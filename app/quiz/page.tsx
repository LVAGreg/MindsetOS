'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 1,
    text: "A big decision lands in your lap. Your instinct is to...",
    options: [
      { id: 'a', label: "Research it thoroughly before committing to anything", type: 'analyst' },
      { id: 'b', label: "Just start — you'll figure it out as you go", type: 'sprinter' },
      { id: 'c', label: "Think through everything that could go wrong first", type: 'protector' },
      { id: 'd', label: "Consider how this will look to the people who matter", type: 'performer' },
    ],
  },
  {
    id: 2,
    text: "Revenue drops 30% unexpectedly. Your first move?",
    options: [
      { id: 'a', label: "Pull the data and find exactly what changed", type: 'analyst' },
      { id: 'b', label: "Launch something new immediately", type: 'sprinter' },
      { id: 'c', label: "Pull back and conserve until you understand why", type: 'protector' },
      { id: 'd', label: "Check if your peers or clients have noticed", type: 'performer' },
    ],
  },
  {
    id: 3,
    text: "You're in a meeting and realize you made a mistake. You...",
    options: [
      { id: 'a', label: "Mentally replay it to understand exactly where you went wrong", type: 'analyst' },
      { id: 'b', label: "Move past it fast and focus on the next thing", type: 'sprinter' },
      { id: 'c', label: "Worry about it — what if it happens again?", type: 'protector' },
      { id: 'd', label: "Feel it immediately — what do they think of you now?", type: 'performer' },
    ],
  },
  {
    id: 4,
    text: "Your best month ever. How do you feel?",
    options: [
      { id: 'a', label: "Curious — you want to understand exactly what drove it", type: 'analyst' },
      { id: 'b', label: "Already thinking about the next goal", type: 'sprinter' },
      { id: 'c', label: "Slightly anxious — now you have something to lose", type: 'protector' },
      { id: 'd', label: "Proud — and aware of who noticed", type: 'performer' },
    ],
  },
  {
    id: 5,
    text: "You have 3 weeks to make a major hire. You...",
    options: [
      { id: 'a', label: "Create a detailed scorecard and interview process", type: 'analyst' },
      { id: 'b', label: "Go with gut on the first strong candidate", type: 'sprinter' },
      { id: 'c', label: "Delay until you're more certain — the wrong hire is worse than no hire", type: 'protector' },
      { id: 'd', label: "Factor in how the hire reflects on you as a leader", type: 'performer' },
    ],
  },
  {
    id: 6,
    text: "A peer hits a big milestone you haven't hit yet. You...",
    options: [
      { id: 'a', label: "Analyze what they did differently", type: 'analyst' },
      { id: 'b', label: "Get motivated and immediately start moving", type: 'sprinter' },
      { id: 'c', label: "Feel quietly threatened — what does this mean for you?", type: 'protector' },
      { id: 'd', label: "Compare — and feel the gap more than the goal", type: 'performer' },
    ],
  },
  {
    id: 7,
    text: "When you're at your best, what's usually true?",
    options: [
      { id: 'a', label: "You have clarity on the facts and the options", type: 'analyst' },
      { id: 'b', label: "You're in motion — momentum is everything", type: 'sprinter' },
      { id: 'c', label: "You feel safe — no major threats on the horizon", type: 'protector' },
      { id: 'd', label: "You're getting recognition for the right things", type: 'performer' },
    ],
  },
];

