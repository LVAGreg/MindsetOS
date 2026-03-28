/**
 * OnboardingGuard Component
 * HOC that ensures user has completed onboarding before accessing the app
 * Phase 1.1 of Enhanced Onboarding & Brand Voice System
 */

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface OnboardingStatus {
  completed: boolean;
  currentStep: number;
  totalSteps: number;
  startedAt?: string;
  completedAt?: string;
}

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const token = localStorage.getItem('token');

      // If no token, redirect to login
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch onboarding status
      const response = await fetch('http://localhost:3010/api/onboarding/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If unauthorized, clear token and redirect to login
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch onboarding status');
      }

      const status = await response.json();
      setOnboardingStatus(status);

      // If onboarding not completed and not already on onboarding page, redirect
      if (!status.completed && pathname !== '/onboarding') {
        router.push('/onboarding');
        return;
      }

      // If onboarding is completed and on onboarding page, redirect to home
      if (status.completed && pathname === '/onboarding') {
        router.push('/');
        return;
      }

      setIsChecking(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsChecking(false);
    }
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default OnboardingGuard;
