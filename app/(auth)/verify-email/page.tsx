'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  // Verify email on mount if token exists
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setIsLoading(false);
      setError('Invalid or missing verification token. Please check your email for the verification link.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/verify-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: verificationToken }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      if (data.alreadyVerified) {
        setAlreadyVerified(true);
      } else {
        setIsSuccess(true);
      }

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col px-4"
        style={{ backgroundColor: '#09090f' }}
      >
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
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#fcc824' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: '#ededf5' }}>
                Verifying Your Email...
              </h2>
              <p style={{ color: '#9090a8' }}>
                Please wait while we verify your email address.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess || alreadyVerified) {
    return (
      <div
        className="min-h-screen flex flex-col px-4"
        style={{ backgroundColor: '#09090f' }}
      >
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
                borderColor: '#1e1e30',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: '#10b981' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#ededf5' }} />
              </div>

              <h2 className="text-2xl font-bold mb-4" style={{ color: '#ededf5' }}>
                {alreadyVerified ? 'Email Already Verified!' : 'Email Verified!'}
              </h2>

              <p className="mb-6" style={{ color: '#9090a8' }}>
                {alreadyVerified
                  ? 'Your email was already verified. You can start using MindsetOS.'
                  : 'Your email has been verified successfully. Welcome to MindsetOS!'}
              </p>

              <p className="text-sm mb-6" style={{ color: '#5a5a72' }}>
                Redirecting to dashboard...
              </p>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div
      className="min-h-screen flex flex-col px-4"
      style={{ backgroundColor: '#09090f' }}
    >
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
              borderColor: '#1e1e30',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#ef4444' }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: '#ededf5' }} />
            </div>

            <h2 className="text-2xl font-bold mb-4" style={{ color: '#ededf5' }}>
              Verification Failed
            </h2>

            <p className="mb-6" style={{ color: '#9090a8' }}>
              {error}
            </p>

            <div className="space-y-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                style={{ backgroundColor: '#fcc824', color: '#09090f' }}
              >
                <Mail className="w-5 h-5" />
                Sign In to Resend
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
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#09090f' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#fcc824' }} />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
