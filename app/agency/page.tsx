'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

type Plan = 'practice5' | 'practice10';

export default function CoachingPracticeLandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('practice5');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Mindset<span style={{ color: '#fcc824' }}>OS</span>
              <span className="text-gray-400 font-normal mx-1.5">/</span>
              Coaching Practice
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <a
              href={CHECKOUT_URL}
              className="px-4 py-2 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Get Coaching Practice
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-full text-sm text-indigo-700 dark:text-indigo-400 font-medium mb-6">
              <GraduationCap className="w-4 h-4" />
              Built for Coaches Running a Practice
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Your Practice.{' '}
              <span style={{ color: '#fcc824' }}>Your Agents.</span>{' '}
              Your Methodology.
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              The Coaching Practice tier gives you separate AI workspaces for every client &mdash;
              their own memory, coaching notes, and exercises. Plus the power to
              build custom coaching agents around your own frameworks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a
                href={CHECKOUT_URL}
                className="px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-lg transform hover:scale-105"
              >
                Start Coaching Practice &mdash; from $297/mo
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              5 clients from $297/mo &middot; 10 clients from $397/mo
            </span>
          </div>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-indigo-100/30 to-transparent dark:from-indigo-900/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Bridge */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-200">
            You&apos;re already using MindsetOS to transform your own mindset.{' '}
            <span className="text-indigo-700 dark:text-indigo-400">Now build a coaching practice that does it for every client &mdash; with your own AI agents.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Run a Coaching Practice
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Each client gets their own AI-powered workspace. Your coaching methodology. Their breakthroughs. Clean separation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRACTICE_FEATURES.map((item, i) => (
              <div
                key={i}
                className="relative p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all hover:shadow-lg group"
              >
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wide mb-4">
                <UserPlus className="w-3.5 h-3.5" />
                Is This You?
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Built for Coaches Who{' '}
                <span style={{ color: '#fcc824' }}>Serve Multiple Clients</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you&apos;re coaching more than one client and tired of context-switching,
                copy-pasting, and cleaning up AI outputs that mix up who&apos;s who &mdash;
                Coaching Practice fixes that.
              </p>
              <div className="space-y-3">
                {WHO_ITS_FOR.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                How the Coaching Practice Works
              </h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'Create a client profile \u2014 name, goals, color badge' },
                  { step: '2', text: 'Switch to that client in the top bar \u2014 everything scopes automatically' },
                  { step: '3', text: 'Run assessments, build exercises, track progress \u2014 all stored per client' },
                  { step: '4', text: 'Switch client. Clean slate. No bleed. Repeat.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                      {item.step}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 pt-1">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Standard vs Coaching Practice
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Everything in your current plan, plus multi-client superpowers.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Standard</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-indigo-700 dark:text-indigo-400">Coaching Practice</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 text-center">{row.starter}</td>
                    <td className="py-3 px-4 text-sm text-indigo-700 dark:text-indigo-400 text-center font-medium">{row.practice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Choose Your Coaching Practice Plan
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Scale your coaching practice with dedicated client workspaces and custom agents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            {/* 5 Clients */}
            <button
              onClick={() => setSelectedPlan('practice5')}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                selectedPlan === 'practice5'
                  ? 'border-indigo-500 bg-white dark:bg-gray-800 shadow-lg ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide mb-2">Practice 5</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                $297<span className="text-lg text-gray-400 font-normal">/mo</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">5 coaching clients</p>
              <div className="space-y-2">
                {['5 client profiles', 'Custom coaching agent creator', 'Per-client memory & notes', 'All 10+ AI agents', 'Fair-use token allowance'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fcc824' }} />
                    {item}
                  </div>
                ))}
              </div>
              {selectedPlan === 'practice5' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                  Selected
                </div>
              )}
            </button>

            {/* 10 Clients */}
            <button
              onClick={() => setSelectedPlan('practice10')}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                selectedPlan === 'practice10'
                  ? 'border-indigo-500 bg-white dark:bg-gray-800 shadow-lg ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                BEST VALUE
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide mb-2">Practice 10</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                $397<span className="text-lg text-gray-400 font-normal">/mo</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">10 coaching clients</p>
              <div className="space-y-2">
                {['10 client profiles', 'Custom coaching agent creator', 'Per-client memory & notes', 'All 10+ AI agents', 'Higher token allowance'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fcc824' }} />
                    {item}
                  </div>
                ))}
              </div>
              {selectedPlan === 'practice10' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                  Selected
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href={`${CHECKOUT_URL}?plan=${selectedPlan}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
            >
              {selectedPlan === 'practice5' ? 'Get Practice 5 \u2014 $297/mo' : 'Get Practice 10 \u2014 $397/mo'}
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Fair-use token policy &middot; Cancel anytime &middot; Billed monthly
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Common Questions
          </h2>
          <div className="space-y-6">
            {[
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
                q: 'Do I still get everything from Client Fast Start?',
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
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-gray-900 dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Scale Your Coaching. Not Your Hours.
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Give every client their own AI-powered workspace. Build custom coaching agents around your methodologies.
            Deliver deeper transformations, faster.
          </p>
          <a
            href={CHECKOUT_URL}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
          >
            Get Coaching Practice &mdash; from $297/mo
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Cancel anytime &middot; All Client Fast Start benefits included
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/mindset-os-logo.png"
                alt="MindsetOS"
                width={24}
                height={24}
                className="object-contain"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Coaching Practice &mdash; powered by{' '}
                <a
                  href="https://mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80"
                  style={{ color: '#fcc824' }}
                >
                  MindsetOS
                </a>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/join" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Client Fast Start
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <a
                href="mailto:hello@mindset.show"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Support
              </a>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
