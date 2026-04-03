'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, X, ExternalLink, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      setListError(null);
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
      setListError(error?.message || 'Failed to mark notifications as read.');
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
      setActionError(null);
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      setActionError(error?.message || 'Failed to delete notification.');
    }
  };

  const getPriorityStyle = (priority: string): React.CSSProperties => {
    switch (priority) {
      case 'urgent': return { borderLeftColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' };
      case 'high': return { borderLeftColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)' };
      case 'normal': return { borderLeftColor: '#4f6ef7', backgroundColor: 'rgba(79,110,247,0.08)' };
      case 'low': return { borderLeftColor: '#5a5a72', backgroundColor: 'rgba(90,90,114,0.06)' };
      default: return { borderLeftColor: '#5a5a72' };
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

  const hasActionableLink = (notification: Notification): boolean => {
    return !!(
      (notification.type === 'research_complete' && notification.data?.research_id) ||
      notification.data?.conversation_id ||
      notification.data?.url
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2.5 rounded-lg transition-all duration-200"
        style={{ color: '#fcc824' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(252,200,36,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        title="Notifications"
      >
        <Bell className="w-5 h-5" style={{ color: '#fcc824' }} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 animate-pulse" style={{ color: '#ededf5', backgroundColor: '#ef4444' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-16px)] max-h-[500px] rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
          {selectedNotification ? (
            // Detail View
            <>
              {/* Detail Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e1e30', background: 'linear-gradient(to right, rgba(252,200,36,0.08), rgba(249,115,22,0.08))' }}>
                <button
                  onClick={() => { setConfirmDelete(false); setSelectedNotification(null); }}
                  className="flex items-center gap-2 transition-colors"
                  style={{ color: '#9090a8' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <X className="w-4 h-4" style={{ color: '#9090a8' }} />
                </button>
              </div>

              {/* Detail Content */}
              <div className="p-4 max-h-[450px] overflow-y-auto">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">{getTypeIcon(selectedNotification.type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: '#ededf5' }}>
                      {selectedNotification.title}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                      {new Date(selectedNotification.created_at).toLocaleString()} • {selectedNotification.source}
                    </p>
                  </div>
                </div>

                {selectedNotification.message && (
                  <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30' }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#ededf5' }}>
                      {selectedNotification.message}
                    </p>
                  </div>
                )}

                {/* Impersonation Accept/Decline buttons */}
                {selectedNotification.type === 'impersonation_request' && selectedNotification.data?.session_id && (
                  <div className="mb-4">
                    {actionError && (
                      <div className="mb-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                        <span>{actionError}</span>
                        <button onClick={() => setActionError(null)} style={{ color: '#f87171' }}>✕</button>
                      </div>
                    )}
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
                          } catch (err: any) {
                            console.error('Failed to accept:', err);
                            setActionError(err?.message || 'Failed to accept the coaching session.');
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                        style={{ backgroundColor: '#22c55e', color: '#09090f' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#16a34a'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#22c55e'; }}
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
                          } catch (err: any) {
                            console.error('Failed to decline:', err);
                            setActionError(err?.message || 'Failed to decline the coaching session.');
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                        style={{ backgroundColor: '#ef4444', color: '#ededf5' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#dc2626'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ef4444'; }}
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
                          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
                          style={{ backgroundColor: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.2)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(252,200,36,0.14)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(252,200,36,0.08)'; }}
                        >
                          {btn.icon && <span className="text-xl">{btn.icon}</span>}
                          <span className="flex-1 text-left text-sm font-medium" style={{ color: '#ededf5' }}>{btn.label}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: '#fcc824' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Data (exclude internal fields from raw display) */}
                {selectedNotification.data && Object.keys(selectedNotification.data).filter(k => !['action_buttons', 'session_id', 'admin_user_id', 'admin_name', 'admin_email', 'target_user_id', 'target_name', 'action', 'expires_at'].includes(k)).length > 0 && (
                  <div className="text-xs mb-4" style={{ color: '#9090a8' }}>
                    <p className="font-medium mb-1">Details:</p>
                    <div className="rounded p-2 space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      {Object.entries(selectedNotification.data).filter(([key]) => !['action_buttons', 'session_id', 'admin_user_id', 'admin_name', 'admin_email', 'target_user_id', 'target_name', 'action', 'expires_at'].includes(key)).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span style={{ color: '#9090a8' }}>{key}:</span>
                          <span style={{ color: '#ededf5' }}>{String(value)}</span>
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
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                        style={{ backgroundColor: '#fcc824', color: '#09090f' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e6b420'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fcc824'; }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Details
                      </button>
                    )}
                  </div>
                  {/* Delete - subtle with confirmation */}
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#9090a8' }}>Delete?</span>
                      <button
                        onClick={() => {
                          deleteNotification(selectedNotification.id);
                          setSelectedNotification(null);
                          setConfirmDelete(false);
                        }}
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{ color: '#ef4444' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.12)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{ color: '#9090a8' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: '#5a5a72' }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = '#ef4444'; el.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = '#5a5a72'; el.style.backgroundColor = 'transparent'; }}
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
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e1e30', background: 'linear-gradient(to right, rgba(252,200,36,0.08), rgba(249,115,22,0.08))' }}>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" style={{ color: '#fcc824' }} />
                  <h3 className="font-semibold" style={{ color: '#ededf5' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ color: '#fcc824', backgroundColor: 'rgba(252,200,36,0.15)' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-2 rounded-lg transition-colors"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" style={{ color: '#9090a8' }} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg transition-colors"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <X className="w-4 h-4" style={{ color: '#9090a8' }} />
                  </button>
                </div>
              </div>

              {/* List-level error (markAllAsRead failure) */}
              {listError && (
                <div className="px-4 py-2 flex items-center justify-between gap-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <span>{listError}</span>
                  <button onClick={() => setListError(null)} style={{ color: '#f87171' }}>✕</button>
                </div>
              )}

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#fcc824' }}></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9090a8' }}>
                    <Bell className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1" style={{ color: '#5a5a72' }}>You're all caught up!</p>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #1e1e30' }}>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="relative p-4 border-l-4 cursor-pointer transition-all duration-200 group"
                        style={{
                          ...getPriorityStyle(notification.priority),
                          opacity: notification.is_read ? 0.7 : 1,
                          borderBottom: '1px solid #1e1e30',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = getPriorityStyle(notification.priority).backgroundColor as string ?? 'transparent'; }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <span className="text-xl">{getTypeIcon(notification.type)}</span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium" style={{ color: notification.is_read ? '#9090a8' : '#ededf5' }}>
                                {notification.title}
                              </h4>
                              <span className="text-xs whitespace-nowrap" style={{ color: '#5a5a72' }}>
                                {formatTime(notification.created_at)}
                              </span>
                            </div>
                            {notification.message && (
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: '#9090a8' }}>
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase" style={{ color: '#5a5a72' }}>
                                {notification.source}
                              </span>
                              {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#fcc824' }}></span>
                              )}
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9090a8' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2" style={{ borderTop: '1px solid #1e1e30', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/notifications';
                    }}
                    className="w-full text-center text-sm font-medium transition-colors"
                    style={{ color: '#fcc824' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#fcc824'; }}
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
