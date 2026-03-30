'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import posthog from 'posthog-js';

interface Question {
  id: number;
  title: string;
  prompt: string;
  why: string;
  reflect: string;
  scores: { value: number; label: string }[];
  patternWatch: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'How Do You Respond Under Pressure?',
    prompt: 'When the stakes are high and the timeline is short — what actually happens inside you?',
    why: 'Your pressure response is the purest expression of your operating system. It fires before you have time to choose. The way you respond in the first 30 seconds of a crisis tells you more about your OS than a year of journaling.',
    reflect: 'Think about the last time something went sideways in your business — a client emergency, a missed deadline, a cash flow surprise. Don\'t think about what you did eventually. Think about what happened first.',
    scores: [
      { value: 1, label: 'Full shutdown. You freeze, avoid, or spiral into worst-case thinking. Hours or days lost.' },
      { value: 2, label: 'Reactive mode. You move fast but sloppy — putting out fires without thinking. You fix it, but create two new problems.' },
      { value: 3, label: 'Mixed. You handle it, but it costs you. You\'re drained afterward. Sleep suffers. You replay it for days.' },
      { value: 4, label: 'Steady. You feel the pressure, acknowledge it, and shift into problem-solving mode within minutes.' },
      { value: 5, label: 'Pressure activates clarity. You get sharper, calmer, more focused. You\'ve built a system for this.' },
    ],
    patternWatch: 'If you scored 1-2, your OS likely runs a Protector pattern under pressure — your system\'s primary job is threat avoidance, not problem-solving. This isn\'t weakness. It\'s old software. Your nervous system learned this response when it was useful. It just isn\'t useful at $20k/month.',
  },
  {
    id: 2,
    title: 'How Do You Make Decisions When the Path Isn\'t Clear?',
    prompt: 'When there\'s no obvious right answer — what does your decision-making process actually look like?',
    why: 'Ambiguity is the tax on growth. The bigger you build, the fewer decisions come with clear answers. Your OS either has a process for navigating uncertainty or it doesn\'t. Most entrepreneurs think they\'re "decisive." The real question is whether you\'re decisive or just impulsive — and whether you can tell the difference.',
    reflect: 'Think about a recent business decision where you genuinely didn\'t know the right move. How long did it take? What did you do in the gap between "I need to decide" and "I\'ve decided"? Did you research? Stall? Ask everyone you know? Just pick something and go?',
    scores: [
      { value: 1, label: 'Paralysis. You postpone until the decision makes itself (or someone else makes it for you).' },
      { value: 2, label: 'Over-research. You gather data endlessly but struggle to pull the trigger. Weeks pass.' },
      { value: 3, label: 'Gut-check and go — but with lingering doubt. You decide, then second-guess yourself quietly.' },
      { value: 4, label: 'Structured intuition. You give yourself a timeframe, weigh the key variables, decide, and move on.' },
      { value: 5, label: 'Comfortable with incomplete information. You\'ve built a decision framework and trust it. You decide fast and course-correct faster.' },
    ],
    patternWatch: 'If you scored 1-2, you\'re likely running an Analyst pattern — your OS equates thoroughness with safety. That\'s a superpower in some contexts. But at scale, the cost of a slow decision usually exceeds the cost of a wrong one. Your OS needs a speed upgrade, not more data.',
  },
  {
    id: 3,
    title: 'What Do You Do With Your Own Ideas?',
    prompt: 'When you have a genuinely good idea — what happens between "that\'s brilliant" and "that\'s live"?',
    why: 'Ideas are the raw material of entrepreneurship. But your operating system determines what happens to them. Some entrepreneurs drown in ideas and ship nothing. Others dismiss their best thinking because it doesn\'t come with a guarantee. The gap between ideation and execution is where most businesses quietly stall.',
    reflect: 'Think about the last three good ideas you had for your business. What happened to each one? Be specific. Did you execute? Shelve it? Start and abandon? Hand it off? Tell yourself you\'d "get to it"?',
    scores: [
      { value: 1, label: 'Idea graveyard. You have notebooks full of good ideas and almost none of them are live. You get excited, then move on to the next shiny thing.' },
      { value: 2, label: 'Start-stop cycle. You begin execution, hit the first real obstacle, and quietly abandon. Repeat.' },
      { value: 3, label: 'Selective execution. You ship maybe 1 in 5 ideas. The ones you ship work. But you know you\'re leaving value on the table.' },
      { value: 4, label: 'Disciplined pipeline. You capture, evaluate, and schedule ideas. Most good ones get executed within 30 days.' },
      { value: 5, label: 'Idea-to-execution machine. You have a system for filtering, prioritizing, and shipping. Your constraint is capacity, not follow-through.' },
    ],
    patternWatch: 'If you scored 1-2, you\'re likely running a Sprinter pattern — your OS is optimized for bursts of energy and novelty, not sustained execution. You don\'t lack ideas or even motivation. You lack an execution architecture. The good news: that\'s buildable.',
  },
  {
    id: 4,
    title: 'How Do You Handle Setbacks?',
    prompt: 'When something fails — a launch flops, a client leaves, a deal falls through — what story does your mind tell you?',
    why: 'Setbacks are data. But your OS doesn\'t treat them that way. It treats them as evidence — of your competence, your worth, your future. The story your mind tells you in the first 60 seconds after a failure is the single most revealing thing about your operating system.',
    reflect: 'Think about a recent failure or disappointment. Not a catastrophe — just something that didn\'t go the way you planned. What was the first thought that crossed your mind? What did you do in the next 24 hours? How long before you were fully back in motion?',
    scores: [
      { value: 1, label: 'It becomes identity. "I\'m not cut out for this." The setback triggers a spiral that affects everything — relationships, sleep, other projects. Recovery takes weeks.' },
      { value: 2, label: 'Avoidance. You don\'t spiral, but you quietly retreat from the area where you failed. You stop launching, stop pitching, stop putting yourself out there.' },
      { value: 3, label: 'Recovery with residue. You bounce back, but it takes longer than it should. The failure lingers in the background, making you subtly more cautious.' },
      { value: 4, label: 'Debrief and move. You feel the hit, give yourself a day, extract the lesson, and re-engage.' },
      { value: 5, label: 'Failure is fuel. You genuinely process setbacks as information. Your recovery time is measured in hours, not days. You\'ve built a post-failure protocol.' },
    ],
    patternWatch: 'If you scored 1-2, your OS likely ties outcomes to identity. This is the Performer pattern — your self-worth is wired to results. When results are good, you\'re unstoppable. When they\'re bad, everything feels bad. Separating performance from identity isn\'t a mindset trick. It\'s an architectural upgrade.',
  },
  {
    id: 5,
    title: 'What Drives You Into Deep Work?',
    prompt: 'When you\'re doing your best, most focused work — what conditions made that possible? And how often do you create those conditions on purpose?',
    why: 'Deep work is where the real leverage lives. It\'s where strategy gets built, problems actually get solved, and the work that moves the needle gets done. But most entrepreneurs leave deep work to chance.',
    reflect: 'Think about the last time you were genuinely locked in — fully focused, doing important work, not just busy work. What was happening? What time of day was it? What had you eliminated? Now ask yourself: did you design those conditions, or did they happen by accident?',
    scores: [
      { value: 1, label: 'Deep work is rare and accidental. Most days are reactive — emails, Slack, fires. You can\'t remember the last time you had 3 uninterrupted hours.' },
      { value: 2, label: 'You try, but it\'s fragile. You block time, but it gets hijacked constantly. Deep work happens maybe once a week.' },
      { value: 3, label: 'Inconsistent. You can do deep work, but you don\'t protect it. Some weeks are great. Others are all shallow.' },
      { value: 4, label: 'Regular and defended. You have blocks scheduled, and you protect them most of the time. 3-4 deep work sessions per week.' },
      { value: 5, label: 'Engineered. You\'ve designed your environment, schedule, and energy management around deep work. It\'s non-negotiable.' },
    ],
    patternWatch: 'If you scored 1-2, your OS is running in reactive mode by default. This isn\'t a scheduling problem — it\'s a permission problem. Somewhere, your operating system decided that being available is more important than being effective. That belief is costing you real money.',
  },
  {
    id: 6,
    title: 'What Stops You From Moving Forward?',
    prompt: 'Think about the thing you\'ve been meaning to do for months — the hire, the launch, the conversation, the decision. What\'s actually in the way?',
    why: 'This is the question that reveals the whole operating system. Not because the answer is complicated — but because the answer you give yourself is almost never the real one. "I need more time" usually means "I\'m afraid of the outcome." The thing that stops you isn\'t a circumstance. It\'s a pattern.',
    reflect: 'Pick the single biggest thing you\'ve been avoiding or delaying in your business right now. Not the small stuff — the one that would genuinely change your trajectory if you did it. What are you telling yourself is the reason? And underneath that — what\'s the real reason?',
    scores: [
      { value: 1, label: 'You can\'t even name the real reason. You\'ve been telling yourself the surface story so long it feels true. The real blocker is invisible to you.' },
      { value: 2, label: 'You suspect the surface reason isn\'t the whole story, but you haven\'t dug in. The pattern keeps winning.' },
      { value: 3, label: 'You can name the real blocker when you\'re honest with yourself. But knowing it hasn\'t been enough to change the behavior.' },
      { value: 4, label: 'You see the pattern clearly and you\'ve started building around it. You\'re not free of it, but it doesn\'t control your decisions anymore.' },
      { value: 5, label: 'You\'ve identified, named, and built a system to override your default blockers. When the pattern shows up, you have a protocol.' },
    ],
    patternWatch: 'The gap between your surface answer and your real answer is the gap between your conscious strategy and your operating system. If those two answers are very different, your OS is running code you didn\'t write — and it\'s making decisions you didn\'t authorize. That\'s not a willpower problem. That\'s an architecture problem.',
  },
  {
    id: 7,
    title: 'What Does Your Relationship With Risk Reveal?',
    prompt: 'When you think about taking a significant risk in your business — raising prices, making a big investment, launching something unproven — what happens in your body and your mind?',
    why: 'Risk tolerance isn\'t a personality trait. It\'s a setting in your operating system. Your relationship with risk determines your ceiling. Not your talent, not your market, not your offer. The business you\'re willing to risk building is the business you\'ll actually build.',
    reflect: 'Think about the last time you faced a real business risk — not a theoretical one, but a moment where real money, reputation, or security was on the line. What was the conversation in your head? Did you lean in or pull back? What would\'ve happened if you\'d done the opposite?',
    scores: [
      { value: 1, label: 'Risk avoidance runs the show. You default to the safe option almost every time. You\'ve stayed at the same revenue level for a long time because scaling feels dangerous.' },
      { value: 2, label: 'You take risks, but only when the downside is near zero. True asymmetric bets — where you could lose something real — are off the table.' },
      { value: 3, label: 'Mixed relationship. You can take risks, but it costs you emotionally. You lose sleep. You hedge excessively. The anxiety eats into your performance.' },
      { value: 4, label: 'Calibrated risk-taking. You can distinguish between reckless and strategic risks. You have a process for evaluating them.' },
      { value: 5, label: 'Risk-fluent. You\'ve reframed risk as information. You size bets deliberately, move quickly, and don\'t attach your identity to outcomes. You know the real risk is standing still.' },
    ],
    patternWatch: 'Your risk score is your OS\'s ceiling setting. If you scored 1-2, your operating system is optimizing for safety — which means it\'s actively preventing the growth your conscious mind is asking for. You\'re driving with one foot on the gas and one on the brake. That\'s not cautious. That\'s exhausting.',
  },
];

