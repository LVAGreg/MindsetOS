'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Send,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_type: 'all' | 'role' | 'users';
  target_roles: string[];
  target_user_ids: string[];
  recipients_count: number;
  read_count: number;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  expires_at: string | null;
  created_at: string;
  admin_email: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function AdminBroadcastsPage() {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination & date filter state
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBroadcasts, setTotalBroadcasts] = useState(0);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    target_type: 'all' | 'role' | 'users';
    target_roles: string[];
    target_user_ids: string[];
    scheduled_for: string;
    expires_at: string;
  }>({
    title: '',
    message: '',
    priority: 'normal',
    target_type: 'all',
    target_roles: [] as string[],
    target_user_ids: [] as string[],
    scheduled_for: '',
    expires_at: '',
  });

  useEffect(() => {
    fetchBroadcasts();
    fetchUsers();
  }, [currentPage, daysFilter]);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(PAGE_SIZE));
      if (daysFilter) params.append('days', String(daysFilter));

      const data = await apiClient.get(`/api/admin/broadcasts?${params}`);
      setBroadcasts(data.broadcasts || []);
      setTotalBroadcasts(data.total || (data.broadcasts || []).length);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/api/admin/stats');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const createBroadcast = async () => {
    try {
      const payload: any = {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        target_type: formData.target_type,
      };

      if (formData.target_type === 'role') {
        payload.target_roles = formData.target_roles;
      } else if (formData.target_type === 'users') {
        payload.target_user_ids = formData.target_user_ids;
      }

      if (formData.scheduled_for) {
        payload.scheduled_for = formData.scheduled_for;
      }
      if (formData.expires_at) {
        payload.expires_at = formData.expires_at;
      }

      // Parse data JSON if provided
      if ((formData as any).data_json) {
        try {
          payload.data = JSON.parse((formData as any).data_json);
        } catch (e) {
          showStatus('error', 'Invalid JSON in Data field');
          return;
        }
      }

      await apiClient.createBroadcast(payload);
      setShowCreateModal(false);
      resetForm();
      fetchBroadcasts();
    } catch (error) {
      console.error('Failed to create broadcast:', error);
      showStatus('error', 'Failed to create broadcast');
    }
  };

  const sendBroadcast = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to send this broadcast?')) return;

    try {
      setSendingId(broadcastId);
      const result = await apiClient.sendBroadcast(broadcastId);
      showStatus('success', `Broadcast sent to ${result.recipientsCount} recipients!`);
      fetchBroadcasts();
      // Trigger notification refresh for all users
      window.dispatchEvent(new CustomEvent('notification-refresh'));
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      showStatus('error', 'Failed to send broadcast');
    } finally {
      setSendingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      priority: 'normal',
      target_type: 'all',
      target_roles: [],
      target_user_ids: [],
      scheduled_for: '',
      expires_at: '',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-[#fca5a5]';
      case 'high': return 'text-[#fb923c]';
      case 'normal': return 'text-[#60a5fa]';
      case 'low': return 'text-[#9090a8]';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '';
      case 'scheduled': return '';
      case 'draft': return '';
      case 'cancelled': return '';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'draft': return <Edit className="w-4 h-4" style={{ color: '#9090a8' }} />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Admin Broadcasts</h1>
          <p className="mt-1" style={{ color: '#9090a8' }}>
            Send notifications to all users, specific roles, or individual users
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </button>
      </div>

      {/* Inline Status Banner */}
      {statusMsg && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={statusMsg.type === 'success'
            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {statusMsg.text}
          </div>
          <button onClick={() => setStatusMsg(null)} className="hover:opacity-70">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
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
              : { background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(79,110,247,0.15)' }}>
              <Megaphone className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Broadcasts</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{broadcasts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Send className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Sent</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>
                {broadcasts.filter(b => b.status === 'sent').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(252,200,36,0.15)' }}>
              <Clock className="w-5 h-5" style={{ color: '#fcc824' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Drafts</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>
                {broadcasts.filter(b => b.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(192,132,252,0.15)' }}>
              <Users className="w-5 h-5" style={{ color: '#c084fc' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Recipients</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>
                {broadcasts.reduce((sum, b) => sum + b.recipients_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcasts Table */}
      <div className="rounded-xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e1e30' }}>
          <h2 className="font-semibold" style={{ color: '#ededf5' }}>All Broadcasts</h2>
          <button
            onClick={fetchBroadcasts}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#9090a8' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#4f6ef7' }} />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9090a8' }}>
            <Megaphone className="w-12 h-12 mb-3 opacity-30" />
            <p>No broadcasts yet</p>
            <p className="text-sm mt-1">Create your first broadcast to notify users</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(9,9,15,0.4)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Broadcast
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Recipients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: '#9090a8' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((broadcast) => (
                  <tr key={broadcast.id} className="hover:bg-white/5" style={{ borderTop: '1px solid #1e1e30' }}>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium" style={{ color: '#ededf5' }}>{broadcast.title}</p>
                        <p className="text-sm truncate max-w-xs" style={{ color: '#9090a8' }}>
                          {broadcast.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(broadcast.status)}
                        <span className="px-2 py-1 text-xs font-medium rounded"
                          style={broadcast.status === 'sent'
                            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
                            : broadcast.status === 'draft'
                            ? { background: 'rgba(252,200,36,0.1)', border: '1px solid rgba(252,200,36,0.25)', color: '#fcc824' }
                            : broadcast.status === 'scheduled'
                            ? { background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.25)', color: '#4f6ef7' }
                            : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                        >
                          {broadcast.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(broadcast.priority)}`}
                        style={{ background: 'rgba(144,144,168,0.1)', border: '1px solid rgba(144,144,168,0.2)' }}>
                        {broadcast.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" style={{ color: '#9090a8' }} />
                        <span className="text-sm capitalize" style={{ color: '#9090a8' }}>
                          {broadcast.target_type}
                          {broadcast.target_type === 'role' && broadcast.target_roles.length > 0 && (
                            <span className="ml-1 text-xs">({broadcast.target_roles.join(', ')})</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <span className="font-medium" style={{ color: '#ededf5' }}>{broadcast.recipients_count}</span>
                        {broadcast.status === 'sent' && (
                          <span className="ml-1" style={{ color: '#9090a8' }}>
                            ({broadcast.read_count} read)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: '#9090a8' }}>
                      {formatDate(broadcast.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                          <button
                            onClick={() => sendBroadcast(broadcast.id)}
                            disabled={sendingId === broadcast.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors text-sm text-white"
                            style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
                          >
                            {sendingId === broadcast.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            Send
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" style={{ color: '#9090a8' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid #1e1e30' }}>
            <p className="text-sm" style={{ color: '#9090a8' }}>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalBroadcasts)} of {totalBroadcasts} broadcasts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
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
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
              <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>New Broadcast</h2>
              <p className="text-sm mt-1" style={{ color: '#9090a8' }}>
                Create a notification to send to users
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  placeholder="Broadcast title..."
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  placeholder="Write your message..."
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Target Audience
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  <option value="all">All Users</option>
                  <option value="role">By Role</option>
                  <option value="users">Specific Users</option>
                </select>
              </div>

              {/* Role Selection */}
              {formData.target_type === 'role' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Select Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['admin', 'power_user', 'user'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          const roles = formData.target_roles.includes(role)
                            ? formData.target_roles.filter(r => r !== role)
                            : [...formData.target_roles, role];
                          setFormData({ ...formData, target_roles: roles });
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={formData.target_roles.includes(role)
                          ? { background: '#4f6ef7', color: '#fff' }
                          : { background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Selection */}
              {formData.target_type === 'users' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Select Users
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl" style={{ border: '1px solid #1e1e30' }}>
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.target_user_ids.includes(user.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...formData.target_user_ids, user.id]
                              : formData.target_user_ids.filter(id => id !== user.id);
                            setFormData({ ...formData, target_user_ids: ids });
                          }}
                          className="rounded focus:ring-[#4f6ef7]"
                          style={{ accentColor: '#4f6ef7' }}
                        />
                        <span className="text-sm" style={{ color: '#ededf5' }}>
                          {user.firstName} {user.lastName} ({user.email})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid #1e1e30' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: '#9090a8' }}
              >
                Cancel
              </button>
              <button
                onClick={createBroadcast}
                disabled={!formData.title || !formData.message}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Create Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
