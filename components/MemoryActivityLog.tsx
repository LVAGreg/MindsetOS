'use client';

import { useState, useEffect } from 'react';
import { Activity, Plus, Edit, Archive, RotateCcw, TrendingUp, TrendingDown, Clock } from 'lucide-react';

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

export default function MemoryActivityLog({ userId, limit = 20 }: MemoryActivityLogProps) {
  const [activities, setActivities] = useState<MemoryActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/history/${userId}?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch memory activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchActivities();
    }
  }, [userId, limit]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'updated':
      case 'merged':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-orange-600" />;
      case 'reactivated':
        return <RotateCcw className="w-4 h-4 text-purple-600" />;
      case 'boosted':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'decayed':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'updated':
      case 'merged':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'archived':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'reactivated':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'boosted':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'decayed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'merged':
        return 'Merged';
      case 'archived':
        return 'Archived';
      case 'reactivated':
        return 'Reactivated';
      case 'boosted':
        return 'Importance +';
      case 'decayed':
        return 'Importance -';
      default:
        return action;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold">Memory Activity Log</h3>
        </div>
        <span className="text-xs text-gray-500">{activities.length} recent</span>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 mt-2">Loading activity...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-500">
          No activity yet. Start a conversation to build memories!
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-3 rounded border ${getActionColor(activity.action)} transition-all`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {getActionLabel(activity.action)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(activity.created_at)}
                    </span>
                  </div>

                  {/* Content changes */}
                  {activity.new_content && (
                    <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                      {activity.new_content.substring(0, 100)}
                      {activity.new_content.length > 100 && '...'}
                    </div>
                  )}

                  {/* Importance changes */}
                  {activity.old_importance !== null && activity.new_importance !== null && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Importance:</span>
                      <span className="font-medium">
                        {(activity.old_importance * 100).toFixed(0)}%
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-blue-600">
                        {(activity.new_importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Reason */}
                  {activity.reason && (
                    <div className="text-xs text-gray-500 italic mt-1">
                      {activity.reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={fetchActivities}
        disabled={isLoading}
        className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Refreshing...' : 'Refresh Activity'}
      </button>
    </div>
  );
}
