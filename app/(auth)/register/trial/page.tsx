'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, Clock, Zap, Lock, ArrowRight, Eye, EyeOff, Sparkles, Brain } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { apiClient } from '@/lib/api-client';
import { identifyUser, trackTrialStarted, trackEvent } from '@/lib/analytics';

/* ── password helpers ────────────────────────────────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  if (score <= 4) return { score, label: 'Strong', color: '#22c55e' };
  return { score, label: 'Very Strong', color: '#10b981' };
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [trialInfo, setTrialInfo] = useState<{
    expiresAt: string;
    daysRemaining: number;
    trialAgent: string;
  } | null>(null);

  const pwStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  useEffect(() => {
    trackEvent('trial_page_viewed', { source: 'trial' });
  }, []);

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
      identifyUser(result.user?.id || formData.email, { email: formData.email, role: 'trial' });
      trackTrialStarted('trial');
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

  /* ── shared input classes ──────────────────────────────── */
  const inputCls =
    'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-[#fcc824]/60 focus:ring-2 focus:ring-[#fcc824]/20 focus:bg-white/[0.07] hover:border-white/20';

  /* ── success state ─────────────────────────────────────── */
  if (registrationComplete) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060611] px-4">
        {/* BG atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-[#fcc824]/[0.08] blur-[140px]" />
          <div className="absolute bottom-[5%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
          <div className="absolute top-[50%] left-[-5%] h-[300px] w-[300px] rounded-full bg-amber-600/[0.04] blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 mb-8 animate-[fadeSlideDown_0.6s_ease-out_both]">
          <MindsetOSLogo size="lg" variant="light" />
        </div>

        {/* Success Card */}
        <div className="relative z-10 w-full max-w-md animate-[fadeSlideUp_0.6s_0.15s_ease-out_both]">
          <div className="rounded-2xl p-[1px] bg-gradient-to-b from-emerald-400/30 via-[#fcc824]/20 to-transparent">
            <div className="rounded-2xl bg-[#0c0c1d]/90 backdrop-blur-xl p-8 shadow-[0_8px_60px_-12px_rgba(252,200,36,0.18)] text-center">
              {/* Celebration icon */}
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#fcc824]/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#fcc824]/15">
                  <Sparkles className="h-8 w-8 text-[#fcc824]" />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                You&apos;re In!
              </h2>
              <p className="text-gray-400 mb-6">
                Your 7-day free trial is now active.
              </p>

              {/* Trial info cards */}
              <div className="space-y-2.5 mb-7">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fcc824]/10">
                    <Clock className="h-4 w-4 text-[#fcc824]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {trialInfo?.daysRemaining || 7} days remaining
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fcc824]/10">
                    <Zap className="h-4 w-4 text-[#fcc824]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    Full access for 7 days
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fcc824]/10">
                    <Lock className="h-4 w-4 text-[#fcc824]" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    All AI agents unlocked
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#fcc824] py-3.5 px-4 font-semibold text-black transition-all duration-300 hover:brightness-110 hover:shadow-[0_4px_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Using MindsetOS
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>

              <p className="mt-5 text-xs text-gray-600">
                Want the full experience?{' '}
                <a
                  href="https://www.mindset.show"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fcc824]/70 hover:text-[#fcc824] transition-colors"
                >
                  Upgrade to full access
                </a>
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeSlideDown {
            from { opacity: 0; transform: translateY(-18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ── main form ─────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#060611] px-4 py-8">
      {/* ── BG atmosphere ────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[10%] h-[500px] w-[500px] rounded-full bg-[#fcc824]/[0.07] blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[5%] h-[450px] w-[450px] rounded-full bg-amber-600/[0.05] blur-[130px]" />
        <div className="absolute top-[30%] right-[20%] h-[350px] w-[350px] rounded-full bg-violet-600/[0.03] blur-[120px]" />
        <div className="absolute bottom-[20%] left-[30%] h-[250px] w-[250px] rounded-full bg-emerald-600/[0.025] blur-[100px]" />
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="relative z-10 mb-2 animate-[fadeSlideDown_0.5s_ease-out_both]">
        <MindsetOSLogo size="lg" variant="light" />
      </div>

      {/* Subtitle */}
      <p className="relative z-10 mb-6 text-sm text-gray-500 animate-[fadeSlideDown_0.5s_0.05s_ease-out_both]">
        AI-Powered Mindset Coaching
      </p>

      {/* ── Trial badge ──────────────────────────────────── */}
      <div className="relative z-10 mb-5 animate-[fadeSlideUp_0.5s_0.08s_ease-out_both]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#fcc824]/20 bg-[#fcc824]/[0.06] px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#fcc824]" />
          <span className="text-xs font-semibold tracking-wide text-[#fcc824]">
            7 DAYS FREE &mdash; NO CREDIT CARD
          </span>
        </div>
      </div>

      {/* ── "What's included" feature strip ───────────────── */}
      <div className="relative z-10 w-full max-w-md mb-5 animate-[fadeSlideUp_0.5s_0.12s_ease-out_both]">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            What&apos;s included in your trial
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { icon: Brain, text: 'All MindsetOS AI agents' },
              { icon: Zap, text: 'Unlimited conversations' },
              { icon: Sparkles, text: 'Mindset foundation builder' },
              { icon: ArrowRight, text: 'Guided daily workflows' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#fcc824]/10">
                  <item.icon className="h-3 w-3 text-[#fcc824]" />
                </div>
                <span className="text-sm text-gray-400">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md animate-[fadeSlideUp_0.6s_0.16s_ease-out_both]">
        {/* gradient border wrapper */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-[#fcc824]/30 via-white/[0.06] to-transparent">
          <div className="rounded-2xl bg-[#0c0c1d]/90 backdrop-blur-xl p-7 sm:p-8 shadow-[0_8px_60px_-12px_rgba(252,200,36,0.12)]">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
              Start Your Free Trial
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Transform how you think in under 5 minutes.
            </p>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[fadeSlideUp_0.3s_ease-out_both]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-400">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-400">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`${inputCls} pr-10`}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {formData.password.length > 0 && (
                  <div className="mt-2 space-y-1 animate-[fadeSlideUp_0.25s_ease-out_both]">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: i <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs transition-colors duration-300" style={{ color: pwStrength.color }}>
                      {pwStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`${inputCls} pr-10 ${
                      formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
                        ? '!border-red-500/50'
                        : formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword
                          ? '!border-emerald-500/50'
                          : ''
                    }`}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="group mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#fcc824] py-3.5 px-4 font-semibold text-black transition-all duration-300 hover:brightness-110 hover:shadow-[0_4px_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating your trial...
                  </>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Terms note */}
            <p className="mt-4 text-center text-xs text-gray-600">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-[#fcc824]/60 hover:text-[#fcc824]/90 underline underline-offset-2 transition-colors">
                Terms & Conditions
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-[#fcc824]/60 hover:text-[#fcc824]/90 underline underline-offset-2 transition-colors">
                Privacy Policy
              </Link>
            </p>

            {/* Sign in link */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#fcc824]/80 hover:text-[#fcc824] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-center animate-[fadeSlideUp_0.6s_0.3s_ease-out_both]">
        <a
          href="https://mindset.show"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[#fcc824]/60 hover:text-[#fcc824]/90 transition-colors"
        >
          mindset.show
        </a>
        <p className="mt-1 text-xs text-gray-700">
          Copyright &copy; 2026 MindsetOS | All rights reserved.
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
