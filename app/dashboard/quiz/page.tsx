'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Loader2, Copy, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// ─── Data ────────────────────────────────────────────────────────────────────

const LAYERS = [
  {
    index: 0,
    label: 'Layer 1',
    name: 'Awareness',
    subtitle: 'The Audit',
    questions: [
      'When something goes wrong, I notice my emotional state before reacting.',
      'I can identify the specific triggers that pull me into reactive patterns.',
      'I observe my thought patterns without being controlled by them.',
      'I know when I\'m operating from fear vs clarity.',
      'I can name the story I\'m telling myself in a difficult moment.',
    ],
  },
  {
    index: 1,
    label: 'Layer 2',
    name: 'Interruption',
    subtitle: 'The Pattern',
    questions: [
      'When I feel triggered, I pause before responding.',
      'I have a reliable practice that interrupts my default reactions.',
      'I can choose my response even under significant pressure.',
      'I notice when old patterns are running and can stop them mid-stream.',
      'I recover from reactive episodes faster than I used to.',
    ],
  },
  {
    index: 2,
    label: 'Layer 3',
    name: 'Architecture',
    subtitle: 'The Design',
    questions: [
      'I make decisions aligned with my values, not just my immediate feelings.',
      'I have a clear mental framework for high-stakes decisions.',
      'My behaviors match my stated intentions more often than not.',
      'I design my environment to support the version of me I want to be.',
      'I track my growth intentionally, not just by how I feel day-to-day.',
    ],
  },
] as const;

const SCALE_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] as const;

// ─── Pattern logic (matches scorecard/view/page.tsx exactly) ─────────────────

type Pattern = 'reactor' | 'avoider' | 'optimizer';

const PATTERNS: Record<Pattern, {
  name: string;
  color: string;
  textColor: string;
  agentSlug: string;
  agentLabel: string;
}> = {
  reactor: {
    name: 'The Reactor',
    color: '#fcc824',
    textColor: '#09090f',
    agentSlug: 'reset-guide',
    agentLabel: 'Work with Reset Guide',
  },
  avoider: {
    name: 'The Avoider',
    color: '#4f6ef7',
    textColor: '#ffffff',
    agentSlug: 'architecture-coach',
    agentLabel: 'Work with Architecture Coach',
  },
  optimizer: {
    name: 'The Optimizer',
    color: '#7c5bf6',
    textColor: '#ffffff',
    agentSlug: 'decision-framework',
    agentLabel: 'Work with Decision Framework',
  },
};

function getPattern(score: number): Pattern {
  if (score <= 40) return 'reactor';
  if (score <= 65) return 'avoider';
  return 'optimizer';
}

function calcLayerScore(answers: Record<string, number>, layerIndex: number): number {
  const sum = [0, 1, 2, 3, 4].reduce((acc, qi) => acc + (answers[`${layerIndex}-${qi}`] || 0), 0);
  return Math.round((sum / 25) * 100);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScaleButton({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        border: selected ? 'none' : '1px solid #1e1e30',
        background: selected ? '#fcc824' : 'rgba(18,18,31,0.8)',
        color: selected ? '#000' : '#9090a8',
        transition: 'all 0.15s ease',
        padding: '6px 4px',
        lineHeight: 1.3,
      }}
    >
      {label}
    </button>
  );
}

