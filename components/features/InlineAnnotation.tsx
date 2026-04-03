'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, X, Check, Trash2 } from 'lucide-react';

// ── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
  // Brand amber
  amber:           '#fcc824',
  amberBg:         'rgba(252,200,36,0.12)',
  amberBorder:     'rgba(252,200,36,0.45)',
  amberText:       '#fcc824',
  // Surfaces
  surface:         'rgba(18,18,31,0.8)',
  surfaceRaised:   '#12121f',
  surfaceInput:    'rgba(18,18,31,0.6)',
  border:          '#1e1e30',
  borderFocus:     'rgba(252,200,36,0.55)',
  // Text
  textPrimary:     '#ededf5',
  textMuted:       '#9090a8',
  textPlaceholder: '#5a5a72',
  // Actions
  dangerText:      '#ef4444',
  dangerBg:        'rgba(239,68,68,0.1)',
  dangerBorder:    'rgba(239,68,68,0.3)',
  successText:     '#10b981',
  transparent:     'transparent',
} as const;

// ── Props ────────────────────────────────────────────────────────────────────
export interface InlineAnnotationProps {
  messageId: string;
  initialNote?: string;
  onSave:   (messageId: string, note: string) => void;
  onDelete: (messageId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function InlineAnnotation({
  messageId,
  initialNote,
  onSave,
  onDelete,
}: InlineAnnotationProps) {
  const hasNote = Boolean(initialNote?.trim());

  const [isOpen,    setIsOpen]    = useState(false);
  const [draft,     setDraft]     = useState(initialNote ?? '');
  const [saved,     setSaved]     = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea as content grows
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Defer so the element is visible before measuring
      requestAnimationFrame(() => {
        resizeTextarea();
        textareaRef.current?.focus();
        // Place cursor at end
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
      });
    }
  }, [isOpen, resizeTextarea]);

  // Sync external initialNote changes
  useEffect(() => {
    if (!isOpen) {
      setDraft(initialNote ?? '');
    }
  }, [initialNote, isOpen]);

  // Click-outside to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpen = () => {
    setDraft(initialNote ?? '');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setDraft(initialNote ?? '');
    setIsOpen(false);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(messageId, trimmed);
    setIsOpen(false);
    setSaved(true);
    clearTimeout(savedTimerRef.current ?? undefined);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1800);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Brief visual delay so user sees the action
    setTimeout(() => {
      onDelete(messageId);
      setIsOpen(false);
      setDraft('');
      setIsDeleting(false);
    }, 120);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // ── Collapsed indicator (note exists) ────────────────────────────────────
  const NotePill = () => (
    <button
      onClick={handleOpen}
      aria-label="View annotation"
      aria-expanded={isOpen}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '4px',
        padding:        '2px 8px',
        borderRadius:   '20px',
        border:         `1px solid ${TOKEN.amberBorder}`,
        background:     TOKEN.amberBg,
        color:          TOKEN.amberText,
        fontSize:       '11px',
        fontWeight:     500,
        lineHeight:     1.6,
        cursor:         'pointer',
        whiteSpace:     'nowrap',
        transition:     'background 0.15s, border-color 0.15s, opacity 0.15s',
        flexShrink:     0,
      }}
    >
      <Pencil size={11} aria-hidden="true" />
      note
    </button>
  );

  // ── Hover pencil button (no note yet) ────────────────────────────────────
  const AddButton = () => (
    <button
      onClick={handleOpen}
      aria-label="Add annotation"
      aria-expanded={isOpen}
      className="inline-annotation-add-btn"
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '22px',
        height:         '22px',
        padding:        0,
        borderRadius:   '4px',
        border:         'none',
        background:     TOKEN.transparent,
        color:          TOKEN.textMuted,
        cursor:         'pointer',
        opacity:        0,
        transition:     'opacity 0.15s, color 0.15s',
        flexShrink:     0,
      }}
    >
      <Pencil size={13} aria-hidden="true" />
    </button>
  );

  // ── Expanded panel ────────────────────────────────────────────────────────
  const ExpandedPanel = () => (
    <div
      style={{
        marginTop:     '8px',
        padding:       '10px 12px',
        borderRadius:  '8px',
        border:        `1px solid ${TOKEN.amberBorder}`,
        background:    TOKEN.amberBg,
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
        // Smooth reveal
        animation:     'ia-expand 0.18s ease',
      }}
      role="region"
      aria-label="Annotation editor"
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          resizeTextarea();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Add a private note…"
        aria-label="Annotation text"
        rows={2}
        style={{
          width:          '100%',
          minHeight:      '60px',
          resize:         'none',
          border:         `1px solid ${draft ? TOKEN.borderFocus : TOKEN.border}`,
          borderRadius:   '6px',
          background:     TOKEN.surfaceInput,
          color:          TOKEN.textPrimary,
          fontSize:       '13px',
          lineHeight:     1.55,
          padding:        '8px 10px',
          outline:        'none',
          fontFamily:     'inherit',
          boxSizing:      'border-box',
          transition:     'border-color 0.15s',
          overflowY:      'hidden',
        }}
      />

      {/* Action row */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '8px',
        }}
      >
        {/* Hint */}
        <span
          aria-hidden="true"
          style={{
            fontSize:   '11px',
            color:      TOKEN.textPlaceholder,
            flexShrink: 1,
            minWidth:   0,
          }}
        >
          ⌘↵ save · Esc cancel
        </span>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Delete — only when a note exists */}
          {hasNote && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Delete annotation"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            '4px',
                padding:        '4px 8px',
                border:         `1px solid ${TOKEN.dangerBorder}`,
                borderRadius:   '6px',
                background:     TOKEN.dangerBg,
                color:          TOKEN.dangerText,
                fontSize:       '12px',
                cursor:         isDeleting ? 'wait' : 'pointer',
                opacity:        isDeleting ? 0.6 : 1,
                transition:     'opacity 0.15s',
                fontFamily:     'inherit',
              }}
            >
              <Trash2 size={12} aria-hidden="true" />
              Delete
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={handleCancel}
            aria-label="Cancel annotation"
            style={{
              display:    'inline-flex',
              alignItems: 'center',
              gap:        '4px',
              padding:    '4px 8px',
              border:     `1px solid ${TOKEN.border}`,
              borderRadius: '6px',
              background: TOKEN.transparent,
              color:      TOKEN.textMuted,
              fontSize:   '12px',
              cursor:     'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            <X size={12} aria-hidden="true" />
            Cancel
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!draft.trim()}
            aria-label="Save annotation"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            '4px',
              padding:        '4px 10px',
              border:         'none',
              borderRadius:   '6px',
              background:     draft.trim() ? TOKEN.amber : 'rgba(252,200,36,0.25)',
              color:          draft.trim() ? '#0f172a' : TOKEN.textMuted,
              fontSize:       '12px',
              fontWeight:     600,
              cursor:         draft.trim() ? 'pointer' : 'not-allowed',
              fontFamily:     'inherit',
              transition:     'background 0.15s, color 0.15s',
            }}
          >
            <Check size={12} aria-hidden="true" />
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Keyframe injection (once per page render is fine — idempotent in DOM) */}
      <style>{`
        @keyframes ia-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        /* Show pencil on parent hover */
        .inline-annotation-parent:hover .inline-annotation-add-btn,
        .inline-annotation-add-btn:focus-visible {
          opacity: 1 !important;
        }
      `}</style>

      <div
        ref={containerRef}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      >
        {/* Collapsed state */}
        {!isOpen && (
          saved ? (
            /* brief "saved" flash */
            <span
              aria-live="polite"
              style={{
                display:    'inline-flex',
                alignItems: 'center',
                gap:        '4px',
                fontSize:   '11px',
                color:      TOKEN.successText,
                padding:    '2px 6px',
              }}
            >
              <Check size={11} aria-hidden="true" />
              Saved
            </span>
          ) : hasNote ? (
            <NotePill />
          ) : (
            <AddButton />
          )
        )}

        {/* Expanded state */}
        {isOpen && <ExpandedPanel />}
      </div>
    </>
  );
}
