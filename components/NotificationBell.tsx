'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Search, ExternalLink, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

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

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setImpersonationSession } = useAppStore();

  // Fetch unread count on mount and when tab becomes active (no polling)
  useEffect(() => {
    fetchUnreadCount();

    // Listen for custom events to refresh immediately
    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('notification-refresh', handleRefresh);
    window.addEventListener('focus', handleRefresh); // Refresh when tab becomes active

    return () => {
      window.removeEventListener('notification-refresh', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await apiClient.getNotificationCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
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
      case 'feedback_reply': return '💬';
      case 'impersonation_request': return '👁️';
      case 'impersonation_response': return '🔓';
      default: return '🔔';
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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Show notification details
    setSelectedNotification(notification);
  };

  const handleNotificationAction = (notification: Notification) => {
    // Handle navigation based on notification type and data
    if (notification.type === 'research_complete' && notification.data?.research_id) {
      window.location.href = `/dashboard?tab=research&id=${notification.data.research_id}`;
    } else if (notification.data?.conversation_id) {
      window.location.href = `/dashboard?conversation=${notification.data.conversation_id}`;
    } else if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
    setIsOpen(false);
  };

  const hasActionableLink = (notification: Notification) => {
    return notification.type === 'research_complete' && notification.data?.research_id ||
           notification.data?.conversation_id ||
           notification.data?.url;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg transition-all duration-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {selectedNotification ? (
            // Detail View
            <>
              {/* Detail Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <button
                  onClick={() => { setConfirmDelete(false); setSelectedNotification(null); }}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="p-4 max-h-[450px] overflow-y-auto">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">{getTypeIcon(selectedNotification.type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(selectedNotification.created_at).toLocaleString()} • {selectedNotification.source}
                    </p>
                  </div>
                </div>

                {selectedNotification.message && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>
                )}

                {/* Impersonation Accept/Decline buttons */}
                {selectedNotification.type === 'impersonation_request' && selectedNotification.data?.session_id && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={actionLoading !== null}
                        onClick={async () => {
                          setActionLoading('accept');
                          try {
                            await apiClient.respondToImpersonation(selectedNotification.data.session_id, 'accept');
                            markAsRead(selectedNotification.id);
                            setSelectedNotification(null);
                            fetchNotifications();
                          } catch (err) {
                            console.error('Failed to accept:', err);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>✅</span>}
                        Accept
                      </button>
                      <button
                        disabled={actionLoading !== null}
                        onClick={async () => {
                          setActionLoading('decline');
                          try {
                            await apiClient.respondToImpersonation(selectedNotification.data.session_id, 'decline');
                            markAsRead(selectedNotification.id);
                            setSelectedNotification(null);
                            fetchNotifications();
                          } catch (err) {
                            console.error('Failed to decline:', err);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>❌</span>}
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons from data.action_buttons (for non-impersonation notifications) */}
                {selectedNotification.type !== 'impersonation_request' && selectedNotification.data?.action_buttons && Array.isArray(selectedNotification.data.action_buttons) && (
                  <div className="mb-4">
                    <div className="grid grid-cols-1 gap-2">
                      {selectedNotification.data.action_buttons.map((btn: { label: string; url: string; icon?: string }, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            window.location.href = btn.url;
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-all group"
                        >
                          {btn.icon && <span className="text-xl">{btn.icon}</span>}
                          <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white">{btn.label}</span>
                          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Data (exclude internal fields from raw display) */}
                {selectedNotification.data && Object.keys(selectedNotification.data).filter(k => !['action_buttons', 'session_id', 'admin_user_id', 'admin_name', 'admin_email', 'target_user_id', 'target_name', 'action', 'expires_at'].includes(k)).length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <p className="font-medium mb-1">Details:</p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                      {Object.entries(selectedNotification.data).filter(([key]) => !['action_buttons', 'session_id', 'admin_user_id', 'admin_name', 'admin_email', 'target_user_id', 'target_name', 'action', 'expires_at'].includes(key)).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500">{key}:</span>
                          <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {hasActionableLink(selectedNotification) && (
                      <button
                        onClick={() => handleNotificationAction(selectedNotification)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Details
                      </button>
                    )}
                  </div>
                  {/* Delete - subtle with confirmation */}
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        onClick={() => {
                          deleteNotification(selectedNotification.id);
                          setSelectedNotification(null);
                          setConfirmDelete(false);
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            // List View
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-200 dark:bg-amber-800 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <Bell className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`relative p-4 border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                          getPriorityColor(notification.priority)
                        } ${!notification.is_read ? 'bg-opacity-100' : 'bg-opacity-50'}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <span className="text-xl">{getTypeIcon(notification.type)}</span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium ${
                                notification.is_read
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {notification.title}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                            {notification.message && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">
                                {notification.source}
                              </span>
                              {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              )}
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/notifications';
                    }}
                    className="w-full text-center text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
