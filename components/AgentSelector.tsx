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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (!response.ok) {
          setFetchError(`Failed to load agents (${response.status}). Please refresh.`);
          return;
        }

        const data = await response.json();
        setAgents(data.agents || []);
        setMembershipTier(data.membershipTier || null);
      } catch (error) {
        console.error('Error fetching agents:', error);
        setFetchError('Could not load agents. Check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleSelectAgent = (agentId: string) => {
    setCurrentAgent(agentId as any);
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div
        style={{
          borderBottom: '1px solid #1e1e30',
          padding: '1rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#9090a8',
            marginBottom: '0.75rem',
          }}
        >
          Select Agent
        </h2>
        <div style={{ fontSize: '0.875rem', color: '#9090a8' }}>
          Loading agents…
        </div>
      </div>
    );
  }

  /* ── error state ── */
  if (fetchError) {
    return (
      <div
        style={{
          borderBottom: '1px solid #1e1e30',
          padding: '1rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#9090a8',
            marginBottom: '0.75rem',
          }}
        >
          Select Agent
        </h2>
        <div
          style={{
            fontSize: '0.875rem',
            color: '#f87171',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid rgba(248,113,113,0.3)',
            background: 'rgba(248,113,113,0.08)',
          }}
        >
          {fetchError}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderBottom: '1px solid #1e1e30',
        padding: '1rem',
      }}
    >
      {/* header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#9090a8',
          }}
        >
          Select Agent
        </h2>

        {membershipTier === 'trial' && (
          <a
            href="https://www.mindset.show"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Upgrade for full access to all agents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(252,200,36,0.12)',
              color: '#fcc824',
              border: '1px solid rgba(252,200,36,0.3)',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(252,200,36,0.22)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(252,200,36,0.12)';
            }}
          >
            <Zap className="w-3 h-3" />
            Upgrade for Full Access
          </a>
        )}
      </div>

      {/* agent grid */}
      <div
        style={{ overflowX: 'auto' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {agents.map((agent) => {
            const isActive = currentAgent === agent.id;
            const accentColor = agent.accent_color || '#4f6ef7';
            const isTrial = agent.isTrialAgent;

            /* base border */
            const baseBorder = agent.locked
              ? '#1e1e30'
              : isTrial && !isActive
              ? 'rgba(252,200,36,0.45)'
              : isActive
              ? accentColor
              : '#1e1e30';

            const baseBackground = isActive && !agent.locked
              ? `${accentColor}18`
              : 'rgba(18,18,31,0.8)';

            return (
              <button
                key={agent.id}
                onClick={() => handleSelectAgent(agent.id)}
                disabled={agent.locked}
                aria-label={
                  agent.locked
                    ? `${agent.name} — ${agent.lockedReason || 'Upgrade to unlock'}`
                    : `Select ${agent.name}`
                }
                aria-pressed={isActive}
                title={
                  agent.locked
                    ? agent.lockedReason || 'Upgrade to unlock this agent'
                    : undefined
                }
                style={{
                  position: 'relative',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${baseBorder}`,
                  background: baseBackground,
                  textAlign: 'left',
                  cursor: agent.locked ? 'not-allowed' : 'pointer',
                  opacity: agent.locked ? 0.5 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!agent.locked && !isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      `${accentColor}60`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!agent.locked && !isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      isTrial ? 'rgba(252,200,36,0.45)' : '#1e1e30';
                  }
                }}
              >
                {/* Trial badge */}
                {isTrial && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#fcc824',
                      color: '#09090f',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Star className="w-2.5 h-2.5" aria-hidden="true" />
                    TRIAL
                  </div>
                )}

                {/* icon */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <AgentIcon
                    agentId={agent.id}
                    className="w-8 h-8"
                    style={!agent.locked ? { color: accentColor } : {}}
                  />
                </div>

                {/* name */}
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#ededf5',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  {agent.name}
                  {agent.locked && (
                    <Lock
                      className="w-3 h-3"
                      aria-label="Locked"
                      style={{ color: '#5a5a72', flexShrink: 0 }}
                    />
                  )}
                </div>

                {/* description */}
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#9090a8',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {agent.locked
                    ? agent.lockedReason || 'Upgrade to unlock'
                    : agent.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
