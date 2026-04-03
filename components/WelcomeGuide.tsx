'use client';

import { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowLeft, Sparkles, ChevronRight, BarChart2, ArrowRight } from 'lucide-react';

interface WelcomeGuideProps {
  show: boolean;
  onDismiss: () => void;
  onStartMindsetScore?: () => void;
}

const STEPS = [
  {
    id: 'agents',
    title: 'Your AI Agents Live Here',
    description: 'Tap this button to browse and switch between all your mindset coaches — Mindset Score, Reset Guide, Practice Builder, and more.',
    position: 'top-left' as const,
    arrowDirection: 'up' as const,
  },
  {
    id: 'sidebar',
    title: 'Your Conversations',
    description: 'The sidebar keeps all your past conversations organized by agent. You can star important ones and search through them.',
    position: 'left' as const,
    arrowDirection: 'left' as const,
  },
  {
    id: 'start',
    title: 'Ready to Go!',
    description: "Pick a coach and start chatting. Each one is trained on proven frameworks to help you assess, interrupt patterns, and design your mindset.",
    position: 'center' as const,
    arrowDirection: 'none' as const,
  },
];

// Token palette
const T = {
  bg:         '#09090f',
  bgCard:     'rgba(18,18,31,0.95)',
  surface:    '#1e1e30',
  textPrimary:'#ededf5',
  textMuted:  '#9090a8',
  textDim:    '#5a5a72',
  accent:     '#4f6ef7',
  amber:      '#fcc824',
  amberHover: '#e6b820',
  purple:     '#7c5bf6',
  dot:        '#2a2a40',
};

export default function WelcomeGuide({ show, onDismiss, onStartMindsetScore }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  if (!show || !isVisible) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onDismiss();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  // Shared tooltip card style
  const cardStyle: React.CSSProperties = {
    background: T.bgCard,
    borderRadius: '0.75rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
    border: `2px solid ${T.amber}`,
    padding: '1.25rem',
    maxWidth: '24rem',
  };

  // Shared dot indicator renderer
  const renderDots = () => (
    <div style={{ display: 'flex', gap: '0.375rem' }}>
      {STEPS.map((_, i) => (
        <div
          key={i}
          style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '9999px',
            transition: 'background 0.2s',
            background: i === currentStep ? T.amber : T.dot,
          }}
        />
      ))}
    </div>
  );

  // Shared skip + next action row
  const renderActions = (nextLabel: React.ReactNode = (<>Next <ChevronRight style={{ width: '0.75rem', height: '0.75rem' }} /></>) ) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {renderDots()}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleSkip}
          style={{ fontSize: '0.75rem', color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.textPrimary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.textMuted; }}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          style={{
            padding: '0.375rem 1rem',
            background: T.amber,
            color: '#000',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.amberHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.amber; }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop overlay — z-[60]: below tooltips (z-[70]), above sidebar (z-40) and page content */}
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={handleSkip}
      />

      {/* Step 0: Agent selector tooltip — z-[70]: above backdrop (z-[60]); below FirstTimeModal (z-[80]) */}
      {step.id === 'agents' && (
        <div
          className="fixed z-[70] animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ top: '60px', left: '310px' }}
        >
          <div style={{ position: 'relative' }}>
            {/* Arrow pointing up to the agent selector button */}
            <div style={{ position: 'absolute', top: '-0.75rem', left: '2rem' }}>
              <ArrowUp className="animate-bounce" style={{ width: '1.5rem', height: '1.5rem', color: T.amber }} />
            </div>
            <div style={{ marginTop: '1rem', ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles style={{ width: '1.25rem', height: '1.25rem', color: T.amber }} />
                  <h3 style={{ fontWeight: 700, color: T.textPrimary, fontSize: '1.125rem', margin: 0 }}>{step.title}</h3>
                </div>
                <button
                  onClick={handleSkip}
                  aria-label="Dismiss guide"
                  style={{ color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.textPrimary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.textDim; }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: T.textMuted, marginBottom: '1rem', lineHeight: '1.625', margin: '0 0 1rem 0' }}>{step.description}</p>
              {renderActions()}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Sidebar tooltip — z-[70]: above backdrop (z-[60]); below FirstTimeModal (z-[80]) */}
      {step.id === 'sidebar' && (
        <div
          className="fixed z-[70] animate-in fade-in slide-in-from-left-2 duration-300"
          style={{ top: '200px', left: '300px' }}
        >
          <div style={{ position: 'relative' }}>
            {/* Arrow pointing left to the sidebar */}
            <div style={{ position: 'absolute', left: '-0.75rem', top: '1.5rem' }}>
              <ArrowLeft className="animate-bounce" style={{ width: '1.5rem', height: '1.5rem', color: T.amber }} />
            </div>
            <div style={{ marginLeft: '1rem', ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles style={{ width: '1.25rem', height: '1.25rem', color: T.amber }} />
                  <h3 style={{ fontWeight: 700, color: T.textPrimary, fontSize: '1.125rem', margin: 0 }}>{step.title}</h3>
                </div>
                <button
                  onClick={handleSkip}
                  aria-label="Dismiss guide"
                  style={{ color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.textPrimary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.textDim; }}
                >
                  <X style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: T.textMuted, marginBottom: '1rem', lineHeight: '1.625', margin: '0 0 1rem 0' }}>{step.description}</p>
              {renderActions()}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Center — ready to go + Mindset Score CTA — z-[70]: above backdrop (z-[60]); below FirstTimeModal (z-[80]) */}
      {step.id === 'start' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
            <div style={{
              background: T.bgCard,
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
              border: `2px solid ${T.amber}`,
              padding: '2rem',
              maxWidth: '28rem',
              textAlign: 'center',
            }}>
              {/* Icon badge */}
              <div style={{
                width: '4rem',
                height: '4rem',
                background: 'rgba(252,200,36,0.12)',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Sparkles style={{ width: '2rem', height: '2rem', color: T.amber }} />
              </div>
              <h3 style={{ fontWeight: 700, color: T.textPrimary, fontSize: '1.5rem', marginBottom: '0.5rem' }}>{step.title}</h3>
              <p style={{ color: T.textMuted, marginBottom: '1.5rem', lineHeight: '1.625' }}>{step.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {onStartMindsetScore && (
                  <button
                    onClick={() => { onStartMindsetScore(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.875rem 1.5rem',
                      background: T.amber,
                      color: '#000',
                      fontWeight: 700,
                      borderRadius: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 10px 15px -3px rgba(252,200,36,0.25)',
                      transition: 'background 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = T.amberHover;
                      el.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = T.amber;
                      el.style.transform = 'scale(1)';
                    }}
                  >
                    <BarChart2 style={{ width: '1rem', height: '1rem' }} />
                    Start with Mindset Score
                    <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  style={onStartMindsetScore ? {
                    fontSize: '0.875rem',
                    color: T.textMuted,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem 0',
                    transition: 'color 0.15s',
                  } : {
                    padding: '0.75rem 2rem',
                    background: T.amber,
                    color: '#000',
                    fontWeight: 700,
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(252,200,36,0.25)',
                    transition: 'background 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    if (onStartMindsetScore) {
                      el.style.color = T.textPrimary;
                    } else {
                      el.style.background = T.amberHover;
                      el.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    if (onStartMindsetScore) {
                      el.style.color = T.textMuted;
                    } else {
                      el.style.background = T.amber;
                      el.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {onStartMindsetScore ? 'Skip for now' : "Let's Go!"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
