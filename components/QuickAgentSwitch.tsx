'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, X, Clock, Zap } from 'lucide-react';
import { MINDSET_AGENTS, useAppStore, type AgentId, type Conversation } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';

// Hex color map — mirrors ChatWindow.tsx AGENT_HEX
const AGENT_HEX: Record<string, string> = {
  'mindset-score': '#fcc824',
  'reset-guide': '#0ea5e9',
  'architecture-coach': '#7c3aed',
  'practice-builder': '#10b981',
  'story-excavator': '#ea580c',
  'launch-companion': '#475569',
  'accountability-partner': '#16a34a',
  'conversation-curator': '#14b8a6',
  'decision-framework': '#2563eb',
  'inner-world-mapper': '#ec4899',
  'goal-architect': '#fcc824',
  'belief-debugger': '#9333ea',
  'morning-ritual-builder': '#f43f5e',
  'energy-optimizer': '#84cc16',
  'fear-processor': '#dc2626',
  'relationship-architect': '#06b6d4',
  'focus-trainer': '#6366f1',
  'values-clarifier': '#c026d3',
  'transformation-tracker': '#22c55e',
  'content-architect': '#f97316',
};

function getAgentHex(agentId: string, accentColor?: string): string {
  return AGENT_HEX[agentId] || accentColor || '#6366f1';
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function truncate(str: string, max: number): string {
  if (!str) return 'Untitled';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DisplayAgent {
  id: string;
  name: string;
  description?: string;
  accent_color?: string;
  locked?: boolean;
  _key?: string;
}

type PaletteItemKind = 'agent' | 'conversation' | 'quick-start';

interface AgentItem {
  kind: 'agent';
  id: string;
  agentId: string;
  name: string;
  description?: string;
  accentColor: string;
  agentKey: string;
}

interface ConversationItem {
  kind: 'conversation';
  id: string;
  conversationId: string;
  agentId: string;
  title: string;
  updatedAt: Date | string;
  accentColor: string;
}

interface QuickStartItem {
  kind: 'quick-start';
  id: string;
  agentId: string;
  name: string;
  accentColor: string;
  agentKey: string;
  convCount: number;
}

type PaletteItem = AgentItem | ConversationItem | QuickStartItem;

// ─── Props ───────────────────────────────────────────────────────────────────

interface QuickAgentSwitchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentKey: string) => void;
  displayAgents?: DisplayAgent[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuickAgentSwitch({
  isOpen,
  onClose,
  onSelect,
  displayAgents = [],
}: QuickAgentSwitchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Store access for conversations and actions
  const conversations = useAppStore(s => s.conversations);
  const setCurrentConversation = useAppStore(s => s.setCurrentConversation);
  const setCurrentAgent = useAppStore(s => s.setCurrentAgent);

  // ── Build agent list ──────────────────────────────────────────────────────

  const allAgents: AgentItem[] = useMemo(() => {
    const source: DisplayAgent[] = displayAgents.length > 0
      ? displayAgents.filter(a => !a.locked)
      : Object.entries(MINDSET_AGENTS).map(([key, agent]) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          accent_color: '#fcc824',
          _key: key,
        }));

    return source.map(agent => {
      const agentKey = agent._key
        || Object.keys(MINDSET_AGENTS).find(
            k => MINDSET_AGENTS[k as AgentId].id === agent.id
          )
        || agent.id.toUpperCase().replace(/-/g, '_');

      return {
        kind: 'agent' as const,
        id: `agent-${agent.id}`,
        agentId: agent.id,
        name: agent.name,
        description: agent.description,
        accentColor: getAgentHex(agent.id, agent.accent_color),
        agentKey,
      };
    });
  }, [displayAgents]);

  // ── Build recent conversations (last 5) ───────────────────────────────────

  const recentConversations: ConversationItem[] = useMemo(() => {
    return Object.values(conversations)
      .filter((c: Conversation) => !c.isArchived)
      .sort((a: Conversation, b: Conversation) => {
        const ta = new Date(a.updatedAt).getTime();
        const tb = new Date(b.updatedAt).getTime();
        return tb - ta;
      })
      .slice(0, 5)
      .map((c: Conversation) => ({
        kind: 'conversation' as const,
        id: `conv-${c.id}`,
        conversationId: c.id,
        agentId: c.agentId,
        title: c.title || 'Untitled conversation',
        updatedAt: c.updatedAt,
        accentColor: getAgentHex(c.agentId),
      }));
  }, [conversations]);

  // ── Build quick-start agents (top 3 by conversation count) ───────────────

  const quickStartAgents: QuickStartItem[] = useMemo(() => {
    // Count conversations per agentId
    const counts: Record<string, number> = {};
    Object.values(conversations).forEach((c: Conversation) => {
      counts[c.agentId] = (counts[c.agentId] || 0) + 1;
    });

    // Sort allAgents by conversation count desc, take top 3
    return [...allAgents]
      .sort((a, b) => (counts[b.agentId] || 0) - (counts[a.agentId] || 0))
      .slice(0, 3)
      .map(agent => ({
        kind: 'quick-start' as const,
        id: `qs-${agent.agentId}`,
        agentId: agent.agentId,
        name: agent.name,
        accentColor: agent.accentColor,
        agentKey: agent.agentKey,
        convCount: counts[agent.agentId] || 0,
      }));
  }, [allAgents, conversations]);

  // ── Filter sections based on query ───────────────────────────────────────

  const filteredAgents: AgentItem[] = useMemo(() => {
    if (!query) return allAgents;
    const q = query.toLowerCase();
    return allAgents.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q),
    );
  }, [allAgents, query]);

  const filteredConversations: ConversationItem[] = useMemo(() => {
    if (!query) return recentConversations;
    const q = query.toLowerCase();
    return recentConversations.filter(c =>
      c.title.toLowerCase().includes(q),
    );
  }, [recentConversations, query]);

  // Quick-start section only visible when no query
  const showQuickStart = query.trim() === '' && quickStartAgents.length > 0;
  const showConversations = filteredConversations.length > 0;
  const showAgents = filteredAgents.length > 0;

  // ── Flatten items for keyboard nav ───────────────────────────────────────

  const flatItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];
    if (showAgents) items.push(...filteredAgents);
    if (showConversations) items.push(...filteredConversations);
    if (showQuickStart) items.push(...quickStartAgents);
    return items;
  }, [filteredAgents, filteredConversations, quickStartAgents, showAgents, showConversations, showQuickStart]);

  // ── Reset on open ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) handleItemSelect(item);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flatItems, selectedIndex]);

  // ── Scroll selected into view ────────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-palette-index="${selectedIndex}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Item selection handlers ──────────────────────────────────────────────

  function handleItemSelect(item: PaletteItem) {
    if (item.kind === 'agent') {
      onSelect(item.agentKey);
      onClose();
    } else if (item.kind === 'conversation') {
      // Find agent key from agentId
      const agentKey = Object.keys(MINDSET_AGENTS).find(
        k => MINDSET_AGENTS[k as AgentId].id === item.agentId,
      ) || (item.agentId.toUpperCase().replace(/-/g, '_') as AgentId);

      setCurrentAgent(agentKey as AgentId);
      setCurrentConversation(item.conversationId);
      onClose();
    } else {
      // quick-start
      onSelect(item.agentKey);
      onClose();
    }
  }

  // ── Flat index for an item ────────────────────────────────────────────────

  function getItemFlatIndex(kind: PaletteItemKind, localIndex: number): number {
    if (kind === 'agent') return localIndex;
    if (kind === 'conversation') {
      return (showAgents ? filteredAgents.length : 0) + localIndex;
    }
    // quick-start
    return (showAgents ? filteredAgents.length : 0)
      + (showConversations ? filteredConversations.length : 0)
      + localIndex;
  }

  if (!isOpen) return null;

  const isEmpty = flatItems.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: '#12121f',
          border: '1px solid #1e1e30',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid #1e1e30' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#9090a8' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agents or conversations…"
            className="flex-1 bg-transparent text-sm outline-none placeholder-[#9090a8]"
            style={{ color: '#ededf5' }}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="overflow-y-auto custom-scrollbar"
          style={{ maxHeight: '26rem' }}
        >
          {isEmpty && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#9090a8' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* ── AGENTS section ── */}
          {showAgents && (
            <div className="py-1.5">
              <SectionLabel>Agents</SectionLabel>
              {filteredAgents.map((agent, i) => {
                const flatIdx = getItemFlatIndex('agent', i);
                const isSelected = flatIdx === selectedIndex;
                return (
                  <PaletteRow
                    key={agent.id}
                    flatIndex={flatIdx}
                    isSelected={isSelected}
                    onClick={() => handleItemSelect(agent)}
                  >
                    <AgentDot color={agent.accentColor} agentId={agent.agentId} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: agent.accentColor }}
                        />
                        <span className="text-sm font-semibold truncate" style={{ color: '#ededf5' }}>
                          {agent.name}
                        </span>
                      </div>
                      {agent.description && (
                        <p className="text-xs truncate mt-0.5" style={{ color: '#9090a8' }}>
                          {agent.description}
                        </p>
                      )}
                    </div>
                    {isSelected && <HintBadge>Enter ↵</HintBadge>}
                  </PaletteRow>
                );
              })}
            </div>
          )}

          {/* ── RECENT CONVERSATIONS section ── */}
          {showConversations && (
            <div className={showAgents ? 'pb-1.5' : 'py-1.5'} style={showAgents ? { borderTop: '1px solid #1e1e30', paddingTop: '0.375rem' } : {}}>
              <SectionLabel icon={<Clock className="w-3 h-3" />}>Recent Conversations</SectionLabel>
              {filteredConversations.map((conv, i) => {
                const flatIdx = getItemFlatIndex('conversation', i);
                const isSelected = flatIdx === selectedIndex;
                return (
                  <PaletteRow
                    key={conv.id}
                    flatIndex={flatIdx}
                    isSelected={isSelected}
                    onClick={() => handleItemSelect(conv)}
                  >
                    {/* Colored dot — no icon needed, keep it compact */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 ml-1 mr-1"
                      style={{ backgroundColor: conv.accentColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block" style={{ color: '#ededf5' }}>
                        {truncate(conv.title, 40)}
                      </span>
                    </div>
                    <span
                      className="text-[11px] flex-shrink-0 ml-2 tabular-nums"
                      style={{ color: '#5a5a72' }}
                    >
                      {relativeTime(conv.updatedAt)}
                    </span>
                    {isSelected && <HintBadge>Enter ↵</HintBadge>}
                  </PaletteRow>
                );
              })}
            </div>
          )}

          {/* ── QUICK START section ── */}
          {showQuickStart && (
            <div
              className="pb-1.5"
              style={{
                borderTop: (showAgents || showConversations) ? '1px solid #1e1e30' : 'none',
                paddingTop: (showAgents || showConversations) ? '0.375rem' : '0.375rem',
              }}
            >
              <SectionLabel icon={<Zap className="w-3 h-3" />}>Quick Start</SectionLabel>
              {quickStartAgents.map((qs, i) => {
                const flatIdx = getItemFlatIndex('quick-start', i);
                const isSelected = flatIdx === selectedIndex;
                return (
                  <PaletteRow
                    key={qs.id}
                    flatIndex={flatIdx}
                    isSelected={isSelected}
                    onClick={() => handleItemSelect(qs)}
                  >
                    <AgentDot color={qs.accentColor} agentId={qs.agentId} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block" style={{ color: '#ededf5' }}>
                        {qs.name}
                      </span>
                      <span className="text-xs" style={{ color: '#5a5a72' }}>
                        {qs.convCount} conversation{qs.convCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {isSelected && <HintBadge>Enter ↵</HintBadge>}
                  </PaletteRow>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 flex items-center gap-4"
          style={{
            borderTop: '1px solid #1e1e30',
            fontSize: '10px',
            color: '#9090a8',
          }}
        >
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Select</span>
          <span><kbd className="font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-4 py-1"
      style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#5a5a72', textTransform: 'uppercase' }}
    >
      {icon}
      {children}
    </div>
  );
}

function PaletteRow({
  flatIndex,
  isSelected,
  onClick,
  children,
}: {
  flatIndex: number;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-palette-index={flatIndex}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{
        background: isSelected ? 'rgba(252,200,36,0.07)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

function AgentDot({ color, agentId }: { color: string; agentId: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{
        background: `${color}18`,
        border: `1.5px solid ${color}30`,
      }}
    >
      <AgentIcon
        agentId={agentId}
        className="w-4 h-4"
        style={{ color }}
      />
    </div>
  );
}

function HintBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] flex-shrink-0 hidden sm:block"
      style={{ color: '#9090a8' }}
    >
      {children}
    </span>
  );
}
