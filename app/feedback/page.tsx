'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Clock,
  Paperclip,
  ArrowLeft,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

// Inline-style tokens for status badges
const STATUS_STYLES: Record<string, { background: string; border: string; color: string }> = {
  new:         { background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.4)',  color: '#4f6ef7' },
  in_progress: { background: 'rgba(252,200,36,0.12)', border: '1px solid rgba(252,200,36,0.35)', color: '#fcc824' },
  resolved:    { background: 'rgba(34,197,94,0.12)',  border: '1px solid rgba(34,197,94,0.35)',  color: '#4ade80' },
  closed:      { background: 'rgba(90,90,114,0.20)',  border: '1px solid rgba(90,90,114,0.4)',   color: '#9090a8' },
};

const FALLBACK_STATUS_STYLE = { background: 'rgba(90,90,114,0.20)', border: '1px solid rgba(90,90,114,0.4)', color: '#9090a8' };

interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  attachment_filename: string | null;
  status: string;
  created_at: string;
}

interface Reply {
  id: string;
  message: string;
  is_internal: boolean;
  admin_first_name: string;
  admin_last_name: string;
  created_at: string;
}

export default function MyFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/user/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch feedback (${response.status})`);

      const data = await response.json();
      setFeedbackList(data.feedback || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackDetails = async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/user/feedback/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch feedback details (${response.status})`);

      const data = await response.json();
      setSelectedFeedback(data.feedback);
      setReplies(data.replies || []);

      // Best-effort mark-as-read — failure is non-fatal
      try {
        await fetch(`${API_URL}/api/user/feedback/${id}/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch {
        // intentionally swallowed — mark-read is non-critical
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feedback details';
      setError(message);
    }
  };

  if (selectedFeedback) {
    const statusStyle = STATUS_STYLES[selectedFeedback.status] ?? FALLBACK_STATUS_STYLE;
    const publicReplies = replies.filter((r) => !r.is_internal);

    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: '#09090f' }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="flex items-center gap-2 mb-4 transition-colors"
              style={{ color: '#9090a8' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ededf5')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9090a8')}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to My Feedback
            </button>
            <h1
              className="text-3xl font-bold"
              style={{ color: '#ededf5' }}
            >
              Feedback Thread
            </h1>
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          {/* Original Feedback */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: '#ededf5' }}
                >
                  Your Feedback
                </h2>
                <p
                  className="text-sm"
                  style={{ color: '#9090a8' }}
                >
                  {new Date(selectedFeedback.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-sm capitalize"
                style={statusStyle}
              >
                {selectedFeedback.status.replace('_', ' ')}
              </span>
            </div>

            <p
              className="whitespace-pre-wrap"
              style={{ color: '#9090a8' }}
            >
              {selectedFeedback.message}
            </p>

            {selectedFeedback.attachment_filename && (
              <div
                className="mt-4 p-3 rounded-lg flex items-center gap-2"
                style={{ background: 'rgba(90,90,114,0.15)', border: '1px solid #1e1e30' }}
              >
                <Paperclip className="w-4 h-4" style={{ color: '#9090a8' }} />
                <span
                  className="text-sm"
                  style={{ color: '#9090a8' }}
                >
                  {selectedFeedback.attachment_filename}
                </span>
              </div>
            )}
          </div>

          {/* Admin Replies */}
          {publicReplies.length > 0 ? (
            <div
              className="rounded-lg p-6"
              style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: '#ededf5' }}
              >
                Admin Responses ({publicReplies.length})
              </h3>

              <div className="space-y-4">
                {publicReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="p-4 rounded-lg"
                    style={{
                      background: 'rgba(79,110,247,0.08)',
                      borderLeft: '3px solid #4f6ef7',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: '#ededf5' }}
                        >
                          {reply.admin_first_name} {reply.admin_last_name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: 'rgba(79,110,247,0.2)',
                            color: '#4f6ef7',
                          }}
                        >
                          Admin
                        </span>
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: '#5a5a72' }}
                      >
                        {new Date(reply.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: '#9090a8' }}
                    >
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg p-12 text-center"
              style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
            >
              <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#5a5a72' }} />
              <p style={{ color: '#9090a8' }}>
                No admin responses yet. We'll notify you when someone replies.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: '#09090f' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 mb-4 transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ededf5')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9090a8')}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: '#ededf5' }}
          >
            My Feedback
          </h1>
          <p style={{ color: '#9090a8' }}>
            View your submitted feedback and admin responses
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8"
              style={{ border: '2px solid transparent', borderBottomColor: '#4f6ef7' }}
            />
          </div>
        ) : feedbackList.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
          >
            <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#5a5a72' }} />
            <p
              className="mb-4"
              style={{ color: '#9090a8' }}
            >
              You haven't submitted any feedback yet
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#fcc824', color: '#09090f' }}
            >
              Send Feedback
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((feedback) => {
              const statusStyle = STATUS_STYLES[feedback.status] ?? FALLBACK_STATUS_STYLE;
              return (
                <div
                  key={feedback.id}
                  onClick={() => fetchFeedbackDetails(feedback.id)}
                  className="rounded-lg cursor-pointer p-6 transition-all"
                  style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#2e2e48')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#1e1e30')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="px-3 py-1 rounded-full text-sm capitalize"
                      style={statusStyle}
                    >
                      {feedback.status.replace('_', ' ')}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: '#5a5a72' }}
                    >
                      {new Date(feedback.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p
                    className="line-clamp-3 mb-3"
                    style={{ color: '#9090a8' }}
                  >
                    {feedback.message}
                  </p>

                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: '#5a5a72' }}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(feedback.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {feedback.attachment_filename && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-4 h-4" />
                        Attachment
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
