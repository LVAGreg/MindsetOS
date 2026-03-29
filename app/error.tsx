'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong.</h1>
        <p className="text-white/50 mb-8 text-sm">
          An unexpected error occurred. Try again or refresh the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#4f6ef7] text-white font-medium text-sm hover:bg-[#4060e8] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