function getResult(total: number) {
  if (total <= 20) return {
    range: '7–20',
    label: 'Your OS Is Fighting You',
    body: 'Your operating system is running old code. The patterns governing your decisions, your energy, and your emotional responses were built for a version of your life that no longer exists. You\'re working hard — probably harder than most — but you\'re working against your own machinery.',
    cta: { label: 'Start the 48-Hour Mindset Reset — $47', href: 'https://mindset.show/reset', note: '6 exercises over 2 days. Surface and interrupt your core patterns.' },
  };
  if (total <= 28) return {
    range: '21–28',
    label: 'Your OS Is Mixed',
    body: 'Some of your operating system is working well. You\'ve probably done some inner work — or you\'ve naturally developed strong patterns in certain areas. But there are 2-3 dimensions where your OS is clearly working against you. Those gaps are where the money\'s leaking.',
    cta: { label: 'Apply for the 90-Day Mindset Architecture — $997', href: 'https://mindset.show/join', note: 'Systematic rebuild of the 2-3 dimensions holding you back, with coaching and a cohort at your level.' },
  };
  return {
    range: '29–35',
    label: 'Your OS Is Ready for the Next Level',
    body: 'Your operating system is strong. Your patterns are mostly serving you. You don\'t need repair work — you need optimization. The question for you isn\'t "what\'s broken?" It\'s "what\'s the next version?"',
    cta: { label: 'Apply for the 90-Day Mindset Architecture — $997', href: 'https://mindset.show/join', note: 'Work on the subtle patterns that are invisible at $20k/month but become the ceiling at $50k+.' },
  };
}

