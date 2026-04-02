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
      playNextAudio(); // Try next chunk
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
          console.error('Failed to parse message:', err);
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
    <div className="flex flex-col h-full bg-[#0D1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <span className="text-xl">🎙️</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">{agentName}</h3>
            <div className="flex items-center gap-2">
              {status === 'connected' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium" style={{ color: accentColor }}>
                    Live • {formatDuration(callDuration)}
                  </span>
                </>
              )}
              {status === 'idle' && (
                <span className="text-xs text-gray-500">Gemini Live Voice</span>
              )}
              {status === 'connecting' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />
                  <span className="text-xs text-gray-400">Connecting...</span>
                </>
              )}
              {status === 'error' && (
                <span className="text-xs text-red-400">Error</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-500 hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {status === 'idle' && (
          <div className="text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <span className="text-5xl">🎙️</span>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">Real-Time Voice Chat</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Powered by Gemini 2.0 Flash Live for instant, natural conversations
            </p>
            <button
              onClick={connect}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium mx-auto"
              style={{ backgroundColor: accentColor }}
            >
              <Phone className="w-5 h-5" />
              Start Call
            </button>
            {error && (
              <p className="mt-4 text-red-400 text-sm">{error}</p>
            )}
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: accentColor }} />
            <p className="text-gray-400">Connecting to Gemini Live...</p>
          </div>
        )}

        {status === 'connected' && (
          <>
            {/* Audio visualization */}
            <div className="relative flex items-center justify-center mb-8">
              <div
                className={`absolute w-48 h-48 rounded-full transition-all duration-300 ${isAgentSpeaking ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: `${accentColor}10`,
                  transform: `scale(${1 + (isAgentSpeaking ? 0.2 : audioLevel * 0.2)})`,
                }}
              />
              <div
                className="absolute w-36 h-36 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: `${accentColor}20`,
                  transform: `scale(${1 + (isAgentSpeaking ? 0.15 : audioLevel * 0.15)})`,
                }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  backgroundColor: `${accentColor}40`,
                  boxShadow: (isAgentSpeaking || isUserSpeaking) ? `0 0 30px ${accentColor}60` : 'none',
                }}
              >
                <span className="text-4xl">🎙️</span>
              </div>
            </div>

            {/* Waveform — agent bins driven by interval state, not Math.random() in render */}
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {(isAgentSpeaking ? agentFrequencyBins : frequencyBins).map((bin, i) => {
                const height = Math.max(8, bin * 60 + 8);
                return (
                  <div
                    key={i}
                    className="w-2.5 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}px`,
                      backgroundColor: isAgentSpeaking ? accentColor : isUserSpeaking ? '#60A5FA' : '#4B5563',
                      opacity: (isAgentSpeaking || isUserSpeaking) ? 0.9 : 0.3,
                    }}
                  />
                );
              })}
            </div>

            {/* Status */}
            <p className="text-gray-400 text-sm">
              {isAgentSpeaking ? `${agentName} is speaking...` : isUserSpeaking ? 'Listening...' : 'Speak anytime...'}
            </p>
          </>
        )}
      </div>

      {/* Controls */}
      {status === 'connected' && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full transition-all ${
                isMuted ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50' : 'text-white hover:opacity-80'
              }`}
              style={!isMuted ? { backgroundColor: accentColor } : {}}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button
              onClick={disconnect}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-4 rounded-full transition-all ${
                !isSpeakerOn ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}

      {status === 'idle' && transcript.length > 0 && (
        <div className="p-4 border-t border-gray-800 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Previous Call Transcript</p>
          {transcript.map((msg, i) => (
            <div key={i} className={`text-sm mb-1 ${msg.role === 'user' ? 'text-blue-400' : 'text-gray-300'}`}>
              <span className="font-medium">{msg.role === 'user' ? 'You' : agentName}:</span> {msg.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
