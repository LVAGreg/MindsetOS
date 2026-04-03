'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
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
      <div
        className="min-h-screen flex flex-col px-4"
        style={{ backgroundColor: '#09090f' }}
      >
        {/* Logo */}
        <div className="w-full pt-6 pb-4">
          <div className="flex justify-center">
            <MindsetOSLogo size="lg" variant="auto" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div
              className="backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center"
              style={{
                backgroundColor: 'rgba(18,18,31,0.8)',
                borderColor: '#fcc824',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: '#fcc824' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#09090f' }} />
              </div>

              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: '#ededf5' }}
              >
                Check Your Email
              </h2>

              <p className="mb-6" style={{ color: '#9090a8' }}>
                If an account exists for{' '}
                <strong style={{ color: '#ededf5' }}>{email}</strong>, you'll
                receive a password reset link shortly.
              </p>

              <p className="text-sm mb-6" style={{ color: '#5a5a72' }}>
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
    <div
      className="min-h-screen flex flex-col px-4"
      style={{ backgroundColor: '#09090f' }}
    >
      {/* Logo */}
      <div className="w-full pt-6 pb-4">
        <div className="flex justify-center">
          <MindsetOSLogo size="lg" variant="auto" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              MindsetOS
            </h1>
            <p className="font-medium" style={{ color: '#9090a8' }}>
              Reset Your Password
            </p>
          </div>

          <div
            className="backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2"
            style={{
              backgroundColor: 'rgba(18,18,31,0.8)',
              borderColor: '#fcc824',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#fcc824' }}
              >
                <Mail className="w-5 h-5" style={{ color: '#09090f' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>
                  Forgot Password?
                </h2>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  No worries, we'll send you reset instructions.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm border"
                style={{
                  backgroundColor: 'rgba(252,200,36,0.08)',
                  borderColor: 'rgba(252,200,36,0.3)',
                  color: '#fcc824',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#ededf5' }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg transition-all outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'rgba(18,18,31,0.6)',
                    border: '1px solid #1e1e30',
                    color: '#ededf5',
                    '--tw-ring-color': '#fcc824',
                  } as React.CSSProperties}
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
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
