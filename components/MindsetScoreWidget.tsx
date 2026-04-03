'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, Target } from 'lucide-react';
import { API_URL } from '@/lib/api-client';
import { MINDSET_AGENTS } from '@/lib/store';
import type { Conversation } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MindsetScoreData {
  score: number | null;
  updatedAt: string | null;
}

interface MindsetScoreWidgetProps {
  onNavigateToAgent: (agentId: string) => void;
}

// ─── Journey stepper config ───────────────────────────────────────────────────

const JOURNEY_STEPS = [
  { agentId: 'mindset-score',         label: 'Score',        workflowStep: 1  },
  { agentId: 'reset-guide',           label: 'Reset',        workflowStep: 2  },
  { agentId: 'architecture-coach',    label: 'Architecture', workflowStep: 3  },
  { agentId: 'inner-world-mapper',    label: 'Inner World',  workflowStep: 10 },
  { agentId: 'practice-builder',      label: 'Practice',     workflowStep: 4  },
  { agentId: 'decision-framework',    label: 'Decisions',    workflowStep: 9  },
  { agentId: 'accountability-partner',label: 'Accountability',workflowStep: 7  },
] as const;

// ─── MindsetScoreWidget ───────────────────────────────────────────────────────

export function MindsetScoreWidget({ onNavigateToAgent }: MindsetScoreWidgetProps) {
  const [data, setData] = useState<MindsetScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchScore = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) { setLoading(false); return; }

        const res = await fetch(`${API_URL}/api/mindset-score/latest`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!cancelled) {
          if (res.ok) {
            const json = await res.json() as MindsetScoreData;
            setData(json);
          } else {
            // Endpoint doesn't exist yet or returned error — treat as null score
            setData({ score: null, updatedAt: null });
          }
        }
      } catch {
        if (!cancelled) setData({ score: null, updatedAt: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchScore();
    return () => { cancelled = true; };
  }, []);

  const BLUE = '#4f6ef7';

  if (loading) {
    return (
      <div
        className="flex items-center gap-3 px-4 rounded-xl animate-pulse"
        style={{
          height: 72,
          background: 'rgba(18,18,31,0.6)',
          border: '1px solid #1e1e30',
        }}
      >
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(79,110,247,0.12)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(79,110,247,0.15)' }} />
          <div className="h-2.5 w-36 rounded" style={{ background: 'rgba(30,30,48,0.8)' }} />
        </div>
      </div>
    );
  }

  const hasScore = data?.score != null;
  const formattedDate = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  if (!hasScore) {
    // CTA state — no score yet
    return (
      <button
        onClick={() => onNavigateToAgent(MINDSET_AGENTS.MINDSET_SCORE.id)}
        className="group w-full flex items-center gap-3 px-4 rounded-xl transition-all duration-200 text-left"
        style={{
          height: 72,
          background: 'rgba(18,18,31,0.6)',
          border: `1px solid ${BLUE}30`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = `${BLUE}55`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.6)';
          (e.currentTarget as HTMLElement).style.borderColor = `${BLUE}30`;
        }}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `${BLUE}18`, border: `2px dashed ${BLUE}40` }}
        >
          <Target className="w-4.5 h-4.5" style={{ color: BLUE }} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-none mb-1" style={{ color: '#ededf5' }}>
            What's your Mindset Score?
          </p>
          <p className="text-xs" style={{ color: '#9090a8' }}>
            5 questions · 2 min · personalised roadmap
          </p>
        </div>

        {/* Arrow */}
        <ArrowRight
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: BLUE }}
        />
      </button>
    );
  }

  // Score exists
  const score = data!.score as number;
  const scoreColor =
    score >= 75 ? '#22c55e' :
    score >= 50 ? BLUE :
    score >= 25 ? '#f59e0b' :
    '#ef4444';

  return (
    <div
      className="flex items-center gap-4 px-4 rounded-xl"
      style={{
        height: 72,
        background: 'rgba(18,18,31,0.6)',
        border: `1px solid ${scoreColor}28`,
      }}
    >
      {/* Circular score badge */}
      <div
        className="relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: `${scoreColor}15`,
          border: `2px solid ${scoreColor}50`,
          boxShadow: `0 0 12px ${scoreColor}20`,
        }}
      >
        <span className="text-sm font-black leading-none" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-sm font-bold" style={{ color: '#ededf5' }}>Mindset Score</span>
          <span className="text-xs font-semibold" style={{ color: '#5a5a72' }}>/100</span>
        </div>
        <p className="text-[11px]" style={{ color: '#5a5a72' }}>
          {formattedDate ? `Last taken ${formattedDate}` : 'Score active'}
        </p>
      </div>

      {/* Retake */}
      <button
        onClick={() => onNavigateToAgent(MINDSET_AGENTS.MINDSET_SCORE.id)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all duration-150"
        style={{ background: `${BLUE}18`, color: BLUE, border: `1px solid ${BLUE}30` }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = `${BLUE}28`;
          (e.currentTarget as HTMLElement).style.borderColor = `${BLUE}55`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = `${BLUE}18`;
          (e.currentTarget as HTMLElement).style.borderColor = `${BLUE}30`;
        }}
        title="Retake your Mindset Score"
      >
        <RefreshCw className="w-3 h-3" />
        Retake
      </button>
    </div>
  );
}

