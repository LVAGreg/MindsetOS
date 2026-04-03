'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RotateCcw } from 'lucide-react';
import posthog from 'posthog-js';

const SCALE = [
  { value: 1, label: 'Almost never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Usually' },
  { value: 5, label: 'Almost always' },
];

const DOMAINS = [
  {
    key: 'clarity',
    name: 'Clarity',
    subtitle: 'Can you think straight when things get hard?',
    color: 'blue',
    questions: [
      'When I wake up on a Monday, I know exactly what matters most this week — not just what\'s urgent.',
      'When someone asks me what I do and who I help, I can answer in one clear sentence without rambling.',
      'I can separate the "noise" decisions (font choices, social captions, inbox) from the "signal" decisions (pricing, partnerships, offers) without getting pulled into the noise.',
      'When I feel overwhelmed, I can identify the one thing creating most of the overwhelm within a few minutes.',
      'I don\'t confuse being busy with making progress. I can tell the difference in real time.',
    ],
    lowRange: '5-12',
    lowTitle: 'What\'s happening',
    lowBody: 'You\'re spending energy on the wrong things. Not because you\'re lazy or disorganized — because your mental filter isn\'t calibrated. Everything feels equally important, which means nothing gets your best thinking.',
    cta: { label: 'Start the 48-Hour Reset — $47', href: 'https://mindset.show/reset' },
  },
  {
    key: 'resilience',
    name: 'Resilience',
    subtitle: 'How quickly do you return to baseline after a hit?',
    color: 'purple',
    questions: [
      'After a tough conversation (with a client, partner, or team member), I can reset within an hour — not carry it through the whole day.',
      'When something doesn\'t go as planned, I look for what I can learn before I look for who to blame (including myself).',
      'A bad week doesn\'t make me question my entire business model.',
      'I can take critical feedback without shutting down or getting defensive — I actually use it.',
      'When I hit a low point, I have a specific practice or routine that helps me recover — not just "push through it."',
    ],
    lowRange: '5-12',
    lowTitle: 'What\'s happening',
    lowBody: 'You bounce back slower than you think. A lost client or a tough week doesn\'t just affect your mood — it affects your next 10 decisions. You\'re making business choices from a depleted state without realizing it.',
    cta: { label: 'Get the 7-Day Resilience Rebuild — Free', href: 'https://mindset.show/resilience' },
  },
  {
    key: 'decision',
    name: 'Decision Quality',
    subtitle: 'Are you deciding from data or from emotional state?',
    color: 'orange',
    questions: [
      'I can name my top 3 decision-making criteria for any major business move — before I start evaluating options.',
      'I rarely make the same decision twice. Once I commit, I don\'t reopen it two days later.',
      'When I feel stuck between two options, I can identify whether I\'m stuck because of the options or because of fear.',
      'I don\'t need permission, validation, or consensus from others before making a call I already know is right.',
      'I can make a high-stakes decision (pricing, firing, pivoting) within 48 hours — not let it drag on for weeks.',
    ],
    lowRange: '5-12',
    lowTitle: 'What\'s happening',
    lowBody: 'You\'re deciding from emotion and calling it intuition. Delayed decisions. Reversed decisions. Decisions made to avoid discomfort instead of to create progress.',
    cta: { label: 'Use the Decision Framework — Free inside MindsetOS', href: 'https://mindset.show/join' },
  },
  {
    key: 'identity',
    name: 'Identity Stability',
    subtitle: 'Does your self-worth move with your revenue?',
    color: 'green',
    questions: [
      'A slow month doesn\'t make me feel like I\'m failing at life — just at a metric.',
      'I don\'t compare my progress to people on LinkedIn and feel worse afterward.',
      'When a prospect says no, I can separate "they didn\'t buy" from "I\'m not good enough."',
      'My sense of who I am doesn\'t shift dramatically based on my last client result or last month\'s revenue.',
      'I can celebrate other people\'s wins without it triggering a story about what I haven\'t done yet.',
    ],
    lowRange: '5-12',
    lowTitle: 'What\'s happening',
    lowBody: 'Your sense of self rises and falls with your numbers. Good month? You\'re a genius. Bad month? You\'re a fraud. Your identity is anchored to outcomes instead of anchored to who you are.',
    cta: { label: 'Apply for the 90-Day Architecture — $997', href: 'https://mindset.show/join' },
  },
];

