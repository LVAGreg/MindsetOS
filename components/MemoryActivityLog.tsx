'use client';

import { useState, useEffect } from 'react';
import { Activity, Plus, Edit, Archive, RotateCcw, TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';

interface MemoryActivity {
  id: string;
  memory_id: string;
  action: string;
  old_content: string | null;
  new_content: string | null;
  old_importance: number | null;
  new_importance: number | null;
  reason: string;
  created_at: string;
  current_content: string | null;
  status: string | null;
}

interface MemoryActivityLogProps {
  userId: string;
  limit?: number;
}

// ─── Token palette ────────────────────────────────────────────────────────────
const T = {
  bg:        '#09090f',
  bgCard:    'rgba(18,18,31,0.8)',
  bgSurface: '#1e1e30',
  text:      '#ededf5',
  muted:     '#9090a8',
  subtle:    '#5a5a72',
  accent:    '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
} as const;

// Per-action colour tokens (border + bg tint expressed as inline styles)
function getActionStyle(action: string): React.CSSProperties {
  switch (action) {
    case 'created':
      return { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.07)' };
    case 'updated':
    case 'merged':
      return { borderColor: T.accent, backgroundColor: 'rgba(79,110,247,0.07)' };
    case 'archived':
      return { borderColor: T.amber, backgroundColor: 'rgba(252,200,36,0.07)' };
    case 'reactivated':
      return { borderColor: T.purple, backgroundColor: 'rgba(124,91,246,0.07)' };
    case 'boosted':
      return { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.07)' };
    case 'decayed':
      return { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.07)' };
    default:
      return { borderColor: T.subtle, backgroundColor: T.bgSurface };
  }
}

function getActionIcon(action: string) {
  const sz = 'w-4 h-4';
  switch (action) {
    case 'created':
      return <Plus className={sz} style={{ color: '#22c55e' }} />;
    case 'updated':
    case 'merged':
      return <Edit className={sz} style={{ color: T.accent }} />;
    case 'archived':
      return <Archive className={sz} style={{ color: T.amber }} />;
    case 'reactivated':
      return <RotateCcw className={sz} style={{ color: T.purple }} />;
    case 'boosted':
      return <TrendingUp className={sz} style={{ color: '#10b981' }} />;
    case 'decayed':
      return <TrendingDown className={sz} style={{ color: '#ef4444' }} />;
    default:
      return <Activity className={sz} style={{ color: T.muted }} />;
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'created':     return 'Created';
    case 'updated':     return 'Updated';
    case 'merged':      return 'Merged';
    case 'archived':    return 'Archived';
    case 'reactivated': return 'Reactivated';
    case 'boosted':     return 'Importance +';
    case 'decayed':     return 'Importance -';
    default:            return action;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days    < 7)  return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function MemoryActivityLog({ userId, limit = 20 }: MemoryActivityLogProps) {
  const [activities, setActivities] = useState<MemoryActivity[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchActivities = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/history/${userId}?limit=${limit}`
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      } else {
        setError(`Failed to load activity (${res.status})`);
      }
    } catch (err) {
      setError('Could not reach the server. Check your connection.');
      console.error('Failed to fetch memory activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, limit]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: T.accent }} />
          <h3 className="text-sm font-semibold" style={{ color: T.text }}>
            Memory Activity Log
          </h3>
        </div>
        <span className="text-xs" style={{ color: T.muted }}>
          {activities.length} recent
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="text-xs px-3 py-2 rounded border"
          style={{
            color: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.25)',
          }}
        >
          {error}
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="text-center py-4">
          <div
            className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: T.accent, borderTopColor: 'transparent' }}
          />
          <p className="text-xs mt-2" style={{ color: T.muted }}>Loading activity…</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-4 text-xs" style={{ color: T.muted }}>
          No activity yet. Start a conversation to build memories!
        </div>
      ) : (
        /* overflow-x-auto covers any future wide table content */
        <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="p-3 rounded border transition-all"
              style={getActionStyle(activity.action)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
              }}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  {/* Action label + timestamp */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: T.text }}
                    >
                      {getActionLabel(activity.action)}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: T.muted }}>
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(activity.created_at)}
                    </span>
                  </div>

                  {/* Content preview */}
                  {activity.new_content && (
                    <div className="text-xs mb-1" style={{ color: T.text }}>
                      {activity.new_content.substring(0, 100)}
                      {activity.new_content.length > 100 && '…'}
                    </div>
                  )}

                  {/* Importance delta */}
                  {activity.old_importance !== null && activity.new_importance !== null && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span style={{ color: T.muted }}>Importance:</span>
                      <span className="font-medium" style={{ color: T.text }}>
                        {(activity.old_importance * 100).toFixed(0)}%
                      </span>
                      <span style={{ color: T.subtle }}>→</span>
                      <span className="font-medium" style={{ color: T.accent }}>
                        {(activity.new_importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Reason */}
                  {activity.reason && (
                    <div className="text-xs italic mt-1" style={{ color: T.muted }}>
                      {activity.reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={fetchActivities}
        disabled={isLoading}
        aria-label="Refresh memory activity log"
        className="w-full flex flex-wrap items-center justify-center gap-2 px-3 py-2 text-xs rounded transition-colors disabled:opacity-50"
        style={{ backgroundColor: T.bgSurface, color: T.text, border: `1px solid ${T.subtle}` }}
        onMouseEnter={(e) => {
          if (!isLoading) (e.currentTarget as HTMLElement).style.backgroundColor = '#2a2a42';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = T.bgSurface;
        }}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            Refreshing…
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3" />
            Refresh Activity
          </>
        )}
      </button>
    </div>
  );
}
