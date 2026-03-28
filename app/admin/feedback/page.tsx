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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-f747.up.railway.app';

const STATUSES = ['new', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
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

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Error and success feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & date filter state
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  // Auto-dismiss success messages after 3 seconds
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        body: JSON.stringify({
          message: replyMessage,
          is_internal: isInternal,
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      // Refresh feedback details
      await fetchFeedbackDetail(selectedFeedback.id);
      setReplyMessage('');
      setIsInternal(false);
      setSuccess(isInternal ? 'Internal note added.' : 'Reply sent successfully.');

      // Refresh list to update reply count
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

      // Refresh both list and detail view if open
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to All Feedback
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Feedback Details
            </h1>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feedback Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Feedback */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {selectedFeedback.user_first_name} {selectedFeedback.user_last_name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedFeedback.user_email}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                    {new Date(selectedFeedback.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </p>
                </div>

                {selectedFeedback.attachment_filename && (
                  <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedFeedback.attachment_filename}
                    </span>
                  </div>
                )}
              </div>

              {/* Replies */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Replies ({replies.length})
                </h3>

                <div className="space-y-4 mb-6">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg ${
                        reply.is_internal
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {reply.admin_first_name} {reply.admin_last_name}
                          </span>
                          {reply.is_internal && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 rounded">
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(reply.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReply} className="border-t dark:border-gray-700 pt-4">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Write your reply..."
                    className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                    rows={4}
                    required
                  />
                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Status</h3>
                <div className="space-y-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedFeedback.id, status)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedFeedback.status === status
                          ? STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Priority</h3>
                <div className="space-y-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleUpdatePriority(selectedFeedback.id, priority)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors capitalize ${
                        selectedFeedback.priority === priority
                          ? PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Feedback Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and respond to user feedback
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {STATUSES.map((status) => (
            <div
              key={status}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {counts[status] || 0}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusFilter === status ? 'ring-4 ring-blue-400' : ''}`}
                  style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS].split(' ')[0].replace('bg-', '').replace('-100', '-500') }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
          {[
            { label: 'Last 7 days', value: 7 },
            { label: 'Last 30 days', value: 30 },
            { label: 'Last 90 days', value: 90 },
            { label: 'All time', value: null },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => { setDaysFilter(opt.value); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                daysFilter === opt.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            {searchTerm || statusFilter || priorityFilter ? (
              <>
                <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No matching feedback</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  No results for the current filters. Try adjusting your search or clearing filters.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter(''); setPriorityFilter(''); }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No feedback yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {feedback.name}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[feedback.status as keyof typeof STATUS_COLORS]}`}>
                        {feedback.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${PRIORITY_COLORS[feedback.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {feedback.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {feedback.email}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                      {feedback.message}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(feedback.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalFeedback)} of {totalFeedback} items
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
