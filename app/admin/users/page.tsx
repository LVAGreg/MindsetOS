'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  Users,
  Search,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Crown,
  Calendar,
  MessageSquare,
  Brain,
  ChevronUp,
  ChevronDown,
  Tag,
  Clock,
  Pause,
  Play,
  History,
  Key,
  Mail,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'power_user' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  conversation_count: string;
  memory_count: string;
  total_input_tokens: string;
  total_output_tokens: string;
  estimated_cost: string;
  membership_tier: '5in30' | 'fast_start' | 'foundations' | 'accelerate' | 'private' | null;
  membership_status: 'active' | 'paused' | 'cancelled' | 'grace_period' | 'expired' | null;
  grace_period_ends_at: string | null;
  membership_updated_at: string | null;
}

type MembershipTier = '5in30' | 'fast_start' | 'foundations' | 'accelerate' | 'private';
type MembershipStatus = 'active' | 'paused' | 'cancelled' | 'grace_period' | 'expired';

const TIER_LABELS: Record<MembershipTier, string> = {
  '5in30': '5IN30',
  'fast_start': 'Fast Start',
  'foundations': 'Foundations',
  'accelerate': 'Accelerate',
  'private': 'Private',
};

const TIER_COLORS: Record<MembershipTier, string> = {
  '5in30': '',
  'fast_start': '',
  'foundations': '',
  'accelerate': '',
  'private': '',
};

const STATUS_LABELS: Record<MembershipStatus, string> = {
  'active': 'Active',
  'paused': 'Paused',
  'cancelled': 'Cancelled',
  'grace_period': 'Grace Period',
  'expired': 'Expired',
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  'active': '',
  'paused': '',
  'cancelled': '',
  'grace_period': 'animate-pulse',
  'expired': '',
};

