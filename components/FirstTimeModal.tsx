'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, BarChart2, Zap, RefreshCw, Settings } from 'lucide-react';

interface FirstTimeModalProps {
  show: boolean;
  onDismiss: () => void;
  onStartMindsetScore: () => void;
}

const JOURNEY_STEPS = [
  {
    icon: BarChart2,
    color: '#f59e0b',
    label: 'Assess',
    description: 'Mindset Score',
  },
  {
    icon: Zap,
    color: '#06b6d4',
    label: 'Insight',
    description: 'See what\'s running you',
  },
  {
    icon: RefreshCw,
    color: '#8b5cf6',
    label: 'Practice',
    description: 'Daily routines that stick',
  },
  {
    icon: Settings,
    color: '#10b981',
    label: 'Design',
    description: 'Build your operating system',
  },
];

export default function FirstTimeModal({ show, onDismiss, onStartMindsetScore }: FirstTimeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsVisible(true), 200);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  // Cycle through journey steps
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % JOURNEY_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!show || !isVisible) return null;

  return (
    <>
      {/* Backdrop — z-[80]: below modal (z-[90]), above WelcomeGuide (z-[70]) and normal content */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] transition-opacity duration-300"
        onClick={onDismiss}
      />

      {/* Modal — z-[90]: above backdrop (z-[80]) and WelcomeGuide (z-[70]); below TrialExpiredPopup (z-[9999]) */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white dark:bg-[#0d1117] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] overflow-hidden"
          style={{ animation: 'modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#f59e0b] via-[#fcc824] to-[#f59e0b]" />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold tracking-widest text-[#fcc824] uppercase">
                  Welcome to MindsetOS
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                Start by knowing<br />where you actually stand.
              </h2>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all flex-shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pb-5">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              Most entrepreneurs optimize everything — except the one thing running it all.
              Take the free 5-question Mindset Score and find out exactly where to focus first.
            </p>

            {/* Journey path */}
            <div className="flex items-center gap-1 mb-6">
              {JOURNEY_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === activeStep;
                const isPast = i < activeStep;
                return (
                  <div key={step.label} className="flex items-center gap-1 flex-1">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500"
                        style={{
                          background: isActive ? `${step.color}18` : isPast ? `${step.color}10` : 'transparent',
                          border: isActive ? `2px solid ${step.color}` : isPast ? `1.5px solid ${step.color}60` : '1.5px solid #e5e7eb',
                          transform: isActive ? 'scale(1.08)' : 'scale(1)',
                        }}
                      >
                        <Icon
                          className="w-4 h-4 transition-all duration-500"
                          style={{ color: isActive ? step.color : isPast ? `${step.color}90` : '#9ca3af' }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-semibold transition-all duration-300"
                        style={{ color: isActive ? step.color : '#9ca3af' }}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <div
                        className="w-4 h-px flex-shrink-0 mb-4 transition-all duration-500"
                        style={{ background: i < activeStep ? JOURNEY_STEPS[i].color + '60' : '#e5e7eb' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Score card preview */}
            <div className="rounded-xl border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#f59e0b18', border: '1.5px solid #f59e0b40' }}
                >
                  <BarChart2 className="w-6 h-6" style={{ color: '#f59e0b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Mindset Score</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">5 questions &middot; 3 minutes &middot; free</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #f59e0b, #fcc824)',
                          width: '0%',
                          animation: 'fillBar 2s 0.8s ease-out forwards',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">your score waiting</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={onStartMindsetScore}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-black font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #fcc824, #f59e0b)',
                boxShadow: '0 4px 20px rgba(252, 200, 36, 0.35)',
              }}
            >
              <BarChart2 className="w-4 h-4" />
              Get My Mindset Score — Free
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Skip */}
            <button
              onClick={onDismiss}
              className="w-full mt-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              I&apos;ll explore on my own
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fillBar {
          from { width: 0%; }
          to   { width: 72%; }
        }
      `}</style>
    </>
  );
}
