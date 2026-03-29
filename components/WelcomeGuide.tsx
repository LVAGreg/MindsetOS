'use client';

import { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowLeft, Sparkles, ChevronRight } from 'lucide-react';

interface WelcomeGuideProps {
  show: boolean;
  onDismiss: () => void;
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

export default function WelcomeGuide({ show, onDismiss }: WelcomeGuideProps) {
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

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Step 0: Agent selector tooltip — positioned right of sidebar, below header */}
      {step.id === 'agents' && (
        <div
          className="fixed z-[70] animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ top: '60px', left: '310px' }}
        >
          <div className="relative">
            {/* Arrow pointing up to the agent selector button */}
            <div className="absolute -top-3 left-8">
              <ArrowUp className="w-6 h-6 text-[#fcc824] animate-bounce" />
            </div>
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-[#fcc824] p-5 max-w-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#fcc824]" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{step.title}</h3>
                </div>
                <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{step.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentStep ? 'bg-[#fcc824]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkip} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Skip
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 bg-[#fcc824] hover:bg-[#f0be1e] text-black text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Sidebar tooltip — positioned right of sidebar */}
      {step.id === 'sidebar' && (
        <div
          className="fixed z-[70] animate-in fade-in slide-in-from-left-2 duration-300"
          style={{ top: '200px', left: '300px' }}
        >
          <div className="relative">
            {/* Arrow pointing left to the sidebar */}
            <div className="absolute -left-3 top-6">
              <ArrowLeft className="w-6 h-6 text-[#fcc824] animate-bounce" />
            </div>
            <div className="ml-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-[#fcc824] p-5 max-w-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#fcc824]" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{step.title}</h3>
                </div>
                <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{step.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentStep ? 'bg-[#fcc824]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkip} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Skip
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 bg-[#fcc824] hover:bg-[#f0be1e] text-black text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Center — ready to go */}
      {step.id === 'start' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-[#fcc824] p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#fcc824]" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-2xl mb-2">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{step.description}</p>
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Let&apos;s Go!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
