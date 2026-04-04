'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface TrialUpsellModalProps {
  membershipTier?: string;
  trialExpiresAt?: string | null;
}

export default function TrialUpsellModal({
  membershipTier,
  trialExpiresAt,
}: TrialUpsellModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    // Only show for active trial users
    if (membershipTier !== 'trial') return;
    if (!trialExpiresAt) return;

    const expiresAt = new Date(trialExpiresAt);
    const now = new Date();

    // Must NOT be expired
    if (expiresAt <= now) return;

    // Compute days remaining (ceiling so "23h 59m left" = 1 day)
    const msLeft = expiresAt.getTime() - now.getTime();
    const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    // Only trigger when 1–3 days remain
    if (days < 1 || days > 3) return;

    // Show once per calendar day via localStorage
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const storageKey = `trial_upsell_shown_${today}`;
    if (localStorage.getItem(storageKey)) return;

    setDaysLeft(days);

    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, 'true');
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [membershipTier, trialExpiresAt]);

  const handleDismiss = () => setIsVisible(false);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9,9,15,0.85)',
          zIndex: 9990,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9991,
          padding: '16px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '420px',
            background: '#1e1e30',
            border: '1px solid rgba(252,200,36,0.3)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9090a8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>

          {/* Amber badge */}
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(252,200,36,0.12)',
                color: '#fcc824',
                border: '1px solid rgba(252,200,36,0.3)',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.03em',
              }}
            >
              Trial Ending Soon
            </span>
          </div>

          {/* Headline */}
          <h2
            style={{
              color: '#ededf5',
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '10px',
              lineHeight: 1.3,
            }}
          >
            Your trial ends in{' '}
            <span style={{ color: '#fcc824' }}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
            </span>
          </h2>

          {/* Body */}
          <p
            style={{
              color: '#9090a8',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            You&apos;ve been building better thinking patterns. Don&apos;t lose your progress.
          </p>

          {/* Primary CTA */}
          <Link
            href="/join"
            style={{
              display: 'block',
              width: '100%',
              background: '#fcc824',
              color: '#000',
              textAlign: 'center',
              borderRadius: '12px',
              padding: '12px 0',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
            onClick={handleDismiss}
          >
            Get the 48-Hour Reset — $47
          </Link>

          {/* Secondary dismiss */}
          <button
            onClick={handleDismiss}
            style={{
              display: 'block',
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9090a8',
              fontSize: '13px',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            Keep exploring for now
          </button>
        </div>
      </div>
    </>
  );
}