const COLOR_MAP: Record<string, { hex: string; hexBg: string; hexBorder: string; hexText: string; barHex: string }> = {
  blue:   { hex: '#4f6ef7', hexBg: 'rgba(79,110,247,0.08)',  hexBorder: 'rgba(79,110,247,0.25)',  hexText: '#818cf8', barHex: '#4f6ef7' },
  purple: { hex: '#7c5bf6', hexBg: 'rgba(124,91,246,0.08)', hexBorder: 'rgba(124,91,246,0.25)', hexText: '#a78bfa', barHex: '#7c5bf6' },
  orange: { hex: '#f97316', hexBg: 'rgba(249,115,22,0.08)', hexBorder: 'rgba(249,115,22,0.25)', hexText: '#fb923c', barHex: '#f97316' },
  green:  { hex: '#10b981', hexBg: 'rgba(16,185,129,0.08)', hexBorder: 'rgba(16,185,129,0.25)', hexText: '#34d399', barHex: '#10b981' },
};

function getInterpretation(total: number) {
  if (total >= 80) return { label: 'The Architect', body: 'Your thinking is a competitive advantage. You\'ve built a strong internal operating system. The opportunity for you is refinement, not rebuilding. You\'re ready for advanced architecture work — optimizing the system that\'s already working.' };
  if (total >= 60) return { label: 'The Aware One', body: 'You can see your patterns. You\'ve done some work. But there are gaps — and those gaps keep showing up as inconsistency. One month you\'re on fire, the next you\'re questioning everything. You don\'t need more information. You need a structure that holds the information you already have.' };
  if (total >= 40) return { label: 'The Searcher', body: 'You know something\'s off. You\'ve been trying to fix it with strategy, systems, and hustle. But the thing that\'s off isn\'t outside you. It\'s in how you\'re processing what\'s in front of you. This scorecard just showed you where. That\'s a very useful place to be standing.' };
  return { label: 'The Reactor', body: 'You\'re running your business from reactive mode. Decisions feel urgent. Setbacks feel personal. Revenue feels like a judgment on your worth. Here\'s the good news: you\'re not broken. You\'re running an operating system that was designed for survival, not for growth. And operating systems can be upgraded.' };
}

