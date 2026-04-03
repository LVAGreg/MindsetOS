'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';

// Password strength helpers
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#fcc824' };
  if (score <= 3) return { score, label: 'Good', color: '#4f6ef7' };
  return { score, label: 'Strong', color: '#22c55e' };
}

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

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsSuccess(true);

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
      <div
        className="min-h-screen flex flex-col px-4 relative overflow-hidden"
        style={{ backgroundColor: '#09090f' }}
      >
        <div className="pointer-events-none absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }} />
        <div className="relative z-10 w-full pt-6 pb-4">
          <div className="flex justify-center">
            <MindsetOSLogo size="lg" variant="auto" />
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center">
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
                style={{ backgroundColor: '#22c55e' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#ededf5' }} />
              </div>

              <h2 className="text-2xl font-bold mb-4" style={{ color: '#ededf5' }}>
                Password Reset Successful!
              </h2>

              <p className="mb-6" style={{ color: '#9090a8' }}>
                Your password has been reset. You can now sign in with your new password.
              </p>

              <p className="text-sm mb-6" style={{ color: '#5a5a72' }}>
                Redirecting to login page...
              </p>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
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
      <div
        className="min-h-screen flex flex-col px-4 relative overflow-hidden"
        style={{ backgroundColor: '#09090f' }}
      >
        <div className="pointer-events-none absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
        <div className="relative z-10 w-full pt-6 pb-4">
          <div className="flex justify-center">
            <MindsetOSLogo size="lg" variant="auto" />
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div
              className="backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 text-center"
              style={{
                backgroundColor: 'rgba(18,18,31,0.8)',
                borderColor: '#ef4444',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: '#ef4444' }}
              >
                <AlertCircle className="w-8 h-8" style={{ color: '#ededf5' }} />
              </div>

              <h2 className="text-2xl font-bold mb-4" style={{ color: '#ededf5' }}>
                Invalid Reset Link
              </h2>

              <p className="mb-6" style={{ color: '#9090a8' }}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>

              <Link
                href="/forgot-password"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
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
    <div
      className="min-h-screen flex flex-col px-4 relative overflow-hidden"
      style={{ backgroundColor: '#09090f' }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, #fcc824 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #4f6ef7 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(252,200,36,0.5) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="reset-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#reset-grain)" />
        </svg>
      </div>

      <div className="relative z-10 w-full pt-6 pb-4">
        <div className="flex justify-center">
          <MindsetOSLogo size="lg" variant="auto" />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#fcc824' }}>
              MindsetOS
            </h1>
            <p className="font-medium" style={{ color: '#9090a8' }}>
              Create New Password
            </p>
          </div>

          <div className="p-[1px] rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.4) 0%, rgba(30,30,48,0.9) 60%, rgba(252,200,36,0.15) 100%)' }}>
          <div
            className="backdrop-blur-sm p-8 rounded-xl shadow-2xl"
            style={{
              backgroundColor: 'rgba(18,18,31,0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#fcc824' }}
              >
                <Lock className="w-5 h-5" style={{ color: '#09090f' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>
                  Reset Password
                </h2>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  Enter your new password below.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm border"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderColor: 'rgba(239,68,68,0.3)',
                  color: '#ef4444',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#ededf5' }}
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
                    className="w-full px-4 py-2 pr-10 rounded-lg transition-all outline-none"
                    style={{
                      backgroundColor: 'rgba(18,18,31,0.8)',
                      border: `1px solid #1e1e30`,
                      color: '#ededf5',
                    }}
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: '#5a5a72' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{
                            backgroundColor:
                              i <= strength.score ? strength.color : '#1e1e30',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>
                      {strength.label}
                      {strength.score < 3 && (
                        <span style={{ color: '#5a5a72' }}>
                          {' '}— add uppercase, numbers, or symbols
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#ededf5' }}
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
                    className="w-full px-4 py-2 pr-10 rounded-lg transition-all outline-none"
                    style={{
                      backgroundColor: 'rgba(18,18,31,0.8)',
                      border: `1px solid ${
                        passwordsMismatch
                          ? '#ef4444'
                          : passwordsMatch
                          ? '#22c55e'
                          : '#1e1e30'
                      }`,
                      color: '#ededf5',
                    }}
                    placeholder="Confirm password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: '#5a5a72' }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                    Passwords do not match.
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs mt-1" style={{ color: '#22c55e' }}>
                    Passwords match.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || passwordsMismatch}
                className="w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
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
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#09090f' }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#fcc824' }} />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
