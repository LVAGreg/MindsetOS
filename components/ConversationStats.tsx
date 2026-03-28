'use client';

import { useState, useEffect } from 'react';
import { Zap, DollarSign, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface ConversationStatsProps {
  conversationId: string;
}

interface ConversationAnalytics {
  conversation_id: string;
  stats: {
    total_messages: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
  };
}

export default function ConversationStats({ conversationId }: ConversationStatsProps) {
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (conversationId) {
      fetchAnalytics();
    }
  }, [conversationId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations/${conversationId}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics || Number(analytics.stats.total_messages) === 0) {
    return null;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="mx-6 mt-4 mb-2">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
        {/* Collapsed Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatNumber(Number(analytics.stats.total_tokens))} tokens
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatCost(Number(analytics.stats.total_cost))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {analytics.stats.total_messages} msgs
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Input Tokens</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(Number(analytics.stats.total_input_tokens))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Output Tokens</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(Number(analytics.stats.total_output_tokens))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cost</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCost(Number(analytics.stats.total_cost))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Latency</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {Number(analytics.stats.avg_latency_ms).toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
