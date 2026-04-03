'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Pin,
  Trash2,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ResearchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model: string;
  query: string;
  progress: number;
  progress_message: string | null;
  searches_count: number;
  tokens_used: number;
  cost_usd: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface SavedResearch {
  id: string;
  title: string;
  query: string;
  summary: string | null;
  citations_count: number;
  tags: string[];
  category: string | null;
  models_used: string[];
  is_pinned: boolean;
  view_count: number;
  created_at: string;
}

interface ResearchPanelProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

// Design tokens
const T = {
  pageBg: '#09090f',
  cardBg: 'rgba(18,18,31,0.8)',
  border: '#1e1e30',
  textPrimary: '#ededf5',
  textMuted: '#9090a8',
  textDim: '#5a5a72',
  blue: '#4f6ef7',
  amber: '#fcc824',
  purple: '#7c5bf6',
};

// Status inline styles (replaces getStatusColor Tailwind strings)
const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case 'pending':
      return { background: 'rgba(252,200,36,0.15)', color: T.amber };
    case 'processing':
      return { background: 'rgba(79,110,247,0.15)', color: T.blue };
    case 'completed':
      return { background: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'failed':
      return { background: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    default:
      return {};
  }
};

export function ResearchPanel({ onClose, isCollapsed = false }: ResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'saved'>('jobs');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [savedResearch, setSavedResearch] = useState<SavedResearch[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hover state helpers
  const [hoveredRefresh, setHoveredRefresh] = useState(false);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [hoveredSavedId, setHoveredSavedId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    } else {
      fetchSavedResearch();
    }
  }, [activeTab, statusFilter]);

  // Poll for job updates every 5 seconds when there are active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (!hasActiveJobs) return;

    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getResearchJobs({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setJobs(data.jobs);
      setStatusCounts(data.counts);
    } catch (err) {
      console.error('Failed to fetch research jobs:', err);
      setError('Failed to load jobs. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedResearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getUserResearch({ limit: 50 });
      setSavedResearch(data.research);
    } catch (err) {
      console.error('Failed to fetch saved research:', err);
      setError('Failed to load saved research. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (researchId: string, currentlyPinned: boolean) => {
    try {
      await apiClient.updateUserResearch(researchId, { is_pinned: !currentlyPinned });
      setSavedResearch(prev =>
        prev.map(r => (r.id === researchId ? { ...r, is_pinned: !currentlyPinned } : r))
      );
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      setError('Failed to update pin. Please try again.');
    }
  };

  const deleteResearch = async (researchId: string) => {
    if (!confirm('Are you sure you want to delete this research?')) return;
    try {
      await apiClient.deleteUserResearch(researchId);
      setSavedResearch(prev => prev.filter(r => r.id !== researchId));
    } catch (err) {
      console.error('Failed to delete research:', err);
      setError('Failed to delete research. Please try again.');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" style={{ color: T.amber }} />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" style={{ color: T.blue }} />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />;
      case 'failed':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      default:
        return null;
    }
  };

  if (isCollapsed) {
    return (
      <div
        className="flex flex-col items-center py-4 space-y-2"
        style={{ background: T.pageBg }}
      >
        <button
          aria-label="Research"
          className="p-2 rounded-lg"
          style={{ color: T.purple }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.15)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="Research"
        >
          <Search className="w-5 h-5" />
        </button>
        {(statusCounts.pending + statusCounts.processing) > 0 && (
          <span className="text-[10px] font-bold" style={{ color: T.purple }}>
            {statusCounts.pending + statusCounts.processing}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: T.pageBg }}>
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: T.purple }} />
            <h3 className="font-semibold" style={{ color: T.textPrimary }}>Research</h3>
          </div>
          <button
            aria-label="Refresh"
            onClick={activeTab === 'jobs' ? fetchJobs : fetchSavedResearch}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: T.textMuted,
              background: hoveredRefresh ? 'rgba(255,255,255,0.07)' : 'transparent',
            }}
            onMouseEnter={() => setHoveredRefresh(true)}
            onMouseLeave={() => setHoveredRefresh(false)}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <button
            onClick={() => setActiveTab('jobs')}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            style={
              activeTab === 'jobs'
                ? { background: T.cardBg, color: T.textPrimary, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                : { color: T.textMuted }
            }
          >
            Jobs
            {(statusCounts.pending + statusCounts.processing) > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{ background: T.blue, color: '#fff' }}
              >
                {statusCounts.pending + statusCounts.processing}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            style={
              activeTab === 'saved'
                ? { background: T.cardBg, color: T.textPrimary, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                : { color: T.textMuted }
            }
          >
            Saved
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="px-4 py-2 text-xs flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderBottom: `1px solid ${T.border}` }}
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Status Filter (Jobs tab only) */}
      {activeTab === 'jobs' && (
        <div
          className="px-4 py-2 flex flex-wrap gap-1"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          {['all', 'processing', 'completed', 'failed'].map((status) => {
            const isActive = statusFilter === status;
            const activeStyle = isActive
              ? getStatusStyle(status === 'all' ? 'processing' : status)
              : { color: T.textDim };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="px-2 py-1 text-[10px] font-medium rounded-md transition-all"
                style={isActive ? { ...activeStyle, fontWeight: 700 } : activeStyle}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && statusCounts[status as keyof typeof statusCounts] > 0 && (
                  <span className="ml-1">({statusCounts[status as keyof typeof statusCounts]})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (jobs.length === 0 && savedResearch.length === 0) ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: T.purple }} />
          </div>
        ) : activeTab === 'jobs' ? (
          jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Sparkles className="w-12 h-12 mb-3" style={{ color: T.textDim }} />
              <p className="text-sm" style={{ color: T.textMuted }}>No research jobs yet</p>
              <p className="text-xs mt-1" style={{ color: T.textDim }}>
                Start a deep research with the Research Agent
              </p>
            </div>
          ) : (
            <div>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 cursor-pointer transition-colors"
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    background: hoveredJobId === job.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredJobId(job.id)}
                  onMouseLeave={() => setHoveredJobId(null)}
                  onClick={() => {
                    window.location.href = `/dashboard?tab=research&job=${job.id}`;
                  }}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: T.textPrimary }}>
                        {job.query.length > 60 ? job.query.substring(0, 60) + '...' : job.query}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                          style={getStatusStyle(job.status)}
                        >
                          {job.status}
                        </span>
                        <span className="text-[10px]" style={{ color: T.textDim }}>
                          {formatTime(job.created_at)}
                        </span>
                      </div>
                      {job.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: T.textDim }}>
                            <span>{job.progress_message || 'Processing...'}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: `${job.progress}%`, background: T.blue }}
                            />
                          </div>
                        </div>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <div className="mt-2 flex items-start gap-1.5 text-[10px]" style={{ color: '#ef4444' }}>
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{job.error_message}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: T.textDim }} />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : savedResearch.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BookOpen className="w-12 h-12 mb-3" style={{ color: T.textDim }} />
            <p className="text-sm" style={{ color: T.textMuted }}>No saved research yet</p>
            <p className="text-xs mt-1" style={{ color: T.textDim }}>
              Completed research will appear here
            </p>
          </div>
        ) : (
          <div>
            {savedResearch
              .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
              .map((research) => (
                <div
                  key={research.id}
                  className="p-4 transition-colors group"
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    background: hoveredSavedId === research.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredSavedId(research.id)}
                  onMouseLeave={() => setHoveredSavedId(null)}
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-4 h-4 mt-0.5" style={{ color: T.purple }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm font-medium cursor-pointer transition-colors"
                          style={{ color: T.textPrimary }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.purple; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = T.textPrimary; }}
                          onClick={() => {
                            window.location.href = `/dashboard?tab=research&id=${research.id}`;
                          }}
                        >
                          {research.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            aria-label={research.is_pinned ? 'Unpin' : 'Pin'}
                            onClick={() => togglePin(research.id, research.is_pinned)}
                            className="p-1 rounded transition-colors"
                            style={{
                              color: research.is_pinned ? T.purple : T.textDim,
                              background: hoveredPinId === research.id ? 'rgba(124,91,246,0.15)' : 'transparent',
                            }}
                            onMouseEnter={() => setHoveredPinId(research.id)}
                            onMouseLeave={() => setHoveredPinId(null)}
                            title={research.is_pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            aria-label="Delete research"
                            onClick={() => deleteResearch(research.id)}
                            className="p-1 rounded transition-colors"
                            style={{
                              color: hoveredDeleteId === research.id ? '#ef4444' : T.textDim,
                              background: hoveredDeleteId === research.id ? 'rgba(239,68,68,0.12)' : 'transparent',
                            }}
                            onMouseEnter={() => setHoveredDeleteId(research.id)}
                            onMouseLeave={() => setHoveredDeleteId(null)}
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {research.summary && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: T.textMuted }}>
                          {research.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px]" style={{ color: T.textDim }}>
                          {research.citations_count} citations
                        </span>
                        <span className="text-[10px]" style={{ color: T.textDim }}>
                          {research.view_count} views
                        </span>
                        <span className="text-[10px]" style={{ color: T.textDim }}>
                          {formatTime(research.created_at)}
                        </span>
                        {research.is_pinned && (
                          <Pin className="w-3 h-3" style={{ color: T.purple }} />
                        )}
                      </div>
                      {research.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {research.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] rounded"
                              style={{ background: 'rgba(255,255,255,0.07)', color: T.textMuted }}
                            >
                              {tag}
                            </span>
                          ))}
                          {research.tags.length > 3 && (
                            <span className="text-[10px]" style={{ color: T.textDim }}>
                              +{research.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