function SubScoreBar({
  label,
  score,
  fillColor,
}: {
  label: string;
  score: number;
  fillColor: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#ededf5', fontSize: 14, fontWeight: 700 }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: '#1e1e30', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 99,
            background: fillColor,
            width: `${score}%`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type Phase = 'intro' | 'quiz' | 'saving' | 'results' | 'error';

export default function QuizPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentLayer, setCurrentLayer] = useState(0);
  // answers keyed as `${layerIndex}-${questionIndex}` → value 1-5
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [validationShake, setValidationShake] = useState(false);

  // Results state
  const [awarenessScore, setAwarenessScore] = useState(0);
  const [interruptionScore, setInterruptionScore] = useState(0);
  const [architectureScore, setArchitectureScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mark score as taken for onboarding checklist detection (runs once when results shown)
  useEffect(() => {
    if (phase === 'results' || phase === 'error') {
      localStorage.setItem('mindset_score_taken', '1');
    }
  }, [phase]);

  const layer = LAYERS[currentLayer];

  // Count how many questions in current layer are answered
  const layerAnswered = [0, 1, 2, 3, 4].filter(qi => answers[`${currentLayer}-${qi}`]).length;
  const layerComplete = layerAnswered === 5;

  function setAnswer(qi: number, value: number) {
    setAnswers(prev => ({ ...prev, [`${currentLayer}-${qi}`]: value }));
  }

  function triggerShake() {
    setValidationShake(true);
    setTimeout(() => setValidationShake(false), 600);
  }

  async function handleFinish() {
    if (!layerComplete) {
      triggerShake();
      return;
    }

    const aw = calcLayerScore(answers, 0);
    const int = calcLayerScore(answers, 1);
    const arch = calcLayerScore(answers, 2);
    const total = Math.round((aw + int + arch) / 3);

    setAwarenessScore(aw);
    setInterruptionScore(int);
    setArchitectureScore(arch);
    setTotalScore(total);
    setPhase('saving');

    // Build full answers object
    const answersPayload: Record<string, unknown> = {
      awareness: { score: aw, answers: {} as Record<string, number> },
      interruption: { score: int, answers: {} as Record<string, number> },
      architecture: { score: arch, answers: {} as Record<string, number> },
    };
    for (const key in answers) {
      const [li, qi] = key.split('-').map(Number);
      const layerName = ['awareness', 'interruption', 'architecture'][li];
      (answersPayload[layerName] as { answers: Record<string, number> }).answers[`q${qi + 1}`] = answers[key];
    }

    try {
      await apiClient.post('/api/mindset-score', {
        score: total,
        category: 'structured-assessment',
        answers: answersPayload,
      });
    } catch {
      setSaveError(true);
    }

    setPhase('results');
  }

  function handleNextLayer() {
    if (!layerComplete) {
      triggerShake();
      return;
    }
    if (currentLayer < 2) {
      setCurrentLayer(currentLayer + 1);
    }
  }

  function reset() {
    setAnswers({});
    setCurrentLayer(0);
    setSaveError(false);
    setValidationShake(false);
    setPhase('intro');
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{ background: '#09090f', minHeight: '100vh', padding: '32px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Back link */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#9090a8',
              fontSize: 14,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 32,
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Dashboard
          </button>

          {/* Card */}
          <div style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 20, padding: 32 }}>
            <h1 style={{ color: '#ededf5', fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Structured Mindset Assessment
            </h1>
            <p style={{ color: '#9090a8', fontSize: 14, marginBottom: 20 }}>
              15 questions · 5 minutes · 3 sub-scores
            </p>
            <p style={{ color: '#9090a8', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
              Rate each statement honestly on a 1–5 scale. This assessment measures all 3 layers of your mindset architecture.
            </p>

            {/* Layer pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {LAYERS.map(l => (
                <div
                  key={l.name}
                  style={{
                    background: 'rgba(18,18,31,0.8)',
                    border: '1px solid #1e1e30',
                    borderRadius: 99,
                    padding: '6px 14px',
                    color: '#9090a8',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {l.name}
                </div>
              ))}
            </div>

            {/* Start button */}
            <button
              onClick={() => setPhase('quiz')}
              style={{
                width: '100%',
                minHeight: 44,
                background: '#fcc824',
                color: '#09090f',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const progressPct = (currentLayer / 3) * 100;

    return (
      <div style={{ background: '#09090f', minHeight: '100vh', padding: '32px 16px' }}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-6px); }
            40%       { transform: translateX(6px); }
            60%       { transform: translateX(-4px); }
            80%       { transform: translateX(4px); }
          }
          .quiz-shake { animation: shake 0.5s ease; }
        `}</style>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Back link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {currentLayer > 0 ? (
              <button
                onClick={() => setCurrentLayer(currentLayer - 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#9090a8',
                  fontSize: 14,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
                Back
              </button>
            ) : (
              <button
                onClick={() => setPhase('intro')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#9090a8',
                  fontSize: 14,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
                Back
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: '#1e1e30', borderRadius: 99, marginBottom: 24, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#fcc824',
                borderRadius: 99,
                width: `${progressPct}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Section header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#fcc824', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {layer.label} — {layer.name}
            </p>
            <p style={{ color: '#5a5a72', fontSize: 13 }}>{layer.subtitle}</p>
          </div>

          {/* Questions */}
          <div className={validationShake ? 'quiz-shake' : ''}>
            {layer.questions.map((q, qi) => {
              const val = answers[`${currentLayer}-${qi}`];
              return (
                <div
                  key={qi}
                  style={{
                    background: 'rgba(18,18,31,0.8)',
                    border: '1px solid #1e1e30',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 12,
                  }}
                >
                  <p style={{ color: '#ededf5', fontSize: 15, lineHeight: 1.6, marginBottom: 14 }}>
                    <span style={{ color: '#5a5a72', fontSize: 12, fontWeight: 600, marginRight: 8 }}>
                      {currentLayer * 5 + qi + 1}.
                    </span>
                    {q}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SCALE_LABELS.map((label, idx) => (
                      <ScaleButton
                        key={idx}
                        label={label}
                        value={idx + 1}
                        selected={val === idx + 1}
                        onClick={() => setAnswer(qi, idx + 1)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation nudge */}
          {validationShake && (
            <p style={{ color: '#fcc824', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
              Please answer all 5 questions before continuing.
            </p>
          )}

          {/* Next / Finish */}
          <div style={{ marginTop: 16 }}>
            {currentLayer < 2 ? (
              <button
                onClick={handleNextLayer}
                style={{
                  width: '100%',
                  minHeight: 44,
                  background: layerComplete ? '#fcc824' : 'rgba(18,18,31,0.8)',
                  color: layerComplete ? '#09090f' : '#5a5a72',
                  border: layerComplete ? 'none' : '1px solid #1e1e30',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: layerComplete ? 'pointer' : 'not-allowed',
                  opacity: layerComplete ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                Next Layer →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  width: '100%',
                  minHeight: 44,
                  background: layerComplete ? '#fcc824' : 'rgba(18,18,31,0.8)',
                  color: layerComplete ? '#09090f' : '#5a5a72',
                  border: layerComplete ? 'none' : '1px solid #1e1e30',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: layerComplete ? 'pointer' : 'not-allowed',
                  opacity: layerComplete ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                See My Results →
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <p style={{ color: '#5a5a72', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            {layerAnswered}/5 answered this section
          </p>
        </div>
      </div>
    );
  }

  // ── Saving ─────────────────────────────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <div style={{ background: '#09090f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2
            style={{ width: 32, height: 32, color: '#fcc824', animation: 'spin 1s linear infinite' }}
          />
          <p style={{ color: '#9090a8', fontSize: 15 }}>Calculating your results...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === 'results' || phase === 'error') {
    const patternKey = getPattern(totalScore);
    const pattern = PATTERNS[patternKey];

    const handleCopyScore = () => {
      const text = `My MindsetOS Score: ${totalScore}/100 — ${pattern.name}.\nGet yours free: mindset.show/scorecard`;
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return (
      <div style={{ background: '#09090f', minHeight: '100vh', padding: '32px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Back link */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#9090a8',
              fontSize: 14,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 32,
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Dashboard
          </button>

          {/* Save error banner */}
          {saveError && (
            <div
              style={{
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                color: '#fb923c',
                fontSize: 13,
              }}
            >
              Results couldn't be saved to your profile, but your scores are shown below.
            </div>
          )}

          {/* Score + pattern */}
          <div
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: `1px solid ${pattern.color}40`,
              borderLeft: `4px solid ${pattern.color}`,
              borderRadius: 20,
              padding: 28,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#9090a8', fontSize: 13, marginBottom: 8 }}>Your Mindset Architecture Score</p>
            <div style={{ fontSize: 72, fontWeight: 900, color: pattern.color, lineHeight: 1, marginBottom: 4 }}>
              {totalScore}
            </div>
            <p style={{ color: '#9090a8', fontSize: 14, marginBottom: 16 }}>out of 100</p>

            {/* Pattern badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: `${pattern.color}18`,
                border: `1px solid ${pattern.color}40`,
                borderRadius: 99,
                padding: '6px 16px',
              }}
            >
              <span style={{ color: pattern.color, fontSize: 14, fontWeight: 700 }}>{pattern.name}</span>
            </div>
          </div>

          {/* Sub-score bars */}
          <div
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: '1px solid #1e1e30',
              borderRadius: 20,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p style={{ color: '#ededf5', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Layer Breakdown</p>
            <SubScoreBar label="Awareness" score={awarenessScore} fillColor="#4f6ef7" />
            <SubScoreBar label="Interruption" score={interruptionScore} fillColor="#7c5bf6" />
            <SubScoreBar label="Architecture" score={architectureScore} fillColor="#fcc824" />
          </div>

          {/* Share score button */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={handleCopyScore}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(79,110,247,0.1)',
                border: '1px solid rgba(79,110,247,0.25)',
                color: copied ? '#22c55e' : '#4f6ef7',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
            >
              {copied ? (
                <>
                  <Check style={{ width: 14, height: 14 }} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy style={{ width: 14, height: 14 }} />
                  Share your score
                </>
              )}
            </button>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => router.push(`/dashboard?agent=${pattern.agentSlug}`)}
              style={{
                flex: 1,
                minWidth: 200,
                minHeight: 44,
                background: pattern.color,
                color: pattern.textColor,
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {pattern.agentLabel}
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={reset}
              style={{
                minHeight: 44,
                background: 'rgba(18,18,31,0.8)',
                color: '#9090a8',
                border: '1px solid #1e1e30',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
              Retake Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
