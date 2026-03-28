'use client';

import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';

interface ForkNavigationProps {
  messageId: string;
  currentBranchIndex: number;
  totalBranches: number;
  onBranchChange: (newIndex: number) => void;
  compact?: boolean; // Inline mode for display next to Edit button
}

export default function ForkNavigation({
  messageId,
  currentBranchIndex,
  totalBranches,
  onBranchChange,
  compact = false,
}: ForkNavigationProps) {
  if (totalBranches <= 1) {
    return null; // No need to show navigation if there's only one branch
  }

  const canGoPrevious = currentBranchIndex > 0;
  const canGoNext = currentBranchIndex < totalBranches - 1;

  // Compact inline mode: [<] (2/3) [>]
  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <button
          onClick={() => canGoPrevious && onBranchChange(currentBranchIndex - 1)}
          disabled={!canGoPrevious}
          className={`p-0.5 ${
            canGoPrevious
              ? 'hover:text-gray-700 dark:hover:text-gray-200'
              : 'opacity-30 cursor-not-allowed'
          }`}
          title="Previous branch"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        <span className="font-mono text-[10px]">
          ({currentBranchIndex + 1}/{totalBranches})
        </span>

        <button
          onClick={() => canGoNext && onBranchChange(currentBranchIndex + 1)}
          disabled={!canGoNext}
          className={`p-0.5 ${
            canGoNext
              ? 'hover:text-gray-700 dark:hover:text-gray-200'
              : 'opacity-30 cursor-not-allowed'
          }`}
          title="Next branch"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Standard mode (standalone below message)
  return (
    <div className="flex items-center justify-center gap-2 mt-2 py-1 px-3 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
      <button
        onClick={() => canGoPrevious && onBranchChange(currentBranchIndex - 1)}
        disabled={!canGoPrevious}
        className={`p-1 rounded transition-colors ${
          canGoPrevious
            ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            : 'opacity-30 cursor-not-allowed text-gray-400'
        }`}
        title="Previous branch"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2">
        <GitBranch className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {currentBranchIndex + 1} of {totalBranches}
        </span>
      </div>

      <button
        onClick={() => canGoNext && onBranchChange(currentBranchIndex + 1)}
        disabled={!canGoNext}
        className={`p-1 rounded transition-colors ${
          canGoNext
            ? 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            : 'opacity-30 cursor-not-allowed text-gray-400'
        }`}
        title="Next branch"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
