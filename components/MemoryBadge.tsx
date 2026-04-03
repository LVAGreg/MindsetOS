'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, User, FileText, MessageSquare, Palette, ChevronDown } from 'lucide-react';
import { useAppStore } from '../lib/store';
import type { MemoryCategories } from '../lib/store';

const CATEGORIES: {
  key: keyof MemoryCategories;
  label: string;
  description: string;
  icon: typeof Brain;
}[] = [
  { key: 'profile', label: 'My Profile', description: 'Name, company, clients, outcomes', icon: User },
  { key: 'knowledge', label: 'My Knowledge', description: 'Uploaded documents & content', icon: FileText },
  { key: 'history', label: 'Conversation History', description: 'Past insights & agent work', icon: MessageSquare },
  { key: 'brandVoice', label: 'Brand Voice', description: 'Your writing style & tone', icon: Palette },
];

export function MemoryBadge() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, viewAsUser, memorySettings, setMemoryCategory, setMemorySettings } = useAppStore();

  // Only show for power_user, agency, and admin roles
  const effectiveUser = viewAsUser || user;
  const canSeeMemory =
    effectiveUser?.role === 'power_user' ||
    effectiveUser?.role === 'agency' ||
    effectiveUser?.role === 'admin';

  const categories = memorySettings?.categories || {
    profile: true,
    knowledge: true,
    history: true,
    brandVoice: true,
  };
  const activeCount = Object.values(categories).filter(Boolean).length;
  const totalCount = CATEGORIES.length;

  // Close dropdown on outside click — must be called before any early returns (React rules of hooks)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!canSeeMemory) return null;

  if (!memorySettings?.masterEnabled) {
    return (
      <button
        onClick={() => setMemorySettings({ masterEnabled: true })}
        aria-label="Memory is off — click to enable"
        title="Memory is off — click to enable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          fontSize: '12px',
          color: '#5a5a72',
          background: 'none',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#ededf5';
          (e.currentTarget as HTMLElement).style.background = 'rgba(237,237,245,0.06)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#5a5a72';
          (e.currentTarget as HTMLElement).style.background = 'none';
        }}
      >
        <Brain style={{ width: '14px', height: '14px' }} />
        <span>Off</span>
      </button>
    );
  }

  const allActive = activeCount === totalCount;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Memory: ${activeCount}/${totalCount} categories active`}
        title={`Memory: ${activeCount}/${totalCount} categories active`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          fontSize: '12px',
          color: allActive ? '#4f6ef7' : '#fcc824',
          background: allActive
            ? 'rgba(79,110,247,0.08)'
            : 'rgba(252,200,36,0.08)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = allActive
            ? 'rgba(79,110,247,0.15)'
            : 'rgba(252,200,36,0.15)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = allActive
            ? 'rgba(79,110,247,0.08)'
            : 'rgba(252,200,36,0.08)';
        }}
      >
        <Brain style={{ width: '14px', height: '14px' }} />
        <span>{activeCount}/{totalCount}</span>
        <ChevronDown
          style={{
            width: '12px',
            height: '12px',
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '8px',
            width: '288px',
            background: 'rgba(18,18,31,0.97)',
            border: '1px solid #1e1e30',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #1e1e30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain style={{ width: '16px', height: '16px', color: '#4f6ef7' }} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ededf5',
                }}
              >
                Memory Context
              </span>
            </div>
            <button
              onClick={() => {
                setMemorySettings({ masterEnabled: false });
                setOpen(false);
              }}
              aria-label="Turn off memory"
              style={{
                fontSize: '12px',
                color: '#5a5a72',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.15s',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#5a5a72';
              }}
            >
              Turn off
            </button>
          </div>

          {/* Categories */}
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {CATEGORIES.map(({ key, label, description, icon: Icon }) => {
              const enabled = categories[key];
              return (
                <button
                  key={key}
                  onClick={() => setMemoryCategory(key, !enabled)}
                  aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    background: enabled ? 'rgba(79,110,247,0.10)' : 'rgba(237,237,245,0.03)',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: enabled ? 1 : 0.55,
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = enabled
                      ? 'rgba(79,110,247,0.18)'
                      : 'rgba(237,237,245,0.07)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = enabled
                      ? 'rgba(79,110,247,0.10)'
                      : 'rgba(237,237,245,0.03)';
                  }}
                >
                  <Icon
                    style={{
                      width: '16px',
                      height: '16px',
                      flexShrink: 0,
                      color: enabled ? '#4f6ef7' : '#5a5a72',
                    }}
                    aria-hidden="true"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: enabled ? '#ededf5' : '#9090a8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#5a5a72',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {description}
                    </div>
                  </div>
                  {/* Toggle pill */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: '32px',
                      height: '20px',
                      borderRadius: '10px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: enabled ? 'flex-end' : 'flex-start',
                      background: enabled ? '#4f6ef7' : '#1e1e30',
                      transition: 'background 0.2s',
                      padding: '0 2px',
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        background: '#ededf5',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid #1e1e30',
            }}
          >
            <p style={{ fontSize: '10px', color: '#5a5a72', margin: 0 }}>
              Controls what the AI knows about you. Agent knowledge (RAG) always loads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
