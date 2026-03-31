'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  Brain,
  Users,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquare,
  Zap,
  Shield,
  Clock,
  Star,
  TrendingUp,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://mindset-os-backend-production.up.railway.app';

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Cohort {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  current_participants: number;
  max_participants: number;
  price_cents: number;
  status: string;
  cohort_type: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const WHAT_YOU_GET = [
  {
    icon: Brain,
    title: 'Weekly AI Coaching Sessions',
    desc: "Private access to the Architecture Coach agent \u2014 your 90-day AI companion for deep, contextual mindset work between calls.",
    accent: '#fcc824',
  },
  {
    icon: Users,
    title: 'Live Group Calls (Bi-Weekly)',
    desc: "Real-time sessions with Greg and your cohort. Process breakthroughs, get unstuck, and build the accountability that actually moves the needle.",
    accent: '#10b981',
  },
  {
    icon: MessageSquare,
    title: 'Private Cohort Community',
    desc: "A focused group of 8\u201312 entrepreneurs moving through the same architecture at the same time. No noise. High signal.",
    accent: '#8b5cf6',
  },
  {
    icon: TrendingUp,
    title: '90-Day Structured Curriculum',
    desc: "A sequenced program \u2014 not a random collection of exercises. Each week builds on the last, with clear milestones and measurable progress.",
    accent: '#f97316',
  },
] as const;

const PHASES = [
  {
    num: '01',
    label: 'The Audit',
    weeks: 'Weeks 1\u20134',
    title: 'Map Your Current Operating System',
    desc: "Before you can redesign anything, you need to see it clearly. This phase surfaces the patterns, beliefs, and decisions that are running your life right now \u2014 most of which you've never consciously examined.",
    milestones: [
      'Complete your full Mindset Score baseline',
      "Map the 5\u20137 core stories driving your behaviour",
      'Identify your 3 highest-cost reactive patterns',
      'Build your personal operating system diagram',
    ],
    accent: '#fcc824',
    dim: '#fcc82420',
  },
  {
    num: '02',
    label: 'The Interruption',
    weeks: 'Weeks 5\u20138',
    title: 'Break the Patterns That Cost You',
    desc: "Insight without interruption is just information. This phase gives you tested methods to physically break the loops \u2014 in the moment, under pressure, when it actually matters.",
    milestones: [
      'Complete the 48-Hour Reset within the cohort context',
      'Install the DESIGN decision framework',
      'Build your personal pattern-interrupt toolkit',
      'Practice real-time application in live scenarios',
    ],
    accent: '#f97316',
    dim: '#f9731620',
  },
  {
    num: '03',
    label: 'The Architecture',
    weeks: 'Weeks 9\u201312',
    title: 'Install the New System Permanently',
    desc: "This is where the work becomes identity. You're not trying to break a habit anymore \u2014 you're consolidating a new operating system. The goal: make the new thinking the default, not the effort.",
    milestones: [
      'Build your permanent 10-minute daily practice',
      'Define your personal decision criteria for life and business',
      'Complete your Architecture Scorecard (baseline to current)',
      'Leave with a 12-month maintenance protocol',
    ],
    accent: '#10b981',
    dim: '#10b98120',
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "I finally see the patterns that were running my decisions. Three weeks in I made a call I'd been avoiding for two years \u2014 and it was the right one.",
    name: 'Sarah K.',
    role: 'Founder, 6-figure coaching practice',
    initial: 'S',
    accent: '#fcc824',
  },
  {
    quote:
      "The combination of AI between calls and Greg on the calls is unlike anything else. You're never stuck waiting for the next session.",
    name: 'Marcus D.',
    role: 'SaaS operator, $2M ARR',
    initial: 'M',
    accent: '#10b981',
  },
  {
    quote:
      "I've done therapy, journaling, mastermind groups. This is the first thing that gave me a system \u2014 not just awareness. The difference is enormous.",
    name: 'Priya L.',
    role: 'Entrepreneur & consultant',
    initial: 'P',
    accent: '#8b5cf6',
  },
] as const;

const FAQS = [
  {
    q: 'Who is this for?',
    a: "Entrepreneurs and founders who are already succeeding by most measures \u2014 but know their thinking is the ceiling. You're not broken. You're just running software that hasn't been updated. This is for people who want to operate from their real potential, not their reactive defaults.",
  },
  {
    q: 'How does the AI coaching work between calls?',
    a: "You get direct access to the Architecture Coach agent \u2014 an AI trained on the full 90-Day curriculum. Between live calls, you can work through exercises, process decisions in real time, reflect on weekly progress, and get unstuck without waiting for the next group session. It remembers your context across the program.",
  },
  {
    q: 'What if I fall behind or miss a session?',
    a: "Life happens. All live calls are recorded and available within 24 hours. The AI coaching is always available, so you can continue the curriculum on your schedule. The cohort structure gives you accountability without making a missed week a catastrophe.",
  },
  {
    q: 'Is there a guarantee?',
    a: "Yes. If you complete the full 90-day curriculum \u2014 all exercises, both phases, the final Architecture Scorecard \u2014 and don't feel a measurable shift in how you think and decide, reach out within 7 days of completion for a full refund. We're not interested in keeping money from people who did the work and didn't get the result.",
  },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function seats(cohort: Cohort) {
  if (!cohort.max_participants) return null;
  return cohort.max_participants - cohort.current_participants;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1e1e30] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-[#ededf5] group-hover:text-[#fcc824] transition-colors leading-snug">
          {q}
        </span>
        <ChevronDown
          className={`shrink-0 mt-0.5 w-5 h-5 text-[#fcc824] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-[#9898b3] leading-relaxed text-sm">{a}</p>
      </div>
    </div>
  );
}

function CohortCard({
  cohort,
  onEnroll,
}: {
  cohort: Cohort;
  onEnroll: (id: number) => void;
}) {
  const remaining = seats(cohort);
  const isFull = remaining !== null && remaining <= 0;
  const isAlmostFull = remaining !== null && remaining <= 3 && remaining > 0;

  return (
    <div className="relative bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6 hover:border-[#fcc824]/40 transition-all duration-300">
      {isAlmostFull && (
        <div className="absolute -top-3 left-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f97316] text-black text-xs font-bold rounded-full">
            <Zap className="w-3 h-3" />
            {remaining} {remaining === 1 ? 'spot' : 'spots'} left
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#ededf5] mb-1">{cohort.name}</h3>
          {cohort.description && (
            <p className="text-sm text-[#9898b3] mb-4 leading-relaxed">
              {cohort.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-[#6b6b8a]">
              <Calendar className="w-4 h-4 text-[#fcc824]" />
              Starts {formatDate(cohort.start_date)}
            </span>
            {cohort.max_participants && (
              <span className="flex items-center gap-1.5 text-[#6b6b8a]">
                <Users className="w-4 h-4 text-[#10b981]" />
                {cohort.current_participants}/{cohort.max_participants} enrolled
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
          <div>
            <span className="text-2xl font-black text-[#ededf5]">
              ${(cohort.price_cents / 100).toLocaleString()}
            </span>
            <span className="text-[#6b6b8a] text-sm ml-1">one-time</span>
          </div>
          {isFull ? (
            <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1e1e30] text-[#6b6b8a] rounded-xl text-sm font-semibold cursor-not-allowed">
              Cohort Full
            </span>
          ) : (
            <button
              onClick={() => onEnroll(cohort.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#fcc824] hover:bg-[#ffd84d] text-black rounded-xl text-sm font-bold transition-all duration-200 shadow-[0_0_20px_rgba(252,200,36,0.2)] hover:shadow-[0_0_30px_rgba(252,200,36,0.35)]"
            >
              Enroll Now
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          magnetType: 'cohort-waitlist',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#fcc824]/10 border border-[#fcc824]/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#fcc824]" />
        </div>
        <div>
          <p className="text-lg font-bold text-[#ededf5] mb-1">You're on the list.</p>
          <p className="text-[#9898b3] text-sm">
            We'll reach out as soon as the next cohort opens. Keep an eye on your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full px-4 py-3 bg-[#0d0d1a] border border-[#1e1e30] focus:border-[#fcc824]/60 rounded-xl text-[#ededf5] placeholder-[#4a4a6a] text-sm outline-none transition-colors"
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-[#0d0d1a] border border-[#1e1e30] focus:border-[#fcc824]/60 rounded-xl text-[#ededf5] placeholder-[#4a4a6a] text-sm outline-none transition-colors"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#fcc824] hover:bg-[#ffd84d] disabled:bg-[#fcc824]/40 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all duration-200 shadow-[0_0_24px_rgba(252,200,36,0.2)] hover:shadow-[0_0_36px_rgba(252,200,36,0.35)]"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Joining waitlist…
          </>
        ) : (
          <>
            Join the Waitlist
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      <p className="text-center text-xs text-[#4a4a6a]">
        No spam. You'll only hear from us when a cohort opens.
      </p>
    </form>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function CohortLandingPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const enrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const res = await fetch(`${API_URL}/api/cohort`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setCohorts(Array.isArray(data) ? data : []);
        }
      } catch {
        // Network error — fall through to waitlist state
      } finally {
        setLoading(false);
      }
    }
    fetchCohorts();
  }, []);

  function handleEnroll(cohortId: number) {
    // Route to checkout with the cohort plan
    window.location.href = `/checkout?plan=architecture_997&cohortId=${cohortId}`;
  }

  function scrollToEnroll() {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const hasCohorts = cohorts.length > 0;

  return (
    <>
      {/* ─── Keyframes ─── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .anim-f1 { animation: fadeUp 0.6s 0.05s ease-out both; }
        .anim-f2 { animation: fadeUp 0.6s 0.15s ease-out both; }
        .anim-f3 { animation: fadeUp 0.6s 0.25s ease-out both; }
        .anim-f4 { animation: fadeUp 0.6s 0.35s ease-out both; }
        .anim-f5 { animation: fadeUp 0.6s 0.45s ease-out both; }
        .anim-fi { animation: fadeIn 0.8s 0.1s ease-out both; }
        .gold-shimmer {
          background: linear-gradient(90deg, #fcc824 0%, #ffe97a 40%, #fcc824 60%, #e6a800 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .phase-line::before {
          content: '';
          position: absolute;
          left: 23px;
          top: 48px;
          bottom: -24px;
          width: 1px;
          background: linear-gradient(to bottom, var(--phase-accent), transparent);
        }
      `}</style>

      <div className="min-h-screen bg-[#09090f] text-[#ededf5]">

        {/* ─── Atmospheric background ─── */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#fcc824]/[0.04] rounded-full blur-[160px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/[0.04] rounded-full blur-[160px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#10b981]/[0.02] rounded-full blur-[200px]" />
        </div>

        {/* ─── Nav ─── */}
        <header className="relative z-10 border-b border-white/[0.05] bg-[#09090f]/80 backdrop-blur-xl sticky top-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" aria-label="MindsetOS home">
              <MindsetOSLogo size="sm" variant="light" />
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm">
              <a href="#program" className="text-[#9898b3] hover:text-[#ededf5] transition-colors">Program</a>
              <a href="#phases" className="text-[#9898b3] hover:text-[#ededf5] transition-colors">Curriculum</a>
              <a href="#faq" className="text-[#9898b3] hover:text-[#ededf5] transition-colors">FAQ</a>
              <button
                onClick={scrollToEnroll}
                className="px-4 py-2 bg-[#fcc824] hover:bg-[#ffd84d] text-black text-xs font-bold rounded-lg transition-all duration-200"
              >
                Enroll Now
              </button>
            </nav>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">

          {/* Badge */}
          <div className="anim-f1 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#fcc824]/25 bg-[#fcc824]/[0.07] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fcc824] animate-pulse" />
            <span className="text-xs font-semibold text-[#fcc824] tracking-wide uppercase">
              Next Cohort · Rolling Enrollment
            </span>
          </div>

          {/* Headline */}
          <h1 className="anim-f2 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6">
            <span className="gold-shimmer">90-Day</span>
            <br />
            <span className="text-[#ededf5]">Mindset Architecture</span>
          </h1>

          {/* Subhead */}
          <p className="anim-f3 max-w-2xl mx-auto text-lg sm:text-xl text-[#9898b3] leading-relaxed mb-10">
            A structured group program for entrepreneurs ready to permanently
            redesign how they think, decide, and lead.
          </p>

          {/* CTAs */}
          <div className="anim-f4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={scrollToEnroll}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#ffd84d] text-black font-bold rounded-2xl text-base transition-all duration-200 shadow-[0_0_40px_rgba(252,200,36,0.25)] hover:shadow-[0_0_60px_rgba(252,200,36,0.4)]"
            >
              Reserve Your Spot
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#phases"
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent border border-[#1e1e30] hover:border-[#2e2e45] text-[#ededf5] rounded-2xl text-base font-semibold transition-colors"
            >
              See the Curriculum
            </a>
          </div>

          {/* Social proof strip */}
          <div className="anim-f5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#6b6b8a]">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#fcc824]" />
              8–12 entrepreneurs per cohort
            </span>
            <span className="w-px h-4 bg-[#1e1e30] hidden sm:block" />
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#fcc824]" />
              AI coaching between live calls
            </span>
            <span className="w-px h-4 bg-[#1e1e30] hidden sm:block" />
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#fcc824]" />
              Completion guarantee
            </span>
          </div>
        </section>

        {/* ─── What you get ─── */}
        <section id="program" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-3">
              What's Included
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ededf5]">
              Everything you need to rebuild the system
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHAT_YOU_GET.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6 hover:border-opacity-60 transition-all duration-300"
                  style={{ ['--hover-accent' as string]: item.accent }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.accent }} />
                  </div>
                  <h3 className="text-base font-bold text-[#ededf5] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#9898b3] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Phase timeline ─── */}
        <section id="phases" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-3">
              The Curriculum
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ededf5]">
              Three phases. One permanent shift.
            </h2>
            <p className="mt-4 text-[#9898b3] max-w-xl mx-auto text-base">
              Each phase builds on the last. You're not collecting insights —
              you're installing a new operating system, one layer at a time.
            </p>
          </div>

          <div className="space-y-6">
            {PHASES.map((phase, idx) => (
              <div
                key={phase.num}
                className="relative bg-[#12121f] border border-[#1e1e30] rounded-2xl overflow-hidden"
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                  style={{ background: phase.accent }}
                />

                <div className="pl-6 pr-6 py-7 sm:pl-8">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    {/* Phase number */}
                    <div className="shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: phase.dim, border: `1px solid ${phase.accent}30` }}
                      >
                        <span
                          className="text-lg font-black font-mono"
                          style={{ color: phase.accent }}
                        >
                          {phase.num}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: phase.dim, color: phase.accent }}
                        >
                          {phase.label}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-[#6b6b8a]">
                          <Clock className="w-3.5 h-3.5" />
                          {phase.weeks}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-[#ededf5] mb-3">{phase.title}</h3>
                      <p className="text-sm text-[#9898b3] leading-relaxed mb-5">{phase.desc}</p>

                      {/* Milestones */}
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {phase.milestones.map((m) => (
                          <li key={m} className="flex items-start gap-2.5 text-sm text-[#9898b3]">
                            <CheckCircle2
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: phase.accent }}
                            />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-3">
              From Past Cohort Members
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ededf5]">
              What the shift actually looks like
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-[#12121f] border border-[#1e1e30] rounded-2xl p-6 flex flex-col gap-5"
              >
                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-[#fcc824] text-[#fcc824]"
                    />
                  ))}
                </div>
                <p className="text-sm text-[#c8c8e0] leading-relaxed flex-1">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-[#1e1e30]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: `${t.accent}20`, color: t.accent }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#ededf5]">{t.name}</p>
                    <p className="text-xs text-[#6b6b8a]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Enrollment section ─── */}
        <section
          id="enroll"
          ref={enrollRef as React.RefObject<HTMLElement>}
          className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20"
        >
          {/* Section glow */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#fcc824]/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-3">
              {hasCohorts ? 'Open Cohorts' : 'Rolling Enrollment'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ededf5]">
              {hasCohorts ? 'Secure your spot' : 'Join the waitlist'}
            </h2>
            {!hasCohorts && (
              <p className="mt-4 text-[#9898b3] max-w-lg mx-auto text-base">
                The next cohort is being scheduled. Drop your email and you'll
                be the first to know — with priority access before public
                enrollment opens.
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#fcc824] animate-spin" />
            </div>
          ) : hasCohorts ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {cohorts.map((c) => (
                <CohortCard key={c.id} cohort={c} onEnroll={handleEnroll} />
              ))}

              {/* Direct checkout link (fallback / always visible) */}
              <div className="mt-8 bg-[#12121f] border border-[#fcc824]/20 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#ededf5] mb-1">
                      Ready to commit?
                    </p>
                    <p className="text-xs text-[#9898b3]">
                      $997 · 90-day group cohort · Completion guarantee
                    </p>
                  </div>
                  <Link
                    href="/checkout?plan=architecture_997"
                    className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#fcc824] hover:bg-[#ffd84d] text-black font-bold rounded-xl text-sm transition-all duration-200 shadow-[0_0_24px_rgba(252,200,36,0.2)] hover:shadow-[0_0_36px_rgba(252,200,36,0.35)]"
                  >
                    Enroll for $997
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto bg-[#12121f] border border-[#1e1e30] rounded-2xl p-8">
              <WaitlistForm />
            </div>
          )}

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[#6b6b8a]">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#10b981]" />
              Completion guarantee
            </span>
            <span className="w-px h-4 bg-[#1e1e30] hidden sm:block" />
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#10b981]" />
              Max 12 per cohort
            </span>
            <span className="w-px h-4 bg-[#1e1e30] hidden sm:block" />
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#10b981]" />
              AI coaching included
            </span>
            <span className="w-px h-4 bg-[#1e1e30] hidden sm:block" />
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#10b981]" />
              Recorded calls
            </span>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-3">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ededf5]">
              Questions
            </h2>
          </div>

          <div className="bg-[#12121f] border border-[#1e1e30] rounded-2xl px-6 sm:px-8">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <div className="relative bg-[#12121f] border border-[#fcc824]/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
            {/* Background orb */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#fcc824]/[0.06] rounded-full blur-[80px]" />
            </div>

            <p className="relative text-xs font-bold text-[#fcc824] uppercase tracking-widest mb-4">
              The next 90 days happen either way.
            </p>
            <h2 className="relative text-3xl sm:text-4xl font-black text-[#ededf5] mb-5 leading-tight">
              The question is whether you'll spend them{' '}
              <br className="hidden sm:block" />
              <span className="gold-shimmer">designing your thinking</span>
              {' '}or reacting to it.
            </h2>
            <p className="relative text-[#9898b3] mb-10 max-w-lg mx-auto leading-relaxed">
              $997 · 90-day group cohort · 8–12 entrepreneurs · AI coaching between calls ·
              Bi-weekly live sessions with Greg · Completion guarantee
            </p>
            <button
              onClick={scrollToEnroll}
              className="relative inline-flex items-center gap-3 px-10 py-4 bg-[#fcc824] hover:bg-[#ffd84d] text-black font-black text-base rounded-2xl transition-all duration-200 shadow-[0_0_60px_rgba(252,200,36,0.3)] hover:shadow-[0_0_80px_rgba(252,200,36,0.45)]"
            >
              Reserve Your Spot
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="relative z-10 border-t border-[#1e1e30] py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6b6b8a]">
            <MindsetOSLogo size="xs" variant="light" />
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-[#ededf5] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[#ededf5] transition-colors">
                Terms
              </Link>
              <Link href="/dashboard" className="hover:text-[#ededf5] transition-colors">
                Dashboard
              </Link>
            </div>
            <p>© 2026 MindsetOS. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </>
  );
}