export default function ScorecardViewPage() {
  const totalQuestions = DOMAINS.reduce((n, d) => n + d.questions.length, 0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === totalQuestions;

  const domainScores = DOMAINS.map(d => ({
    ...d,
    score: d.questions.reduce((sum, _, qi) => sum + (answers[`${d.key}-${qi}`] || 0), 0),
  }));
  const totalScore = domainScores.reduce((s, d) => s + d.score, 0);
  const lowestDomain = [...domainScores].sort((a, b) => a.score - b.score)[0];

  const setAnswer = (domainKey: string, qi: number, val: number) => {
    setAnswers(prev => {
      if (Object.keys(prev).length === 0) {
        try {
          if (typeof window !== 'undefined' && posthog) {
            posthog.capture('scorecard_started', { source: 'scorecard' });
          }
        } catch (_) {}
      }
      return { ...prev, [`${domainKey}-${qi}`]: val };
    });
  };

  const reset = () => { setAnswers({}); setSubmitted(false); };

  if (submitted) {
    const interp = getInterpretation(totalScore);
    const lowestC = COLOR_MAP[lowestDomain.color];
    return (
      <div className="min-h-screen py-12 px-4" style={{ background: '#09090f' }}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score header */}
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#9090a8' }}>Your Thinking Score</p>
            <div className="text-7xl font-black mb-1" style={{ color: '#fcc824' }}>{totalScore}</div>
            <div className="text-lg mb-4" style={{ color: '#9090a8' }}>out of 100</div>
            <div
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ background: 'rgba(79,110,247,0.15)', color: '#818cf8', border: '1px solid rgba(79,110,247,0.3)' }}
            >
              {interp.label}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{interp.body}</p>
          </div>

          {/* Domain breakdown */}
          <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <h2 className="text-base font-bold mb-4" style={{ color: '#ededf5' }}>Domain Breakdown</h2>
            <div className="space-y-4">
              {domainScores.map(d => {
                const c = COLOR_MAP[d.color];
                const pct = (d.score / 25) * 100;
                return (
                  <div key={d.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: '#ededf5' }}>{d.name}</span>
                      <span className="text-sm font-bold" style={{ color: d.key === lowestDomain.key ? '#f87171' : '#9090a8' }}>
                        {d.score}/25{d.key === lowestDomain.key ? ' ← lowest' : ''}
                      </span>
                    </div>
                    <div style={{ height: 3, background: '#1e1e30', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: c.barHex, width: `${pct}%`, transition: 'all 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your leverage point */}
          <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <h2 className="text-base font-bold mb-1" style={{ color: '#ededf5' }}>Your Leverage Point</h2>
            <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
              Your lowest domain is the bottleneck. It affects everything else.
            </p>
            <div style={{ background: lowestC.hexBg, border: `1px solid ${lowestC.hexBorder}`, borderRadius: 12, padding: 16 }}>
              <div style={{ color: lowestC.hexText, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {lowestDomain.name} — {lowestDomain.score}/25
              </div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: '#ededf5' }}>
                {lowestDomain.lowBody}
              </p>
              <a
                href={lowestDomain.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined' && posthog) {
                      posthog.capture('scorecard_cta_clicked', { cta_type: lowestDomain.key, score: totalScore });
                    }
                  } catch (_) {}
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: '#fcc824', color: '#09090f' }}
              >
                {lowestDomain.cta.label}
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Retake */}
          <div className="text-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-sm transition-colors hover:text-[#ededf5]"
              style={{ color: '#9090a8' }}
            >
              <RotateCcw className="w-4 h-4" />
              Retake the scorecard
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: '#5a5a72' }}>
            <Link href="https://mindset.show" target="_blank" className="hover:underline">mindset.show</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#09090f' }}>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2" style={{ color: '#ededf5' }}>
            The Entrepreneur&apos;s Thinking Scorecard
          </h1>
          <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
            20 questions · 4 domains · 5 minutes
          </p>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: '#9090a8' }}>
            Rate each statement honestly based on the last 90 days, not your best week.
            Go with your gut — don&apos;t debate yourself.
          </p>
        </div>

        {/* Scale reference */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
          <div className="grid grid-cols-5 gap-1 text-center">
            {SCALE.map(s => (
              <div key={s.value}>
                <div className="text-lg font-bold" style={{ color: '#ededf5' }}>{s.value}</div>
                <div className="text-xs leading-tight" style={{ color: '#9090a8' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Domains */}
        {DOMAINS.map(domain => {
          const c = COLOR_MAP[domain.color];
          const domainScore = domain.questions.reduce((sum, _, qi) => sum + (answers[`${domain.key}-${qi}`] || 0), 0);
          const answeredInDomain = domain.questions.filter((_, qi) => answers[`${domain.key}-${qi}`]).length;

          return (
            <div key={domain.key} className="rounded-2xl p-6" style={{ background: c.hexBg, border: `1px solid ${c.hexBorder}` }}>
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-bold" style={{ color: c.hexText }}>{domain.name}</h2>
                <span style={{ background: c.hexBg, color: c.hexText, border: `1px solid ${c.hexBorder}`, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                  {answeredInDomain}/{domain.questions.length}
                </span>
              </div>
              <p className="text-xs mb-6 italic" style={{ color: '#9090a8' }}>{domain.subtitle}</p>

              <div className="space-y-6">
                {domain.questions.map((q, qi) => {
                  const key = `${domain.key}-${qi}`;
                  const val = answers[key];
                  return (
                    <div key={qi}>
                      <p className="text-sm mb-3 leading-relaxed" style={{ color: '#ededf5' }}>
                        <span className="font-semibold mr-2 text-xs" style={{ color: '#5a5a72' }}>
                          {DOMAINS.indexOf(domain) * 5 + qi + 1}.
                        </span>
                        {q}
                      </p>
                      <div className="flex gap-2">
                        {SCALE.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setAnswer(domain.key, qi, s.value)}
                            className="flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all"
                            style={
                              val === s.value
                                ? { background: c.hex, color: '#fff', border: `1px solid ${c.hex}` }
                                : { background: '#12121f', border: '1px solid #1e1e30', color: '#9090a8' }
                            }
                          >
                            {s.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {answeredInDomain === domain.questions.length && (
                <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${c.hexBorder}` }}>
                  <span className="text-xs" style={{ color: '#9090a8' }}>{domain.name} total</span>
                  <span style={{ color: c.hexText, fontSize: 18, fontWeight: 700 }}>{domainScore} / 25</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Progress / Submit */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: '#9090a8' }}>{answeredCount} of {totalQuestions} answered</span>
            {isComplete && (
              <span className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                Total: {Object.values(answers).reduce((s, v) => s + v, 0)} / 100
              </span>
            )}
          </div>
          <div style={{ height: 3, background: '#1e1e30', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
            <div
              style={{ height: '100%', background: '#4f6ef7', borderRadius: 99, width: `${(answeredCount / totalQuestions) * 100}%`, transition: 'width 0.3s ease' }}
            />
          </div>
          <button
            onClick={() => {
              try {
                if (typeof window !== 'undefined' && posthog) {
                  posthog.capture('scorecard_completed', { score: totalScore, lowest_domain: lowestDomain.key, source: 'scorecard' });
                }
              } catch (_) {}
              setSubmitted(true);
            }}
            disabled={!isComplete}
            className="w-full py-3.5 font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-black"
            style={{ background: '#fcc824' }}
          >
            {isComplete ? 'See My Score →' : `Answer all ${totalQuestions - answeredCount} remaining questions`}
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: '#5a5a72' }}>
          <Link href="https://mindset.show" target="_blank" className="hover:underline">mindset.show</Link>
          {' · '}Stop reacting. Start designing.
        </p>
      </div>
    </div>
  );
}
