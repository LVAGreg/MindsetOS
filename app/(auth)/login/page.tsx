'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import posthog from 'posthog-js';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const currentConversationId = useAppStore((state) => state.currentConversationId);
  const currentAgent = useAppStore((state) => state.currentAgent);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(formData.email, formData.password);

      // Fetch user details
      const userData = await apiClient.getCurrentUser();
      console.log('\u{1F464} Setting user in store:', userData.email);
      setUser(userData);
      try {
        posthog.identify(userData.id || userData.email, { email: userData.email });
        posthog.capture('user_signed_in', { role: userData.role });
      } catch {}

      // Load user's conversation history
      try {
        const conversationsData = await apiClient.getUserConversations();
        if (conversationsData.conversations) {
          // Transform history to proper format (tree structure)
          const formattedConversations = conversationsData.conversations.map((conv: any) => ({
            ...conv,
            history: conv.history ? {
              currentId: conv.history.currentId,
              messages: Object.fromEntries(
                Object.entries(conv.history.messages || {}).map(([id, msg]: [string, any]) => [
                  id,
                  {
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                    editedAt: msg.editedAt ? new Date(msg.editedAt) : null
                  }
                ])
              )
            } : { currentId: null, messages: {} },
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt)
          }));
          loadConversations(formattedConversations);
        }
      } catch (convErr) {
        console.error('Failed to load conversations:', convErr);
        // Don't block login if conversations fail to load
      }

      // Navigate to dashboard
      if (currentConversationId && currentAgent) {
        console.log(`\u{1F504} Returning to conversation: ${currentConversationId} with agent: ${currentAgent}`);
        router.push(`/dashboard?agent=${currentAgent}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.needsVerification) {
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
      } else {
        setError(
          errorData?.error ||
          errorData?.message ||
          'Login failed. Please check your credentials.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      // Get Google OAuth URL from backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/google`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Google OAuth URL');
      }

      const { authUrl } = await response.json();

      // Open Google OAuth page
      window.location.href = authUrl;
    } catch (err: any) {
      setError('Google Sign-In failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#09090f]">

      {/* --- Atmospheric background layers --- */}

      {/* Primary amber glow — top-left */}
      <div
        className="pointer-events-none absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }}
      />
      {/* Secondary cyan glow — bottom-right */}
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
      />
      {/* Faint amber wash — center-right */}
      <div
        className="pointer-events-none absolute top-1/3 right-[10%] w-[320px] h-[320px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }}
      />

      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(252,200,36,0.5) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Noise grain overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="login-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#login-grain)" />
        </svg>
      </div>

      {/* --- Content --- */}

      {/* Logo at top */}
      <div className="relative z-10 w-full pt-8 sm:pt-10 pb-2 login-float-1">
        <div className="flex justify-center">
          <MindsetOSLogo size="lg" variant="light" />
        </div>
      </div>

      {/* Login form */}
      <div className="relative z-10 flex-1 flex items-start justify-center pt-2 sm:pt-4 px-4 pb-8">
        <div className="max-w-[420px] w-full space-y-6">

          {/* Subtitle */}
          <p className="text-center text-gray-400 text-sm tracking-wide login-float-2">
            AI-Powered Mindset Coaching
          </p>

          {/* --- Glass card with gradient border --- */}
          <div className="login-float-3 relative rounded-2xl p-[1px]"
               style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.4) 0%, rgba(30,30,48,0.9) 60%, rgba(252,200,36,0.15) 100%)' }}>

            {/* Inner card */}
            <div className="relative rounded-2xl backdrop-blur-xl p-7 sm:p-8 overflow-hidden" style={{ background: 'rgba(18,18,31,0.9)' }}>

              {/* Subtle inner glow at top of card */}
              <div
                className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[280px] h-[140px] rounded-full opacity-[0.08]"
                style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }}
              />

              <h2 className="relative text-2xl font-bold tracking-tight text-white mb-6">
                Sign In
              </h2>

              {error && (
                <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm leading-relaxed login-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="login-input w-full px-4 py-3 bg-[#12121f] border border-[#1e1e30] rounded-xl text-[#ededf5] placeholder-[#9090a8] text-sm transition-all duration-300 focus:outline-none focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.15)]"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="login-input w-full px-4 py-3 bg-[#12121f] border border-[#1e1e30] rounded-xl text-[#ededf5] placeholder-[#9090a8] text-sm transition-all duration-300 focus:outline-none focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_rgba(79,110,247,0.15)]"
                    placeholder="••••••••"
                  />
                </div>

                {/* Remember / Forgot row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-600 bg-white/5"
                      style={{ accentColor: '#fcc824' }}
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-400"
                    >
                      Remember me
                    </label>
                  </div>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#4f6ef7] hover:text-[#7b8ff9] transition-colors duration-200"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="login-btn-primary group w-full py-3 px-4 text-black font-semibold rounded-xl transition-all duration-300 shadow-[0_4px_24px_rgba(252,200,36,0.25)] hover:shadow-[0_8px_40px_rgba(252,200,36,0.35)] hover:scale-[1.015] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #fcc824 0%, #f0b800 100%)' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 text-[#9090a8] text-xs uppercase tracking-wider" style={{ background: 'rgba(18,18,31,1)' }}>
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.14] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-gray-300 text-sm font-medium">Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-300 text-sm font-medium">Sign in with Google</span>
                  </>
                )}
              </button>

              {/* Sign up link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register/trial"
                    className="font-semibold text-[#4f6ef7] hover:text-[#7b8ff9] transition-colors duration-200"
                  >
                    Sign up free
                  </Link>
                </p>
              </div>

              {/* Terms / Privacy links */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="hover:text-[#fcc824] underline underline-offset-2 transition-colors duration-200"
                  >
                    Terms & Conditions
                  </button>
                  {' '}&middot;{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="hover:text-[#fcc824] underline underline-offset-2 transition-colors duration-200"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="login-float-4 text-center space-y-1 pb-4">
            <p className="text-sm text-gray-500">
              <a
                href="https://mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#fcc824]/70 hover:text-[#fcc824] transition-colors duration-200"
              >
                MindsetOS
              </a>
              {' '}&mdash; Mindset Operating System
            </p>
            <p className="text-xs text-gray-600">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>

        {/* ===================== MODALS ===================== */}

        {/* Terms & Conditions Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowTermsModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-black/80 backdrop-blur-sm" aria-hidden="true"></div>
              <div className="inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-white/[0.08] bg-[#0d0d24]"
                   onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Terms & Conditions</h3>
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm prose-invert max-w-none text-gray-300 space-y-4">
                    <p className="text-sm text-gray-500">Last Updated: March 27, 2026</p>
                    <p>These terms and conditions outline the rules and regulations for the use of MindsetOS — Mindset Operating System.</p>
                    <h4 className="text-lg font-bold text-white mt-4">AI-Powered Services & Limitations</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li><strong className="text-gray-200">Informational Only</strong>: AI content is NOT professional, legal, or financial advice</li>
                      <li><strong className="text-gray-200">No Warranty</strong>: We make no guarantees about accuracy or suitability</li>
                      <li><strong className="text-gray-200">Your Responsibility</strong>: You must review and validate all AI recommendations</li>
                      <li><strong className="text-gray-200">Potential Errors</strong>: AI may produce inaccurate information</li>
                    </ul>
                    <p className="text-sm font-semibold text-red-400 mt-3">
                      We are NOT liable for business decisions or losses from AI-generated content.
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-between items-center">
                  <Link href="/terms" target="_blank" className="text-sm text-[#fcc824] hover:text-[#fdd84e] transition-colors">
                    View Full Terms &rarr;
                  </Link>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="px-5 py-2 text-black font-semibold rounded-xl transition-all duration-200 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #fcc824 0%, #f0b800 100%)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowPrivacyModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-black/80 backdrop-blur-sm" aria-hidden="true"></div>
              <div className="inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-white/[0.08] bg-[#0d0d24]"
                   onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Privacy Policy</h3>
                    <button
                      onClick={() => setShowPrivacyModal(false)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm prose-invert max-w-none text-gray-300 space-y-4">
                    <p className="text-sm text-gray-500">Last Updated: March 27, 2026</p>
                    <p>This Privacy Policy describes our collection, use and disclosure of your information.</p>
                    <h4 className="text-lg font-bold text-white mt-4">Personal Data We Collect</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Email address, name, and contact information</li>
                      <li>Conversation history with AI agents</li>
                      <li>AI-generated content and business frameworks</li>
                      <li>Usage analytics and interaction patterns</li>
                    </ul>
                    <h4 className="text-lg font-bold text-white mt-4">Your Rights</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Request access, correction, or deletion of your data</li>
                      <li>Opt out of marketing communications</li>
                      <li>Data portability in machine-readable format</li>
                    </ul>
                  </div>
                </div>
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-between items-center">
                  <Link href="/privacy" target="_blank" className="text-sm text-[#fcc824] hover:text-[#fdd84e] transition-colors">
                    View Full Privacy Policy &rarr;
                  </Link>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-5 py-2 text-black font-semibold rounded-xl transition-all duration-200 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #fcc824 0%, #f0b800 100%)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Inline keyframe styles for entrance animations --- */}
      <style jsx>{`
        @keyframes login-float-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        .login-float-1 {
          animation: login-float-up 0.6s 0.05s ease-out both;
        }
        .login-float-2 {
          animation: login-float-up 0.6s 0.12s ease-out both;
        }
        .login-float-3 {
          animation: login-float-up 0.6s 0.2s ease-out both;
        }
        .login-float-4 {
          animation: login-float-up 0.6s 0.35s ease-out both;
        }
        .login-shake {
          animation: login-shake 0.4s ease-out;
        }
        .login-input::selection {
          background: rgba(252, 200, 36, 0.3);
        }
      `}</style>
    </div>
  );
}
