'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, RotateCcw } from 'lucide-react';

const STEPS = [
  {
    letter: 'D',
    name: 'Define',
    prompt: 'What is the actual decision I\u2019m making?',
  },
  {
    letter: 'E',
    name: 'Examine',
    prompt: 'What assumptions am I carrying into this?',
  },
  {
    letter: 'S',
    name: 'Separate',
    prompt: 'What do I know vs. what am I afraid of?',
  },
  {
    letter: 'I',
    name: 'Identify',
    prompt: 'What would each option cost me if wrong?',
  },
  {
    letter: 'G',
    name: 'Generate',
    prompt: 'What options haven\u2019t I considered yet?',
  },
  {
    letter: 'N',
    name: 'Name',
    prompt: 'What does my gut say, and do I trust it?',
  },
];

export default function DecisionRehearsalPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed
  const [answers, setAnswers] = useState<string[]>(Array(6).fill(''));
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;

  const handleAnswerChange = (value: string) => {
    const updated = [...answers];
    updated[currentStep] = value;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step completed — show summary
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers(Array(6).fill(''));
    setShowSummary(false);
    setCopied(false);
  };

  const buildCopyText = () => {
    const lines = STEPS.map((s, i) => {
      const answer = answers[i]?.trim() || '(no answer)';
      return `${s.letter} — ${s.name}\nQ: ${s.prompt}\nA: ${answer}`;
    });
    return `DESIGN Decision Rehearsal\n${'─'.repeat(32)}\n\n${lines.join('\n\n')}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = buildCopyText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid #1e1e30',
        borderRadius: '12px',
        marginBottom: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#fcc824',
          }}
        >
          Decision Rehearsal
        </span>
        <button
          aria-label="Toggle rehearsal panel"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9090a8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '6px',
          }}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div
          style={{
            padding: '0 14px 14px',
          }}
        >
          {/* Step indicator */}
          {!showSummary && (
            <p
              style={{
                fontSize: '11px',
                color: '#9090a8',
                marginBottom: '12px',
                marginTop: '2px',
              }}
            >
              Step {currentStep + 1} of {totalSteps} \u2014 {step.name}
            </p>
          )}

          {showSummary ? (
            /* ===== Summary Card ===== */
            <div>
              <p
                style={{
                  fontSize: '11px',
                  color: '#9090a8',
                  marginBottom: '12px',
                  marginTop: '2px',
                }}
              >
                DESIGN summary \u2014 all 6 steps
              </p>

              <div
                style={{
                  background: '#09090f',
                  border: '1px solid #1e1e30',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '12px',
                }}
              >
                {STEPS.map((s, i) => (
                  <div
                    key={s.letter}
                    style={{
                      marginBottom: i < STEPS.length - 1 ? '12px' : 0,
                      paddingBottom: i < STEPS.length - 1 ? '12px' : 0,
                      borderBottom: i < STEPS.length - 1 ? '1px solid #1e1e30' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#fcc824',
                        }}
                      >
                        {s.letter}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#ededf5',
                        }}
                      >
                        {s.name}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#9090a8',
                        fontStyle: 'italic',
                        marginBottom: '4px',
                        lineHeight: 1.4,
                      }}
                    >
                      {s.prompt}
                    </p>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#ededf5',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {answers[i]?.trim() || (
                        <span style={{ color: '#5a5a72', fontStyle: 'italic' }}>
                          (no answer)
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Copy to chat button */}
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  background: copied ? '#1e1e30' : '#4f6ef7',
                  color: '#ededf5',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 16px',
                  minHeight: '44px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: '8px',
                }}
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy to chat'}
              </button>

              {/* Back to last step */}
              <button
                onClick={handleBack}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9090a8',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '4px 0',
                  marginBottom: '8px',
                }}
              >
                \u2190 Back to Name
              </button>

              {/* Reset */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#5a5a72',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            </div>
          ) : (
            /* ===== Active Step Card ===== */
            <div>
              <div
                style={{
                  background: '#09090f',
                  border: '1px solid #1e1e30',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '10px',
                }}
              >
                {/* Step letter + name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: '#fcc824',
                      lineHeight: 1,
                    }}
                  >
                    {step.letter}
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#ededf5',
                    }}
                  >
                    {step.name}
                  </span>
                </div>

                {/* Prompt question */}
                <p
                  style={{
                    fontSize: '13px',
                    color: '#9090a8',
                    fontStyle: 'italic',
                    marginBottom: '10px',
                    lineHeight: 1.5,
                  }}
                >
                  {step.prompt}
                </p>

                {/* Textarea */}
                <textarea
                  rows={3}
                  value={answers[currentStep]}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer\u2026"
                  style={{
                    width: '100%',
                    background: 'rgba(9,9,15,0.6)',
                    border: '1px solid #1e1e30',
                    color: '#ededf5',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Next step button */}
              <button
                onClick={handleNext}
                style={{
                  display: 'block',
                  width: '100%',
                  background: '#fcc824',
                  color: '#000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 16px',
                  minHeight: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                {currentStep < totalSteps - 1 ? 'Next step \u2192' : 'Complete \u2192'}
              </button>

              {/* Back link (steps 2–6 only) */}
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9090a8',
                    fontSize: '12px',
                    textAlign: 'center',
                    padding: '4px 0',
                    marginBottom: '8px',
                  }}
                >
                  \u2190 Back
                </button>
              )}

              {/* Progress dots */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  marginTop: currentStep === 0 ? '8px' : '0',
                }}
              >
                {STEPS.map((s, i) => {
                  const isCompleted = answers[i]?.trim().length > 0 && i < currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div
                      key={s.letter}
                      title={s.name}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isCurrent
                          ? '#4f6ef7'
                          : isCompleted
                          ? '#fcc824'
                          : '#1e1e30',
                        border: isCurrent
                          ? '2px solid #4f6ef7'
                          : isCompleted
                          ? '2px solid #fcc824'
                          : '2px solid #5a5a72',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    />
                  );
                })}
              </div>

              {/* Reset */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#5a5a72',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