// ─── JourneyProgressStepper ───────────────────────────────────────────────────

interface JourneyProgressStepperProps {
  conversations: Record<string, Conversation>;
  onNavigateToAgent: (agentId: string) => void;
}

export function JourneyProgressStepper({ conversations, onNavigateToAgent }: JourneyProgressStepperProps) {
  const BLUE = '#4f6ef7';

  const allConvs = Object.values(conversations);

  // Determine completion for each step
  const steps = JOURNEY_STEPS.map(step => {
    const done = allConvs.some(c => c.agentId === step.agentId);
    return { ...step, done };
  });

  // Current step = first incomplete
  const currentIdx = steps.findIndex(s => !s.done);
  const activeIdx = currentIdx === -1 ? steps.length - 1 : currentIdx;

  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{
        background: 'rgba(18,18,31,0.6)',
        border: '1px solid #1e1e30',
      }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-[0.15em] mb-3"
        style={{ color: '#4a4a60' }}
      >
        Your journey
      </p>

      {/* Dots row */}
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isDone = step.done;
          const isActive = idx === activeIdx;
          const isLocked = !isDone && idx > activeIdx;

          let dotColor: string;
          let borderColor: string;
          if (isDone) {
            dotColor = BLUE;
            borderColor = `${BLUE}80`;
          } else if (isActive) {
            dotColor = `${BLUE}40`;
            borderColor = `${BLUE}80`;
          } else {
            dotColor = 'rgba(30,30,48,0.8)';
            borderColor = '#2a2a3f';
          }

          return (
            <div key={step.agentId} className="flex items-center flex-1">
              {/* Dot */}
              <div className="relative flex flex-col items-center" style={{ flex: '0 0 auto' }}>
                <button
                  onClick={() => !isLocked && onNavigateToAgent(step.agentId)}
                  disabled={isLocked}
                  title={step.label}
                  className="relative transition-all duration-200"
                  style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                >
                  {/* Active pulse ring */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{
                        background: `${BLUE}30`,
                        transform: 'scale(1.6)',
                      }}
                    />
                  )}
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: dotColor,
                      border: `2px solid ${borderColor}`,
                      boxShadow: isDone ? `0 0 8px ${BLUE}35` : isActive ? `0 0 10px ${BLUE}40` : 'none',
                    }}
                  >
                    {isDone && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
                {/* Label below dot */}
                <span
                  className="mt-1.5 text-center whitespace-nowrap text-[9px] font-medium leading-none"
                  style={{
                    color: isDone ? BLUE : isActive ? `${BLUE}cc` : '#3a3a52',
                    maxWidth: 52,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between dots (not after last) */}
              {idx < steps.length - 1 && (
                <div
                  className="flex-1 h-px mx-1"
                  style={{
                    background: isDone && steps[idx + 1].done
                      ? `${BLUE}60`
                      : isDone && idx === activeIdx - 1
                      ? `linear-gradient(to right, ${BLUE}60, ${BLUE}20)`
                      : '#1e1e30',
                    minWidth: 4,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
