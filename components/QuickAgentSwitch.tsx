'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';

interface QuickAgentSwitchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentKey: string) => void;
  displayAgents?: any[];
}

export default function QuickAgentSwitch({ isOpen, onClose, onSelect, displayAgents = [] }: QuickAgentSwitchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build searchable agent list from displayAgents (DB) or fall back to MINDSET_AGENTS
  const allAgents = displayAgents.length > 0
    ? displayAgents.filter(a => !a.locked)
    : Object.entries(MINDSET_AGENTS).map(([key, agent]) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        accent_color: '#fcc824',
        _key: key,
      }));

  const filtered = allAgents.filter(agent => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      (agent.description || '').toLowerCase().includes(q)
    );
  });

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const agent = filtered[selectedIndex];
        if (agent) handleSelect(agent);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (agent: any) => {
    // Resolve agent key: use _key if present (from MINDSET_AGENTS fallback),
    // otherwise find the matching MINDSET_AGENTS key by id, or uppercase the id
    const key = agent._key
      || Object.keys(MINDSET_AGENTS).find(k => MINDSET_AGENTS[k as keyof typeof MINDSET_AGENTS].id === agent.id)
      || agent.id.toUpperCase().replace(/-/g, '_');
    onSelect(key);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[#12121f] border border-[#1e1e30] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e30]">
          <Search className="w-4 h-4 text-[#9090a8] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agents..."
            className="flex-1 bg-transparent text-[#ededf5] placeholder-[#9090a8] text-sm outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4 text-[#9090a8]" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto custom-scrollbar py-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#9090a8] text-sm">
              No agents found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((agent, i) => (
              <button
                key={agent.id}
                data-index={i}
                onClick={() => handleSelect(agent)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-[#fcc824]/10 text-[#ededf5]'
                    : 'hover:bg-white/[0.04] text-[#ededf5]'
                }`}
              >
                {/* Agent icon with color */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${agent.accent_color || '#fcc824'}18`,
                    border: `1.5px solid ${agent.accent_color || '#fcc824'}30`,
                  }}
                >
                  <AgentIcon
                    agentId={agent.id}
                    className="w-4 h-4"
                    style={{ color: agent.accent_color || '#fcc824' }}
                  />
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: agent.accent_color || '#fcc824' }}
                    />
                    <span className="text-sm font-semibold truncate">{agent.name}</span>
                  </div>
                  {agent.description && (
                    <p className="text-xs text-[#9090a8] truncate mt-0.5">{agent.description}</p>
                  )}
                </div>

                {/* Active indicator */}
                {i === selectedIndex && (
                  <span className="text-[10px] text-[#9090a8] flex-shrink-0 hidden sm:block">Enter ↵</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-[#1e1e30] flex items-center gap-4 text-[10px] text-[#9090a8]">
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Select</span>
          <span><kbd className="font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
