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
  const [error, setError] = useState<string | null>(null);
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
    } catch (err) {
      console.error('Failed to fetch conversation analytics:', err);
      setError('Failed to load conversation stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading || error || !analytics || Number(analytics.stats.total_messages) === 0) {
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
      <div
        style={{
          background: 'rgba(18,18,31,0.8)',
          border: '1px solid #1e1e30',
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }}
      >
        {/* Collapsed Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse conversation stats' : 'Expand conversation stats'}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: '#fcc824' }} />
              <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                {formatNumber(Number(analytics.stats.total_tokens))} tokens
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: '#4f6ef7' }} />
              <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                {formatCost(Number(analytics.stats.total_cost))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: '#7c5bf6' }} />
              <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                {analytics.stats.total_messages} msgs
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: '#9090a8' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: '#9090a8' }} />
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div
            className="px-4 pb-4 pt-3"
            style={{ borderTop: '1px solid #1e1e30' }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs mb-1" style={{ color: '#9090a8' }}>Input Tokens</div>
                <div className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                  {formatNumber(Number(analytics.stats.total_input_tokens))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#9090a8' }}>Output Tokens</div>
                <div className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                  {formatNumber(Number(analytics.stats.total_output_tokens))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#9090a8' }}>Total Cost</div>
                <div className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                  {formatCost(Number(analytics.stats.total_cost))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: '#9090a8' }}>Avg Latency</div>
                <div className="text-sm font-semibold" style={{ color: '#ededf5' }}>
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
