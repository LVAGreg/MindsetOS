'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#09090f' }}
    >
      <div className="text-center max-w-md w-full">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(18,18,31,0.8)',
            border: '1px solid #1e1e30',
          }}
        >
          <RefreshCw
            className="w-6 h-6"
            style={{ color: '#4f6ef7' }}
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1
          className="text-2xl font-semibold mb-3 tracking-tight"
          style={{ color: '#ededf5' }}
        >
          The dashboard hit a snag.
        </h1>

        {/* Body */}
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: '#9090a8' }}
        >
          Something tripped in the dashboard. Hit &ldquo;Try Again&rdquo; — it usually
          clears up fast.
        </p>

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          style={{ flexWrap: 'wrap' }}
        >
          <button
            onClick={reset}
            aria-label="Try again"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors"
            style={{ background: '#4f6ef7', color: '#ededf5' }}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors"
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: '1px solid #1e1e30',
              color: '#9090a8',
            }}
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
