'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
        {/* Logo */}
        <div className="w-full pt-6 pb-4">
          <div className="flex justify-center">
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS Logo"
              width={80}
              height={32}
              priority
              className="object-contain hidden dark:block"
            />
            <Image
              src="/mindset-os-logo.png"
              alt="MindsetOS Logo"
              width={80}
              height={32}
              priority
              className="object-contain block dark:hidden"
              style={{ filter: 'brightness(0)' }}
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center" style={{ borderColor: '#fcc824' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#fcc824' }}>
                <CheckCircle className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Check Your Email
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                The link will expire in 1 hour for security reasons.
              </p>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
      {/* Logo */}
      <div className="w-full pt-6 pb-4">
        <div className="flex justify-center">
          <Image
            src="/mindset-os-logo.png"
            alt="MindsetOS Logo"
            width={80}
            height={32}
            priority
            className="object-contain hidden dark:block"
          />
          <Image
            src="/mindset-os-logo.png"
            alt="MindsetOS Logo"
            width={80}
            height={32}
            priority
            className="object-contain block dark:hidden"
            style={{ filter: 'brightness(0)' }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              MindsetOS
            </h1>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Reset Your Password
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2" style={{ borderColor: '#fcc824' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fcc824' }}>
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Forgot Password?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No worries, we'll send you reset instructions.
                </p>
              </div>
            </div>

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                  placeholder="you@example.com"
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#fcc824' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
