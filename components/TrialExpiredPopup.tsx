'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  ArrowRight,
  Clock,
  Zap,
  Star,
  Shield,
  Award,
} from 'lucide-react';

interface TrialExpiredPopupProps {
  membershipTier?: string;
  trialExpiresAt?: string | null;
  onDismiss?: () => void;
}

export default function TrialExpiredPopup({
  membershipTier,
  trialExpiresAt,
  onDismiss,
}: TrialExpiredPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Only show for expired trial users
    if (!membershipTier) return;

    const isTrialExpired =
      membershipTier === 'trial_expired' ||
      (membershipTier === 'trial' && trialExpiresAt && new Date(trialExpiresAt) < new Date());

    if (!isTrialExpired) return;

    // Check if dismissed this session
    const dismissedKey = 'trial_popup_dismissed';
    const dismissed = sessionStorage.getItem(dismissedKey);
    if (dismissed) return;

    // Show after a brief delay for smooth UX
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, [membershipTier, trialExpiresAt]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('trial_popup_dismissed', 'true');
    onDismiss?.();
  };

  if (!isVisible || isDismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div
          className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
          style={{ borderColor: '#fcc824' }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          {/* Gold header bar */}
          <div className="bg-gradient-to-r from-[#fcc824] to-[#f0a030] px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-black">
              <Clock className="w-5 h-5" />
              <span className="font-bold text-lg">Your Free Trial Has Ended</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Keep Your AI Agents <span style={{ color: '#fcc824' }}>+ Level Up</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You've seen what the AI can do. Now get the full system &mdash; AI agents, live coaching, and implementation training.
              </p>
            </div>

            {/* What you get */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
              <div className="space-y-2.5">
                {[
                  { icon: Zap, text: 'All 12+ AI agents + future releases' },
                  { icon: Star, text: '12 implementation modules & frameworks' },
                  { icon: Shield, text: 'Weekly LIVE coaching calls' },
                  { icon: Award, text: 'MindsetOS community + private support' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5" style={{ color: '#fcc824' }} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ color: '#fcc824' }}>$87</span>
                <span className="text-lg text-gray-500">/week</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                12-week program &middot; Or save $294 with upfront payment
              </p>
            </div>

            {/* CTA Button */}
            <Link
              href="/join"
              className="w-full px-6 py-3.5 bg-[#fcc824] hover:bg-[#f0be1e] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg transform hover:scale-[1.02]"
              onClick={handleDismiss}
            >
              See What&apos;s Inside
              <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Secondary action */}
            <button
              onClick={handleDismiss}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-center py-2"
            >
              Maybe later
            </button>

            {/* Guarantee */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              30-day money-back guarantee &middot; Secure payment
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
