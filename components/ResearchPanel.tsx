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
      const data = await apiClient.getResearchJobs({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setJobs(data.jobs);
      setStatusCounts(data.counts);
    } catch (error) {
      console.error('Failed to fetch research jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedResearch = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUserResearch({ limit: 50 });
      setSavedResearch(data.research);
    } catch (error) {
      console.error('Failed to fetch saved research:', error);
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
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const deleteResearch = async (researchId: string) => {
    if (!confirm('Are you sure you want to delete this research?')) return;
    try {
      await apiClient.deleteUserResearch(researchId);
      setSavedResearch(prev => prev.filter(r => r.id !== researchId));
    } catch (error) {
      console.error('Failed to delete research:', error);
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
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return '';
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 space-y-2">
        <button
          className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30"
          title="Research"
        >
          <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </button>
        {(statusCounts.pending + statusCounts.processing) > 0 && (
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
            {statusCounts.pending + statusCounts.processing}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Research</h3>
          </div>
          <button
            onClick={activeTab === 'jobs' ? fetchJobs : fetchSavedResearch}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'jobs'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Jobs
            {(statusCounts.pending + statusCounts.processing) > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                {statusCounts.pending + statusCounts.processing}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Saved
          </button>
        </div>
      </div>

      {/* Status Filter (Jobs tab only) */}
      {activeTab === 'jobs' && (
        <div className="px-4 py-2 flex gap-1 border-b border-gray-100 dark:border-gray-800">
          {['all', 'processing', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                statusFilter === status
                  ? getStatusColor(status === 'all' ? 'processing' : status) + ' font-bold'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && statusCounts[status as keyof typeof statusCounts] > 0 && (
                <span className="ml-1">({statusCounts[status as keyof typeof statusCounts]})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (jobs.length === 0 && savedResearch.length === 0) ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : activeTab === 'jobs' ? (
          jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Sparkles className="w-12 h-12 text-purple-300 dark:text-purple-600 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No research jobs yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Start a deep research with the Research Agent
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  onClick={() => {
                    window.location.href = `/dashboard?tab=research&job=${job.id}`;
                  }}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {job.query.length > 60 ? job.query.substring(0, 60) + '...' : job.query}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <span className="text-[10px] text-gray-500">{formatTime(job.created_at)}</span>
                      </div>
                      {job.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>{job.progress_message || 'Processing...'}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-red-600 dark:text-red-400">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{job.error_message}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : savedResearch.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BookOpen className="w-12 h-12 text-purple-300 dark:text-purple-600 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No saved research yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Completed research will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Pinned first */}
            {savedResearch
              .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
              .map((research) => (
                <div
                  key={research.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-4 h-4 text-purple-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400"
                          onClick={() => {
                            window.location.href = `/dashboard?tab=research&id=${research.id}`;
                          }}
                        >
                          {research.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => togglePin(research.id, research.is_pinned)}
                            className={`p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 ${
                              research.is_pinned ? 'text-purple-600' : 'text-gray-400'
                            }`}
                            title={research.is_pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteResearch(research.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {research.summary && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {research.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-500">
                          {research.citations_count} citations
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {research.view_count} views
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatTime(research.created_at)}
                        </span>
                        {research.is_pinned && (
                          <Pin className="w-3 h-3 text-purple-500" />
                        )}
                      </div>
                      {research.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {research.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {research.tags.length > 3 && (
                            <span className="text-[10px] text-gray-500">
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
