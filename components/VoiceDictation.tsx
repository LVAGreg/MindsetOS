'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceDictationProps {
  onTranscriptUpdate: (transcript: string) => void;
  disabled?: boolean;
}

export default function VoiceDictation({
  onTranscriptUpdate,
  disabled = false,
}: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    try {
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Wait 300ms for microphone to fully initialize
      await new Promise(resolve => setTimeout(resolve, 300));

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, total chunks:', chunksRef.current.length);
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      console.log('🔴 Recording started');
      setIsRecording(true);
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      const msg = 'Failed to access microphone. Please check permissions.';
      setError(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏸️ Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setError(null);
    try {
      console.log('🎙️ Starting transcription, audio size:', audioBlob.size, 'bytes');

      // Check if audio blob is too small
      if (audioBlob.size < 1000) {
        throw new Error('Recording too short. Please speak for at least 1 second.');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      console.log('📡 Sending transcription request to backend...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      console.log('📥 Transcription response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Transcription failed');
      }

      const data = await response.json();
      console.log('✅ Transcription result:', data);

      if (data.transcript) {
        onTranscriptUpdate(data.transcript);
      } else {
        throw new Error('No transcript returned from server');
      }
    } catch (err) {
      console.error('❌ Transcription error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to transcribe audio. Please try again.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Derive button styles from design tokens — no forbidden Tailwind color classes
  const buttonStyle: React.CSSProperties = isRecording
    ? {
        backgroundColor: '#c0392b',
        color: '#ededf5',
      }
    : isProcessing
    ? {
        backgroundColor: '#fcc824',
        color: '#09090f',
      }
    : {
        backgroundColor: 'rgba(18,18,31,0.8)',
        color: '#9090a8',
        border: '1px solid #1e1e30',
      };

  const ariaLabel = isRecording
    ? 'Stop recording'
    : isProcessing
    ? 'Transcribing audio'
    : 'Start voice recording';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
      <button
        onClick={handleToggle}
        disabled={disabled || isProcessing}
        aria-label={ariaLabel}
        title={isRecording ? 'Click to stop & transcribe' : isProcessing ? 'Transcribing...' : 'Click to start recording'}
        className={`px-4 py-4 rounded-xl font-semibold transition-all flex items-center gap-2${isRecording ? ' animate-pulse' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
        style={buttonStyle}
      >
        {isRecording ? (
          <>
            <MicOff className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Recording...</span>
          </>
        ) : isProcessing ? (
          <>
            <Mic className="w-5 h-5 animate-spin" />
            <span className="text-sm hidden sm:inline">Transcribing...</span>
          </>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      {error && (
        <span
          role="alert"
          style={{ fontSize: '0.75rem', color: '#fcc824', maxWidth: '220px', lineHeight: 1.3 }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
