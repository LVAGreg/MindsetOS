'use client';

import { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  isCollapsed?: boolean; // Sidebar collapsed state
}

export default function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  isCollapsed = false
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isCollapsed) {
    // When sidebar is collapsed, show only icon as a button
    return (
      <button
        className="p-3 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
        title={title}
      >
        {icon}
      </button>
    );
  }

  return (
    <div className="px-3 py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-400 group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            {icon}
          </span>
          <span className="text-[13px] font-semibold tracking-wide uppercase">{title}</span>
        </div>
        <ChevronRight
          className={`w-3.5 h-3.5 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[2000px] opacity-100 mt-1' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
