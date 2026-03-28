'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, ArrowLeft, Search, Filter, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, any>;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  source: 'system' | 'admin' | 'agent';
  created_at: string;
  read_at: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getNotifications({ limit: 100 });
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification({ ...selectedNotification, is_read: true, read_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'normal': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'low': return 'border-l-gray-400 bg-gray-50 dark:bg-gray-800';
      default: return 'border-l-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'research_complete': return '🔬';
      case 'research_failed': return '❌';
      case 'admin_broadcast': return '📢';
      case 'credit_low': return '💰';
      case 'memory_saved': return '🧠';
      case 'agent_update': return '🤖';
      case 'welcome': return '👋';
      default: return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === 'all'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === 'unread'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Unread
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        setSelectedNotification(notification);
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                      }}
                      className={`p-4 border-l-4 cursor-pointer transition-all ${
                        getPriorityColor(notification.priority)
                      } ${
                        selectedNotification?.id === notification.id
                          ? 'bg-amber-50 dark:bg-amber-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${!notification.is_read ? 'font-medium' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm truncate ${
                            notification.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {selectedNotification ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{getTypeIcon(selectedNotification.type)}</span>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedNotification.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatTime(selectedNotification.created_at)} • {selectedNotification.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedNotification.is_read && (
                      <button
                        onClick={() => markAsRead(selectedNotification.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(selectedNotification.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Priority Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedNotification.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    selectedNotification.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    selectedNotification.priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {selectedNotification.priority} priority
                  </span>
                </div>

                {/* Message */}
                {selectedNotification.message && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedNotification.data?.action_buttons && Array.isArray(selectedNotification.data.action_buttons) && (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedNotification.data.action_buttons.map((btn: { label: string; url: string; icon?: string; description?: string }, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => { window.location.href = btn.url; }}
                          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-all group text-left"
                        >
                          {btn.icon && <span className="text-2xl">{btn.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{btn.label}</span>
                            {btn.description && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{btn.description}</span>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data (exclude action_buttons) */}
                {selectedNotification.data && Object.keys(selectedNotification.data).filter(k => k !== 'action_buttons').length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Additional Details</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <dl className="space-y-2">
                        {Object.entries(selectedNotification.data).filter(([key]) => key !== 'action_buttons').map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <dt className="text-gray-500 dark:text-gray-400">{key}</dt>
                            <dd className="text-gray-900 dark:text-white font-medium">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500 dark:text-gray-400">
                <Bell className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a notification</p>
                <p className="text-sm mt-1">Click on a notification to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
