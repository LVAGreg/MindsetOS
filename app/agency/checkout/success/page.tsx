'use client';

import Link from 'next/link';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { CheckCircle, ArrowRight, Sparkles, Users, GraduationCap, Video, ExternalLink, Bot } from 'lucide-react';

const CIRCLE_URL = 'https://www.mindset.show/'; // TODO: Update with actual invite link

export default function CoachingPracticeCheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#050510] text-white relative overflow-hidden">
      {/* Celebratory background effects */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#fcc824]/[0.04] rounded-full blur-[180px]" />
      <div className="absolute top-[200px] left-[10%] w-[300px] h-[300px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
      <div className="absolute top-[100px] right-[10%] w-[250px] h-[250px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
      {/* Subtle dot grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      {/* Header */}
      <div className="relative border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <MindsetOSLogo size="md" variant="light" />
          <span className="text-lg font-bold text-white">
            <span className="text-white/20 font-normal mx-1.5">/</span>
            <span className="text-white/80">Coaching Practice</span>
          </span>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-14 sm:py-16">
        {/* Confirmation Hero */}
        <div className="text-center mb-14">
          {/* Animated check */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-[#fcc824]/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 bg-gradient-to-br from-[#fcc824]/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-[#fcc824]/20">
              <CheckCircle className="w-10 h-10 text-[#fcc824]" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white mb-4 tracking-tight">
            Welcome to Coaching Practice!
          </h1>
          <p className="text-lg text-white/40 max-w-lg mx-auto">
            Multi-client management, custom agents, and per-client AI memory are now unlocked.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">

          {/* Step 1: Agency is unlocked */}
          <div className="group rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 transition-all duration-300 hover:border-emerald-500/30">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Step 1 -- Done</span>
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">Your Coaching Practice Is Live</h3>
                <p className="text-sm text-white/35 mb-4 leading-relaxed">
                  All 10+ AI coaching agents are unlocked, plus multi-client management, per-client AI memory,
                  and the Custom Agent Creator. Your account has been upgraded to Coaching Practice tier.
                </p>
                <Link
                  href="/dashboard"
                  className="group/link inline-flex items-center gap-1.5 text-sm font-semibold text-[#fcc824]/70 hover:text-[#fcc824] transition-colors duration-300"
                >
                  Open MindsetOS Dashboard
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Step 2: Set up your first client */}
          <div className="group relative rounded-2xl border-2 border-[#fcc824]/30 bg-[#fcc824]/[0.03] p-6 transition-all duration-300 hover:border-[#fcc824]/40 hover:shadow-[0_0_40px_rgba(252,200,36,0.06)] overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#fcc824]/[0.04] rounded-full blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="w-11 h-11 bg-[#fcc824] rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(252,200,36,0.2)]">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-[#fcc824] uppercase tracking-wider">Step 2 -- Your First Move</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1.5">Create Your First Client Profile</h3>
                <p className="text-sm text-white/35 mb-3 leading-relaxed">
                  Head to the dashboard and use the client selector in the top bar to create a client profile.
                  Once created, everything scopes automatically:
                </p>
                <div className="space-y-2 mb-5">
                  {[
                    'AI memory stays per-client -- no cross-contamination',
                    'Conversations, playbooks, and deliverables are scoped',
                    'Brand voice and business profile are client-specific',
                    'Switch between clients instantly from the top bar',
                    'Activate or deactivate agents per client',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#fcc824]/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-2.5 h-2.5 text-[#fcc824]" />
                      </div>
                      <span className="text-sm text-white/50">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard"
                  className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-[#fcc824] hover:bg-[#fdd84a] text-black font-bold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(252,200,36,0.15)] hover:shadow-[0_0_35px_rgba(252,200,36,0.25)] transform hover:scale-[1.02]"
                >
                  Go to Dashboard &amp; Create Client
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Step 3: Community */}
          <div className="group relative rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6 transition-all duration-300 hover:border-amber-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.04] rounded-full blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Step 3 -- Access Your Training</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1.5">Get Your Community &amp; Content Access</h3>
                <p className="text-sm text-white/35 mb-4 leading-relaxed">
                  Your Coaching Practice tier includes full Mindset Architecture access -- training modules, coaching calls,
                  implementation support, and the MindsetOS community.
                </p>
                <a
                  href={CIRCLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-[#1e1e30] text-white font-bold rounded-xl transition-all duration-300 hover:border-white/[0.15]"
                >
                  Join the Community &amp; Access Content
                  <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Step 4: Custom agents */}
          <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-purple-500/20 hover:bg-purple-500/[0.02]">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Step 4 -- When You&apos;re Ready</span>
                </div>
                <h3 className="font-bold text-white mb-1.5">Build Custom Agents Around Your Frameworks</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Use the Custom Agent Creator to build AI agents trained on your own methodologies.
                  Your IP, your frameworks, packaged as AI agents your clients can use.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: First coaching call */}
          <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-blue-500/20 hover:bg-blue-500/[0.02]">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Step 5 -- This Week</span>
                </div>
                <h3 className="font-bold text-white mb-1.5">Join Your First Live Coaching Call</h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  Check the community schedule for the next live coaching session.
                  Bring your client work -- coaches give direct, actionable feedback on your offers, promos, and funnels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick start reminder */}
        <div className="relative mt-10 rounded-2xl border border-[#fcc824]/10 bg-gradient-to-br from-[#fcc824]/[0.03] to-transparent p-6 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#fcc824]/[0.03] rounded-full blur-[80px]" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#fcc824]" />
              <h3 className="font-bold text-white text-sm">Recommended First Move</h3>
            </div>
            <p className="text-sm text-white/35 mb-5 max-w-md mx-auto leading-relaxed">
              Open MindsetOS, create your first client profile, then run <strong className="text-white/60">Mindset Score Agent</strong> for
              that client, followed by <strong className="text-white/60">Practice Builder</strong> to design their daily routine.
            </p>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold rounded-xl transition-all duration-300 text-sm border border-[#1e1e30] hover:border-white/[0.15]"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Support */}
        <p className="text-center text-xs text-white/20 mt-10">
          Questions? Email{' '}
          <a href="mailto:hello@mindset.show" className="text-[#fcc824]/50 hover:text-[#fcc824] transition-colors duration-300">
            hello@mindset.show
          </a>
        </p>
      </div>
    </div>
  );
}
