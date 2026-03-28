'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Clock,
  Paperclip,
  ArrowLeft,
  Check,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-f747.up.railway.app';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

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

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/user/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedbackList(data.feedback || []);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/user/feedback/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch feedback details');

      const data = await response.json();
      setSelectedFeedback(data.feedback);
      setReplies(data.replies || []);

      // Mark this feedback as read
      try {
        await fetch(`${API_URL}/api/user/feedback/${id}/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (markReadError) {
        console.error('Failed to mark feedback as read:', markReadError);
      }
    } catch (error) {
      console.error('Failed to fetch feedback details:', error);
    }
  };

  if (selectedFeedback) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to My Feedback
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Feedback Thread
            </h1>
          </div>

          {/* Original Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Your Feedback
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(selectedFeedback.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm capitalize ${STATUS_COLORS[selectedFeedback.status as keyof typeof STATUS_COLORS]}`}>
                {selectedFeedback.status.replace('_', ' ')}
              </span>
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

          {/* Admin Replies */}
          {replies.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Admin Responses ({replies.filter(r => !r.is_internal).length})
              </h3>

              <div className="space-y-4">
                {replies.filter(r => !r.is_internal).map((reply) => (
                  <div
                    key={reply.id}
                    className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {reply.admin_first_name} {reply.admin_last_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded">
                          Admin
                        </span>
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
            </div>
          )}

          {replies.filter(r => !r.is_internal).length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No admin responses yet. We'll notify you when someone replies.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your submitted feedback and admin responses
          </p>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't submitted any feedback yet
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-amber-500 text-black rounded-lg hover:bg-amber-600 transition-colors"
              style={{ backgroundColor: '#fcc824' }}
            >
              Send Feedback
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => fetchFeedbackDetails(feedback.id)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm capitalize ${STATUS_COLORS[feedback.status as keyof typeof STATUS_COLORS]}`}>
                    {feedback.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(feedback.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
                  {feedback.message}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
