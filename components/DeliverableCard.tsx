'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { copyDeliverable, formatContentPreview, CopyFormat } from '../utils/clipboard';

interface DeliverableCardProps {
  title: string;
  content: any;
  agentId: string;
  timestamp: Date;
  icon?: string;
}

// Agent accent colors — using design tokens only
const AGENT_ACCENT: Record<string, { border: string; bg: string; text: string }> = {
  'mindset-score':        { border: '#0d9488', bg: 'rgba(13,148,136,0.12)',  text: '#2dd4bf' },
  'reset-guide':          { border: '#4f6ef7', bg: 'rgba(79,110,247,0.12)',  text: '#818cf8' },
  'architecture-coach':   { border: '#fcc824', bg: 'rgba(252,200,36,0.12)',  text: '#fcc824' },
  'inner-world-mapper':   { border: '#7c5bf6', bg: 'rgba(124,91,246,0.12)', text: '#a78bfa' },
  'accountability-partner':{ border: '#22c55e', bg: 'rgba(34,197,94,0.12)', text: '#4ade80' },
  'practice-builder':     { border: '#ef4444', bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  'story-excavator':      { border: '#7c5bf6', bg: 'rgba(124,91,246,0.12)', text: '#a78bfa' },
};

const DEFAULT_ACCENT = { border: '#1e1e30', bg: 'rgba(18,18,31,0.8)', text: '#9090a8' };

export function DeliverableCard({ title, content, agentId, timestamp, icon }: DeliverableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{
    text: 'idle' | 'copied' | 'error';
    json: 'idle' | 'copied' | 'error';
    markdown: 'idle' | 'copied' | 'error';
  }>({
    text: 'idle',
    json: 'idle',
    markdown: 'idle',
  });

  const handleCopy = async (format: CopyFormat) => {
    try {
      const success = await copyDeliverable(
        {
          title,
          content,
          agentId,
          timestamp,
        },
        format
      );

      if (success) {
        setCopyStatus((prev) => ({ ...prev, [format]: 'copied' }));
        setTimeout(() => {
          setCopyStatus((prev) => ({ ...prev, [format]: 'idle' }));
        }, 2000);
      } else {
        setCopyStatus((prev) => ({ ...prev, [format]: 'error' }));
        setTimeout(() => {
          setCopyStatus((prev) => ({ ...prev, [format]: 'idle' }));
        }, 3000);
      }
    } catch {
      setCopyStatus((prev) => ({ ...prev, [format]: 'error' }));
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [format]: 'idle' }));
      }, 3000);
    }
  };

  const preview = formatContentPreview(content, 150);
  const contentText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const accent = AGENT_ACCENT[agentId] ?? DEFAULT_ACCENT;

  return (
    <div
      style={{
        border: `2px solid ${accent.border}`,
        borderRadius: '0.5rem',
        background: accent.bg,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
            {icon && (
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  marginBottom: '0.25rem',
                  color: '#ededf5',
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#9090a8' }}>
                {timestamp.toLocaleDateString()} at{' '}
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{
              padding: '0.25rem',
              borderRadius: '0.25rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9090a8',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Preview (when collapsed) */}
        {!isExpanded && (
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#9090a8',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {preview}
          </p>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${accent.border}` }}>
          <div style={{ padding: '1rem' }}>
            <pre
              style={{
                fontSize: '0.75rem',
                color: '#ededf5',
                background: 'rgba(9,9,15,0.6)',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: `1px solid ${accent.border}`,
                overflowX: 'auto',
                maxHeight: '20rem',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {contentText}
            </pre>
          </div>
        </div>
      )}

      {/* Copy Buttons Footer */}
      <div
        style={{
          borderTop: `1px solid ${accent.border}`,
          padding: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#5a5a72',
            marginRight: '0.5rem',
          }}
        >
          Copy as:
        </span>

        {(['text', 'json', 'markdown'] as CopyFormat[]).map((fmt) => {
          const status = copyStatus[fmt];
          return (
            <button
              key={fmt}
              onClick={() => handleCopy(fmt)}
              disabled={status !== 'idle'}
              aria-label={`Copy as ${fmt}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${accent.border}`,
                cursor: status !== 'idle' ? 'default' : 'pointer',
                opacity: status !== 'idle' ? 0.6 : 1,
                transition: 'background 0.15s',
                color:
                  status === 'copied'
                    ? '#4ade80'
                    : status === 'error'
                    ? '#f87171'
                    : accent.text,
              }}
              onMouseEnter={(e) => {
                if (status === 'idle') {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              {status === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : status === 'error' ? (
                <>
                  <span style={{ fontSize: '0.75rem' }}>✕</span>
                  <span>Failed</span>
                </>
              ) : (
                <>
                  {fmt === 'json' ? (
                    <Copy className="w-3.5 h-3.5" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span style={{ textTransform: 'capitalize' }}>{fmt}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
