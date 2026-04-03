'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, ArrowLeft, Filter, ChevronRight, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getNotifications({ limit: 100 });
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications. Please try again.');
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
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError('Failed to mark notification as read. Please try again.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all notifications as read. Please try again.');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError('Failed to delete notification. Please try again.');
    }
  };

  const getPriorityStyle = (priority: string): Record<string, string> => {
    switch (priority) {
      case 'urgent': return { borderLeftColor: '#ef4444', background: 'rgba(239,68,68,0.07)' };
      case 'high': return { borderLeftColor: '#f97316', background: 'rgba(249,115,22,0.07)' };
      case 'normal': return { borderLeftColor: '#4f6ef7', background: 'rgba(79,110,247,0.07)' };
      case 'low': return { borderLeftColor: '#9090a8', background: 'rgba(18,18,31,0.5)' };
      default: return { borderLeftColor: '#9090a8' };
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
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6" style={{ color: '#fcc824' }} />
                <h1 className="text-xl font-bold" style={{ color: '#ededf5' }}>Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ color: '#fcc824', background: 'rgba(252,200,36,0.12)' }}>
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter */}
              <div className="flex items-center rounded-lg p-1" style={{ background: 'rgba(30,30,48,0.8)' }}>
                <button
                  onClick={() => setFilter('all')}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                  style={filter === 'all'
                    ? { background: 'rgba(79,110,247,0.15)', color: '#ededf5' }
                    : { color: '#9090a8' }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                  style={filter === 'unread'
                    ? { background: 'rgba(79,110,247,0.15)', color: '#ededf5' }
                    : { color: '#9090a8' }}
                >
                  Unread
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:text-[#ededf5] hover:bg-[rgba(144,144,168,0.08)]"
                  style={{ color: '#9090a8' }}
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
        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline"
              style={{ color: '#f87171' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: '#fcc824' }}></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(144,144,168,0.08)', border: '1px solid rgba(144,144,168,0.12)' }}>
                    <Bell className="w-8 h-8 opacity-30" style={{ color: '#9090a8' }} />
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#ededf5' }}>
                    {filter === 'unread' ? 'All caught up' : 'No notifications yet'}
                  </p>
                  <p className="text-xs" style={{ color: '#9090a8' }}>
                    {filter === 'unread' ? 'No unread notifications.' : "You'll see system alerts and updates here."}
                  </p>
                </div>
              ) : (
                <div style={{ borderTop: 'none' }}>
                  {filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        setSelectedNotification(notification);
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedNotification(notification);
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }
                      }}
                      className="w-full text-left p-4 border-l-4 cursor-pointer transition-all hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#4f6ef7]"
                      style={{
                        borderBottom: '1px solid #1e1e30',
                        ...getPriorityStyle(notification.priority),
                        ...(selectedNotification?.id === notification.id
                          ? { background: 'rgba(79,110,247,0.12)', boxShadow: 'inset 0 0 0 1px rgba(79,110,247,0.18)' }
                          : {}),
                        fontWeight: notification.is_read ? 'normal' : 600,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm truncate" style={{ color: notification.is_read ? '#9090a8' : '#ededf5' }}>
                            {notification.title}
                          </h4>
                          <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4f6ef7' }}></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile detail pane — visible only below lg breakpoint */}
          {selectedNotification && (
            <div className="lg:hidden rounded-xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTypeIcon(selectedNotification.type)}</span>
                    <div>
                      <h2 className="text-base font-semibold" style={{ color: '#ededf5' }}>{selectedNotification.title}</h2>
                      <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>
                        {formatTime(selectedNotification.created_at)} · {selectedNotification.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedNotification.is_read && (
                      <button onClick={() => markAsRead(selectedNotification.id)} className="p-1.5 rounded-lg" style={{ color: '#9090a8' }} aria-label="Mark as read" title="Mark as read">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(selectedNotification.id)} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }} aria-label="Delete notification" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSelectedNotification(null)} className="p-1.5 rounded-lg text-xs" style={{ color: '#9090a8' }} aria-label="Close notification" title="Close">
                      ✕
                    </button>
                  </div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3"
                  style={
                    selectedNotification.priority === 'urgent' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } :
                    selectedNotification.priority === 'high' ? { background: 'rgba(249,115,22,0.15)', color: '#fb923c' } :
                    selectedNotification.priority === 'normal' ? { background: 'rgba(79,110,247,0.15)', color: '#818cf8' } :
                    { background: 'rgba(144,144,168,0.15)', color: '#9090a8' }
                  }
                >
                  {selectedNotification.priority} priority
                </span>
                {selectedNotification.message && (
                  <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(9,9,15,0.6)' }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#ededf5' }}>{selectedNotification.message}</p>
                  </div>
                )}
                {selectedNotification.data?.action_buttons && Array.isArray(selectedNotification.data.action_buttons) && (
                  <div className="space-y-2">
                    {selectedNotification.data.action_buttons.map((btn: { label: string; url: string; icon?: string; description?: string }, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => { window.location.href = btn.url; }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                        style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.25)' }}
                      >
                        {btn.icon && <span className="text-xl">{btn.icon}</span>}
                        <span className="text-sm font-semibold" style={{ color: '#ededf5' }}>{btn.label}</span>
                        <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: '#fcc824' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detail — desktop only */}
          <div className="hidden lg:block lg:col-span-2 rounded-xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            {selectedNotification ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{getTypeIcon(selectedNotification.type)}</span>
                    <div>
                      <h2 className="text-xl font-semibold" style={{ color: '#ededf5' }}>
                        {selectedNotification.title}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
                        {formatTime(selectedNotification.created_at)} • {selectedNotification.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedNotification.is_read && (
                      <button
                        onClick={() => markAsRead(selectedNotification.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#9090a8' }}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(selectedNotification.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#ef4444' }}
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Priority Badge */}
                <div className="mb-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={
                      selectedNotification.priority === 'urgent' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } :
                      selectedNotification.priority === 'high' ? { background: 'rgba(249,115,22,0.15)', color: '#fb923c' } :
                      selectedNotification.priority === 'normal' ? { background: 'rgba(79,110,247,0.15)', color: '#818cf8' } :
                      { background: 'rgba(144,144,168,0.15)', color: '#9090a8' }
                    }
                  >
                    {selectedNotification.priority} priority
                  </span>
                </div>

                {/* Message */}
                {selectedNotification.message && (
                  <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(9,9,15,0.6)' }}>
                    <p className="whitespace-pre-wrap" style={{ color: '#ededf5' }}>
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
                          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-left"
                          style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.25)' }}
                        >
                          {btn.icon && <span className="text-2xl">{btn.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold" style={{ color: '#ededf5' }}>{btn.label}</span>
                            {btn.description && <span className="block text-xs mt-0.5" style={{ color: '#9090a8' }}>{btn.description}</span>}
                          </div>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" style={{ color: '#fcc824' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data (exclude action_buttons) */}
                {selectedNotification.data && Object.keys(selectedNotification.data).filter(k => k !== 'action_buttons').length > 0 && (
                  <div className="pt-4" style={{ borderTop: '1px solid #1e1e30' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: '#9090a8' }}>Additional Details</h3>
                    <div className="rounded-lg p-4" style={{ background: 'rgba(9,9,15,0.6)' }}>
                      <dl className="space-y-2">
                        {Object.entries(selectedNotification.data).filter(([key]) => key !== 'action_buttons').map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <dt style={{ color: '#9090a8' }}>{key}</dt>
                            <dd className="font-medium" style={{ color: '#ededf5' }}>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20" style={{ color: '#9090a8' }}>
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
