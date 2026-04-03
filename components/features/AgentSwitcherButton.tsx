'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentOption {
  slug: string;
  name: string;
  color: string; // hex color for the dot, e.g. "#f59e0b"
}

interface AgentSwitcherButtonProps {
  currentAgentSlug: string;
  currentAgentName: string;
  agents: AgentOption[];
  onSwitch: (slug: string) => void;
  disabled?: boolean;
}

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Only these 9 tokens are permitted — zero Tailwind color classes.

const T = {
  bg:         '#09090f',
  bgPanel:    'rgba(18,18,31,0.8)',
  surface:    '#1e1e30',
  textPrimary:'#ededf5',
  textMuted:  '#9090a8',
  textDim:    '#5a5a72',
  accent:     '#4f6ef7',
  gold:       '#fcc824',
  purple:     '#7c5bf6',
  dropdownBg: 'rgba(18,18,31,0.95)',
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function AgentSwitcherButton({
  currentAgentSlug,
  currentAgentName,
  agents,
  onSwitch,
  disabled = false,
}: AgentSwitcherButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out the current agent from the dropdown list
  const otherAgents = agents.filter((a) => a.slug !== currentAgentSlug);

  // Close on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open, handleOutsideClick]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (slug: string) => {
    if (disabled) return;
    setOpen(false);
    if (slug !== currentAgentSlug) {
      onSwitch(slug);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* ── Pill trigger button ── */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={`Switch agent — currently ${currentAgentName}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px 5px 8px',
          borderRadius: '999px',
          border: `1px solid ${disabled ? T.textDim : T.surface}`,
          background: disabled ? 'transparent' : T.bgPanel,
          color: disabled ? T.textDim : T.textMuted,
          fontSize: '12px',
          fontWeight: 500,
          lineHeight: 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.15s, color 0.15s, background 0.15s',
          outline: 'none',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.textDim;
            (e.currentTarget as HTMLButtonElement).style.color = T.textPrimary;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.surface;
            (e.currentTarget as HTMLButtonElement).style.color = T.textMuted;
          }
        }}
      >
        {/* Switch icon — two-arrows glyph via SVG */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ flexShrink: 0, color: disabled ? T.textDim : T.accent }}
        >
          <path
            d="M1 3.5h8M7 1.5l2 2-2 2M11 8.5H3M5 6.5l-2 2 2 2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentAgentName}
        </span>

        <ChevronDown
          size={12}
          aria-hidden
          style={{
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && otherAgents.length > 0 && (
        <div
          role="listbox"
          aria-label="Select an agent"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            minWidth: '200px',
            maxHeight: '260px',
            overflowY: 'auto',
            borderRadius: '10px',
            border: `1px solid ${T.surface}`,
            background: T.dropdownBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            padding: '6px',
          }}
        >
          {/* Header label */}
          <div
            style={{
              padding: '4px 8px 6px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: T.textDim,
              userSelect: 'none',
            }}
          >
            Switch Agent
          </div>

          {otherAgents.map((agent) => (
            <AgentRow
              key={agent.slug}
              agent={agent}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Empty state when all agents are current or list is empty */}
      {open && otherAgents.length === 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            minWidth: '180px',
            borderRadius: '10px',
            border: `1px solid ${T.surface}`,
            background: T.dropdownBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            padding: '12px 16px',
            fontSize: '12px',
            color: T.textDim,
          }}
        >
          No other agents available
        </div>
      )}
    </div>
  );
}

// ─── AgentRow sub-component ──────────────────────────────────────────────────

interface AgentRowProps {
  agent: AgentOption;
  onSelect: (slug: string) => void;
}

function AgentRow({ agent, onSelect }: AgentRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="option"
      aria-selected={false}
      tabIndex={0}
      onClick={() => onSelect(agent.slug)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(agent.slug);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '7px',
        cursor: 'pointer',
        background: hovered ? T.surface : 'transparent',
        transition: 'background 0.12s',
        outline: 'none',
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Colored dot */}
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: agent.color,
          boxShadow: `0 0 6px ${agent.color}66`,
        }}
      />

      {/* Agent name */}
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 450,
          color: hovered ? T.textPrimary : T.textMuted,
          transition: 'color 0.12s',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {agent.name}
      </span>

      {/* Arrow hint on hover */}
      {hovered && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          style={{ flexShrink: 0, color: T.textDim }}
        >
          <path
            d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export default AgentSwitcherButton;
