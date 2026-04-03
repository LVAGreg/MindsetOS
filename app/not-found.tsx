import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-[#5a5a72] mb-2">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          This page doesn't exist.
        </h1>
        <p className="text-white/50 mb-8 text-sm leading-relaxed">
          But your mindset work does. Head back and keep building.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#4f6ef7] text-white font-medium text-sm hover:bg-[#4060e8] transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/10 text-white/70 font-medium text-sm hover:border-white/20 hover:text-white transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
