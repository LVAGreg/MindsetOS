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
  const canSeeMemory = effectiveUser?.role === 'power_user' || effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin';

  const categories = memorySettings?.categories || { profile: true, knowledge: true, history: true, brandVoice: true };
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
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        title="Memory is off — click to enable"
      >
        <Brain className="w-3.5 h-3.5" />
        <span>Off</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors ${
          activeCount === totalCount
            ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        }`}
        title={`Memory: ${activeCount}/${totalCount} categories active`}
      >
        <Brain className="w-3.5 h-3.5" />
        <span>{activeCount}/{totalCount}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Memory Context</span>
            </div>
            <button
              onClick={() => {
                setMemorySettings({ masterEnabled: false });
                setOpen(false);
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Turn off
            </button>
          </div>

          {/* Categories */}
          <div className="p-2 space-y-1">
            {CATEGORIES.map(({ key, label, description, icon: Icon }) => {
              const enabled = categories[key];
              return (
                <button
                  key={key}
                  onClick={() => setMemoryCategory(key, !enabled)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    enabled
                      ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 opacity-60'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${enabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                      {label}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{description}</div>
                  </div>
                  <div className={`w-8 h-5 rounded-full flex items-center transition-colors ${
                    enabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                  }`}>
                    <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Controls what the AI knows about you. Agent knowledge (RAG) always loads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
