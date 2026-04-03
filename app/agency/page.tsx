'use client';

import { useState } from 'react';
import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  CheckCircle,
  Users,
  Sparkles,
  Brain,
  Shield,
  Zap,
  Layers,
  GraduationCap,
  UserPlus,
  BarChart3,
  Bot,
  ChevronDown,
  Minus,
} from 'lucide-react';

const CHECKOUT_URL = '/agency/checkout';

const PRACTICE_FEATURES = [
  {
    icon: Users,
    title: 'Multi-Client Management',
    desc: 'Switch between client profiles instantly. Every conversation, memory, and deliverable stays scoped to the right client.',
  },
  {
    icon: Brain,
    title: 'Per-Client AI Memory',
    desc: 'Each client gets their own AI memory \u2014 mindset profile, breakthroughs, patterns. No cross-contamination.',
  },
  {
    icon: Bot,
    title: 'Custom Coaching Agent Creator',
    desc: 'Build your own AI coaching agents trained on your methodologies. Your frameworks, your voice, your agents.',
  },
  {
    icon: Layers,
    title: 'Client-Scoped Playbooks',
    desc: 'Every playbook, exercise, and deliverable is tied to the right client. Export-ready for sessions.',
  },
  {
    icon: BarChart3,
    title: 'Granular Memory Controls',
    desc: 'Toggle which AI memory categories are active per conversation \u2014 profile, knowledge, history, coaching notes.',
  },
  {
    icon: Shield,
    title: 'All 10+ MindsetOS AI Agents',
    desc: 'Full access to every coaching agent in the platform, plus activate or deactivate agents per client.',
  },
];

const WHO_ITS_FOR = [
  'You coach 3+ clients and need separate workspaces for each',
  'You want AI agents that know each client\'s mindset profile, patterns, and goals',
  'You\'re building your own coaching frameworks and want custom agents to deliver them',
  'You need clean, client-ready exercises and deliverables without manual cleanup',
  'You want to scale your coaching practice without scaling your hours',
];

const COMPARISON = [
  { feature: 'AI Agent Access', starter: '10 agents', practice: '10+ agents + custom' },
  { feature: 'Client Profiles', starter: '1 (yours)', practice: '5 or 10 sub-accounts' },
  { feature: 'AI Memory', starter: 'Single context', practice: 'Per-client scoped' },
  { feature: 'Custom Coaching Agents', starter: '\u2014', practice: 'Create unlimited' },
  { feature: 'Playbook Scoping', starter: 'All in one list', practice: 'Per-client filtered' },
  { feature: 'Memory Controls', starter: 'On/Off toggle', practice: 'Granular 4-category' },
  { feature: 'Agent Management', starter: '\u2014', practice: 'Per-client activation' },
  { feature: 'Coaching Notes', starter: '1 profile', practice: 'Per-client profiles' },
  { feature: 'Knowledge Upload', starter: 'Shared', practice: 'Per-client + per-agent' },
];

const FAQS = [
  {
    q: 'What are "sub-accounts" exactly?',
    a: 'Each sub-account is a client profile with its own AI memory, brand voice, conversations, playbooks, and knowledge base. When you switch clients, everything scopes automatically \u2014 no manual cleanup needed.',
  },
  {
    q: 'Can I create custom coaching agents?',
    a: 'Yes. The Coaching Practice tier includes the Custom Agent Creator \u2014 a meta-agent that walks you through building coaching agents trained on your own frameworks and methodologies. Your coaching IP, packaged as AI.',
  },
  {
    q: 'What does "fair-use token allowance" mean?',
    a: 'You get generous monthly AI usage. Normal consulting workflows (building offers, writing promos, creating playbooks) stay well within limits. We only flag extreme outlier usage \u2014 like automated bulk processing.',
  },
  {
    q: 'Do I still get everything from Mindset Architecture?',
    a: 'Everything. All 10+ AI agents, coaching access, training modules, community, and bonuses. Coaching Practice adds multi-client management and custom coaching agents on top.',
  },
  {
    q: 'Can I upgrade from 5 to 10 clients later?',
    a: 'Absolutely. Upgrade anytime from your dashboard. You\'ll be prorated for the remaining billing cycle.',
  },
  {
    q: 'What happens if I need more than 10 clients?',
    a: 'Reach out directly \u2014 we offer custom Enterprise plans for larger coaching practices. DM Greg on LinkedIn or email hello@mindset.show.',
  },
];

