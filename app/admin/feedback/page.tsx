'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Send,
  Paperclip,
  X,
  ArrowLeft,
  Tag,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

const STATUSES = ['new', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new:         { background: 'rgba(79,110,247,0.18)', color: '#7b8ff8', border: '1px solid rgba(79,110,247,0.3)' },
  in_progress: { background: 'rgba(252,200,36,0.18)', color: '#fcc824', border: '1px solid rgba(252,200,36,0.3)' },
  resolved:    { background: 'rgba(74,222,128,0.18)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
  closed:      { background: '#1e1e30',               color: '#9090a8', border: '1px solid #1e1e30' },
};

const PRIORITY_STYLES: Record<string, React.CSSProperties> = {
  low:    { background: 'rgba(79,110,247,0.18)', color: '#8fa6ff', border: '1px solid rgba(79,110,247,0.3)' },
  normal: { background: 'rgba(79,110,247,0.18)', color: '#7b8ff8', border: '1px solid rgba(79,110,247,0.3)' },
  high:   { background: 'rgba(252,200,36,0.18)', color: '#fcc824', border: '1px solid rgba(252,200,36,0.3)' },
  urgent: { background: 'rgba(248,113,113,0.18)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' },
};


interface Feedback {
  id: string;
  user_id: string;
  name: string;
  email: string;
  message: string;
  attachment_filename: string | null;
  status: string;
  priority: string;
  tags: string[];
  assigned_to: string | null;
  assigned_first_name: string | null;
  assigned_last_name: string | null;
  reply_count: number;
  created_at: string;
}

interface FeedbackDetail extends Feedback {
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  attachment_path: string | null;
  attachment_size: number | null;
  attachment_type: string | null;
  resolved_at: string | null;
}

interface Reply {
  id: string;
  message: string;
  is_internal: boolean;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  created_at: string;
}

function priorityBorderStyle(priority: string): React.CSSProperties {
  if (priority === 'high' || priority === 'urgent') return { borderLeft: '3px solid #f87171' };
  if (priority === 'normal') return { borderLeft: '3px solid #fcc824' };
  return { borderLeft: '3px solid #4f6ef7' };
}

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter, priorityFilter, currentPage, daysFilter]);

  const fetchFeedback = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      params.append('page', String(currentPage));
      params.append('limit', String(PAGE_SIZE));
      if (daysFilter) params.append('days', String(daysFilter));

      const response = await fetch(`${API_URL}/api/admin/feedback?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedbackList(data.feedback);
      setCounts(data.counts);
      setTotalFeedback(data.total || data.feedback.length);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      setError('Failed to load feedback. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackDetail = async (id: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/admin/feedback/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch feedback details');

      const data = await response.json();
      setSelectedFeedback(data.feedback);
      setReplies(data.replies);
    } catch (err) {
      console.error('Failed to fetch feedback details:', err);
      setError('Failed to load feedback details. Please try again.');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedFeedback) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/admin/feedback/${selectedFeedback.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyMessage, is_internal: isInternal }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      await fetchFeedbackDetail(selectedFeedback.id);
      setReplyMessage('');
      setIsInternal(false);
      setSuccess(isInternal ? 'Internal note added.' : 'Reply sent successfully.');
      fetchFeedback();
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError('Failed to send reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, status: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setSuccess(`Status updated to "${status.replace('_', ' ')}".`);
      fetchFeedback();
      if (selectedFeedback?.id === feedbackId) {
        fetchFeedbackDetail(feedbackId);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleUpdatePriority = async (feedbackId: string, priority: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      setSuccess(`Priority updated to "${priority}".`);
      fetchFeedback();
      if (selectedFeedback?.id === feedbackId) {
        fetchFeedbackDetail(feedbackId);
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to update priority. Please try again.');
    }
  };

  const filteredFeedback = feedbackList.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedFeedback) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#09090f' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
              style={{ color: '#9090a8' }}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to All Feedback
            </button>
            <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>
              Feedback Details
            </h1>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 rounded-lg flex items-center justify-between" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
                <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
              </div>
              <button onClick={() => setError(null)} style={{ color: '#f87171' }} aria-label="Dismiss error">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="mb-4 p-4 rounded-lg flex items-center justify-between" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#4ade80' }} />
                <p className="text-sm" style={{ color: '#86efac' }}>{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} style={{ color: '#4ade80' }} aria-label="Dismiss success message">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feedback Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Feedback */}
              <div className="p-6 rounded-2xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: '#ededf5' }}>
                      {selectedFeedback.user_first_name} {selectedFeedback.user_last_name}
                    </h2>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {selectedFeedback.user_email}
                    </p>
                  </div>
                  <div className="text-right text-sm" style={{ color: '#9090a8' }}>
                    {new Date(selectedFeedback.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>

                <p className="whitespace-pre-wrap" style={{ color: '#ededf5' }}>
                  {selectedFeedback.message}
                </p>

                {selectedFeedback.attachment_filename && (
                  <div className="mt-4 p-3 rounded-lg flex items-center gap-2" style={{ background: '#1e1e30' }}>
                    <Paperclip className="w-4 h-4" style={{ color: '#9090a8' }} />
                    <span className="text-sm" style={{ color: '#ededf5' }}>
                      {selectedFeedback.attachment_filename}
                    </span>
                  </div>
                )}
              </div>

              {/* Replies */}
              <div className="p-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#ededf5' }}>
                  Replies ({replies.length})
                </h3>

                <div className="space-y-4 mb-6">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-lg"
                      style={reply.is_internal
                        ? { background: 'rgba(252,200,36,0.08)', borderLeft: '4px solid #fcc824' }
                        : { background: 'rgba(79,110,247,0.08)', borderLeft: '4px solid #4f6ef7' }
                      }
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                            {reply.admin_first_name} {reply.admin_last_name}
                          </span>
                          {reply.is_internal && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(252,200,36,0.2)', color: '#fcc824' }}>
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: '#9090a8' }}>
                          {new Date(reply.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: '#ededf5' }}>
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReply} className="pt-4" style={{ borderTop: '1px solid #1e1e30' }}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                    style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
                    rows={4}
                    required
                  />
                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-sm" style={{ color: '#9090a8' }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      Internal note (not visible to user)
                    </label>
                    <button
                      type="submit"
                      disabled={submitting || !replyMessage.trim()}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
                      style={{ background: '#4f6ef7', color: '#fff' }}
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar - Status & Priority */}
            <div className="space-y-6">
              {/* Status */}
              <div className="p-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#ededf5' }}>Status</h3>
                <div className="space-y-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedFeedback.id, status)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-opacity capitalize text-sm"
                      style={selectedFeedback.status === status
                        ? STATUS_STYLES[status]
                        : { background: '#1e1e30', color: '#9090a8' }
                      }
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="p-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#ededf5' }}>Priority</h3>
                <div className="space-y-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleUpdatePriority(selectedFeedback.id, priority)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-opacity capitalize text-sm"
                      style={selectedFeedback.priority === priority
                        ? PRIORITY_STYLES[priority]
                        : { background: '#1e1e30', color: '#9090a8' }
                      }
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#09090f' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#ededf5' }}>
            Feedback Management
          </h1>
          <p style={{ color: '#9090a8' }}>
            View and respond to user feedback
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 rounded-lg flex items-center justify-between" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
              <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
            <button onClick={() => setError(null)} style={{ color: '#f87171' }} aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-4 p-4 rounded-lg flex items-center justify-between" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#4ade80' }} />
              <p className="text-sm" style={{ color: '#86efac' }}>{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} style={{ color: '#4ade80' }} aria-label="Dismiss success message">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {STATUSES.map((status) => (
            <div
              key={status}
              className="p-4 cursor-pointer transition-all hover:opacity-90"
              style={{
                background: 'rgba(18,18,31,0.7)',
                border: statusFilter === status ? '1px solid #4f6ef7' : '1px solid #1e1e30',
                borderRadius: 16,
                boxShadow: statusFilter === status ? '0 0 0 2px rgba(79,110,247,0.2)' : undefined,
              }}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm capitalize" style={{ color: '#9090a8' }}>
                    {status.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    {counts[status] || 0}
                  </p>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: status === 'new' ? '#60a5fa' : status === 'in_progress' ? '#fcc824' : status === 'resolved' ? '#4ade80' : '#5a5a72',
                    boxShadow: statusFilter === status ? '0 0 0 4px rgba(79,110,247,0.3)' : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Show:</span>
          {[
            { label: 'Last 7 days', value: 7 },
            { label: 'Last 30 days', value: 30 },
            { label: 'Last 90 days', value: 90 },
            { label: 'All time', value: null },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => { setDaysFilter(opt.value); setCurrentPage(1); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={daysFilter === opt.value
                ? { background: '#4f6ef7', color: '#fff' }
                : { background: '#1e1e30', color: '#9090a8' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 mb-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9090a8' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
                />
              </div>
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
              style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#4f6ef7' }}></div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#9090a8' }} />
            {searchTerm || statusFilter || priorityFilter ? (
              <>
                <p className="font-medium mb-1" style={{ color: '#ededf5' }}>No matching feedback</p>
                <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
                  No results for the current filters. Try adjusting your search or clearing filters.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter(''); setPriorityFilter(''); }}
                  className="text-sm hover:underline"
                  style={{ color: '#4f6ef7' }}
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="font-medium mb-1" style={{ color: '#ededf5' }}>No feedback yet</p>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  When users submit feedback, it will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => fetchFeedbackDetail(feedback.id)}
                className="cursor-pointer p-6 transition-all hover:opacity-90"
                style={{
                  ...priorityBorderStyle(feedback.priority),
                  background: 'rgba(18,18,31,0.7)',
                  border: '1px solid #1e1e30',
                  borderRadius: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: feedback.priority === 'high' || feedback.priority === 'urgent'
                    ? '#f87171'
                    : feedback.priority === 'normal'
                    ? '#fcc824'
                    : '#4f6ef7',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold" style={{ color: '#ededf5' }}>
                        {feedback.name}
                      </h3>
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={STATUS_STYLES[feedback.status] ?? { background: '#1e1e30', color: '#9090a8' }}
                      >
                        {feedback.status.replace('_', ' ')}
                      </span>
                      <span
                        className="px-2 py-1 rounded text-xs capitalize"
                        style={PRIORITY_STYLES[feedback.priority] ?? { background: '#1e1e30', color: '#9090a8' }}
                      >
                        {feedback.priority}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: '#9090a8' }}>
                      {feedback.email}
                    </p>
                    <p className="line-clamp-2" style={{ color: '#ededf5' }}>
                      {feedback.message}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: '#9090a8' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(feedback.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {feedback.reply_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {feedback.reply_count} {feedback.reply_count === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                      {feedback.attachment_filename && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-4 h-4" />
                          Attachment
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: '#9090a8' }} />
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalFeedback)} of {totalFeedback} items
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#1e1e30', color: '#9090a8' }}
                  >
                    Previous
                  </button>
                  <span className="text-sm px-2" style={{ color: '#9090a8' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#1e1e30', color: '#9090a8' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
