'use client';

import { Brain } from 'lucide-react';

interface MindsetOSLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showIcon?: boolean;
  className?: string;
}

const sizes = {
  xs: { icon: 16, text: 'text-sm', gap: 'gap-1' },
  sm: { icon: 20, text: 'text-base', gap: 'gap-1.5' },
  md: { icon: 26, text: 'text-xl', gap: 'gap-2' },
  lg: { icon: 32, text: 'text-2xl', gap: 'gap-2.5' },
  xl: { icon: 44, text: 'text-4xl', gap: 'gap-3' },
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
        <Brain size={s.icon} className="text-amber-500 flex-shrink-0" strokeWidth={2.2} />
      )}
      <span className={`${s.text} font-extrabold tracking-tight ${textColor}`}>
        mindset<span className="text-amber-500">OS</span>
      </span>
    </span>
  );
}
