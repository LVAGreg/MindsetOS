'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import type { RecentMemory } from '../../lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMemoryHeaderProps {
  recentMemories: RecentMemory[];
  totalMemoryCount?: number;
  onViewAllMemories?: () => void;
}

// ─── ImportanceDots ───────────────────────────────────────────────────────────

function ImportanceDots({ score }: { score: number }) {
  // score is 0.0–1.0; map to 0–5 filled dots
  const filled = Math.min(5, Math.max(0, Math.round(score * 5)));

  return (
    <div
      role="img"
      aria-label={`Importance: ${filled} out of 5`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: i < filled ? '#4f6ef7' : '#1e1e30',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  );
}

// ─── MemoryCard ───────────────────────────────────────────────────────────────

function MemoryCard({ memory }: { memory: RecentMemory }) {
  const preview =
    memory.content.length > 80
      ? memory.content.slice(0, 80).trimEnd() + '…'
      : memory.content;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px 10px',
        borderRadius: '8px',
        background: 'rgba(79,110,247,0.06)',
        border: '1px solid rgba(79,110,247,0.12)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          lineHeight: '1.45',
          color: '#9090a8',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        {preview}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: '#5a5a72',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {memory.memory_type}
        </span>
        <ImportanceDots score={memory.importance_score} />
      </div>
    </div>
  );
}

// ─── ChatMemoryHeader ─────────────────────────────────────────────────────────

export default function ChatMemoryHeader({
  recentMemories,
  totalMemoryCount,
  onViewAllMemories,
}: ChatMemoryHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const expandRef = useRef<HTMLDivElement>(null);
  const [expandedHeight, setExpandedHeight] = useState<number>(0);

  // Measure real content height for smooth animation
  useEffect(() => {
    if (expandRef.current) {
      setExpandedHeight(expandRef.current.scrollHeight);
    }
  }, [recentMemories, expanded]);

  // Don't render at all when there's nothing to show
  if (recentMemories.length === 0) return null;

  const count = recentMemories.length;
  const lastThree = recentMemories.slice(-3).reverse(); // most-recent first

  const viewAllLabel =
    totalMemoryCount != null && totalMemoryCount > count
      ? `View all ${totalMemoryCount} →`
      : 'View all →';

  function handleBarClick() {
    setExpanded((prev) => !prev);
  }

  function handleViewAll(e: React.MouseEvent) {
    e.stopPropagation(); // don't toggle expand
    onViewAllMemories?.();
  }

  return (
    <div
      role="region"
      aria-label="Session memory activity"
      style={{
        width: '100%',
        background: 'rgba(79,110,247,0.06)',
        borderBottom: '1px solid rgba(79,110,247,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* ── Slim bar (always visible when memories exist) ── */}
      <button
        onClick={handleBarClick}
        aria-expanded={expanded}
        aria-controls="chat-memory-expanded"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: '40px',
          padding: '0 14px',
          gap: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Left: brain + label */}
        <Brain
          aria-hidden="true"
          style={{ width: '14px', height: '14px', color: '#4f6ef7', flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            fontSize: '12px',
            color: '#9090a8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ color: '#4f6ef7', fontWeight: 600 }}>{count}</span>{' '}
          {count === 1 ? 'memory' : 'memories'} updated this session
        </span>

        {/* Chevron expand indicator */}
        <ChevronRight
          aria-hidden="true"
          style={{
            width: '14px',
            height: '14px',
            color: '#5a5a72',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />

        {/* Right: View all button */}
        <button
          onClick={handleViewAll}
          aria-label="View recent memories"
          style={{
            flexShrink: 0,
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#4f6ef7',
            background: 'rgba(79,110,247,0.10)',
            border: '1px solid rgba(79,110,247,0.20)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'rgba(79,110,247,0.18)';
            el.style.borderColor = 'rgba(79,110,247,0.35)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'rgba(79,110,247,0.10)';
            el.style.borderColor = 'rgba(79,110,247,0.20)';
          }}
        >
          {viewAllLabel}
        </button>
      </button>

      {/* ── Expandable cards panel ── */}
      <div
        id="chat-memory-expanded"
        ref={expandRef}
        aria-hidden={!expanded}
        style={{
          maxHeight: expanded ? `${expandedHeight}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '0 14px 12px',
          }}
        >
          {lastThree.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      </div>
    </div>
  );
}
