'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
  Users,
  TrendingUp,
  MessageSquare,
  Shield,
  Star,
  Target,
} from 'lucide-react';

const TRIAL_AGENTS = [
  {
    name: 'Client Onboarding',
    description: 'Your personal setup guide — configures MindsetOS for your mindset coaching business so every agent knows exactly who you help.',
    icon: '🚀',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Money Model Mapper',
    description: 'Build your offer foundation: WHO you help, WHAT you promise, and the 3 PRINCIPLES that make it work.',
    icon: '💰',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'The Offer Invitation Architect',
    description: 'Generate a powerful promotional invitation using the proven 6 Ps framework.',
    icon: '📣',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'LinkedIn Events Builder Buddy',
    description: 'Create compelling event topics using the WHAT-WHAT-HOW framework for LinkedIn.',
    icon: '📅',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Qualification Call Builder',
    description: 'Create a conversion-ready sales script that turns conversations into clients.',
    icon: '📞',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Presentation Printer',
    description: 'Design high-impact presentations and event content that positions you as the authority.',
    icon: '🎯',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Email Promo Engine',
    description: 'Turn any offer into a high-converting email campaign with proven copy frameworks.',
    icon: '📧',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'MindsetAI Super Agent',
    description: 'Your on-demand mindset coaching strategist — answers any business development question.',
    icon: '🧠',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Deep Research Expert',
    description: 'In-depth market research and competitive analysis to sharpen your positioning.',
    icon: '🔬',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Content Catalyst',
    description: 'Repurpose your expertise into high-impact content across every platform.',
    icon: '✍️',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Voice Expert',
    description: 'Refine your speaking and communication style for maximum client impact.',
    icon: '🎙️',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'Sales Roleplay Coach',
    description: 'Practice sales conversations with AI roleplay to sharpen your closing skills.',
    icon: '🎭',
    unlocked: true,
    tag: 'Included in Trial',
  },
  {
    name: 'MindsetOS Roadmap Companion',
    description: 'Strategic planning and milestone tracking to keep your mindset coaching business on track.',
    icon: '🗺️',
    unlocked: true,
    tag: 'Included in Trial',
  },
];

const SOCIAL_PROOF = [
  { metric: '87+', label: 'Active Entrepreneurs' },
  { metric: '14+', label: 'MindsetOS AI Agents' },
  { metric: '30%', label: 'Avg. Conversion Rate' },
  { metric: '7 Days', label: 'Free Trial' },
];

export default function TrialLandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">MindsetOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register/trial"
              className="px-4 py-2 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-sm text-amber-700 dark:text-amber-400 font-medium mb-6">
              <Clock className="w-4 h-4" />
              7-Day Free Trial &mdash; No Credit Card Required
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Build Your Mindset Coaching Offer{' '}
              <span style={{ color: '#fcc824' }}>in Minutes,</span>{' '}
              Not Months
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              MindsetOS gives you AI-powered agents that walk you through building
              your offer, creating promotions, and converting clients &mdash;
              using the same frameworks used by 6-figure entrepreneurs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/register/trial"
                className="px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-lg transform hover:scale-105"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No credit card &middot; Cancel anytime &middot; Full access for 7 days
              </span>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-amber-100/30 to-transparent dark:from-amber-900/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {SOCIAL_PROOF.map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white" style={{ color: '#fcc824' }}>
                  {item.metric}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What's Inside Your Free Trial
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Full access to all 14+ MindsetOS AI agents — from offer creation to client conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRIAL_AGENTS.map((agent, i) => (
              <div
                key={i}
                className="relative p-6 rounded-xl border-2 transition-all border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10 shadow-lg"
              >
                <div className="absolute -top-3 left-4 px-3 py-1 bg-[#fcc824] text-black text-xs font-bold rounded-full">
                  {agent.tag}
                </div>
                <div className="text-3xl mb-3">{agent.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {agent.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agent.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fcc824] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sign Up Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create your account in 30 seconds. No credit card. No commitment.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#fcc824] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Chat with Your Agent</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The Money Model Mapper walks you through building your offer foundation step by step.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#fcc824] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Get Your Framework</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Walk away with a clear PEOPLE + PROMISE + PRINCIPLES framework you can use immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Built for Entrepreneurs Who Want to{' '}
                <span style={{ color: '#fcc824' }}>Scale Systematically</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Target, text: 'Get crystal clear on who you help and what you promise' },
                  { icon: TrendingUp, text: 'Build offers that sell — based on proven frameworks' },
                  { icon: MessageSquare, text: 'AI agents that guide you step-by-step, not just generate text' },
                  { icon: Users, text: 'Join 87+ entrepreneurs already using MindsetOS' },
                  { icon: Shield, text: 'Your data stays private — enterprise-grade security' },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <benefit.icon className="w-4 h-4" style={{ color: '#fcc824' }} />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-8 border-2 border-amber-200 dark:border-amber-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Your Trial Includes:
              </h3>
              <div className="space-y-3">
                {[
                  '7 days of full access',
                  'AI-powered conversations with every agent',
                  'All 14+ MindsetOS AI agents unlocked',
                  'Complete offer-to-client workflow',
                  'Conversation history saved',
                  'No credit card required',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#fcc824' }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/register/trial"
                className="mt-6 w-full px-6 py-3 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:scale-105"
              >
                Start Free Trial Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-gray-900 dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Build Your Mindset Coaching Offer?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Join 87+ entrepreneurs using MindsetOS to systematically build, promote, and sell their expertise.
          </p>
          <Link
            href="/register/trial"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg transform hover:scale-105"
          >
            Start Your 7-Day Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required &middot; Cancel anytime
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
                MindsetOS &mdash; powered by{' '}
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
              <Link href="/agency" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Agency Tier
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <a
                href="https://www.linkedin.com/in/gregmindset/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Contact
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
