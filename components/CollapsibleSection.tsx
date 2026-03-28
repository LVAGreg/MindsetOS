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
        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={title}
      >
        {icon}
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
