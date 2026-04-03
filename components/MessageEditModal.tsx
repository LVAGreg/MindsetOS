'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface MessageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  onSave: (newContent: string) => Promise<void>;
}

export default function MessageEditModal({
  isOpen,
  onClose,
  originalContent,
  onSave,
}: MessageEditModalProps) {
  const [content, setContent] = useState(originalContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update content when modal opens with new message
  useEffect(() => {
    if (isOpen) {
      setContent(originalContent);
      setError(null);
    }
  }, [originalContent, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (content.trim() === originalContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(content);
      onClose();
    } catch (err) {
      console.error('Error saving message:', err);
      setError('Failed to save message. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'rgba(18,18,31,0.8)',
          border: '1px solid #1e1e30',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          width: '100%',
          maxWidth: '672px',
          margin: '0 16px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid #1e1e30',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#ededf5',
              margin: 0,
            }}
          >
            Edit Message
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: '4px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9090a8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#ededf5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#9090a8';
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: '#9090a8',
              marginBottom: '12px',
              margin: '0 0 12px',
            }}
          >
            Editing this message will create a new conversation branch. You can navigate between
            branches using the arrows.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your message..."
            autoFocus
            style={{
              width: '100%',
              height: '256px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #1e1e30',
              background: '#09090f',
              color: '#ededf5',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#4f6ef7';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
            }}
          />

          {/* Inline error */}
          {error && (
            <p
              style={{
                marginTop: '8px',
                fontSize: '0.8125rem',
                color: '#f87171',
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #1e1e30',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #1e1e30',
              background: 'transparent',
              color: '#9090a8',
              fontSize: '0.875rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                const el = e.currentTarget as HTMLElement;
                el.style.color = '#ededf5';
                el.style.borderColor = '#5a5a72';
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = '#9090a8';
              el.style.borderColor = '#1e1e30';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || content.trim() === ''}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#4f6ef7',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isSaving || content.trim() === '' ? 'not-allowed' : 'pointer',
              opacity: isSaving || content.trim() === '' ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && content.trim() !== '') {
                (e.currentTarget as HTMLElement).style.background = '#3d5ce5';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#4f6ef7';
            }}
          >
            {isSaving ? (
              <>
                <Loader2
                  style={{
                    width: '16px',
                    height: '16px',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Saving...
              </>
            ) : (
              'Update & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
