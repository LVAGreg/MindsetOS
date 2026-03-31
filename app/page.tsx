'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import {
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Users,
  Award,
  Lock
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { user, isAuthenticated } = useAppStore();

  // Wait for store hydration
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect based on auth status
  useEffect(() => {
    if (!hasHydrated) return;

    const accessToken = localStorage.getItem('accessToken');

    // If user is authenticated, redirect to dashboard
    if (user && isAuthenticated && accessToken) {
      console.log('✅ User authenticated, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // If not authenticated, redirect to login
    console.log('🔒 No authenticated user, redirecting to login');
    router.push('/login');
  }, [hasHydrated, user, isAuthenticated, router]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const agents = [
    {
      icon: '🧠',
      name: 'Practice Coach',
      tagline: 'Build Daily Rituals That Rewire Your Defaults',
      description: 'Design a personalized mindset practice that fits your schedule. Replace reactive habits with intentional routines that compound over time.',
      outcome: 'Custom daily practice blueprint',
      time: '15 minutes'
    },
    {
      icon: '🔍',
      name: 'Inner World Navigator',
      tagline: 'Map the Beliefs Running Your Decisions',
      description: 'Surface the hidden assumptions and emotional patterns driving your behavior. Get clarity on what to keep, what to rewire, and what to release.',
      outcome: 'Personal belief audit & reframe plan',
      time: '20 minutes'
    },
    {
      icon: '💬',
      name: 'Conversation Architect',
      tagline: 'Upgrade the Conversations That Matter Most',
      description: 'Build frameworks for the hard conversations — with partners, clients, and yourself. Move from avoidance to alignment.',
      outcome: 'Ready-to-use conversation playbooks',
      time: '20 minutes'
    },
    {
      icon: '⚡',
      name: 'Decision Clarity Engine',
      tagline: 'Cut Through Overthinking in Minutes',
      description: 'Use structured decision frameworks to stop spinning and start moving. Designed for high-stakes choices under pressure.',
      outcome: 'Clear next step with conviction',
      time: '10 minutes'
    },
    {
      icon: '🎯',
      name: 'Performance Reset',
      tagline: 'Recover When You Hit the Wall',
      description: 'Identify what drained you, recalibrate your energy, and rebuild momentum — without burning it all down.',
      outcome: 'Personalized recovery protocol',
      time: '15 minutes'
    },
    {
      icon: '🗺️',
      name: 'Leadership Lens',
      tagline: 'See Yourself the Way Your Team Does',
      description: 'Get honest feedback on your leadership patterns and blind spots. Build a plan to lead with more presence and less friction.',
      outcome: 'Leadership growth roadmap',
      time: '20 minutes'
    }
  ];

  const benefits = [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Practice',
      description: 'Daily rituals that rewire your defaults and build unshakable clarity'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Inner World',
      description: 'Surface the beliefs and patterns silently running your decisions'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Conversations',
      description: 'Upgrade the way you communicate — with others and with yourself'
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Battle-Tested',
      description: 'Built on Greg\'s frameworks used by thousands of entrepreneurs worldwide'
    }
  ];

  const stats = [
    { number: '30-45', label: 'age range', sublabel: 'Built for entrepreneurs' },
    { number: '3x', label: 'faster clarity', sublabel: 'Decision-making' },
    { number: '6', label: 'AI agents', sublabel: 'Complete system' },
    { number: '80%', label: 'less overthinking', sublabel: 'Within 30 days' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Logo at top */}
      <div className="w-full pt-6 pb-4">
        <div className="flex justify-center">
          <MindsetOSLogo size="lg" variant="light" />
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
          {/* Logo/Branding Badge */}
          <div className={`text-center mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffc82c]/20 border border-[#ffc82c] rounded-full text-[#ffc82c] text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              <span>MindsetOS — Mindset Operating System</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className={`text-center mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              MindsetOS
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffc82c] to-[#f8c824]">
                Stop reacting. Start designing.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              The AI coaching platform built for the way entrepreneurs actually think — and where they get stuck.
            </p>
          </div>

          {/* Social Proof Row */}
          <div className={`flex flex-col items-center gap-3 mb-10 transition-all duration-1000 delay-350 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  { initials: 'MR', bg: 'bg-violet-500' },
                  { initials: 'JK', bg: 'bg-emerald-500' },
                  { initials: 'AL', bg: 'bg-blue-500' },
                  { initials: 'TP', bg: 'bg-rose-500' },
                  { initials: 'SB', bg: 'bg-amber-500' },
                ].map((avatar, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full ${avatar.bg} flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-900`}
                  >
                    {avatar.initials}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">500+</span> entrepreneurs redesigning how they think
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <button
              onClick={() => router.push('/trial-v3b')}
              className="group px-8 py-4 bg-gradient-to-r from-[#ffc82c] to-[#f8c824] text-gray-900 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-[#ffc82c]/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Start Free — No credit card
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              See How It Works
            </button>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="text-4xl font-bold text-[#ffc82c] mb-2">{stat.number}</div>
                <div className="text-sm font-semibold text-white">{stat.label}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              The 3 Pillars
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              A systematic approach to transforming your mindset and performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-[#ffc82c]/50 transition-all duration-300">
                <div className="w-12 h-12 bg-[#ffc82c]/20 rounded-lg flex items-center justify-center text-[#ffc82c] mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div id="agents" className="py-24 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Meet Your AI Agent Team
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Six specialized agents that work together to upgrade your mindset and performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map((agent, index) => (
              <div
                key={index}
                className="group p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-[#ffc82c]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-[#ffc82c]/20"
              >
                <div className="text-5xl mb-4">{agent.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#ffc82c] transition-colors">
                  {agent.name}
                </h3>
                <p className="text-[#ffc82c] font-semibold mb-3">{agent.tagline}</p>
                <p className="text-gray-300 mb-6 leading-relaxed">{agent.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-1">Outcome</div>
                    <div className="text-sm font-semibold text-white">{agent.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase mb-1">Time</div>
                    <div className="text-sm font-semibold text-[#ffc82c]">{agent.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={() => router.push('/trial-v3b')}
              className="group px-10 py-5 bg-gradient-to-r from-[#ffc82c] to-[#f8c824] text-gray-900 rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-[#ffc82c]/50 transition-all duration-300 inline-flex items-center gap-3"
            >
              Start Free — No credit card
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Three steps from reactive to designed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Take the Mindset Score',
                desc: 'A 7-question assessment that pinpoints your thinking style and where you get stuck. Takes 3 minutes.',
                icon: '🧠',
              },
              {
                step: '2',
                title: 'Get your personalized AI coach',
                desc: 'Based on your score, MindsetOS activates the right AI coaches for your patterns — not generic advice.',
                icon: '⚡',
              },
              {
                step: '3',
                title: 'Build the mental architecture for results',
                desc: 'Daily practices, decision frameworks, and accountability that compound into a mind that works for you.',
                icon: '🎯',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-[#ffc82c]/40 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffc82c] to-[#f8c824] flex items-center justify-center text-gray-900 font-extrabold text-lg shadow-lg shadow-[#ffc82c]/30">
                    {item.step}
                  </div>
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Proof / Features */}
      <div className="py-24 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Built on Proven Frameworks
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                MindsetOS combines Greg's proven methodologies with AI-powered execution.
                Every agent is trained on frameworks that have helped thousands of entrepreneurs
                transform their mindset and performance.
              </p>
              <div className="space-y-4">
                {[
                  'Practice pillar: daily rituals that compound over time',
                  'Inner World pillar: beliefs and patterns made visible',
                  'Conversations pillar: frameworks for the talks that matter',
                  'Built for entrepreneurs 30-45 running on fumes'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ffc82c]/20 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-[#ffc82c]" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="p-8 bg-gradient-to-br from-[#ffc82c]/20 to-[#ffc82c]/5 rounded-2xl border border-[#ffc82c]/30">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  MindsetOS Methodology
                </h3>
                <p className="text-gray-300 mb-6">
                  Created by Greg, this system is battle-tested with high-performing entrepreneurs worldwide.
                  Now available as an AI-powered platform that guides you step-by-step.
                </p>
                <a
                  href="https://www.mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#ffc82c] hover:text-[#f8c824] font-semibold transition-colors"
                >
                  Learn More About MindsetOS
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to Transform Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffc82c] to-[#f8c824]">
              Mindset and Performance?
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands of entrepreneurs using MindsetOS to think clearer, decide faster, and lead better
          </p>
          <button
            onClick={() => router.push('/trial-v3b')}
            className="group px-12 py-6 bg-gradient-to-r from-[#ffc82c] to-[#f8c824] text-gray-900 rounded-xl font-bold text-2xl hover:shadow-2xl hover:shadow-[#ffc82c]/50 transition-all duration-300 inline-flex items-center gap-3"
          >
            Start Free — No credit card
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-gray-400 mt-6">
            No credit card required • Get started in 60 seconds
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © 2026 MindsetOS — Mindset Operating System. Built on MindsetOS methodology.
            </div>
            <div className="flex gap-6">
              <a href="https://www.mindset.show" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#ffc82c] transition-colors text-sm">
                MindsetOS
              </a>
              <a href="https://www.linkedin.com/in/gregmindset/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#ffc82c] transition-colors text-sm">
                Connect with Greg
              </a>
              <a href="https://www.mindset.show/c/mindset-arena" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#ffc82c] transition-colors text-sm">
                Mindset Arena
              </a>
              <a href="/agency" className="text-gray-400 hover:text-[#ffc82c] transition-colors text-sm">
                Coaching Practice
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
