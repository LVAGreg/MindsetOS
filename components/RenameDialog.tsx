'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface RenameDialogProps {
  conversationId: string;
  currentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RenameDialog({
  conversationId,
  currentTitle,
  isOpen,
  onClose,
}: RenameDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { renameConversation } = useAppStore();

  useEffect(() => {
    setTitle(currentTitle);
    setError(null);
  }, [currentTitle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await renameConversation(conversationId, title);
      onClose();
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      setError('Failed to rename. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ background: 'rgba(0,0,0,0.6)' }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          style={{
            background: 'rgba(18,18,31,0.95)',
            border: '1px solid #1e1e30',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: '28rem',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderBottom: '1px solid #1e1e30',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#ededf5',
                margin: 0,
              }}
            >
              Rename Conversation
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '0.375rem',
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
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter conversation title"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: 'rgba(18,18,31,0.6)',
                border: '1px solid #1e1e30',
                borderRadius: '0.5rem',
                color: '#ededf5',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#4f6ef7';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
              }}
              autoFocus
              disabled={isSubmitting}
            />

            {/* Error message */}
            {error && (
              <p
                style={{
                  color: '#f87171',
                  fontSize: '0.8125rem',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}
              >
                {error}
              </p>
            )}

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#9090a8',
                  background: 'none',
                  border: '1px solid #1e1e30',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#ededf5';
                  (e.currentTarget as HTMLElement).style.borderColor = '#5a5a72';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#9090a8';
                  (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#09090f',
                  background: '#fcc824',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !title.trim() ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'opacity 0.15s',
                }}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Renaming…' : 'Rename'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
