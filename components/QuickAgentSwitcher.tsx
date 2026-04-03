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

  // Filter to only show the core MindsetOS agents (exclude GENERAL and CLIENT_ONBOARDING)
  const agentSequence = [
    'mindset-score',
    'reset-guide',
    'architecture-coach',
    'inner-world-mapper',
    'practice-builder',
    'decision-framework',
    'accountability-partner',
    'story-excavator',
    'conversation-curator',
    'launch-companion',
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
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm"
        style={{
          background: '#12121f',
          border: '1px solid #1e1e30',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f6ef7')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e30')}
      >
        {currentAgent ? (
          <>
            <AgentIcon agentId={currentAgent.id} className="w-8 h-8 flex-shrink-0" style={{ color: '#9090a8' }} />
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                {currentAgent.name}
              </span>
              <span className="text-xs" style={{ color: '#9090a8' }}>
                Click to switch agent
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: '#5a5a72' }}
            />
          </>
        ) : (
          <>
            <span className="text-sm font-medium" style={{ color: '#9090a8' }}>
              Select an agent
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: '#5a5a72' }}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-80 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto backdrop-blur-md"
          style={{
            background: 'rgba(18,18,31,0.95)',
            border: '1px solid #1e1e30',
          }}
        >
          <div className="p-2">
            <div
              className="text-xs font-semibold uppercase tracking-wide px-3 py-2"
              style={{ color: '#5a5a72' }}
            >
              Switch Agent
            </div>
            <div className="space-y-1">
              {filteredAgents.map((agent) => {
                const agentKey = Object.keys(MINDSET_AGENTS).find(
                  key => MINDSET_AGENTS[key as keyof typeof MINDSET_AGENTS].id === agent.id
                ) as keyof typeof MINDSET_AGENTS;

                const isActive = currentAgent?.id === agent.id;

                return (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentClick(agentKey)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors"
                    style={
                      isActive
                        ? {
                            background: 'rgba(79,110,247,0.12)',
                            border: '1px solid #4f6ef7',
                          }
                        : {
                            background: 'transparent',
                            border: '1px solid transparent',
                          }
                    }
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(30,30,48,0.8)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <AgentIcon
                      agentId={agent.id}
                      className="w-8 h-8 flex-shrink-0"
                      style={{ color: isActive ? '#4f6ef7' : '#9090a8' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: '#ededf5' }}
                        >
                          {agent.name}
                        </span>
                        {isActive && (
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#4f6ef7' }} />
                        )}
                      </div>
                      <p
                        className="text-xs truncate"
                        style={{ color: isActive ? '#9090a8' : '#5a5a72' }}
                      >
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
