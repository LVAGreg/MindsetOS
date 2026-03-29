'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, Clock, Zap, Lock, ArrowRight } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { apiClient } from '@/lib/api-client';

export default function TrialRegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [trialInfo, setTrialInfo] = useState<{
    expiresAt: string;
    daysRemaining: number;
    trialAgent: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiClient.registerTrial({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      setTrialInfo({
        expiresAt: result.trial?.expiresAt,
        daysRemaining: result.trial?.daysRemaining || 7,
        trialAgent: result.trial?.trialAgent || 'Mindset Score Agent',
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

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
        <div className="w-full pt-6 pb-2">
          <div className="flex justify-center">
            <MindsetOSLogo size="lg" variant="dark" />
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center pt-4">
          <div className="max-w-md w-full">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center" style={{ borderColor: '#fcc824' }}>
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#fcc824' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#fcc824' }}>
                You're In!
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your 7-day free trial is now active.
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" style={{ color: '#fcc824' }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {trialInfo?.daysRemaining || 7} days remaining
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" style={{ color: '#fcc824' }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full access for 7 days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" style={{ color: '#fcc824' }} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    All AI agents unlocked
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824' }}
              >
                Start Using MindsetOS
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Want the full experience?{' '}
                <a
                  href="https://www.mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:opacity-80"
                  style={{ color: '#fcc824' }}
                >
                  Upgrade to full access
                </a>
              </p>
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
          <MindsetOSLogo size="lg" variant="dark" />
        </div>
      </div>

      {/* Trial registration form */}
      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              Try MindsetOS Free
            </h1>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              7 days free access. No credit card required.
            </p>
          </div>

          {/* What you get */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">
              What's included in your trial
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Full access to <strong>all MindsetOS AI agents</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  AI-powered conversations with every agent
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Build your mindset foundation in minutes
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#fcc824' }} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Guided workflows from self-awareness to daily practice
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2" style={{ borderColor: '#fcc824' }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#fcc824' }}>
              Start Your Free Trial
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
                  placeholder="Min. 8 characters"
                />
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
                  placeholder="Confirm your password"
                />
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
                    Creating your trial...
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              By signing up, you agree to our{' '}
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
          </div>

          <div className="text-center mt-4 space-y-1 pb-8">
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
              {' '}is powered by{' '}
              <a
                href="https://mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                MindsetOS
              </a>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Copyright &copy; 2026 MindsetOS | All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
