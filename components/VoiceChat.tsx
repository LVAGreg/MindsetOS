'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Volume2, VolumeX, Settings, X, ChevronDown } from 'lucide-react';

interface VoiceChatProps {
  agentId: string;
  agentName: string;
  agentType: 'voice-expert' | 'sales-roleplay-coach';
  accentColor?: string;
  onClose: () => void;
  userId: string;
}

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

export default function VoiceChat({
  agentId,
  agentName,
  agentType,
  accentColor = '#10B981',
  onClose,
  userId,
}: VoiceChatProps) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'connecting' | 'active' | 'ending' | 'ended'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Voice state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  // Audio visualization - use frequency bins for real waveform
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [frequencyBins, setFrequencyBins] = useState<number[]>(new Array(12).fill(0));

  // Device selection
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'transcribing' | 'thinking' | 'speaking'>('idle');

  // Transcript
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Roleplay specific
  const [difficulty, setDifficulty] = useState<'kind' | 'medium' | 'hard_ass'>('medium');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ strengths: string[]; improvements: string[]; tips: string[] } | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const agentAudioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vadRef = useRef<any>(null);
  const speechStartTimeRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop agent audio (barge-in functionality)
  const stopAgentAudio = () => {
    // Stop ElevenLabs audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Cancel browser TTS if speaking
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }

    // Clear the audio level interval
    if (agentAudioIntervalRef.current) {
      clearInterval(agentAudioIntervalRef.current);
      agentAudioIntervalRef.current = null;
    }

    setAgentAudioLevel(0);
    setIsAgentSpeaking(false);
  };

  // Enumerate audio input devices
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .filter(device => {
            // Filter out virtual/system audio devices
            const label = device.label.toLowerCase();
            return !label.includes('stereo mix') &&
                   !label.includes('what u hear') &&
                   !label.includes('virtual') &&
                   !label.includes('loopback') &&
                   !label.includes('system audio');
          })
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          }));

        setAudioDevices(audioInputs);

        // Select first device if none selected
        if (!selectedDeviceId && audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };

    enumerateDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [selectedDeviceId]);

  // Scroll to bottom of transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Call duration timer
  useEffect(() => {
    if (sessionStatus === 'active') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [sessionStatus]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start continuous audio monitoring
  const startAudioMonitoring = useCallback(() => {
    // Frame counter used for deterministic debug logging (~every 60 frames) instead of Math.random()
    let frameCount = 0;
    const monitor = () => {
      if (!analyserRef.current) {
        console.log('⚠️ No analyser ref');
        return;
      }

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate overall level using RMS for better accuracy
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(rms / 128, 1);

      // Debug logging every 60 frames (~1 second at 60fps) — use counter, not Math.random()
      frameCount = (frameCount + 1) % 60;
      if (frameCount === 0) {
        const maxBin = dataArray.reduce((max, val) => Math.max(max, val), 0);
        console.log('🎤 Audio level:', normalizedLevel.toFixed(3), 'Max bin:', maxBin);
      }

      if (!isMuted) {
        setUserAudioLevel(normalizedLevel);

        // Extract 12 frequency bins for visualization (focus on voice range)
        const voiceBins: number[] = [];
        const binCount = 12;
        const startBin = 2; // Skip very low frequencies
        const endBin = Math.min(dataArray.length, 64); // Voice range
        const binSize = Math.max(1, Math.floor((endBin - startBin) / binCount));

        for (let i = 0; i < binCount; i++) {
          const start = startBin + i * binSize;
          const end = Math.min(start + binSize, dataArray.length);
          let binSum = 0;
          for (let j = start; j < end; j++) {
            binSum += dataArray[j];
          }
          voiceBins.push(binSum / binSize / 255);
        }

        setFrequencyBins(voiceBins);

        // Lower threshold for speech detection (0.05 is very sensitive)
        const isSpeaking = normalizedLevel > 0.05;
        setIsUserSpeaking(isSpeaking);

        // Speech segment detection for recording control
        if (isSpeaking && !speechStartTimeRef.current) {
          speechStartTimeRef.current = Date.now();
          console.log('🗣️ Speech started');
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else if (!isSpeaking && speechStartTimeRef.current) {
          // Only trigger processing if user spoke for at least 300ms
          const speechDuration = Date.now() - speechStartTimeRef.current;
          if (!silenceTimeoutRef.current && speechDuration > 300) {
            // Reduced from 800ms to 400ms for faster response
            silenceTimeoutRef.current = setTimeout(() => {
              console.log('🤫 Silence detected after', speechDuration, 'ms of speech');
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
              speechStartTimeRef.current = null;
              silenceTimeoutRef.current = null;
            }, 400);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(monitor);
    };

    monitor();
  }, [isMuted]);

  // Start voice session
  const startSession = async () => {
    setSessionStatus('connecting');
    setError(null);
    setCallDuration(0);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/voice/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentSlug: agentId,
          userId,
          difficulty: agentType === 'sales-roleplay-coach' ? difficulty : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start voice session');
      }

      const data = await response.json();
      setSessionId(data.session.id);

      // Add initial greeting
      const greeting = agentType === 'sales-roleplay-coach'
        ? `Alright, I'm set to ${difficulty} mode. Let's practice - I'll play the prospect. Ready when you are!`
        : "Hey! I'm your Voice Expert. What are you working on today - your offer, marketing, sales? Tell me what's on your mind.";

      setTranscript([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString(),
      }]);

      // Speak the greeting
      await speakText(greeting);

      // Start listening
      await startListening();
      setSessionStatus('active');

    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
      setSessionStatus('idle');
    }
  };

  // Start listening to microphone with selected device
  const startListening = async () => {
    try {
      // Build audio constraints with specific device if selected
      // Note: Don't force sampleRate - let browser use native rate for best compatibility
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      };

      // Use specific device if selected
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      console.log('🎤 Starting microphone with device:', selectedDeviceId || 'default');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      streamRef.current = stream;

      // Log which device we actually got
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Active microphone:', audioTrack.label);
      console.log('🎤 Track settings:', audioTrack.getSettings());

      // Create audio context - use default sample rate for compatibility
      audioContextRef.current = new AudioContext();

      // CRITICAL: Resume audio context (browsers suspend until user gesture)
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔊 Resuming suspended AudioContext...');
        await audioContextRef.current.resume();
      }
      console.log('🔊 AudioContext state:', audioContextRef.current.state);

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Faster updates
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing = more responsive
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Start audio level monitoring immediately (don't wait for session status)
      startAudioMonitoring();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      let chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (chunks.length > 0 && !processingRef.current) {
          processingRef.current = true;
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          chunks = [];

          // Only process if blob has meaningful audio (>2KB)
          if (audioBlob.size > 2000) {
            await processAudio(audioBlob);
          }

          // Restart recording if session is still active
          if (sessionStatus === 'active' && mediaRecorderRef.current) {
            mediaRecorderRef.current.start();
          }

          processingRef.current = false;
        }
      };

      // Start recording
      mediaRecorder.start();

      // Use timeslice-based recording as backup (10 seconds max)
      // The speech detection in startAudioMonitoring will stop it earlier when silence is detected
      const intervalId = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording' && !isMuted && !processingRef.current) {
          // Force stop after 10 seconds of continuous recording
          mediaRecorderRef.current.stop();
        }
      }, 10000);

      (mediaRecorderRef.current as any).intervalId = intervalId;

    } catch (err) {
      console.error('Failed to access microphone:', err);
      if (err instanceof Error && err.name === 'NotFoundError') {
        setError('Microphone not found. Please connect a microphone and try again.');
      } else if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Failed to access microphone. Please check permissions.');
      }
    }
  };

  // Process recorded audio
  const processAudio = async (audioBlob: Blob) => {
    if (audioBlob.size < 1000 || isMuted) return;

    // Barge-in: Stop agent audio if user starts speaking
    if (isAgentSpeaking) {
      console.log('🛑 Barge-in detected - stopping agent audio');
      stopAgentAudio();
    }

    setIsProcessing(true);
    setProcessingStep('transcribing');
    console.log('📝 Transcribing audio...', audioBlob.size, 'bytes');

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const startTime = Date.now();
      const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      console.log('📝 Transcription took', Date.now() - startTime, 'ms');

      if (transcribeResponse.ok) {
        const { transcript: userText } = await transcribeResponse.json();

        if (userText && userText.trim() && userText.trim().length > 2) {
          console.log('📝 Transcribed:', userText);
          setTranscript(prev => [...prev, {
            role: 'user',
            content: userText,
            timestamp: new Date().toISOString(),
          }]);
          await getAgentResponse(userText);
        } else {
          console.log('📝 Transcription too short or empty, ignoring');
          setIsProcessing(false);
          setProcessingStep('idle');
        }
      } else {
        console.error('📝 Transcription failed:', transcribeResponse.status);
        setIsProcessing(false);
        setProcessingStep('idle');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setIsProcessing(false);
      setProcessingStep('idle');
    }
  };

  // Get agent response
  const getAgentResponse = async (userMessage: string) => {
    if (!sessionId) return;

    setProcessingStep('thinking');
    console.log('🤔 Getting agent response...');

    try {
      const token = localStorage.getItem('accessToken');

      const startTime = Date.now();
      // Use the streaming chat endpoint for voice agents
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/letta/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          message: userMessage,
          conversationId: sessionId,
        }),
      });
      console.log('🤔 Agent response took', Date.now() - startTime, 'ms');

      if (!response.ok) throw new Error('Failed to get agent response');

      const data = await response.json();
      const agentText = data.response || data.message || data.content;

      if (agentText) {
        console.log('🤔 Agent said:', agentText.substring(0, 100) + '...');
        setTranscript(prev => [...prev, {
          role: 'assistant',
          content: agentText,
          timestamp: new Date().toISOString(),
        }]);

        if (isSpeakerOn) {
          setProcessingStep('speaking');
          setIsAgentSpeaking(true);
          await speakText(agentText);
        }
      }
    } catch (err) {
      console.error('Error getting agent response:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent response');
    } finally {
      setIsAgentSpeaking(false);
      setIsProcessing(false);
      setProcessingStep('idle');
    }
  };

  // Text-to-speech
  const speakText = async (text: string) => {
    setIsAgentSpeaking(true);

    // Store interval in ref so it can be cleared by barge-in
    agentAudioIntervalRef.current = setInterval(() => {
      setAgentAudioLevel(Math.random() * 0.5 + 0.3);
    }, 100);

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (agentAudioIntervalRef.current) clearInterval(agentAudioIntervalRef.current);
          agentAudioIntervalRef.current = null;
          setAgentAudioLevel(0);
          setIsAgentSpeaking(false);
        };
        speechSynthesis.speak(utterance);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio; // Store audio element for barge-in

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (agentAudioIntervalRef.current) clearInterval(agentAudioIntervalRef.current);
        agentAudioIntervalRef.current = null;
        currentAudioRef.current = null;
        setAgentAudioLevel(0);
        setIsAgentSpeaking(false);
      };

      await audio.play();

    } catch (err) {
      console.error('TTS error:', err);
      if (agentAudioIntervalRef.current) clearInterval(agentAudioIntervalRef.current);
      agentAudioIntervalRef.current = null;
      setAgentAudioLevel(0);

      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsAgentSpeaking(false);
        if (agentAudioIntervalRef.current) clearInterval(agentAudioIntervalRef.current);
        agentAudioIntervalRef.current = null;
      };
      speechSynthesis.speak(utterance);
    }
  };

  // End session
  const endSession = async () => {
    setSessionStatus('ending');

    if (mediaRecorderRef.current) {
      const intervalId = (mediaRecorderRef.current as any).intervalId;
      if (intervalId) clearInterval(intervalId);
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

    if (sessionId) {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/voice/session/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.session.score) setScore(data.session.score);
          if (data.session.feedback) setFeedback(data.session.feedback);
        }
      } catch (err) {
        console.error('Error ending session:', err);
        setError(err instanceof Error ? err.message : 'Failed to end session cleanly');
      }
    }

    setSessionStatus('ended');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        const intervalId = (mediaRecorderRef.current as any).intervalId;
        if (intervalId) clearInterval(intervalId);
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (agentAudioIntervalRef.current) clearInterval(agentAudioIntervalRef.current);
    };
  }, []);

  // Close device selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDeviceSelector) {
        setShowDeviceSelector(false);
      }
    };

    if (showDeviceSelector) {
      // Add small delay to prevent immediate close
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeviceSelector]);

  // Soundwave visualization
  const SoundWave = ({ level, color, isActive, size = 'md' }: { level: number; color: string; isActive: boolean; size?: 'sm' | 'md' }) => {
    const barCount = size === 'sm' ? 4 : 5;
    const maxHeight = size === 'sm' ? 24 : 40;
    const baseHeight = size === 'sm' ? 4 : 6;

    return (
      <div className="flex items-center justify-center gap-0.5">
        {[...Array(barCount)].map((_, i) => {
          const height = isActive
            ? baseHeight + (maxHeight - baseHeight) * level * Math.sin((Date.now() / 200) + i)
            : baseHeight;

          return (
            <div
              key={i}
              className="w-1 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(baseHeight, Math.abs(height))}px`,
                backgroundColor: isActive ? color : '#5a5a72',
                opacity: isActive ? 0.8 + (level * 0.2) : 0.3,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#09090f' }}>
      {/* Header bar - consistent with other agents */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1e1e30', backgroundColor: '#09090f' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <span className="text-xl">{agentType === 'sales-roleplay-coach' ? '🎭' : '🎙️'}</span>
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: '#ededf5' }}>{agentName}</h3>
            <div className="flex items-center gap-2">
              {sessionStatus === 'active' && (
                <>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#4f6ef7' }} />
                  <span className="text-xs font-medium" style={{ color: accentColor }}>
                    Live • {formatDuration(callDuration)}
                  </span>
                </>
              )}
              {sessionStatus === 'idle' && (
                <span className="text-xs" style={{ color: '#5a5a72' }}>Voice Agent</span>
              )}
              {sessionStatus === 'connecting' && (
                <>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                  <span className="text-xs" style={{ color: '#9090a8' }}>Connecting...</span>
                </>
              )}
              {sessionStatus === 'ending' && (
                <span className="text-xs" style={{ color: '#9090a8' }}>Ending call...</span>
              )}
              {sessionStatus === 'ended' && (
                <span className="text-xs" style={{ color: '#5a5a72' }}>Call ended</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close voice chat"
          className="p-2 rounded-lg transition-colors"
          style={{ color: '#5a5a72' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,30,48,0.5)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5a5a72'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Pre-call: Start screen */}
        {(sessionStatus as string) === 'idle' && (
          <div className="flex flex-col h-full p-6">
            {/* Welcome message */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <span className="text-xl">{agentType === 'sales-roleplay-coach' ? '🎭' : '🎙️'}</span>
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]" style={{ backgroundColor: 'rgba(30,30,48,0.6)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#ededf5' }}>
                    {agentType === 'sales-roleplay-coach'
                      ? "Ready to practice your sales skills? I'll roleplay as different prospect types. Select a difficulty and hit start!"
                      : "I'm your live voice consultant. Start a call and we can talk through your offer, marketing, or sales challenges."}
                  </p>
                </div>
              </div>

              {/* Roleplay difficulty selector */}
              {agentType === 'sales-roleplay-coach' && (
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 flex-shrink-0" /> {/* Spacer */}
                  <div>
                    <p className="text-xs mb-2 uppercase tracking-wide" style={{ color: '#5a5a72' }}>Prospect Difficulty</p>
                    <div className="flex flex-wrap gap-2">
                      {(['kind', 'medium', 'hard_ass'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          style={difficulty === level
                            ? { backgroundColor: accentColor, color: '#ededf5' }
                            : { backgroundColor: 'rgba(30,30,48,0.6)', color: '#9090a8' }}
                        >
                          {level === 'kind' ? '😊 Easy' : level === 'medium' ? '😐 Medium' : '😤 Hard'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Microphone selector */}
              {audioDevices.length > 0 && (
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 flex-shrink-0" /> {/* Spacer */}
                  <div className="relative">
                    <p className="text-xs mb-2 uppercase tracking-wide" style={{ color: '#5a5a72' }}>Microphone</p>
                    <button
                      onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all min-w-[200px]"
                      style={{ backgroundColor: 'rgba(30,30,48,0.6)', color: '#9090a8' }}
                    >
                      <Mic className="w-4 h-4" />
                      <span className="flex-1 text-left text-sm truncate max-w-[180px]">
                        {audioDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'Select microphone'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDeviceSelector ? 'rotate-180' : ''}`} />
                    </button>
                    {showDeviceSelector && (
                      <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-xl z-10 overflow-hidden" style={{ backgroundColor: '#12121f', border: '1px solid #1e1e30' }}>
                        {audioDevices.map((device) => (
                          <button
                            key={device.deviceId}
                            onClick={() => {
                              setSelectedDeviceId(device.deviceId);
                              setShowDeviceSelector(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                            style={selectedDeviceId === device.deviceId
                              ? { backgroundColor: 'rgba(30,30,48,0.5)', color: '#ededf5' }
                              : { color: '#9090a8' }}
                          >
                            <span className="truncate block">{device.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Start call button - at bottom like chat input */}
            <div className="pt-4" style={{ borderTop: '1px solid #1e1e30' }}>
              <button
                onClick={startSession}
                disabled={sessionStatus === 'connecting'}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: accentColor, color: '#ededf5' }}
              >
                {sessionStatus === 'connecting' ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    Start Voice Call
                  </>
                )}
              </button>
              {error && (
                <p className="mt-3 text-sm text-center" style={{ color: '#fcc824' }}>{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Active call: Audio visualization (voice-focused, no transcript during call) */}
        {(sessionStatus === 'active' || sessionStatus === 'ending') && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Central audio visualization */}
            <div className="relative flex items-center justify-center mb-8">
              {/* Outer pulsing ring */}
              <div
                className={`absolute w-48 h-48 rounded-full transition-all duration-300 ${isAgentSpeaking ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: `${accentColor}10`,
                  transform: `scale(${1 + (isAgentSpeaking ? agentAudioLevel * 0.3 : userAudioLevel * 0.2)})`,
                }}
              />
              {/* Middle ring */}
              <div
                className="absolute w-36 h-36 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: `${accentColor}20`,
                  transform: `scale(${1 + (isAgentSpeaking ? agentAudioLevel * 0.2 : userAudioLevel * 0.15)})`,
                }}
              />
              {/* Inner circle with icon */}
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  backgroundColor: `${accentColor}40`,
                  boxShadow: isAgentSpeaking || isUserSpeaking ? `0 0 30px ${accentColor}60` : 'none',
                }}
              >
                <span className="text-4xl">{agentType === 'sales-roleplay-coach' ? '🎭' : '🎙️'}</span>
              </div>
            </div>

            {/* Audio waveform bars - using real frequency data */}
            {/* Agent bars use agentAudioLevel (already updated via interval) — no Math.random() in render */}
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {frequencyBins.map((bin, i) => {
                // Use real frequency data for user, stable agentAudioLevel state for agent
                const binValue = isAgentSpeaking
                  ? agentAudioLevel * 0.8 + agentAudioLevel * 0.2
                  : isUserSpeaking
                    ? bin
                    : 0.05;
                const height = Math.max(8, binValue * 60 + 8);
                return (
                  <div
                    key={i}
                    className="w-2.5 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}px`,
                      backgroundColor: isAgentSpeaking ? accentColor : isUserSpeaking ? '#4f6ef7' : '#5a5a72',
                      opacity: isAgentSpeaking || isUserSpeaking ? 0.9 : 0.3,
                      transform: `scaleY(${isUserSpeaking && bin > 0.3 ? 1.1 : 1})`,
                    }}
                  />
                );
              })}
            </div>

            {/* Status text */}
            <p className="text-sm" style={{ color: '#9090a8' }}>
              {processingStep === 'transcribing' ? '📝 Processing your voice...' :
               processingStep === 'thinking' ? '🤔 Thinking...' :
               processingStep === 'speaking' || isAgentSpeaking ? `${agentName} is speaking...` :
               isUserSpeaking ? 'Listening to you...' : 'Speak anytime...'}
            </p>
            <p className="text-xs mt-2" style={{ color: '#5a5a72' }}>
              {formatDuration(callDuration)}
            </p>
          </div>
        )}

        {/* Post-call: Show transcript */}
        {sessionStatus === 'ended' && transcript.length > 0 && (
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto" style={{ borderBottom: '1px solid #1e1e30' }}>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#5a5a72' }}>Call Transcript</p>
            {transcript.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mr-2"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <span className="text-xs">{agentType === 'sales-roleplay-coach' ? '🎭' : '🎙️'}</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                  }`}
                  style={msg.role === 'user'
                    ? { backgroundColor: `${accentColor}80` }
                    : { backgroundColor: 'rgba(30,30,48,0.6)', color: '#9090a8' }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: '#ededf5' }}>{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Post-call: Results */}
        {sessionStatus === 'ended' && score !== null && (
          <div className="p-6" style={{ borderTop: '1px solid #1e1e30' }}>
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: '#9090a8' }}>Your Score</p>
              <p className="text-4xl font-bold" style={{ color: accentColor }}>{score}/100</p>
            </div>

            {feedback && (
              <div className="space-y-4">
                {feedback.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: '#4f6ef7' }}>Strengths</p>
                    <ul className="text-sm space-y-1" style={{ color: '#9090a8' }}>
                      {feedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.improvements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: '#fcc824' }}>Areas to Improve</p>
                    <ul className="text-sm space-y-1" style={{ color: '#9090a8' }}>
                      {feedback.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls - Chat-style input with voice controls */}
      <div style={{ borderTop: '1px solid #1e1e30', backgroundColor: 'rgba(18,18,31,0.8)' }}>
        {sessionStatus === 'active' && (
          <div className="p-4">
            {/* Simplified voice controls - no text input */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className="p-4 rounded-full transition-all"
                style={isMuted
                  ? { backgroundColor: 'rgba(124,91,246,0.2)', color: '#7c5bf6', outline: '2px solid rgba(124,91,246,0.5)' }
                  : { backgroundColor: accentColor, color: '#ededf5' }}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={endSession}
                disabled={sessionStatus === 'ending' as any}
                aria-label="End call"
                className="p-4 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#7c5bf6', color: '#ededf5' }}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                aria-label={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
                className="p-4 rounded-full transition-all"
                style={!isSpeakerOn
                  ? { backgroundColor: '#1e1e30', color: '#5a5a72' }
                  : { backgroundColor: '#12121f', color: '#ededf5' }}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}

        {sessionStatus === 'ended' && (
          <div className="p-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setSessionStatus('idle');
                setTranscript([]);
                setScore(null);
                setFeedback(null);
                setCallDuration(0);
              }}
              className="px-6 py-3 rounded-xl font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: accentColor, color: '#ededf5' }}
            >
              New Call
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl transition-all"
              style={{ backgroundColor: '#1e1e30', color: '#9090a8' }}
            >
              Close
            </button>
          </div>
        )}

        {sessionStatus === 'connecting' && (
          <div className="p-4 flex items-center justify-center">
            <div className="flex items-center gap-2" style={{ color: '#9090a8' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span>Connecting to {agentName}...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
