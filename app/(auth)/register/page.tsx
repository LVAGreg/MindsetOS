'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, Ticket, Eye, EyeOff, ArrowRight } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { apiClient } from '@/lib/api-client';
import { identifyUser, trackTrialStarted } from '@/lib/analytics';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

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
      setError('Unable to validate invite code. Please try again.');
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

      identifyUser(formData.email, { email: formData.email, role: 'trial' });
      trackTrialStarted('register');
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

  /* ── shared input classes ──────────────────────────────── */
  const inputCls =
    'w-full px-4 py-3 bg-[#12121f] border border-[#1e1e30] rounded-xl text-[#ededf5] placeholder-[#9090a8] outline-none transition-all duration-300 focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/20 hover:border-[#2e2e45]';

  /* ── success state ─────────────────────────────────────── */
  if (registrationComplete) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#09090f] px-4">
        {/* BG atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-[15%] h-[500px] w-[500px] rounded-full bg-[#fcc824]/[0.06] blur-[140px]" />
          <div className="absolute bottom-[-5%] right-[10%] h-[400px] w-[400px] rounded-full bg-amber-600/[0.05] blur-[120px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 mb-8 animate-[fadeSlideDown_0.6s_ease-out_both]">
          <MindsetOSLogo size="lg" variant="light" />
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md animate-[fadeSlideUp_0.6s_0.15s_ease-out_both]">
          <div className="rounded-2xl border border-[#1e1e30] p-8 backdrop-blur-xl shadow-[0_8px_60px_-12px_rgba(79,110,247,0.2)] text-center" style={{ background: 'rgba(18,18,31,0.9)' }}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fcc824]/10">
              <CheckCircle className="h-9 w-9 text-[#fcc824]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Check Your Email
            </h2>
            <p className="text-[#9090a8] mb-8 leading-relaxed">
              We sent a verification link to{' '}
              <strong className="text-white">{formData.email}</strong>. Click the link to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#fcc824] px-6 py-3 font-semibold text-black transition-all duration-300 hover:brightness-110 hover:shadow-[0_4px_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Link>
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
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#09090f] px-4 py-8">
      {/* ── BG atmosphere ────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[15%] h-[500px] w-[500px] rounded-full bg-[#fcc824]/[0.06] blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[10%] h-[400px] w-[400px] rounded-full bg-amber-600/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] right-[30%] h-[300px] w-[300px] rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(124,91,246,0.03)' }} />
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
      <p className="relative z-10 mb-6 text-sm text-[#5a5a72] animate-[fadeSlideDown_0.5s_0.05s_ease-out_both]">
        AI-Powered Mindset Coaching
      </p>

      {/* ── Card ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md animate-[fadeSlideUp_0.6s_0.1s_ease-out_both]">
        {/* gradient border wrapper */}
        <div className="rounded-2xl p-[1px]" style={{ background: 'linear-gradient(160deg, rgba(79,110,247,0.45) 0%, rgba(30,30,48,0.9) 55%, rgba(252,200,36,0.12) 100%)' }}>
          <div className="rounded-2xl backdrop-blur-xl p-7 sm:p-8 shadow-[0_8px_60px_-12px_rgba(79,110,247,0.15)]" style={{ background: 'rgba(18,18,31,0.9)' }}>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-6">
              Create Account
            </h2>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[fadeSlideUp_0.3s_ease-out_both]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#9090a8]">
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
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#9090a8]">
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

              {/* Invite Code */}
              <div>
                <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-medium text-[#9090a8]">
                  Invite Code <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Ticket className="h-4 w-4 text-[#9090a8]" />
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
                    className={`${inputCls} pl-10 pr-10 ${
                      inviteCodeValid === true
                        ? '!border-emerald-500/50 !ring-emerald-500/20'
                        : inviteCodeValid === false
                          ? '!border-red-500/50 !ring-red-500/20'
                          : ''
                    }`}
                    placeholder="Enter your invite code"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                    {inviteCodeChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#9090a8]" />
                    ) : inviteCodeValid === true ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : inviteCodeValid === false ? (
                      <span className="text-xs font-medium text-red-400">Invalid</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-[#5a5a72]">
                  Need an invite code? Contact{' '}
                  <a href="mailto:hello@mindset.show" className="text-[#fcc824]/80 hover:text-[#fcc824] transition-colors">
                    hello@mindset.show
                  </a>
                </p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#9090a8]">
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#9090a8] hover:text-[#ededf5] transition-colors"
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
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#9090a8]">
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
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#9090a8] hover:text-[#ededf5] transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#1e1e30] bg-[#12121f] transition-colors"
                  style={{ accentColor: '#fcc824' }}
                />
                <label htmlFor="terms-checkbox" className="text-sm leading-snug text-[#9090a8]">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="font-medium text-[#fcc824]/80 hover:text-[#fcc824] underline underline-offset-2 transition-colors"
                  >
                    Terms & Conditions
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="font-medium text-[#fcc824]/80 hover:text-[#fcc824] underline underline-offset-2 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms}
                className="group mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#fcc824] py-3.5 px-4 font-semibold text-black transition-all duration-300 hover:brightness-110 hover:shadow-[0_4px_24px_rgba(252,200,36,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-[#9090a8]" style={{ background: 'rgba(18,18,31,1)' }}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#1e1e30] bg-[#12121f] py-3 px-4 font-medium text-[#9090a8] transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.14] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#9090a8]" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            {/* Sign in link */}
            <p className="mt-6 text-center text-sm text-[#9090a8]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#4f6ef7] hover:text-[#7b8ff9] transition-colors">
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
        <p className="mt-1 text-xs text-[#5a5a72]">
          Copyright &copy; 2026 MindsetOS | All rights reserved.
        </p>
      </div>

      {/* ── Terms Modal ──────────────────────────────────── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" onClick={() => setShowTermsModal(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
          <div
            className="relative z-10 w-full max-w-3xl rounded-2xl border border-[#1e1e30] backdrop-blur-xl shadow-2xl animate-[fadeSlideUp_0.3s_ease-out_both]" style={{ background: 'rgba(18,18,31,0.97)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h3 className="text-xl font-bold text-white">Terms & Conditions</h3>
              <button aria-label="Close Terms & Conditions" onClick={() => setShowTermsModal(false)} className="text-[#5a5a72] hover:text-[#9090a8] transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="prose prose-sm prose-invert max-w-none text-[#9090a8] space-y-4">
                <p className="text-xs text-[#5a5a72]">Last Updated: March 27, 2026</p>
                <p>These terms and conditions outline the rules and regulations for the use of MindsetOS — Mindset Operating System, located at https://mindset.show.</p>
                <h4 className="text-base font-bold text-white mt-4">AI-Powered Services & Limitations</h4>
                <p className="text-sm font-semibold text-[#9090a8]">IMPORTANT: By using MindsetOS, you acknowledge that:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong className="text-[#ededf5]">Informational Only</strong>: AI-generated content is for informational purposes and NOT professional, legal, financial, or tax advice</li>
                  <li><strong className="text-[#ededf5]">No Warranty</strong>: We make no guarantees about accuracy, completeness, or suitability of AI outputs</li>
                  <li><strong className="text-[#ededf5]">Your Responsibility</strong>: You are solely responsible for reviewing and validating all AI recommendations before use</li>
                  <li><strong className="text-[#ededf5]">Potential Errors</strong>: AI systems may produce inaccurate or misleading information</li>
                  <li><strong className="text-[#ededf5]">Third-Party Models</strong>: We use third-party AI providers (OpenAI, Anthropic, Perplexity) subject to their terms</li>
                  <li><strong className="text-[#ededf5]">Content License</strong>: You retain ownership but grant us license to use your content for service improvement</li>
                </ul>
                <p className="text-sm font-semibold text-red-400 mt-3">We are NOT liable for business decisions, financial losses, or damages arising from AI-generated content or recommendations.</p>
                <h4 className="text-base font-bold text-white mt-4">License & Usage</h4>
                <p>You must not:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Republish, sell, or redistribute material from MindsetOS</li>
                  <li>Attempt to reverse engineer AI model logic</li>
                  <li>Use automated tools to scrape data</li>
                  <li>Generate harmful, illegal, or unethical content</li>
                </ul>
                <h4 className="text-base font-bold text-white mt-4">Data & Privacy</h4>
                <p className="text-sm">We collect account information, conversation history, usage analytics, and API logs to provide and improve our services. See our Privacy Policy for details.</p>
                <h4 className="text-base font-bold text-white mt-4">Payment</h4>
                <p className="text-sm">Fees are based on API usage and token consumption. Pricing may vary by AI model. You are responsible for all charges incurred under your account.</p>
                <h4 className="text-base font-bold text-white mt-4">Disclaimer</h4>
                <p className="text-sm">We make no guarantees about accuracy, completeness, or suitability of AI-generated content. We reserve the right to modify, suspend, or discontinue services with reasonable notice.</p>
                <p className="text-xs text-[#5a5a72] mt-4 pt-4 border-t border-white/[0.06]">MindsetOS is operated by MindsetOS Pty. Ltd. By using our services, you agree to be bound by these terms and our Privacy Policy.</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
              <Link href="/terms" target="_blank" className="text-sm text-[#fcc824]/70 hover:text-[#fcc824] transition-colors">
                View Full Terms &rarr;
              </Link>
              <button
                onClick={() => setShowTermsModal(false)}
                className="rounded-lg bg-[#fcc824] px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Modal ────────────────────────────────── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" onClick={() => setShowPrivacyModal(false)}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
          <div
            className="relative z-10 w-full max-w-3xl rounded-2xl border border-[#1e1e30] backdrop-blur-xl shadow-2xl animate-[fadeSlideUp_0.3s_ease-out_both]" style={{ background: 'rgba(18,18,31,0.97)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h3 className="text-xl font-bold text-white">Privacy Policy</h3>
              <button aria-label="Close Privacy Policy" onClick={() => setShowPrivacyModal(false)} className="text-[#5a5a72] hover:text-[#9090a8] transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="prose prose-sm prose-invert max-w-none text-[#9090a8] space-y-4">
                <p className="text-xs text-[#5a5a72]">Last Updated: March 27, 2026</p>
                <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service.</p>
                <h4 className="text-base font-bold text-white mt-4">Personal Data We Collect</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Email address, name, and optional contact information</li>
                  <li>Conversation history with AI agents</li>
                  <li>AI-generated content and business frameworks</li>
                  <li>Usage analytics and interaction patterns</li>
                  <li>API usage logs and token consumption data</li>
                </ul>
                <h4 className="text-base font-bold text-white mt-4">How We Use Your Data</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>To provide and maintain AI-powered consulting services</li>
                  <li>To improve AI models and service quality</li>
                  <li>To contact you with service updates and announcements</li>
                  <li>To analyze platform usage and improve user experience</li>
                  <li>To comply with legal obligations</li>
                </ul>
                <h4 className="text-base font-bold text-white mt-4">Third-Party AI Providers</h4>
                <p className="text-sm">We share data with third-party AI providers (OpenAI, Anthropic, Perplexity) to deliver AI services. These providers have their own privacy policies governing data usage.</p>
                <h4 className="text-base font-bold text-white mt-4">Data Retention</h4>
                <p className="text-sm">We retain Personal Data as long as necessary to provide services. You may request data deletion at any time.</p>
                <h4 className="text-base font-bold text-white mt-4">Your Rights (GDPR & CCPA)</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong className="text-[#ededf5]">Access</strong>: Request access to your personal data</li>
                  <li><strong className="text-[#ededf5]">Correction</strong>: Request correction of inaccurate data</li>
                  <li><strong className="text-[#ededf5]">Deletion</strong>: Request deletion of your data</li>
                  <li><strong className="text-[#ededf5]">Opt-out</strong>: Opt out of marketing communications</li>
                  <li><strong className="text-[#ededf5]">Data Portability</strong>: Request data in machine-readable format</li>
                </ul>
                <h4 className="text-base font-bold text-white mt-4">Security</h4>
                <p className="text-sm">We use commercially acceptable security measures to protect your data. However, no method of transmission over the Internet is 100% secure.</p>
                <h4 className="text-base font-bold text-white mt-4">Children&apos;s Privacy</h4>
                <p className="text-sm">Our Service does not address anyone under the age of 13. We do not knowingly collect personal information from children under 13.</p>
                <p className="text-xs text-[#5a5a72] mt-4 pt-4 border-t border-white/[0.06]">MindsetOS is operated by MindsetOS Pty. Ltd. By using our services, you agree to this Privacy Policy and our Terms & Conditions.</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
              <Link href="/privacy" target="_blank" className="text-sm text-[#fcc824]/70 hover:text-[#fcc824] transition-colors">
                View Full Privacy Policy &rarr;
              </Link>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="rounded-lg bg-[#fcc824] px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

// Wrap in Suspense for useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fcc824]" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
