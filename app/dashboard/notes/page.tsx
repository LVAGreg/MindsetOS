'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, FileText, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/* ─── Types ─────────────────────────────────────────────── */
interface FieldNote {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
}

/* ─── Token constants ────────────────────────────────────── */
const PAGE_BG       = '#09090f';
const CARD_BG       = 'rgba(18,18,31,0.8)';
const CARD_BORDER   = '1px solid #1e1e30';
const TEXT_PRIMARY  = '#ededf5';
const TEXT_MUTED    = '#9090a8';
const TEXT_DIM      = '#5a5a72';
const INPUT_BG      = 'rgba(9,9,15,0.6)';
const INPUT_BORDER  = '1px solid #1e1e30';
const AMBER         = '#fcc824';

/* ─── Relative time ──────────────────────────────────────── */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'Just now';
  if (diffMin < 60)  return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHr  < 24)  return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7)   return `${diffDay} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Skeleton card ──────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div
      style={{
        background: CARD_BG,
        border: CARD_BORDER,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      aria-hidden="true"
    >
      <div style={{ height: 14, width: '55%', borderRadius: 6, background: 'rgba(237,237,245,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, width: '80%', borderRadius: 6, background: 'rgba(237,237,245,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, width: '60%', borderRadius: 6, background: 'rgba(237,237,245,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function FieldNotesPage() {
  const [notes, setNotes]           = useState<FieldNote[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm]     = useState(false);
  const [formTitle, setFormTitle]   = useState('');
  const [formContent, setFormContent] = useState('');
  const [contentError, setContentError] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Delete confirmation state — stores note id being confirmed
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState<string | null>(null);

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get('/api/field-notes');
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setFetchError('Could not load notes. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  /* ── Show form when list is empty (after initial load) ─── */
  useEffect(() => {
    if (!loading && notes.length === 0 && !fetchError) {
      setShowForm(true);
    }
  }, [loading, notes.length, fetchError]);

  /* ── Submit ─────────────────────────────────────────────── */
  async function handleSave() {
    if (!formContent.trim()) {
      setContentError('Content is required.');
      return;
    }
    setContentError(null);
    setSaveError(null);
    setSaving(true);
    try {
      const newNote: FieldNote = await apiClient.post('/api/field-notes', {
        title: formTitle.trim() || undefined,
        content: formContent.trim(),
      });
      setNotes(prev => [newNote, ...prev]);
      setFormTitle('');
      setFormContent('');
      setShowForm(false);
    } catch {
      setSaveError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete ─────────────────────────────────────────────── */
  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await apiClient.delete(`/api/field-notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      setConfirmDeleteId(null);
    } catch {
      // Non-critical: reset confirm state so user can retry
    } finally {
      setDeleting(null);
    }
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* ── Page header ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: TEXT_PRIMARY,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Field Notes
            </h1>
            <p style={{ fontSize: '0.8125rem', color: TEXT_MUTED, marginTop: 4, margin: '4px 0 0' }}>
              Capture insights from your coaching sessions
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(true);
              setSaveError(null);
              setContentError(null);
            }}
            aria-label="Create new note"
            style={{
              background: AMBER,
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              flexShrink: 0,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Note
          </button>
        </div>

        {/* ── Create form ─────────────────────────────────── */}
        {showForm && (
          <div
            style={{
              background: CARD_BG,
              border: CARD_BORDER,
              borderRadius: 12,
              padding: '16px',
              marginBottom: 20,
            }}
          >
            {/* Title input */}
            <input
              type="text"
              placeholder="Note title (optional)"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              style={{
                width: '100%',
                background: INPUT_BG,
                border: INPUT_BORDER,
                color: TEXT_PRIMARY,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 10,
                minHeight: 44,
              }}
            />

            {/* Content textarea */}
            <textarea
              placeholder="What did you learn? What shifted?"
              value={formContent}
              onChange={e => { setFormContent(e.target.value); if (contentError) setContentError(null); }}
              rows={4}
              style={{
                width: '100%',
                background: INPUT_BG,
                border: contentError ? '1px solid #e05252' : INPUT_BORDER,
                color: TEXT_PRIMARY,
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            {contentError && (
              <p style={{ color: '#e05252', fontSize: '0.75rem', marginTop: 4 }}>{contentError}</p>
            )}
            {saveError && (
              <p style={{ color: '#e05252', fontSize: '0.75rem', marginTop: 4 }}>{saveError}</p>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 14,
              }}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                aria-label="Save note"
                style={{
                  background: saving ? 'rgba(252,200,36,0.5)' : AMBER,
                  color: '#000',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 20px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  minHeight: 44,
                }}
              >
                {saving ? 'Saving…' : 'Save Note'}
              </button>

              <button
                onClick={() => {
                  setShowForm(false);
                  setFormTitle('');
                  setFormContent('');
                  setContentError(null);
                  setSaveError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: TEXT_MUTED,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: '8px 4px',
                  minHeight: 44,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────── */}
        {fetchError && (
          <div
            role="alert"
            style={{
              background: 'rgba(224,82,82,0.1)',
              border: '1px solid rgba(224,82,82,0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              color: '#e05252',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span>{fetchError}</span>
            <button
              onClick={fetchNotes}
              style={{
                background: 'none',
                border: '1px solid rgba(224,82,82,0.4)',
                color: '#e05252',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                minHeight: 44,
              }}
              aria-label="Retry loading notes"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeletons ────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* ── Notes list ───────────────────────────────────── */}
        {!loading && !fetchError && notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(note => (
              <div
                key={note.id}
                style={{
                  background: CARD_BG,
                  border: CARD_BORDER,
                  borderRadius: 12,
                  padding: '12px 16px',
                  position: 'relative',
                }}
              >
                {/* Delete button — top right */}
                <button
                  onClick={() => setConfirmDeleteId(confirmDeleteId === note.id ? null : note.id)}
                  aria-label="Delete note"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: TEXT_DIM,
                    padding: 4,
                    minHeight: 44,
                    minWidth: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>

                {/* Card content — leave right padding for X button */}
                <div style={{ paddingRight: 36 }}>
                  {/* Title */}
                  {note.title ? (
                    <p style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: '0.9375rem', margin: '0 0 4px' }}>
                      {note.title}
                    </p>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: TEXT_DIM, fontSize: '0.875rem', margin: '0 0 4px' }}>
                      Untitled
                    </p>
                  )}

                  {/* Content — 2-line clamp */}
                  <p
                    style={{
                      color: TEXT_MUTED,
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      margin: '0 0 8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {note.content}
                  </p>

                  {/* Timestamp */}
                  <p style={{ color: TEXT_DIM, fontSize: '0.75rem', margin: 0 }}>
                    {relativeTime(note.created_at)}
                  </p>
                </div>

                {/* Inline delete confirmation */}
                {confirmDeleteId === note.id && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid #1e1e30',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', color: TEXT_MUTED }}>Delete this note?</span>
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={deleting === note.id}
                      aria-label="Confirm delete note"
                      style={{
                        background: 'rgba(224,82,82,0.12)',
                        border: '1px solid rgba(224,82,82,0.3)',
                        color: '#e05252',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: deleting === note.id ? 'not-allowed' : 'pointer',
                        minHeight: 44,
                      }}
                    >
                      {deleting === note.id ? 'Deleting…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: TEXT_MUTED,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        padding: '6px 4px',
                        minHeight: 44,
                      }}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && !fetchError && notes.length === 0 && !showForm && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
            }}
          >
            <FileText
              style={{ width: 40, height: 40, color: TEXT_DIM, margin: '0 auto 16px' }}
            />
            <p style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: '1rem', margin: '0 0 6px' }}>
              No notes yet. Start capturing what matters.
            </p>
            <p style={{ color: TEXT_DIM, fontSize: '0.8125rem', margin: 0, lineHeight: 1.6 }}>
              Use Field Notes to capture insights, shifts, and breakthroughs from your sessions.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
