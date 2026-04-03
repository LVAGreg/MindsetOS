'use client';

import { useState, useRef } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { createArtifact, API_URL } from '@/lib/api-client';

// ── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
  amber: '#fcc824',
  amberBg: 'rgba(252,200,36,0.15)',
  amberBorder: '#fcc824',
  errorText: '#ef4444',
  mutedText: '#6b7280',
  successText: '#10b981',
  transparent: 'transparent',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────
type ReactionType = 'insight' | 'powerful' | 'actionable' | 'confused';

interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
}

const REACTIONS: Reaction[] = [
  { type: 'insight',    emoji: '💡', label: 'Insight'    },
  { type: 'powerful',  emoji: '🔥', label: 'Powerful'   },
  { type: 'actionable',emoji: '✅', label: 'Actionable' },
  { type: 'confused',  emoji: '🤔', label: 'Confused'   },
];

export interface MessageReactionsAndSaveProps {
  messageId: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  content: string;
  existingReaction?: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MessageReactionsAndSave({
  messageId,
  conversationId,
  agentId,
  agentName,
  content,
  existingReaction = null,
}: MessageReactionsAndSaveProps) {
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(
    (existingReaction as ReactionType) ?? null,
  );
  const [reactionError, setReactionError] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reaction handler ───────────────────────────────────────────────────────
  const handleReaction = async (type: ReactionType) => {
    const isToggleOff = activeReaction === type;
    const next: ReactionType | null = isToggleOff ? null : type;

    // Optimistic update
    setActiveReaction(next);
    setReactionError(false);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;

      if (next) {
        const res = await fetch(`${API_URL}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messageId,
            conversationId,
            agentId,
            feedbackType: next,
          }),
        });
        if (!res.ok) throw new Error(`POST /api/feedback ${res.status}`);
      } else {
        const token2 =
          typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;
        const res = await fetch(`${API_URL}/api/feedback/${messageId}`, {
          method: 'DELETE',
          headers: {
            ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`DELETE /api/feedback/${messageId} ${res.status}`);
      }
    } catch {
      // Revert optimistic update and surface error briefly
      setActiveReaction(activeReaction);
      setReactionError(true);
      clearTimeout(errorTimerRef.current ?? undefined);
      errorTimerRef.current = setTimeout(() => setReactionError(false), 2000);
    }
  };

  // ── Save to Playbook handler ───────────────────────────────────────────────
  const handleSave = async () => {
    if (saved) return; // Already saved — icon is BookmarkCheck; let user see it
    setSaveError(false);

    try {
      const trimmedTitle = content.slice(0, 60).trimEnd();
      await createArtifact({
        conversation_id: conversationId,
        message_id: messageId,
        agent_id: agentId,
        type: 'document',
        title: trimmedTitle,
        content,
      });

      setSaved(true);
      clearTimeout(savedTimerRef.current ?? undefined);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError(true);
      clearTimeout(errorTimerRef.current ?? undefined);
      errorTimerRef.current = setTimeout(() => setSaveError(false), 2000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'nowrap',
      }}
      role="toolbar"
      aria-label={`Message reactions for ${agentName}`}
    >
      {/* Reaction buttons */}
      {REACTIONS.map(({ type, emoji, label }) => {
        const isActive = activeReaction === type;
        return (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            aria-label={`React with ${label}`}
            aria-pressed={isActive}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              fontSize: '14px',
              lineHeight: 1,
              border: `1px solid ${isActive ? TOKEN.amberBorder : TOKEN.transparent}`,
              borderRadius: '6px',
              background: isActive ? TOKEN.amberBg : TOKEN.transparent,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {emoji}
          </button>
        );
      })}

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: '1px',
          height: '16px',
          background: 'rgba(107,114,128,0.3)',
          margin: '0 2px',
          flexShrink: 0,
        }}
      />

      {/* Save to Playbook */}
      <button
        onClick={handleSave}
        aria-label="Save to Playbook"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: 'none',
          background: TOKEN.transparent,
          cursor: saved ? 'default' : 'pointer',
          padding: '2px 4px',
          borderRadius: '4px',
          color: saved ? TOKEN.successText : TOKEN.mutedText,
          fontSize: '12px',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
      >
        {saved ? (
          <BookmarkCheck size={16} aria-hidden="true" />
        ) : (
          <Bookmark size={16} aria-hidden="true" />
        )}
        {saved && (
          <span style={{ whiteSpace: 'nowrap' }}>Saved to Playbook</span>
        )}
      </button>

      {/* Inline error messages */}
      {reactionError && (
        <span
          role="alert"
          style={{ fontSize: '11px', color: TOKEN.errorText, flexShrink: 0 }}
        >
          Failed
        </span>
      )}
      {saveError && (
        <span
          role="alert"
          style={{ fontSize: '11px', color: TOKEN.errorText, flexShrink: 0 }}
        >
          Failed
        </span>
      )}
    </div>
  );
}