const RESULTS = {
  analyst: {
    label: 'Analyst',
    color: '#4f6ef7',
    headline: "You're an Analyst.",
    description:
      "Your superpower is pattern recognition. Your kryptonite is the gap between knowing and moving. You've probably made the right call dozens of times — and then spent another week researching it anyway.",
    keyInsight:
      "More information doesn't reduce risk. It delays the decision while the risk grows.",
    agentBridge:
      "The Decision Framework agent was built specifically for how you think.",
  },
  sprinter: {
    label: 'Sprinter',
    color: '#f59e0b',
    headline: "You're a Sprinter.",
    description:
      "You move fast and you trust yourself. Your blind spot: motion can be a form of avoidance. Sometimes the sprint is running away from a conversation you haven't had with yourself yet.",
    keyInsight: "The thing you're moving away from keeps pace.",
    agentBridge:
      "The Accountability Partner agent keeps you moving — and honest.",
  },
  protector: {
    label: 'Protector',
    color: '#7c5bf6',
    headline: "You're a Protector.",
    description:
      "You're not risk-averse — you're threat-aware. There's a difference. You've built something real and you know what it took. What you're protecting makes sense. What it's costing you might not.",
    keyInsight:
      "Caution compounds. Every delayed decision trains you to delay the next one.",
    agentBridge:
      "The Inner World Mapper agent helps you see what you're protecting — and whether it still needs protecting.",
  },
  performer: {
    label: 'Performer',
    color: '#10b981',
    headline: "You're a Performer.",
    description:
      "You're wired for impact — and for being seen. That's not vanity. It's how you're built. The problem is when the audience gets a vote in decisions that should be yours alone.",
    keyInsight:
      "The version of you that needs to be seen is running more decisions than you think.",
    agentBridge:
      "The Story Excavator agent helps you separate your identity from your results.",
  },
};

type ThinkingType = 'analyst' | 'sprinter' | 'protector' | 'performer';

