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
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9090a8', fontSize: '12px' }}
      >
        <button
          onClick={() => canGoPrevious && onBranchChange(currentBranchIndex - 1)}
          disabled={!canGoPrevious}
          aria-label="Previous branch"
          style={{
            padding: '2px',
            background: 'none',
            border: 'none',
            cursor: canGoPrevious ? 'pointer' : 'not-allowed',
            opacity: canGoPrevious ? 1 : 0.3,
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronLeft style={{ width: '12px', height: '12px' }} />
        </button>

        <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
          ({currentBranchIndex + 1}/{totalBranches})
        </span>

        <button
          onClick={() => canGoNext && onBranchChange(currentBranchIndex + 1)}
          disabled={!canGoNext}
          aria-label="Next branch"
          style={{
            padding: '2px',
            background: 'none',
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.3,
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    );
  }

  // Standard mode (standalone below message)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
        padding: '4px 12px',
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid #1e1e30',
        borderRadius: '6px',
        fontSize: '12px',
      }}
    >
      <button
        onClick={() => canGoPrevious && onBranchChange(currentBranchIndex - 1)}
        disabled={!canGoPrevious}
        aria-label="Previous branch"
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: 'none',
          background: 'none',
          cursor: canGoPrevious ? 'pointer' : 'not-allowed',
          opacity: canGoPrevious ? 1 : 0.3,
          color: canGoPrevious ? '#ededf5' : '#5a5a72',
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (canGoPrevious) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'none';
        }}
      >
        <ChevronLeft style={{ width: '16px', height: '16px' }} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
        <GitBranch style={{ width: '14px', height: '14px', color: '#9090a8' }} />
        <span style={{ fontWeight: 500, color: '#ededf5' }}>
          {currentBranchIndex + 1} of {totalBranches}
        </span>
      </div>

      <button
        onClick={() => canGoNext && onBranchChange(currentBranchIndex + 1)}
        disabled={!canGoNext}
        aria-label="Next branch"
        style={{
          padding: '4px',
          borderRadius: '4px',
          border: 'none',
          background: 'none',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.3,
          color: canGoNext ? '#ededf5' : '#5a5a72',
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          if (canGoNext) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'none';
        }}
      >
        <ChevronRight style={{ width: '16px', height: '16px' }} />
      </button>
    </div>
  );
}
