'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, X, Sparkles } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          '#09090f',
  bgGlass:     'rgba(18,18,31,0.8)',
  surface:     '#1e1e30',
  textPrimary: '#ededf5',
  textMuted:   '#9090a8',
  textDim:     '#5a5a72',
  blue:        '#4f6ef7',
  amber:       '#fcc824',
  purple:      '#7c5bf6',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: string;
  content: string;
}

export interface ConversationSummaryBannerProps {
  /** Full message list — banner only renders when length >= 10 */
  messages: ConversationMessage[];
  /** One-sentence AI-generated summary of the conversation so far */
  summary?: string;
  /** Called when the user clicks ×. Parent can use this to clear/hide. */
  onDismiss?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREVIEW_LENGTH = 80;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ─── ConversationSummaryBanner ────────────────────────────────────────────────

export default function ConversationSummaryBanner({
  messages,
  summary,
  onDismiss,
}: ConversationSummaryBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const panelId = useId();

  // Measure real content height for smooth CSS transition
  useEffect(() => {
    if (bodyRef.current) {
      setBodyHeight(bodyRef.current.scrollHeight);
    }
  }, [summary, expanded]);

  // Don't render unless threshold met, summary exists, and not dismissed
  const shouldRender =
    messages.length >= 10 && !!summary && !dismissed;

  if (!shouldRender) return null;

  const isLong = summary.length > PREVIEW_LENGTH;
  const previewText = isLong ? truncate(summary, PREVIEW_LENGTH) : summary;

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  function handleDismiss(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      role="region"
      aria-label="Conversation summary"
      style={{
        width: '100%',
        background: T.bgGlass,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(124,91,246,0.20)`,
        overflow: 'hidden',
      }}
    >
      {/* ── Header bar (always visible) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: '40px',
          padding: '0 14px',
          gap: '8px',
          boxSizing: 'border-box',
        }}
      >
        {/* Sparkles icon */}
        <Sparkles
          aria-hidden="true"
          style={{
            width: '14px',
            height: '14px',
            color: T.purple,
            flexShrink: 0,
          }}
        />

        {/* Label + preview text — clicking this row toggles expand */}
        <button
          onClick={isLong ? handleToggle : undefined}
          aria-expanded={isLong ? expanded : undefined}
          aria-controls={isLong ? panelId : undefined}
          disabled={!isLong}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            padding: '10px 0',
            cursor: isLong ? 'pointer' : 'default',
            textAlign: 'left',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: T.purple,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            TL;DR
          </span>

          <span
            style={{
              fontSize: '12px',
              lineHeight: '1.45',
              color: T.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: expanded ? 'normal' : 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {expanded ? summary : previewText}
          </span>
        </button>

        {/* Chevron — only shown when summary is long enough to expand */}
        {isLong && (
          <ChevronDown
            aria-hidden="true"
            style={{
              width: '14px',
              height: '14px',
              color: T.textDim,
              flexShrink: 0,
              transition: 'transform 0.22s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Dismiss × */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss conversation summary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            flexShrink: 0,
            background: 'none',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: T.textDim,
            padding: 0,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = T.textPrimary;
            el.style.background = `rgba(237,237,245,0.08)`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = T.textDim;
            el.style.background = 'none';
          }}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>

      {/* ── Expandable full summary panel ── */}
      {isLong && (
        <div
          id={panelId}
          ref={bodyRef}
          aria-hidden={!expanded}
          style={{
            maxHeight: expanded ? `${bodyHeight}px` : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease',
          }}
        >
          <div
            style={{
              padding: '0 14px 12px 38px', // indent aligns with text after icon
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                lineHeight: '1.6',
                color: T.textMuted,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
