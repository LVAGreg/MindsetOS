'use client';

import { useEffect, useState } from 'react';
import { Lock, Zap, Star } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  accent_color?: string;
  tags: string[];
  popularity: number;
  releaseDate: string;
  isEnabled: boolean;
  locked: boolean;
  lockedReason: string | null;
  requiresOnboarding: boolean;
  isTrialAgent?: boolean;
}

export default function AgentSelector() {
  const { currentAgent, setCurrentAgent } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.error('Failed to fetch agents:', response.status);
          return;
        }

        const data = await response.json();
        setAgents(data.agents || []);
        setMembershipTier(data.membershipTier || null);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleSelectAgent = (agentId: string) => {
    setCurrentAgent(agentId as any);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Agent
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Agent
        </h2>
        {membershipTier === 'trial' && (
          <a
            href="https://www.mindset.show"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Upgrade for Full Access
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {agents.map((agent) => {
          const isActive = currentAgent === agent.id;
          const accentColor = agent.accent_color || '#3B82F6';
          const isTrial = agent.isTrialAgent;

          return (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent.id)}
              disabled={agent.locked}
              className={`p-3 rounded-lg border-2 transition-all text-left relative ${
                agent.locked
                  ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                  : isActive
                  ? ''
                  : isTrial
                    ? 'border-amber-300 dark:border-amber-600'
                    : 'border-gray-200 dark:border-gray-700'
              }`}
              style={
                !agent.locked && isActive
                  ? {
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}10`,
                    }
                  : {}
              }
              onMouseEnter={(e) => {
                if (!agent.locked && !isActive) {
                  e.currentTarget.style.borderColor = `${accentColor}60`;
                }
              }}
              onMouseLeave={(e) => {
                if (!agent.locked && !isActive) {
                  e.currentTarget.style.borderColor = '';
                }
              }}
              title={agent.locked ? agent.lockedReason || 'Upgrade to unlock this agent' : ''}
            >
              {/* Trial badge */}
              {isTrial && (
                <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  TRIAL
                </div>
              )}
              <div className="mb-2">
                <AgentIcon
                  agentId={agent.id}
                  className="w-8 h-8"
                  style={!agent.locked ? { color: accentColor } : {}}
                />
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1">
                {agent.name}
                {agent.locked && <Lock className="w-3 h-3 text-gray-500" />}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {agent.locked ? (agent.lockedReason || 'Upgrade to unlock') : agent.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
