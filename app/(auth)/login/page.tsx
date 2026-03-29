'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

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
      console.log('👤 Setting user in store:', userData.email);
      setUser(userData);

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
        console.log(`🔄 Returning to conversation: ${currentConversationId} with agent: ${currentAgent}`);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
      {/* Logo at top */}
      <div className="w-full pt-6 pb-2">
        <div className="flex justify-center">
          <MindsetOSLogo size="lg" variant="dark" />
        </div>
      </div>

      {/* Login form - top aligned */}
      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              MindsetOS
            </h1>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              AI-Powered Mindset Coaching by{' '}
              <a
                href="https://mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                MindsetOS
              </a>
            </p>
          </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2" style={{ borderColor: '#fcc824' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#fcc824' }}>
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 rounded"
                  style={{ accentColor: '#fcc824' }}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Remember me
                </label>
              </div>

              <Link
                href="/forgot-password"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02]"
              style={{ backgroundColor: '#fcc824' }}
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
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-3 px-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.02]"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-gray-700 dark:text-gray-300" />
                <span className="text-gray-700 dark:text-gray-300">Connecting to Google...</span>
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
                <span className="text-gray-700 dark:text-gray-300">Sign in with Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="hover:opacity-80 underline"
                style={{ color: '#fcc824' }}
              >
                Terms & Conditions
              </button>
              {' '}•{' '}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="hover:opacity-80 underline"
                style={{ color: '#fcc824' }}
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>

          <div className="text-center mt-8 space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <a
                href="https://mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                MindsetOS
              </a>
              {' '}&mdash; Mindset Operating System
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Copyright © 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>

        {/* Terms & Conditions Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowTermsModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" aria-hidden="true"></div>
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
                   onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms & Conditions</h3>
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated: March 27, 2026</p>
                    <p>These terms and conditions outline the rules and regulations for the use of MindsetOS — Mindset Operating System.</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">AI-Powered Services & Limitations</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li><strong>Informational Only</strong>: AI content is NOT professional, legal, or financial advice</li>
                      <li><strong>No Warranty</strong>: We make no guarantees about accuracy or suitability</li>
                      <li><strong>Your Responsibility</strong>: You must review and validate all AI recommendations</li>
                      <li><strong>Potential Errors</strong>: AI may produce inaccurate information</li>
                    </ul>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-3">
                      ⚠️ We are NOT liable for business decisions or losses from AI-generated content.
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <Link href="/terms" target="_blank" className="text-sm hover:opacity-80" style={{ color: '#fcc824' }}>
                    View Full Terms →
                  </Link>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="px-4 py-2 text-black font-semibold rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: '#fcc824' }}
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
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" aria-hidden="true"></div>
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
                   onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h3>
                    <button
                      onClick={() => setShowPrivacyModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated: March 27, 2026</p>
                    <p>This Privacy Policy describes our collection, use and disclosure of your information.</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Personal Data We Collect</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Email address, name, and contact information</li>
                      <li>Conversation history with AI agents</li>
                      <li>AI-generated content and business frameworks</li>
                      <li>Usage analytics and interaction patterns</li>
                    </ul>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Your Rights</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Request access, correction, or deletion of your data</li>
                      <li>Opt out of marketing communications</li>
                      <li>Data portability in machine-readable format</li>
                    </ul>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <Link href="/privacy" target="_blank" className="text-sm hover:opacity-80" style={{ color: '#fcc824' }}>
                    View Full Privacy Policy →
                  </Link>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-4 py-2 text-black font-semibold rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: '#fcc824' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
