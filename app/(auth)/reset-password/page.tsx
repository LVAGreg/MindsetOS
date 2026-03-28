'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
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
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-500">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Password Reset Successful!
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Redirecting to login page...
              </p>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824' }}
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
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
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center" style={{ borderColor: '#ef4444' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-500">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Invalid Reset Link
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>

              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824' }}
              >
                Request New Link
              </Link>

              <div className="mt-4">
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

  // Reset password form
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
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
              Create New Password
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2" style={{ borderColor: '#fcc824' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fcc824' }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your new password below.
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
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                    placeholder="Confirm password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
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
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#fcc824' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