type SortField = 'email' | 'role' | 'created_at' | 'last_login_at' | 'conversation_count' | 'total_input_tokens' | 'total_output_tokens' | 'estimated_cost';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<string>('all');
  const [membershipModal, setMembershipModal] = useState<User | null>(null);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>('foundations');
  const [membershipNotes, setMembershipNotes] = useState('');
  const [passwordResetModal, setPasswordResetModal] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ password?: string; email_sent?: boolean } | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMemoryConfirm, setResetMemoryConfirm] = useState<string | null>(null);
  const [resettingMemory, setResettingMemory] = useState(false);

  // Pagination & date filter state
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [daysFilter, setDaysFilter] = useState<number | null>(null);

  // Redirect if not admin or power_user
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'power_user') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    loadUsers();
  }, [currentPage, daysFilter]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, roleFilter, statusFilter, tierFilter, membershipStatusFilter, sortField, sortOrder]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(PAGE_SIZE));
      if (daysFilter) params.append('days', String(daysFilter));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load users');

      const data = await response.json();
      // Support both new paginated format and legacy array format
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
        setTotalPages(1);
      } else {
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((u) => u.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((u) => !u.is_active);
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((u) => u.membership_tier === tierFilter);
    }

    // Membership status filter
    if (membershipStatusFilter !== 'all') {
      filtered = filtered.filter((u) => u.membership_status === membershipStatusFilter);
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'conversation_count' || sortField === 'total_input_tokens' || sortField === 'total_output_tokens') {
        aVal = parseInt(aVal);
        bVal = parseInt(bVal);
      } else if (sortField === 'estimated_cost') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Membership management functions
  const handleMembershipAction = async (userId: string, action: 'pause' | 'cancel' | 'expire' | 'reactivate', tier?: MembershipTier) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/membership`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          membership_tier: tier,
          notes: membershipNotes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update membership');
      }

      const actionLabels = {
        pause: 'Membership paused (7-day grace period)',
        cancel: 'Membership cancelled (7-day grace period)',
        expire: 'Membership expired',
        reactivate: 'Membership reactivated',
      };

      setSuccess(actionLabels[action]);
      setTimeout(() => setSuccess(null), 3000);
      setMembershipModal(null);
      setMembershipNotes('');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership');
    }
  };

  const handleTierChange = async (userId: string, newTier: MembershipTier) => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/membership`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ membership_tier: newTier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tier');
      }

      setSuccess(`Tier updated to ${TIER_LABELS[newTier]}`);
      setTimeout(() => setSuccess(null), 3000);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tier');
    }
  };

  // Password reset handler
  const handlePasswordReset = async (userId: string) => {
    try {
      setError(null);
      setResettingPassword(true);
      setResetResult(null);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_password: newPassword || undefined,
          send_email: sendResetEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      const result = await response.json();
      setResetResult({
        password: result.temporary_password,
        email_sent: result.email_sent,
      });

      setSuccess(`Password reset for ${passwordResetModal?.email}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setPasswordResetModal(null);
    setNewPassword('');
    setSendResetEmail(true);
    setShowPassword(false);
    setResetResult(null);
  };

  const handleResetMemory = async (userId: string) => {
    try {
      setError(null);
      setResettingMemory(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/users/${userId}/reset-memory`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset memory');
      }

      const result = await response.json();
      setSuccess(`Memory reset for ${result.user_email}. Agents remain unlocked.`);
      setTimeout(() => setSuccess(null), 5000);
      setResetMemoryConfirm(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset memory');
    } finally {
      setResettingMemory(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Password copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  };

  const formatGracePeriod = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  };

  const getRoleBadgeStyle = (role: string): React.CSSProperties => {
    switch (role) {
      case 'admin':
        return { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 };
      case 'power_user':
        return { background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#a78bfa', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 };
      default:
        return { background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 };
    }
  };

  const stats = {
    total: totalUsers || users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === 'admin').length,
    newThisMonth: users.filter((u) => {
      const created = new Date(u.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
    graceWarning: users.filter((u) => u.membership_status === 'grace_period').length,
    tierBreakdown: {
      '5in30': users.filter((u) => u.membership_tier === '5in30').length,
      'fast_start': users.filter((u) => u.membership_tier === 'fast_start').length,
      'foundations': users.filter((u) => u.membership_tier === 'foundations').length,
      'accelerate': users.filter((u) => u.membership_tier === 'accelerate').length,
      'private': users.filter((u) => u.membership_tier === 'private').length,
    },
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'power_user')) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#f87171] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#ededf5' }}>Access Denied</h1>
          <p style={{ color: '#9090a8' }}>
            This page is only accessible to administrators and power users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f6ef7] mx-auto mb-4"></div>
          <p style={{ color: '#9090a8' }}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#ededf5' }}>
                User Management
              </h1>
              <p style={{ color: '#9090a8' }}>
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
            >
              Back to Admin
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: '#4f6ef720' }}>
                  <Users className="w-5 h-5" style={{ color: '#7b8ff8' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Total Users</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: '#4ade80' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Active Users</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Crown className="w-5 h-5" style={{ color: '#f87171' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>Admins</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{stats.admins}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: '#4f6ef720' }}>
                  <Calendar className="w-5 h-5" style={{ color: '#7b8ff8' }} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#9090a8' }}>New This Month</p>
                  <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    {stats.newThisMonth}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 rounded-lg flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
              <div>
                <h3 className="font-semibold" style={{ color: '#fca5a5' }}>Error</h3>
                <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <p className="font-medium" style={{ color: '#4ade80' }}>{success}</p>
            </div>
          )}
        </div>

        {/* Grace Period Warning */}
        {stats.graceWarning > 0 && (
          <div className="mb-4 p-4 rounded-lg flex items-start gap-3" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}>
            <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fb923c' }} />
            <div>
              <h3 className="font-semibold" style={{ color: '#fdba74' }}>Grace Period Alert</h3>
              <p className="text-sm" style={{ color: '#fb923c' }}>
                {stats.graceWarning} user{stats.graceWarning === 1 ? ' is' : 's are'} in grace period and may lose access soon.
              </p>
            </div>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 mb-4">
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

        {/* Filters */}
        <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9090a8' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Tier
              </label>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
              >
                <option value="all">All Tiers</option>
                <option value="5in30">5IN30 ({stats.tierBreakdown['5in30']})</option>
                <option value="fast_start">Fast Start ({stats.tierBreakdown['fast_start']})</option>
                <option value="foundations">Foundations ({stats.tierBreakdown['foundations']})</option>
                <option value="accelerate">Accelerate ({stats.tierBreakdown['accelerate']})</option>
                <option value="private">Private ({stats.tierBreakdown['private']})</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Membership
              </label>
              <select
                value={membershipStatusFilter}
                onChange={(e) => setMembershipStatusFilter(e.target.value)}
                className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
              >
                <option value="all">All Membership</option>
                <option value="active">Active</option>
                <option value="grace_period">Grace Period</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="power_user">Power User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                Account Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1200px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ background: 'rgba(9,9,15,0.8)' }}>
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      User
                      {sortField === 'email' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {sortField === 'role' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}>
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}>
                    Membership
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('conversation_count')}
                  >
                    <div className="flex items-center gap-2">
                      Activity
                      {sortField === 'conversation_count' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortField === 'created_at' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('last_login_at')}
                  >
                    <div className="flex items-center gap-2">
                      Last Login
                      {sortField === 'last_login_at' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('total_input_tokens')}
                  >
                    <div className="flex items-center gap-2">
                      Input Tokens
                      {sortField === 'total_input_tokens' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('total_output_tokens')}
                  >
                    <div className="flex items-center gap-2">
                      Output Tokens
                      {sortField === 'total_output_tokens' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}
                    onClick={() => handleSort('estimated_cost')}
                  >
                    <div className="flex items-center gap-2">
                      Est. Cost
                      {sortField === 'estimated_cost' &&
                        (sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8', borderBottom: '1px solid #1e1e30' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center"
                      style={{ color: '#9090a8' }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(18,18,31,0.8)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#ededf5' }}>
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm" style={{ color: '#9090a8' }}>
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === currentUser.id}
                          style={getRoleBadgeStyle(user.role)}
                          className="disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none bg-transparent"
                        >
                          <option value="user">User</option>
                          <option value="power_user">Power User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(user.id, user.is_active)}
                          disabled={user.id === currentUser.id}
                          className="flex items-center gap-1 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                          style={user.is_active
                            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                            : { background: 'rgba(144,144,168,0.1)', border: '1px solid rgba(144,144,168,0.2)', color: '#9090a8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}
                        >
                          {user.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      {/* Tier */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.membership_tier || 'foundations'}
                          onChange={(e) => handleTierChange(user.id, e.target.value as MembershipTier)}
                          style={{ background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}
                          className="focus:outline-none"
                        >
                          <option value="5in30">5IN30</option>
                          <option value="fast_start">Fast Start</option>
                          <option value="foundations">Foundations</option>
                          <option value="accelerate">Accelerate</option>
                          <option value="private">Private</option>
                        </select>
                      </td>
                      {/* Membership Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setMembershipModal(user);
                            setSelectedTier(user.membership_tier || 'foundations');
                          }}
                          className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${user.membership_status === 'grace_period' ? 'animate-pulse' : ''}`}
                          style={
                            user.membership_status === 'active'
                              ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                              : user.membership_status === 'grace_period'
                              ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                              : user.membership_status === 'paused'
                              ? { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                              : user.membership_status === 'cancelled'
                              ? { background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                              : { background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }
                          }
                        >
                          {user.membership_status === 'grace_period' && (
                            <Clock className="w-3 h-3" />
                          )}
                          {STATUS_LABELS[user.membership_status || 'active']}
                          {user.membership_status === 'grace_period' && user.grace_period_ends_at && (
                            <span className="text-[10px] ml-1">
                              ({formatGracePeriod(user.grace_period_ends_at)})
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-sm" style={{ color: '#9090a8' }}>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {user.conversation_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <Brain className="w-4 h-4" />
                            {user.memory_count}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#9090a8' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#9090a8' }}>
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#ededf5' }}>
                        {Number(user.total_input_tokens || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#ededf5' }}>
                        {Number(user.total_output_tokens || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#4ade80' }}>
                        ${Number(user.estimated_cost || 0).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => setPasswordResetModal(user)}
                            className="p-2 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: '#7b8ff8' }}
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Reset Memory Button */}
                          {resetMemoryConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleResetMemory(user.id)}
                                disabled={resettingMemory}
                                className="px-2 py-1 text-xs font-medium text-white rounded transition-colors disabled:opacity-50"
                                style={{ background: '#fb923c' }}
                              >
                                {resettingMemory ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setResetMemoryConfirm(null)}
                                className="px-2 py-1 text-xs font-medium rounded transition-colors"
                                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetMemoryConfirm(user.id)}
                              className="p-2 rounded-lg transition-colors hover:opacity-80"
                              style={{ color: '#fb923c' }}
                              title="Reset memory (clear all business profile, brand voice, onboarding)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-2 py-1 text-xs font-medium text-white rounded transition-colors"
                                style={{ background: '#ef4444' }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium rounded transition-colors"
                                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              disabled={user.id === currentUser.id}
                              className="p-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ color: '#f87171' }}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
            <p className="text-sm" style={{ color: '#9090a8' }}>
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalUsers)} of {totalUsers} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-lg" style={{ background: '#4f6ef710', border: '1px solid #4f6ef730' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#7b8ff8' }}>
            User Management Notes
          </h3>
          <ul className="text-sm space-y-1" style={{ color: '#9090a8' }}>
            <li>• You cannot modify your own role or status</li>
            <li>• System prevents deletion of the last admin account</li>
            <li>• All changes are logged in the security events table</li>
            <li>• Deleting a user removes all their conversations and memories</li>
            <li>• Paused/Cancelled memberships have a 7-day grace period before access is revoked</li>
          </ul>
        </div>
      </div>

      {/* Membership Management Modal */}
      {membershipModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
            {/* Modal Header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e1e30', background: 'rgba(9,9,15,0.8)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>
                  Manage Membership
                </h3>
                <button
                  onClick={() => {
                    setMembershipModal(null);
                    setMembershipNotes('');
                  }}
                  className="p-1 rounded-full hover:opacity-70 transition-opacity"
                  style={{ color: '#9090a8' }}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(9,9,15,0.5)', border: '1px solid #1e1e30' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4f6ef7] flex items-center justify-center text-white font-bold">
                    {(membershipModal.first_name?.[0] || membershipModal.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#ededf5' }}>
                      {membershipModal.first_name} {membershipModal.last_name}
                    </p>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {membershipModal.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span style={{ background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {TIER_LABELS[membershipModal.membership_tier || 'foundations']}
                  </span>
                  <span style={{ background: '#4f6ef720', border: '1px solid #4f6ef730', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {STATUS_LABELS[membershipModal.membership_status || 'active']}
                  </span>
                </div>
                {membershipModal.membership_status === 'grace_period' && membershipModal.grace_period_ends_at && (
                  <div className="mt-2 text-sm flex items-center gap-1" style={{ color: '#f87171' }}>
                    <Clock className="w-4 h-4" />
                    Grace period ends: {new Date(membershipModal.grace_period_ends_at).toLocaleDateString()} ({formatGracePeriod(membershipModal.grace_period_ends_at)})
                  </div>
                )}
              </div>

              {/* Tier Selection (for reactivation) */}
              {(membershipModal.membership_status === 'expired' || membershipModal.membership_status === 'cancelled' || membershipModal.membership_status === 'paused') && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                    Reactivate to Tier
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as MembershipTier)}
                    className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
                  >
                    <option value="5in30">5IN30</option>
                    <option value="fast_start">Fast Start ($87/week)</option>
                    <option value="foundations">Foundations (TXP)</option>
                    <option value="accelerate">Accelerate (TXP)</option>
                    <option value="private">Private (TXP)</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                  Admin Notes (optional)
                </label>
                <textarea
                  value={membershipNotes}
                  onChange={(e) => setMembershipNotes(e.target.value)}
                  placeholder="Add notes about this membership change..."
                  rows={2}
                  className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Active status actions */}
                {membershipModal.membership_status === 'active' && (
                  <>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'pause')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                    >
                      <Pause className="w-4 h-4" />
                      Pause Membership (7-day grace)
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'cancel')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Membership (7-day grace)
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Expire Immediately (Revoke Access)
                    </button>
                  </>
                )}

                {/* Grace period actions */}
                {membershipModal.membership_status === 'grace_period' && (
                  <>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'reactivate', selectedTier)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                    >
                      <Play className="w-4 h-4" />
                      Reactivate Membership
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Expire Now (Skip Grace Period)
                    </button>
                  </>
                )}

                {/* Paused/Cancelled actions */}
                {(membershipModal.membership_status === 'paused' || membershipModal.membership_status === 'cancelled') && (
                  <>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'reactivate', selectedTier)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                    >
                      <Play className="w-4 h-4" />
                      Reactivate as {TIER_LABELS[selectedTier]}
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Expire Immediately
                    </button>
                  </>
                )}

                {/* Expired status actions */}
                {membershipModal.membership_status === 'expired' && (
                  <button
                    onClick={() => handleMembershipAction(membershipModal.id, 'reactivate', selectedTier)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                  >
                    <Play className="w-4 h-4" />
                    Reactivate as {TIER_LABELS[selectedTier]}
                  </button>
                )}
              </div>

              {/* Warning message */}
              <div className="text-xs rounded-lg p-3" style={{ background: 'rgba(9,9,15,0.5)', border: '1px solid #1e1e30', color: '#9090a8' }}>
                <p className="font-medium mb-1" style={{ color: '#ededf5' }}>Important:</p>
                <ul className="space-y-0.5">
                  <li>• Paused/Cancelled members get 7 days to renew</li>
                  <li>• After grace period, access is permanently revoked</li>
                  <li>• User data is retained but they cannot log in</li>
                  <li>• Reactivation requires admin action</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4" style={{ borderTop: '1px solid #1e1e30', background: 'rgba(9,9,15,0.8)' }}>
              <button
                onClick={() => {
                  setMembershipModal(null);
                  setMembershipNotes('');
                }}
                className="w-full px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
            {/* Modal Header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e1e30', background: 'rgba(9,9,15,0.8)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: '#4f6ef720' }}>
                    <Key className="w-5 h-5" style={{ color: '#7b8ff8' }} />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>
                    Reset Password
                  </h3>
                </div>
                <button
                  onClick={closePasswordModal}
                  className="p-1 rounded-full hover:opacity-70 transition-opacity"
                  style={{ color: '#9090a8' }}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="rounded-lg p-4" style={{ background: 'rgba(9,9,15,0.5)', border: '1px solid #1e1e30' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4f6ef7] flex items-center justify-center text-white font-bold">
                    {(passwordResetModal.first_name?.[0] || passwordResetModal.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#ededf5' }}>
                      {passwordResetModal.first_name} {passwordResetModal.last_name}
                    </p>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {passwordResetModal.email}
                    </p>
                  </div>
                </div>
              </div>

              {!resetResult ? (
                <>
                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                      New Password (optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave empty to auto-generate"
                        className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
                        style={{ color: '#9090a8' }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                      If left empty, a secure random password will be generated.
                    </p>
                  </div>

                  {/* Email Option */}
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#4f6ef710', border: '1px solid #4f6ef730' }}>
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendResetEmail}
                      onChange={(e) => setSendResetEmail(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#4f6ef7' }}
                    />
                    <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#9090a8' }}>
                      <Mail className="w-4 h-4" style={{ color: '#7b8ff8' }} />
                      Send password to user via email
                    </label>
                  </div>

                  {/* Warning */}
                  <div className="text-xs rounded-lg p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderLeft: '4px solid #fbbf24', color: '#9090a8' }}>
                    <p className="font-medium mb-1" style={{ color: '#fbbf24' }}>Important:</p>
                    <ul className="space-y-0.5">
                      <li>• The user&apos;s current password will be replaced</li>
                      <li>• All active sessions will remain valid</li>
                      <li>• This action is logged for security</li>
                    </ul>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handlePasswordReset(passwordResetModal.id)}
                    disabled={resettingPassword}
                    className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full flex items-center justify-center gap-2 py-2.5"
                  >
                    {resettingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Reset Password
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Success State */
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(34,197,94,0.1)' }}>
                      <CheckCircle className="w-6 h-6" style={{ color: '#4ade80' }} />
                    </div>
                    <h4 className="text-lg font-semibold mb-1" style={{ color: '#ededf5' }}>
                      Password Reset Successful
                    </h4>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {resetResult.email_sent
                        ? 'An email with the new password has been sent to the user.'
                        : 'The password has been reset. Share it with the user securely.'}
                    </p>
                  </div>

                  {!resetResult.email_sent && resetResult.password && (
                    <div className="rounded-lg p-4" style={{ background: 'rgba(9,9,15,0.5)', border: '1px solid #1e1e30' }}>
                      <p className="text-xs mb-2" style={{ color: '#9090a8' }}>New Password:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded font-mono text-sm" style={{ background: '#09090f', border: '1px solid #1e1e30', color: '#ededf5' }}>
                          {resetResult.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(resetResult.password!)}
                          className="p-2 rounded-lg transition-colors hover:opacity-70"
                          style={{ color: '#9090a8' }}
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: '#fb923c' }}>
                        Make sure to share this password securely. It won&apos;t be shown again.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4" style={{ borderTop: '1px solid #1e1e30', background: 'rgba(9,9,15,0.8)' }}>
              <button
                onClick={closePasswordModal}
                className="w-full px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                {resetResult ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
