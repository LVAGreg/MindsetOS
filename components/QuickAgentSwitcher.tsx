'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { MINDSET_AGENTS, AgentId } from '../lib/store';
import { AgentIcon } from '@/lib/agent-icons';

interface QuickAgentSwitcherProps {
  currentAgentId: AgentId | null;
  onAgentChange: (agentId: AgentId) => void;
}

export function QuickAgentSwitcher({ currentAgentId, onAgentChange }: QuickAgentSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter to only show the 6 core MindsetOS agents (exclude GENERAL and CLIENT_ONBOARDING)
  const agentSequence = [
    'money-model-maker',
    'fast-fix-finder',
    'offer-promo-printer',
    'promo-planner',
    'qualification-call-builder',
    'linkedin-events-builder-buddy',
    'five-ones-formula',
    'authority-content-engine',
    'daily-lead-sequence',
    'easy-event-architect',
    'profile-power-up'
  ];

  const filteredAgents = Object.values(MINDSET_AGENTS).filter(agent =>
    agentSequence.includes(agent.id)
  );

  const currentAgent = currentAgentId ? MINDSET_AGENTS[currentAgentId.toUpperCase().replace(/-/g, '_') as keyof typeof MINDSET_AGENTS] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAgentClick = (agentId: AgentId) => {
    onAgentChange(agentId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors shadow-sm"
      >
        {currentAgent ? (
          <>
            <AgentIcon agentId={currentAgent.id} className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {currentAgent.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Click to switch agent
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Select an agent
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-3 py-2">
              Switch Agent
            </div>
            <div className="space-y-1">
              {filteredAgents.map((agent) => {
                const agentKey = Object.keys(MINDSET_AGENTS).find(
                  key => MINDSET_AGENTS[key as keyof typeof MINDSET_AGENTS].id === agent.id
                ) as keyof typeof MINDSET_AGENTS;

                const isActive = currentAgentId === agentKey;

                return (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentClick(agentKey)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <AgentIcon agentId={agent.id} className="w-8 h-8 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          isActive
                            ? 'text-indigo-900 dark:text-indigo-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {agent.name}
                        </span>
                        {isActive && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs ${
                        isActive
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {agent.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
