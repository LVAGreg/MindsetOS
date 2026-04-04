import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
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
          <SearchX
            className="w-6 h-6"
            style={{ color: '#9090a8' }}
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1
          className="text-2xl font-semibold mb-3 tracking-tight"
          style={{ color: '#ededf5' }}
        >
          That page doesn&apos;t exist.
        </h1>

        {/* Body */}
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: '#9090a8' }}
        >
          But your mindset work does. Head back and keep building.
        </p>

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          style={{ flexWrap: 'wrap' }}
        >
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-sm transition-colors"
            style={{ background: '#4f6ef7', color: '#ededf5' }}
          >
            Back to Dashboard
          </Link>
          <Link
            href="/"
            aria-label="Go home"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-sm transition-colors"
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: '1px solid #1e1e30',
              color: '#9090a8',
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
