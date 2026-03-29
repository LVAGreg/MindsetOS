'use client';

import { Brain } from 'lucide-react';

interface MindsetOSLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showIcon?: boolean;
  className?: string;
}

const sizes = {
  xs: { icon: 16, text: 'text-sm', gap: 'gap-1', glow: '0 0 8px rgba(252,200,36,0.15)' },
  sm: { icon: 20, text: 'text-base', gap: 'gap-1.5', glow: '0 0 10px rgba(252,200,36,0.15)' },
  md: { icon: 26, text: 'text-xl', gap: 'gap-2', glow: '0 0 14px rgba(252,200,36,0.18)' },
  lg: { icon: 32, text: 'text-2xl', gap: 'gap-2.5', glow: '0 0 18px rgba(252,200,36,0.2)' },
  xl: { icon: 44, text: 'text-4xl', gap: 'gap-3', glow: '0 0 24px rgba(252,200,36,0.25)' },
};

export default function MindsetOSLogo({ size = 'md', variant = 'auto', showIcon = true, className = '' }: MindsetOSLogoProps) {
  const s = sizes[size];

  const textColor = variant === 'light'
    ? 'text-white'
    : variant === 'dark'
      ? 'text-gray-900'
      : 'text-gray-900 dark:text-white';

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {showIcon && (
        <span
          className="flex-shrink-0 rounded-lg flex items-center justify-center"
          style={{
            filter: `drop-shadow(${s.glow})`,
          }}
        >
          <Brain size={s.icon} className="text-[#fcc824]" strokeWidth={2.2} />
        </span>
      )}
      <span className={`${s.text} font-extrabold tracking-tighter ${textColor}`}>
        mindset<span className="text-[#fcc824]">OS</span>
      </span>
    </span>
  );
}
