'use client';
import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BrainToggle, { BrainVariant } from './BrainToggle';

function BrainLoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(79,110,247,0.3)', borderTopColor: '#4f6ef7' }}
      />
    </div>
  );
}

const BrainVariantA = dynamic(() => import('./BrainVariantA'), {
  ssr: false,
  loading: () => <BrainLoadingSpinner />,
});

const BrainVariantB = dynamic(() => import('./BrainVariantB'), {
  ssr: false,
  loading: () => <BrainLoadingSpinner />,
});

interface BrainInterfaceProps {
  onAgentSelect?: (slug: string) => void;
  activeSlug?: string;
  className?: string;
}

export default function BrainInterface({
  onAgentSelect,
  activeSlug,
  className = '',
}: BrainInterfaceProps) {
  const [variant, setVariant] = useState<BrainVariant>('A');
  const router = useRouter();

  const handleSelect = useCallback((slug: string) => {
    if (onAgentSelect) {
      onAgentSelect(slug);
    } else {
      sessionStorage.setItem('brainSelectedAgent', slug);
      router.push('/dashboard');
    }
  }, [onAgentSelect, router]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <BrainToggle active={variant} onChange={setVariant} />
      <div className="relative" style={{ height: 420 }}>
        {variant === 'A' ? (
          <BrainVariantA onAgentSelect={handleSelect} activeSlug={activeSlug} />
        ) : (
          <BrainVariantB onAgentSelect={handleSelect} activeSlug={activeSlug} />
        )}
      </div>
      <p className="text-center text-xs" style={{ color: '#5a5a72' }}>
        Hover to explore · Click to open
      </p>
    </div>
  );
}