function getDominantType(answers: string[]): ThinkingType {
  const counts: Record<string, number> = { analyst: 0, sprinter: 0, protector: 0, performer: 0 };
  answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0] as ThinkingType;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function QuizPage() {
  const [step, setStep] = useState(0);           // 0–6 = questions, 7 = result
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [resultType, setResultType] = useState<ThinkingType | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Email form state
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  function handleAnswer(optionType: string) {
    if (selectedOption) return; // prevent double-click
    setSelectedOption(optionType);

    setTimeout(() => {
      const newAnswers = [...answers, optionType];
      setAnswers(newAnswers);
      setSelectedOption(null);

      if (step === 6) {
        const dominant = getDominantType(newAnswers);
        setResultType(dominant);
        setDirection('forward');
        setStep(7);
      } else {
        setDirection('forward');
        setStep(s => s + 1);
      }
    }, 380);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !resultType) return;
    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          thinkingType: resultType,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setSubmitted(true);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const result = resultType ? RESULTS[resultType] : null;
  const progress = step >= 7 ? 7 : step;

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes resultReveal {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-forward { animation: slideInRight 0.32s ease-out both; }
        .anim-slide-back    { animation: slideInLeft  0.32s ease-out both; }
        .anim-r1 { animation: resultReveal 0.5s 0.00s ease-out both; }
        .anim-r2 { animation: resultReveal 0.5s 0.10s ease-out both; }
        .anim-r3 { animation: resultReveal 0.5s 0.20s ease-out both; }
        .anim-r4 { animation: resultReveal 0.5s 0.35s ease-out both; }
        .anim-r5 { animation: resultReveal 0.5s 0.50s ease-out both; }
        .anim-r6 { animation: resultReveal 0.5s 0.65s ease-out both; }
        .option-card {
          transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
        }
        .option-card:hover {
          border-color: rgba(79,110,247,0.6);
          background-color: rgba(79,110,247,0.06);
          transform: translateY(-1px);
        }
        .option-card.selected {
          transform: scale(0.98);
        }
      `}</style>

      <div className="min-h-screen bg-[#09090f] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-base font-bold text-[#ededf5]">
            Mindset<span className="text-[#4f6ef7]">OS</span>
          </Link>
          {step < 7 && (
            <span className="text-sm text-[#9090a8]">
              {step + 1} <span className="text-[#9090a8]/50">/ 7</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        {step < 7 && (
          <div className="px-6 mb-8">
            <div className="h-1 bg-[#12121f] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4f6ef7] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step) / 7) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12">

          {/* ── QUESTION SCREEN ── */}
          {step < 7 && (
            <div
              key={step}
              className={`w-full max-w-lg ${direction === 'forward' ? 'anim-slide-forward' : 'anim-slide-back'}`}
            >
              <h2 className="text-xl md:text-2xl font-bold text-[#ededf5] text-center mb-8 leading-snug">
                {QUESTIONS[step].text}
              </h2>

              <div className="space-y-3">
                {QUESTIONS[step].options.map(opt => {
                  const isSelected = selectedOption === opt.type;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(opt.type)}
                      disabled={!!selectedOption}
                      className={`option-card w-full text-left px-5 py-4 rounded-xl border text-sm font-medium leading-snug transition-all
                        ${isSelected
                          ? 'selected border-[#4f6ef7] bg-[#4f6ef7]/10 text-[#ededf5]'
                          : 'border-[#1e1e30] bg-[#12121f] text-[#9090a8] hover:text-[#ededf5]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RESULT SCREEN ── */}
          {step === 7 && result && (
            <div className="w-full max-w-xl">

              {!submitted ? (
                <>
                  {/* Type badge */}
                  <div className="anim-r1 text-center mb-6">
                    <span
                      className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                      style={{ background: `${result.color}20`, color: result.color, border: `1px solid ${result.color}40` }}
                    >
                      Your result: {result.label}
                    </span>
                  </div>

                  {/* Headline */}
                  <h1 className="anim-r2 text-3xl md:text-4xl font-bold text-[#ededf5] text-center mb-5 leading-tight">
                    {result.headline}
                  </h1>

                  {/* Description */}
                  <p className="anim-r3 text-[#9090a8] text-center text-base leading-relaxed mb-6">
                    {result.description}
                  </p>

                  {/* Key insight callout */}
                  <div
                    className="anim-r4 rounded-r-xl p-4 mb-8 border-l-4"
                    style={{
                      borderLeftColor: result.color,
                      background: `${result.color}10`,
                    }}
                  >
                    <p className="text-[#ededf5] text-sm font-medium leading-relaxed italic">
                      "{result.keyInsight}"
                    </p>
                  </div>

                  {/* Email capture */}
                  <div className="anim-r5 bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6">
                    <p className="text-[#ededf5] font-semibold text-base mb-1">
                      Get your full {result.label} breakdown
                    </p>
                    <p className="text-[#9090a8] text-sm mb-5">
                      5-day email series. Free tools. Built for exactly how you think.
                    </p>

                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#09090f] border border-[#1e1e30] text-[#ededf5] text-sm placeholder-[#9090a8]/50 focus:outline-none focus:border-[#4f6ef7] transition-colors"
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-[#09090f] border border-[#1e1e30] text-[#ededf5] text-sm placeholder-[#9090a8]/50 focus:outline-none focus:border-[#4f6ef7] transition-colors"
                      />

                      {formError && (
                        <p className="text-red-400 text-xs">{formError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || !email.trim()}
                        className="w-full py-3 px-6 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: result.color }}
                      >
                        {submitting ? (
                          <span className="opacity-70">Sending...</span>
                        ) : (
                          <>
                            Get my full breakdown + free tools
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-[#9090a8]/50 text-xs text-center mt-3">
                      No spam. Unsubscribe any time.
                    </p>
                  </div>

                  {/* Agent bridge */}
                  <p className="anim-r6 text-center text-[#9090a8] text-xs mt-5">
                    {result.agentBridge}
                  </p>
                </>
              ) : (
                /* ── SUCCESS STATE ── */
                <div className="text-center anim-r1">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: `${result.color}20` }}>
                    <CheckCircle size={28} style={{ color: result.color }} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#ededf5] mb-3">
                    Check your inbox.
                  </h2>
                  <p className="text-[#9090a8] text-base leading-relaxed mb-8 max-w-sm mx-auto">
                    Your full {result.label} breakdown is on its way. First email lands in the next few minutes.
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                    style={{ background: result.color }}
                  >
                    Try MindsetOS free
                    <ArrowRight size={16} />
                  </Link>
                  <p className="text-[#9090a8]/50 text-xs mt-4">
                    Free account. No credit card needed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── INTRO (step -1 handled by start screen below) ── */}
        </div>
      </div>
    </>
  );
}