type Plan = 'practice5' | 'practice10';

export default function CoachingPracticeLandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('practice5');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/[0.06] sticky top-0 bg-[#050510]/90 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MindsetOSLogo size="md" variant="light" />
            <span className="text-xl font-bold text-white">
              <span className="text-white/20 font-normal mx-1.5">/</span>
              <span className="text-white/80">Coaching Practice</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-white/50 hover:text-white transition-colors duration-300"
            >
              Sign In
            </Link>
            <a
              href={CHECKOUT_URL}
              className="px-5 py-2.5 bg-[#fcc824] hover:bg-[#fdd84a] text-black font-semibold rounded-lg transition-all duration-300 text-sm hover:shadow-[0_0_20px_rgba(252,200,36,0.25)]"
            >
              Get Coaching Practice
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background depth layers */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#fcc824]/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[100px] left-[5%] w-[400px] h-[400px] rounded-full blur-[120px]" style={{ background: 'rgba(252,200,36,0.03)' }} />
        <div className="absolute top-[200px] right-[5%] w-[350px] h-[350px] rounded-full blur-[120px]" style={{ background: 'rgba(124,91,246,0.03)' }} />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-24 sm:pb-32">
          <div className="text-center max-w-3xl mx-auto">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#fcc824]/[0.08] border border-[#fcc824]/20 rounded-full text-sm text-[#fcc824] font-medium mb-8"
              style={{ animationDelay: '0.1s' }}
            >
              <GraduationCap className="w-4 h-4" />
              Built for Coaches Running a Practice
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.1] mb-6 tracking-tight">
              Your Practice.{' '}
              <span className="text-[#fcc824]">Your Agents.</span>{' '}
              <br className="hidden sm:block" />
              Your Methodology.
            </h1>

            <p className="text-lg sm:text-xl text-white/50 mb-10 leading-relaxed max-w-2xl mx-auto">
              The Coaching Practice tier gives you separate AI workspaces for every client &mdash;
              their own memory, coaching notes, and exercises. Plus the power to
              build custom coaching agents around your own frameworks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
              <a
                href={CHECKOUT_URL}
                className="group px-8 py-4 bg-[#fcc824] hover:bg-[#fdd84a] text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.15)] hover:shadow-[0_0_40px_rgba(252,200,36,0.3)] flex items-center gap-2 text-lg transform hover:scale-[1.03]"
              >
                Start Coaching Practice &mdash; from $297/mo
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
            <span className="text-sm text-white/30">
              5 clients from $297/mo &middot; 10 clients from $397/mo
            </span>
          </div>
        </div>

        {/* Section transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050510]" />
      </section>

      {/* Bridge */}
      <section className="relative border-y border-white/[0.06]" style={{ background: 'linear-gradient(to right, rgba(252,200,36,0.03), transparent, rgba(124,91,246,0.03))' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-lg sm:text-xl font-medium text-white/70">
            You&apos;re already using MindsetOS to transform your own mindset.{' '}
            <span className="text-[#fcc824]">Now build a coaching practice that does it for every client &mdash; with your own AI agents.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 sm:py-28">
        {/* Background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#fcc824]/[0.02] rounded-full blur-[150px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white mb-5 tracking-tight">
              Everything You Need to Run a<br className="hidden sm:block" /> Coaching Practice
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              Each client gets their own AI-powered workspace. Your coaching methodology. Their breakthroughs. Clean separation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRACTICE_FEATURES.map((item, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#fcc824]/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(252,200,36,0.06)]"
              >
                <div className="w-11 h-11 bg-[#fcc824]/[0.08] rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:bg-[#fcc824]/[0.15] group-hover:shadow-[0_0_20px_rgba(252,200,36,0.1)]">
                  <item.icon className="w-5 h-5 text-[#fcc824]" />
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#fcc824] transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="relative py-20 sm:py-28">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-white/[0.03] to-white/[0.01]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fcc824]/[0.08] border border-[#fcc824]/20 rounded-full text-xs text-[#fcc824] font-bold uppercase tracking-wider mb-5">
                <UserPlus className="w-3.5 h-3.5" />
                Is This You?
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-5 tracking-tight leading-tight">
                Built for Coaches Who{' '}
                <span className="text-[#fcc824]">Serve Multiple Clients</span>
              </h2>
              <p className="text-white/40 mb-8 leading-relaxed">
                If you&apos;re coaching more than one client and tired of context-switching,
                copy-pasting, and cleaning up AI outputs that mix up who&apos;s who &mdash;
                Coaching Practice fixes that.
              </p>
              <div className="space-y-4">
                {WHO_ITS_FOR.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#fcc824]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#fcc824]" />
                    </div>
                    <span className="text-sm text-white/60 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Card glow */}
              <div className="absolute -inset-1 rounded-3xl blur-xl" style={{ background: 'linear-gradient(to bottom right, rgba(252,200,36,0.08), transparent, rgba(124,91,246,0.05))' }} />
              <div className="relative bg-white/[0.03] rounded-2xl p-8 border border-white/[0.08]">
                <h3 className="text-lg font-bold text-white mb-6">
                  How the Coaching Practice Works
                </h3>
                <div className="space-y-5">
                  {[
                    { step: '1', text: 'Create a client profile \u2014 name, goals, color badge' },
                    { step: '2', text: 'Switch to that client in the top bar \u2014 everything scopes automatically' },
                    { step: '3', text: 'Run assessments, build exercises, track progress \u2014 all stored per client' },
                    { step: '4', text: 'Switch client. Clean slate. No bleed. Repeat.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-[#fcc824] rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black text-black shadow-[0_0_15px_rgba(252,200,36,0.2)]">
                        {item.step}
                      </div>
                      <span className="text-sm text-white/60 pt-1.5 leading-relaxed">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute top-[50%] right-[10%] w-[300px] h-[300px] rounded-full blur-[100px]" style={{ background: 'rgba(124,91,246,0.03)' }} />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
              Standard vs Coaching Practice
            </h2>
            <p className="text-white/40">
              Everything in your current plan, plus multi-client superpowers.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-white/60">Feature</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-white/30">Standard</th>
                  <th className="text-center py-4 px-6 text-sm font-bold text-[#fcc824]">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Coaching Practice
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={`border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]`}>
                    <td className="py-3.5 px-6 text-sm text-white/70 font-medium">{row.feature}</td>
                    <td className="py-3.5 px-6 text-sm text-white/25 text-center">{row.starter}</td>
                    <td className="py-3.5 px-6 text-sm text-[#fcc824]/80 text-center font-medium">{row.practice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile comparison cards */}
          <div className="sm:hidden space-y-3">
            {COMPARISON.map((row, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs text-white/40 font-medium mb-2">{row.feature}</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/25">{row.starter}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/10" />
                  <div className="text-sm text-[#fcc824] font-medium">{row.practice}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="relative py-20 sm:py-28">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-white/[0.03] to-white/[0.01]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              Choose Your Coaching Practice Plan
            </h2>
            <p className="text-white/40">
              Scale your coaching practice with dedicated client workspaces and custom agents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
            {/* Practice 5 */}
            <button
              onClick={() => setSelectedPlan('practice5')}
              className={`group relative p-7 rounded-2xl border-2 text-left transition-all duration-500 ${
                selectedPlan === 'practice5'
                  ? 'border-[#fcc824]/60 bg-[#fcc824]/[0.04] shadow-[0_0_40px_rgba(252,200,36,0.08)]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.03]'
              }`}
            >
              {selectedPlan === 'practice5' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#fcc824] text-black text-xs font-bold rounded-full shadow-[0_0_15px_rgba(252,200,36,0.3)]">
                  Selected
                </div>
              )}
              <div className="text-xs text-[#fcc824]/70 font-bold uppercase tracking-wider mb-3">Practice 5</div>
              <div className="text-4xl font-black text-white mb-1 tracking-tight">
                $297<span className="text-lg text-white/30 font-normal tracking-normal">/mo</span>
              </div>
              <p className="text-sm text-white/30 mb-5">5 coaching clients</p>
              <div className="space-y-2.5">
                {['5 client profiles', 'Custom coaching agent creator', 'Per-client memory & notes', 'All 10+ AI agents', 'Fair-use token allowance'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-white/50">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#fcc824]/60" />
                    {item}
                  </div>
                ))}
              </div>
            </button>

            {/* Practice 10 */}
            <button
              onClick={() => setSelectedPlan('practice10')}
              className={`group relative p-7 rounded-2xl border-2 text-left transition-all duration-500 ${
                selectedPlan === 'practice10'
                  ? 'border-[#fcc824]/60 bg-[#fcc824]/[0.04] shadow-[0_0_40px_rgba(252,200,36,0.08)]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.03]'
              }`}
            >
              <div
                className="absolute -top-3 right-4 px-3 py-1 text-white text-[10px] font-bold rounded-full uppercase tracking-wide"
                style={{ background: '#7c5bf6', boxShadow: '0 0 15px rgba(124,91,246,0.35)' }}
              >
                Best Value
              </div>
              {selectedPlan === 'practice10' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#fcc824] text-black text-xs font-bold rounded-full shadow-[0_0_15px_rgba(252,200,36,0.3)]">
                  Selected
                </div>
              )}
              <div className="text-xs text-[#fcc824]/70 font-bold uppercase tracking-wider mb-3">Practice 10</div>
              <div className="text-4xl font-black text-white mb-1 tracking-tight">
                $397<span className="text-lg text-white/30 font-normal tracking-normal">/mo</span>
              </div>
              <p className="text-sm text-white/30 mb-5">10 coaching clients</p>
              <div className="space-y-2.5">
                {['10 client profiles', 'Custom coaching agent creator', 'Per-client memory & notes', 'All 10+ AI agents', 'Higher token allowance'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-white/50">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#fcc824]/60" />
                    {item}
                  </div>
                ))}
              </div>
            </button>
          </div>

          <div className="text-center">
            <a
              href={`${CHECKOUT_URL}?plan=${selectedPlan}`}
              className="group inline-flex items-center gap-2 px-10 py-4 bg-[#fcc824] hover:bg-[#fdd84a] text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.15)] hover:shadow-[0_0_50px_rgba(252,200,36,0.3)] text-lg transform hover:scale-[1.03]"
            >
              {selectedPlan === 'practice5' ? 'Get Practice 5 \u2014 $297/mo' : 'Get Practice 10 \u2014 $397/mo'}
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <p className="text-xs text-white/20 mt-4">
              Fair-use token policy &middot; Cancel anytime &middot; Billed monthly
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-10 text-center tracking-tight">
            Common Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                  openFaq === i
                    ? 'border-[#fcc824]/20 bg-[#fcc824]/[0.03]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <h3 className={`font-bold text-sm sm:text-base pr-4 transition-colors duration-300 ${openFaq === i ? 'text-[#fcc824]' : 'text-white/80'}`}>
                    {faq.q}
                  </h3>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    openFaq === i ? 'border-[#fcc824]/30 bg-[#fcc824]/10 rotate-0' : 'border-white/10 bg-white/[0.03] rotate-0'
                  }`}>
                    {openFaq === i ? (
                      <Minus className="w-3 h-3 text-[#fcc824]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-white/40" />
                    )}
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-5 pb-5 text-sm text-white/40 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#fcc824]/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#fcc824]/10 to-transparent" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 tracking-tight">
            Scale Your Coaching.<br className="hidden sm:block" /> Not Your Hours.
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
            Give every client their own AI-powered workspace. Build custom coaching agents around your methodologies.
            Deliver deeper transformations, faster.
          </p>
          <a
            href={CHECKOUT_URL}
            className="group inline-flex items-center gap-2 px-10 py-4 bg-[#fcc824] hover:bg-[#fdd84a] text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(252,200,36,0.15)] hover:shadow-[0_0_50px_rgba(252,200,36,0.3)] text-lg transform hover:scale-[1.03]"
          >
            Get Coaching Practice &mdash; from $297/mo
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <p className="text-sm text-white/20 mt-5">
            Cancel anytime &middot; All Mindset Architecture benefits included
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MindsetOSLogo size="xs" variant="light" />
              <span className="text-sm text-white/30">
                Coaching Practice &mdash; powered by{' '}
                <a
                  href="https://mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fcc824]/60 hover:text-[#fcc824] transition-colors duration-300"
                >
                  MindsetOS
                </a>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/25">
              <Link href="/join" className="hover:text-white/60 transition-colors duration-300">
                Mindset Architecture
              </Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors duration-300">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white/60 transition-colors duration-300">
                Privacy
              </Link>
              <a
                href="mailto:hello@mindset.show"
                className="hover:text-white/60 transition-colors duration-300"
              >
                Support
              </a>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-white/15">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
