'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, ArrowRight, Sparkles, Users, GraduationCap, Video, ExternalLink, Bot } from 'lucide-react';

const CIRCLE_URL = 'https://www.mindset.show/'; // TODO: Update with actual invite link

export default function CoachingPracticeCheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <Image
            src="/mindset-os-logo.png"
            alt="MindsetOS"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="text-lg font-bold text-gray-900">
            Mindset<span style={{ color: '#fcc824' }}>OS</span>
            <span className="text-gray-400 font-normal mx-1.5">/</span>
            Coaching Practice
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Confirmation */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Welcome to Coaching Practice!
          </h1>
          <p className="text-lg text-gray-600">
            Multi-client management, custom agents, and per-client AI memory are now unlocked.
          </p>
        </div>

        {/* Step 1: Agency is unlocked */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Step 1 — Done</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Your Coaching Practice Is Live</h3>
              <p className="text-sm text-gray-600 mb-3">
                All 10+ AI coaching agents are unlocked, plus multi-client management, per-client AI memory,
                and the Custom Agent Creator. Your account has been upgraded to Coaching Practice tier.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b8860b] hover:text-[#996f00] transition-colors"
              >
                Open MindsetOS Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Step 2: Set up your first client */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-400 mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Step 2 — Your First Move</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Create Your First Client Profile</h3>
              <p className="text-sm text-gray-600 mb-2">
                Head to the dashboard and use the client selector in the top bar to create a client profile.
                Once created, everything scopes automatically:
              </p>
              <div className="space-y-1.5 mb-4">
                {[
                  'AI memory stays per-client — no cross-contamination',
                  'Conversations, playbooks, and deliverables are scoped',
                  'Brand voice and business profile are client-specific',
                  'Switch between clients instantly from the top bar',
                  'Activate or deactivate agents per client',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Go to Dashboard &amp; Create Client
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Step 3: Community */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-[#fcc824] mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-10 h-10 bg-[#fcc824] rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Step 3 — Access Your Training</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Get Your Community &amp; Content Access</h3>
              <p className="text-sm text-gray-600 mb-2">
                Your Coaching Practice tier includes full Client Fast Start access — training modules, coaching calls,
                implementation support, and the MindsetOS community.
              </p>
              <a
                href={CIRCLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Join the Community &amp; Access Content
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Step 4: Custom agents */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Step 4 — When You&apos;re Ready</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Build Custom Agents Around Your Frameworks</h3>
              <p className="text-sm text-gray-600">
                Use the Custom Agent Creator to build AI agents trained on your own methodologies.
                Your IP, your frameworks, packaged as AI agents your clients can use.
              </p>
            </div>
          </div>
        </div>

        {/* Step 5: First coaching call */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Step 5 — This Week</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Join Your First Live Coaching Call</h3>
              <p className="text-sm text-gray-600">
                Check the community schedule for the next live coaching session.
                Bring your client work — coaches give direct, actionable feedback on your offers, promos, and funnels.
              </p>
            </div>
          </div>
        </div>

        {/* Quick start reminder */}
        <div className="bg-gray-900 rounded-xl p-6 text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#fcc824]" />
            <h3 className="font-bold text-white text-sm">Recommended First Move</h3>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            Open MindsetOS → Create your first client profile → Run <strong className="text-white">Client Onboarding</strong> for
            that client → Then <strong className="text-white">Money Model Mapper</strong> to nail their foundation.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors text-sm border border-white/20"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Support */}
        <p className="text-center text-xs text-gray-400">
          Questions? Email{' '}
          <a href="mailto:hello@mindset.show" className="text-[#fcc824] hover:underline">
            hello@mindset.show
          </a>
        </p>
      </div>
    </div>
  );
}