export default function AuditViewPage() {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [reflects, setReflects] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(scores).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

  const reset = () => { setScores({}); setReflects({}); setSubmitted(false); };

  const setScore = (id: number, value: number) => {
    setScores(prev => {
      if (Object.keys(prev).length === 0) {
        try {
          if (typeof window !== 'undefined' && posthog) {
            posthog.capture('audit_started', { source: 'audit' });
          }
        } catch (_) {}
      }
      return { ...prev, [id]: value };
    });
  };

  if (submitted) {
    const result = getResult(totalScore);
    const lowestQ = QUESTIONS.reduce((min, q) => (scores[q.id] || 0) < (scores[min.id] || 0) ? q : min);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Score */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your OS Audit Score</p>
            <div className="text-7xl font-black text-gray-900 dark:text-white mb-1">{totalScore}</div>
            <div className="text-lg text-gray-400 mb-4">out of 35</div>
            <div className="inline-block px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold mb-4">
              {result.label}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{result.body}</p>
          </div>

          {/* Score breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your Dimension Scores</h2>
            <div className="space-y-3">
              {QUESTIONS.map(q => {
                const s = scores[q.id] || 0;
                const isLow = q.id === lowestQ.id;
                return (
                  <div key={q.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium truncate ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          Q{q.id}: {q.title.split('?')[0].replace('How Do You ', '').replace('What Do You ', 'Your ').replace('What Drives You Into ', '').replace('What Stops You From Moving Forward', 'What Blocks You').replace('What Does Your Relationship With Risk Reveal', 'Risk Relationship')}
                          {isLow && <span className="ml-1 text-red-500">← lowest</span>}
                        </span>
                        <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{s}/5</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(s / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-6 text-white">
            <p className="text-xs text-gray-400 mb-1">Your next move</p>
            <h3 className="text-base font-bold mb-2">{result.label}</h3>
            <p className="text-sm text-gray-300 mb-4">{result.cta.note}</p>
            <a
              href={result.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined' && posthog) {
                    posthog.capture('audit_cta_clicked', { cta_type: result.label, score: totalScore });
                  }
                } catch (_) {}
              }}
              className="inline-block px-5 py-2.5 bg-white text-gray-900 text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {result.cta.label}
            </a>
          </div>

          {/* Retake */}
          <div className="text-center">
            <button onClick={reset} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <RotateCcw className="w-4 h-4" />
              Retake the audit
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            <Link href="https://mindset.show" target="_blank" className="hover:underline">mindset.show</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">MindsetOS</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">The OS Audit</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            7 questions · ~15 minutes · be honest
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Answer based on what you actually do — not what you think you should do.
            Your first instinct is usually the honest one.
          </p>
        </div>

        {/* Questions */}
        {QUESTIONS.map((q, idx) => {
          const score = scores[q.id];
          return (
            <div key={q.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Question header */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{q.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 italic">&ldquo;{q.prompt}&rdquo;</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Why this matters */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Why This Matters</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{q.why}</p>
                </div>

                {/* Reflect */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Reflect</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{q.reflect}</p>
                  <textarea
                    value={reflects[q.id] || ''}
                    onChange={e => setReflects(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write your thoughts here..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Score */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Score Yourself (1–5)</p>
                  <div className="space-y-2">
                    {q.scores.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setScore(q.id, s.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex gap-3 items-start ${
                          score === s.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5 ${
                          score === s.value
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-gray-400'
                        }`}>
                          {s.value}
                        </span>
                        <span className={`text-sm leading-relaxed ${score === s.value ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pattern watch — show after answering */}
                {score !== undefined && score <= 2 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Pattern Watch</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{q.patternWatch}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Submit */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{answeredCount} of {QUESTIONS.length} scored</span>
            {isComplete && (
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: {totalScore} / 35</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <button
            onClick={() => {
              try {
                if (typeof window !== 'undefined' && posthog) {
                  posthog.capture('audit_completed', { score: totalScore, source: 'audit' });
                }
              } catch (_) {}
              setSubmitted(true);
            }}
            disabled={!isComplete}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isComplete ? 'See My OS Score →' : `Score ${QUESTIONS.length - answeredCount} remaining question${QUESTIONS.length - answeredCount !== 1 ? 's' : ''}`}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          <Link href="https://mindset.show" target="_blank" className="hover:underline">mindset.show</Link>
          {' · '}Stop reacting. Start designing.
        </p>
      </div>
    </div>
  );
}
