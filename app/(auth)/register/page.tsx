'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle, Ticket } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [inviteCodeChecking, setInviteCodeChecking] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Check for invite code in URL params
  useEffect(() => {
    const code = searchParams.get('code') || searchParams.get('invite');
    if (code) {
      setFormData(prev => ({ ...prev, inviteCode: code.toUpperCase() }));
      validateInviteCode(code);
    }
  }, [searchParams]);

  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 4) {
      setInviteCodeValid(null);
      return;
    }

    setInviteCodeChecking(true);
    try {
      const result = await apiClient.validateInviteCode(code);
      setInviteCodeValid(result.valid);
      if (!result.valid && result.error) {
        setError(result.error);
      } else {
        setError('');
      }
    } catch {
      setInviteCodeValid(false);
    } finally {
      setInviteCodeChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions to register');
      return;
    }

    if (!formData.inviteCode) {
      setError('Invite code is required to register');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
      });

      setRegistrationComplete(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');

    // Require invite code for Google sign-up
    if (!formData.inviteCode) {
      setError('Please enter an invite code before signing up with Google');
      return;
    }

    if (!inviteCodeValid) {
      setError('Please enter a valid invite code before signing up with Google');
      return;
    }

    setIsGoogleLoading(true);

    try {
      // Get Google OAuth URL from backend with invite code
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/google?inviteCode=${encodeURIComponent(formData.inviteCode)}`, {
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

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
        {/* Logo at top */}
        <div className="w-full pt-6 pb-2">
          <div className="flex justify-center">
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS Logo"
              width={80}
              height={80}
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Success message - top aligned */}
        <div className="flex-1 flex items-start justify-center pt-2">
          <div className="max-w-md w-full">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center" style={{ borderColor: '#fcc824' }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#fcc824' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#fcc824' }}>
                Check Your Email
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                We've sent a verification link to{' '}
                <strong>{formData.email}</strong>. Click the link to activate your
                account.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824' }}
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
      {/* Logo at top */}
      <div className="w-full pt-6 pb-2">
        <div className="flex justify-center">
          <Image
            src="/mindset-os-logo.png"
            alt="MindsetOS Logo"
            width={80}
            height={80}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Registration form - top aligned */}
      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              MindsetOS
            </h1>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Mindset coaching for entrepreneurs, powered by AI
            </p>
          </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2" style={{ borderColor: '#fcc824' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#fcc824' }}>
            Create Account
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                placeholder="John Doe"
              />
            </div>

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
                htmlFor="inviteCode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Invite Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Ticket className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  value={formData.inviteCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    setFormData({ ...formData, inviteCode: code });
                    if (code.length >= 4) {
                      validateInviteCode(code);
                    } else {
                      setInviteCodeValid(null);
                    }
                  }}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all ${
                    inviteCodeValid === true
                      ? 'border-green-500 dark:border-green-500'
                      : inviteCodeValid === false
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                  placeholder="Enter your invite code"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {inviteCodeChecking ? (
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  ) : inviteCodeValid === true ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : inviteCodeValid === false ? (
                    <span className="text-red-500 text-sm">Invalid</span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Need an invite code? Contact{' '}
                <a
                  href="mailto:hello@mindset.show"
                  className="hover:opacity-80"
                  style={{ color: '#fcc824' }}
                >
                  hello@mindset.show
                </a>
              </p>
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                At least 8 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                placeholder="••••••••"
              />
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 focus:ring-2"
                style={{ accentColor: '#fcc824' }}
              />
              <label htmlFor="terms-checkbox" className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-medium hover:opacity-80 underline"
                  style={{ color: '#fcc824' }}
                >
                  Terms & Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="font-medium hover:opacity-80 underline"
                  style={{ color: '#fcc824' }}
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02]"
              style={{ backgroundColor: '#fcc824' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
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
                <span className="text-gray-700 dark:text-gray-300">Sign up with Google</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By registering, you agree to our{' '}
              <Link
                href="/terms"
                className="hover:opacity-80 underline"
                style={{ color: '#fcc824' }}
              >
                Terms & Conditions
              </Link>
              {' '}and{' '}
              <Link
                href="/privacy"
                className="hover:opacity-80 underline"
                style={{ color: '#fcc824' }}
              >
                Privacy Policy
              </Link>
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
                mindset.show
              </a>
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
              {/* Background overlay */}
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" aria-hidden="true"></div>

              {/* Modal panel */}
              <div
                className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b-2 border-gray-200 dark:border-gray-600" style={{ borderColor: '#fcc824' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Terms & Conditions
                    </h3>
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

                {/* Content - scrollable */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated: March 27, 2026</p>

                    <p>
                      These terms and conditions outline the rules and regulations for the use of MindsetOS — Mindset Operating System,
                      located at https://mindset.show.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">AI-Powered Services & Limitations</h4>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">IMPORTANT: By using MindsetOS, you acknowledge that:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li><strong>Informational Only</strong>: AI-generated content is for informational purposes and NOT professional, legal, financial, or tax advice</li>
                      <li><strong>No Warranty</strong>: We make no guarantees about accuracy, completeness, or suitability of AI outputs</li>
                      <li><strong>Your Responsibility</strong>: You are solely responsible for reviewing and validating all AI recommendations before use</li>
                      <li><strong>Potential Errors</strong>: AI systems may produce inaccurate or misleading information ("hallucinations")</li>
                      <li><strong>Third-Party Models</strong>: We use third-party AI providers (OpenAI, Anthropic, Perplexity) subject to their terms</li>
                      <li><strong>Content License</strong>: You retain ownership but grant us license to use your content for service improvement and AI training</li>
                    </ul>

                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-3">
                      ⚠️ We are NOT liable for business decisions, financial losses, or damages arising from AI-generated content or recommendations.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">License & Usage</h4>
                    <p>You must not:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Republish, sell, or redistribute material from MindsetOS</li>
                      <li>Attempt to reverse engineer AI model logic</li>
                      <li>Use automated tools to scrape data</li>
                      <li>Generate harmful, illegal, or unethical content</li>
                    </ul>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Data & Privacy</h4>
                    <p className="text-sm">
                      We collect account information, conversation history, usage analytics, and API logs to provide and improve our services.
                      See our Privacy Policy for details.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Payment</h4>
                    <p className="text-sm">
                      Fees are based on API usage and token consumption. Pricing may vary by AI model. You are responsible for all charges
                      incurred under your account.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Disclaimer</h4>
                    <p className="text-sm">
                      We make no guarantees about accuracy, completeness, or suitability of AI-generated content. We cannot guarantee
                      uninterrupted service or error-free operation. We reserve the right to modify, suspend, or discontinue services
                      with reasonable notice.
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      MindsetOS is operated by MindsetOS Pty. Ltd. By using our services, you agree to be bound by these terms and our Privacy Policy.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center">
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-sm hover:opacity-80"
                    style={{ color: '#fcc824' }}
                  >
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
              {/* Background overlay */}
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" aria-hidden="true"></div>

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
                   onClick={(e) => e.stopPropagation()}>

                {/* Header with close button */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Privacy Policy
                    </h3>
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

                {/* Content - scrollable */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated: March 27, 2026</p>

                    <p>
                      This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information
                      when You use the Service.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Personal Data We Collect</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Email address, name, and optional contact information</li>
                      <li>Conversation history with AI agents</li>
                      <li>AI-generated content and business frameworks</li>
                      <li>Usage analytics and interaction patterns</li>
                      <li>API usage logs and token consumption data</li>
                    </ul>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">How We Use Your Data</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>To provide and maintain AI-powered consulting services</li>
                      <li>To improve AI models and service quality</li>
                      <li>To contact you with service updates and announcements</li>
                      <li>To analyze platform usage and improve user experience</li>
                      <li>To comply with legal obligations</li>
                    </ul>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Third-Party AI Providers</h4>
                    <p className="text-sm">
                      We share data with third-party AI providers (OpenAI, Anthropic, Perplexity) to deliver AI services.
                      These providers have their own privacy policies governing data usage.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Data Retention</h4>
                    <p className="text-sm">
                      We retain Personal Data as long as necessary to provide services. Conversation data is retained for service
                      improvement and personalization. You may request data deletion at any time.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Your Rights (GDPR & CCPA)</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li><strong>Access</strong>: Request access to your personal data</li>
                      <li><strong>Correction</strong>: Request correction of inaccurate data</li>
                      <li><strong>Deletion</strong>: Request deletion of your data</li>
                      <li><strong>Opt-out</strong>: Opt out of marketing communications</li>
                      <li><strong>Data Portability</strong>: Request data in machine-readable format</li>
                    </ul>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Security</h4>
                    <p className="text-sm">
                      We use commercially acceptable security measures to protect your data. However, no method of transmission
                      over the Internet is 100% secure.
                    </p>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4">Children's Privacy</h4>
                    <p className="text-sm">
                      Our Service does not address anyone under the age of 13. We do not knowingly collect personal information
                      from children under 13.
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      MindsetOS is operated by MindsetOS Pty. Ltd. By using our services, you agree to this Privacy Policy and our Terms & Conditions.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-sm hover:opacity-80"
                    style={{ color: '#fcc824' }}
                  >
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

// Wrap in Suspense for useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
