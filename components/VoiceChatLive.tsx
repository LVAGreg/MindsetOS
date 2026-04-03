'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Volume2, VolumeX, X, Loader2 } from 'lucide-react';

interface VoiceChatLiveProps {
  agentId: string;
  agentName: string;
  systemInstruction?: string;
  accentColor?: string;
  onClose: () => void;
  userId: string;
}

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Design tokens
const T = {
  pageBg:   '#09090f',
  cardBg:   'rgba(18,18,31,0.8)',
  border:   '#1e1e30',
  text:     '#ededf5',
  muted:    '#9090a8',
  dim:      '#5a5a72',
  blue:     '#4f6ef7',
  amber:    '#fcc824',
  purple:   '#7c5bf6',
};

export default function VoiceChatLive({
  agentId,
  agentName,
  systemInstruction,
  accentColor = '#10B981',
  onClose,
  userId,
}: VoiceChatLiveProps) {
  // Connection state
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Voice state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyBins, setFrequencyBins] = useState<number[]>(new Array(12).fill(0));
  // Agent speaking waveform — updated by interval, never via Math.random() in render
  const [agentFrequencyBins, setAgentFrequencyBins] = useState<number[]>(new Array(12).fill(0));
  const agentWaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Transcript (shown after call ends)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio playback refs
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert Float32Array to 16-bit PCM base64
  const float32ToPcm16Base64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convert base64 PCM to Float32Array for playback
  const base64ToFloat32 = (base64: string, sampleRate: number): Float32Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32;
  };

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !isSpeakerOn) {
      return;
    }

    isPlayingRef.current = true;
    setIsAgentSpeaking(true);

    const audioData = audioQueueRef.current.shift();
    if (!audioData) {
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      return;
    }

    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const float32 = base64ToFloat32(new TextDecoder().decode(audioData), 24000);
      const audioBuffer = playbackContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = playbackContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContextRef.current.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextAudio();
        } else {
          setIsAgentSpeaking(false);
        }
      };

      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      // Surface playback failure to the user then attempt next chunk
      setError('Audio playback failed — retrying...');
      playNextAudio();
    }
  }, [isSpeakerOn]);

  // Start audio monitoring
  const startAudioMonitoring = useCallback(() => {
    const monitor = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(rms / 128, 1);

      setAudioLevel(level);
      setIsUserSpeaking(level > 0.05);

      // Extract frequency bins
      const bins: number[] = [];
      const binSize = Math.floor(dataArray.length / 12);
      for (let i = 0; i < 12; i++) {
        let binSum = 0;
        for (let j = 0; j < binSize; j++) {
          binSum += dataArray[i * binSize + j];
        }
        bins.push(binSum / binSize / 255);
      }
      setFrequencyBins(bins);

      animationFrameRef.current = requestAnimationFrame(monitor);
    };
    monitor();
  }, []);

  // Drive agent waveform animation with stable interval instead of Math.random() in JSX
  useEffect(() => {
    if (isAgentSpeaking) {
      agentWaveIntervalRef.current = setInterval(() => {
        setAgentFrequencyBins(
          Array.from({ length: 12 }, () => Math.random() * 0.5 + 0.3)
        );
      }, 100);
    } else {
      if (agentWaveIntervalRef.current) {
        clearInterval(agentWaveIntervalRef.current);
        agentWaveIntervalRef.current = null;
      }
      setAgentFrequencyBins(new Array(12).fill(0));
    }
    return () => {
      if (agentWaveIntervalRef.current) {
        clearInterval(agentWaveIntervalRef.current);
        agentWaveIntervalRef.current = null;
      }
    };
  }, [isAgentSpeaking]);

  // Connect to Gemini Live
  const connect = async () => {
    setStatus('connecting');
    setError(null);

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });
      streamRef.current = stream;

      // Set up audio context for visualization and capture
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Create worklet for PCM capture
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');
      source.connect(workletNodeRef.current);

      // Connect to WebSocket
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
        (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
        (process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3010') +
        '/ws/voice';

      const params = new URLSearchParams();
      if (systemInstruction) params.set('systemInstruction', systemInstruction);
      params.set('voice', 'Aoede');
      // Send auth token for user-scoped voice sessions
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) params.set('token', accessToken);

      wsRef.current = new WebSocket(`${wsUrl}?${params.toString()}`);

      wsRef.current.onopen = () => {
        console.log('🔌 WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'connected') {
            setStatus('connected');
            startAudioMonitoring();

            // Start sending audio
            if (workletNodeRef.current) {
              workletNodeRef.current.port.onmessage = (e) => {
                if (!isMuted && wsRef.current?.readyState === WebSocket.OPEN) {
                  const pcmBase64 = float32ToPcm16Base64(e.data);
                  wsRef.current.send(JSON.stringify({ type: 'audio', data: pcmBase64 }));
                }
              };
            }

            // Start call timer
            callTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }

          if (message.type === 'audio') {
            const audioData = new TextEncoder().encode(message.data);
            audioQueueRef.current.push(audioData.buffer);
            playNextAudio();
          }

          if (message.type === 'transcript') {
            setTranscript(prev => [...prev, {
              role: 'assistant',
              content: message.text,
              timestamp: new Date().toISOString(),
            }]);
          }

          if (message.type === 'interrupted') {
            // Clear audio queue on interruption
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsAgentSpeaking(false);
          }

          if (message.type === 'error') {
            setError(message.message);
            setStatus('error');
          }
        } catch (err) {
          // Surface parse failures so the user knows something went wrong
          console.error('Failed to parse message:', err);
          setError('Received an unreadable message from the server.');
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
        setStatus('error');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        if (status === 'connected') {
          setStatus('idle');
        }
      };

    } catch (err) {
      console.error('Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
    }
  };

  // Disconnect
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus('idle');
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: T.pageBg }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accentColor}15`,
            }}
          >
            <span style={{ fontSize: 20 }}>🎙️</span>
          </div>
          <div>
            <h3 style={{ color: T.text, fontWeight: 600, fontSize: 15, margin: 0 }}>{agentName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {status === 'connected' && (
                <>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: accentColor }}>
                    Live • {formatDuration(callDuration)}
                  </span>
                </>
              )}
              {status === 'idle' && (
                <span style={{ fontSize: 11, color: T.dim }}>Gemini Live Voice</span>
              )}
              {status === 'connecting' && (
                <>
                  <Loader2 style={{ width: 12, height: 12, color: accentColor, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, color: T.muted }}>Connecting...</span>
                </>
              )}
              {status === 'error' && (
                <span style={{ fontSize: 11, color: '#f87171' }}>Error</span>
              )}
            </div>
          </div>
        </div>
        <button
          aria-label="Close voice chat"
          onClick={onClose}
          style={{
            padding: 8,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: T.dim,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.muted; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.dim; }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {(status === 'idle' || status === 'error') && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                backgroundColor: `${accentColor}20`,
              }}
            >
              <span style={{ fontSize: 48 }}>🎙️</span>
            </div>
            <h3 style={{ color: T.text, fontSize: 17, fontWeight: 500, margin: '0 0 8px' }}>Real-Time Voice Chat</h3>
            <p style={{ color: T.muted, fontSize: 13, margin: '0 0 24px', maxWidth: 280 }}>
              Powered by Gemini 2.0 Flash Live for instant, natural conversations
            </p>
            <button
              onClick={connect}
              disabled={status === 'connecting'}
              aria-label="Start voice call"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                cursor: status === 'connecting' ? 'not-allowed' : 'pointer',
                color: T.text,
                fontWeight: 500,
                fontSize: 14,
                margin: '0 auto',
                backgroundColor: accentColor,
                opacity: status === 'connecting' ? 0.6 : 1,
              }}
            >
              {status === 'connecting'
                ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Connecting...</>
                : <><Phone style={{ width: 18, height: 18 }} /> Start Call</>
              }
            </button>
            {error && (
              <p style={{ marginTop: 16, color: '#f87171', fontSize: 13 }}>{error}</p>
            )}
          </div>
        )}

        {status === 'connecting' && (
          <div style={{ textAlign: 'center' }}>
            <Loader2 style={{ width: 64, height: 64, color: accentColor, animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: T.muted }}>Connecting to Gemini Live...</p>
          </div>
        )}

        {status === 'connected' && (
          <>
            {/* Audio visualization */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
              <div
                style={{
                  position: 'absolute',
                  width: 192,
                  height: 192,
                  borderRadius: '50%',
                  backgroundColor: `${accentColor}10`,
                  transition: 'transform 300ms',
                  transform: `scale(${1 + (isAgentSpeaking ? 0.2 : audioLevel * 0.2)})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: 144,
                  height: 144,
                  borderRadius: '50%',
                  backgroundColor: `${accentColor}20`,
                  transition: 'transform 200ms',
                  transform: `scale(${1 + (isAgentSpeaking ? 0.15 : audioLevel * 0.15)})`,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 150ms',
                  backgroundColor: `${accentColor}40`,
                  boxShadow: (isAgentSpeaking || isUserSpeaking) ? `0 0 30px ${accentColor}60` : 'none',
                }}
              >
                <span style={{ fontSize: 40 }}>🎙️</span>
              </div>
            </div>

            {/* Waveform — agent bins driven by interval state, not Math.random() in render */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 64, marginBottom: 24 }}>
              {(isAgentSpeaking ? agentFrequencyBins : frequencyBins).map((bin, i) => {
                const height = Math.max(8, bin * 60 + 8);
                return (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      borderRadius: 9999,
                      transition: 'height 75ms',
                      height: `${height}px`,
                      backgroundColor: isAgentSpeaking ? accentColor : isUserSpeaking ? T.blue : T.dim,
                      opacity: (isAgentSpeaking || isUserSpeaking) ? 0.9 : 0.3,
                    }}
                  />
                );
              })}
            </div>

            {/* Status */}
            <p style={{ color: T.muted, fontSize: 13 }}>
              {isAgentSpeaking ? `${agentName} is speaking...` : isUserSpeaking ? 'Listening...' : 'Speak anytime...'}
            </p>
          </>
        )}
      </div>

      {/* Controls */}
      {status === 'connected' && (
        <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: 16,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms',
                ...(isMuted
                  ? { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171', outline: '2px solid rgba(239,68,68,0.5)' }
                  : { backgroundColor: accentColor, color: T.text }
                ),
              }}
            >
              {isMuted ? <MicOff style={{ width: 24, height: 24 }} /> : <Mic style={{ width: 24, height: 24 }} />}
            </button>
            <button
              aria-label="End call"
              onClick={disconnect}
              style={{
                padding: 16,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ef4444',
                color: T.text,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#dc2626'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ef4444'; }}
            >
              <PhoneOff style={{ width: 24, height: 24 }} />
            </button>
            <button
              aria-label={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              style={{
                padding: 16,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms',
                backgroundColor: isSpeakerOn ? T.cardBg : 'rgba(30,30,48,0.6)',
                color: isSpeakerOn ? T.text : T.dim,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              {isSpeakerOn ? <Volume2 style={{ width: 24, height: 24 }} /> : <VolumeX style={{ width: 24, height: 24 }} />}
            </button>
          </div>
        </div>
      )}

      {status === 'idle' && transcript.length > 0 && (
        <div style={{ padding: 16, borderTop: `1px solid ${T.border}`, maxHeight: 192, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Previous Call Transcript
          </p>
          {transcript.map((msg, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4, color: msg.role === 'user' ? T.blue : T.muted }}>
              <span style={{ fontWeight: 500 }}>{msg.role === 'user' ? 'You' : agentName}:</span> {msg.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
