'use client';

import { useState } from 'react';
import { Eye, X, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TakeoverInfo {
  id: string;
  power_user_id: string;
  target_user_id: string;
  target_user_email?: string;
  target_user_first_name?: string;
  target_user_last_name?: string;
  power_user_email?: string;
  power_user_first_name?: string;
  power_user_last_name?: string;
  started_at: string;
  notes?: string;
}

interface TakeoverBannerProps {
  takeover: TakeoverInfo;
  mode: 'power_user' | 'target_user';
  onExit?: () => void;
}

export function TakeoverBanner({ takeover, mode, onExit }: TakeoverBannerProps) {
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndTakeover = async () => {
    if (!confirm('End this coaching session?')) {
      return;
    }

    setIsEnding(true);
    setError(null);

    try {
      await apiClient.post(`/api/power-user/takeover/${takeover.id}/end`, {});

      if (onExit) {
        onExit();
      }
    } catch (err: any) {
      console.error('Error ending takeover:', err);
      setError(err.message || 'Failed to end session');
      setIsEnding(false);
    }
  };

  const formatDuration = () => {
    const start = new Date(takeover.started_at);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (mode === 'power_user') {
    // Banner for power user (coach)
    const targetName = takeover.target_user_first_name
      ? `${takeover.target_user_first_name} ${takeover.target_user_last_name || ''}`
      : takeover.target_user_email || 'User';

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  Coaching Session Active
                </span>
                <span className="text-xs text-purple-200">
                  Viewing as: {targetName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-purple-200">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration()}</span>
              </div>

              {takeover.notes && (
                <span className="text-xs text-purple-200 max-w-xs truncate">
                  Note: {takeover.notes}
                </span>
              )}

              <button
                onClick={handleEndTakeover}
                disabled={isEnding}
                className="
                  flex items-center gap-2 px-4 py-1.5
                  bg-white text-purple-600 rounded-md
                  hover:bg-purple-50 transition-colors
                  text-sm font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isEnding ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    <span>Exit Session</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-200 bg-red-500/20 px-3 py-1.5 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Banner for target user (being coached)
    const coachName = takeover.power_user_first_name
      ? `${takeover.power_user_first_name} ${takeover.power_user_last_name || ''}`
      : takeover.power_user_email || 'Coach';

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  Coach is helping you
                </span>
                <span className="text-xs text-blue-200">
                  {coachName} is viewing your session
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-blue-200">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration()}</span>
              </div>

              {takeover.notes && (
                <span className="text-xs text-blue-200 max-w-xs truncate">
                  {takeover.notes}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Compact takeover indicator (for sidebar or header)
 */
export function TakeoverIndicator({
  takeover,
  mode
}: {
  takeover: TakeoverInfo;
  mode: 'power_user' | 'target_user';
}) {
  if (mode === 'power_user') {
    const targetName = takeover.target_user_first_name
      ? `${takeover.target_user_first_name} ${takeover.target_user_last_name || ''}`
      : takeover.target_user_email || 'User';

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Coaching: {targetName}</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Coach Active</span>
      </div>
    );
  }
}
