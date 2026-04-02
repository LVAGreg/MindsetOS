'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    <div className="flex items-center justify-center min-h-[60vh] px-4" style={{ background: '#09090f' }}>
      <div className="text-center max-w-md">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <svg className="w-6 h-6" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#ededf5' }}>Something went wrong</h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#9090a8' }}>
          {error.message || 'An unexpected error occurred in the dashboard.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{ background: '#4f6ef7', color: '#ffffff' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4060e8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4f6ef7'; }}
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
            style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2e2e40'; (e.currentTarget as HTMLAnchorElement).style.color = '#ededf5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#1e1e30'; (e.currentTarget as HTMLAnchorElement).style.color = '#9090a8'; }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
