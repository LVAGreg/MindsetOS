'use client';

import { useState, useEffect } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  label: string;
  href: string;
  isComplete: boolean;
  isActive: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingChecklist() {
  const { user, viewAsUser } = useAppStore((s) => ({
    user: s.user,
    viewAsUser: s.viewAsUser,
  }));

  const effectiveUser = viewAsUser || user;
  const isAdmin = effectiveUser?.role === 'admin';

  const [dismissed, setDismissed] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [mounted, setMounted] = useState(false);

  // Read localStorage only after mount (SSR-safe)
  useEffect(() => {
    const raw: Array<{ id: string; label: string; href: string; lsKey: string; check: () => boolean }> = [
      {
        id: 'mindset-score',
        label: 'Take your Mindset Score',
        href: '/scorecard',
        lsKey: 'mindset_score_taken',
        check: () => !!localStorage.getItem('mindset_score_taken'),
      },
      {
        id: 'morning-intention',
        label: 'Set a morning intention',
        href: '#morning-checkin',
        lsKey: 'morning_checkin_done',
        check: () => !!localStorage.getItem('morning_checkin_done'),
      },
      {
        id: 'agent-chat',
        label: 'Chat with an agent',
        href: '/dashboard',
        lsKey: 'first_agent_chat',
        check: () => !!localStorage.getItem('first_agent_chat'),
      },
      {
        id: 'field-note',
        label: 'Write a field note',
        href: '/dashboard/notes',
        lsKey: 'first_field_note',
        check: () => !!localStorage.getItem('first_field_note'),
      },
      {
        id: 'outcomes',
        label: 'Check your outcomes',
        href: '/outcomes',
        lsKey: 'outcomes_visited',
        check: () => !!localStorage.getItem('outcomes_visited'),
      },
    ];

    const isDismissed = localStorage.getItem('onboarding_dismissed') === 'true';
    setDismissed(isDismissed);

    const computed = raw.map((s, idx) => ({ ...s, isComplete: s.check(), isActive: false }));

    // Mark first incomplete step as active
    const firstIncompleteIdx = computed.findIndex((s) => !s.isComplete);
    if (firstIncompleteIdx !== -1) computed[firstIncompleteIdx].isActive = true;

    setSteps(computed);
    setMounted(true);
  }, []);

  const completedCount = steps.filter((s) => s.isComplete).length;
  const allComplete = completedCount === steps.length;

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
  };

  // Guard: don't render until mounted (avoid hydration mismatch)
  if (!mounted) return null;
  // Hide for admins
  if (isAdmin) return null;
  // Hide if dismissed or all complete
  if (dismissed || allComplete) return null;

  const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div
      style={{
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid #1e1e30',
        borderRadius: 12,
        padding: '20px 24px',
        margin: '16px 16px 0',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            color: '#fcc824',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Getting started
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss onboarding checklist"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#5a5a72',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            background: '#1e1e30',
            borderRadius: 4,
            height: 4,
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              background: '#4f6ef7',
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ color: '#9090a8', fontSize: 12 }}>
          {completedCount}/5 steps complete
        </span>
      </div>

      {/* Steps */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {steps.map((step) => {
          const Icon = step.isComplete ? Check : Circle;
          const iconColor = step.isComplete ? '#4f6ef7' : '#5a5a72';

          if (step.isComplete) {
            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#5a5a72',
                  fontSize: 13,
                  textDecoration: 'line-through',
                }}
              >
                <Icon size={14} color={iconColor} />
                <span>{step.label}</span>
              </div>
            );
          }

          if (step.isActive) {
            // First incomplete — clickable link
            return (
              <a
                key={step.id}
                href={step.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#4f6ef7',
                  fontSize: 13,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <Icon size={14} color={iconColor} />
                <span>{step.label}</span>
              </a>
            );
          }

          // Inactive incomplete
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#9090a8',
                fontSize: 13,
              }}
            >
              <Icon size={14} color={iconColor} />
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
