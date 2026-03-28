'use client';

import { useState, useEffect } from 'react';
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
  '5in30': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  'fast_start': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'foundations': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'accelerate': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'private': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
};

const STATUS_LABELS: Record<MembershipStatus, string> = {
  'active': 'Active',
  'paused': 'Paused',
  'cancelled': 'Cancelled',
  'grace_period': 'Grace Period',
  'expired': 'Expired',
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  'active': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'paused': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  'cancelled': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'grace_period': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 animate-pulse',
  'expired': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'power_user':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only accessible to administrators and power users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Admin
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Crown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.admins}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">New This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.newThisMonth}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-900 dark:text-green-100 font-medium">{success}</p>
            </div>
          )}
        </div>

        {/* Grace Period Warning */}
        {stats.graceWarning > 0 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Grace Period Alert</h3>
              <p className="text-orange-700 dark:text-orange-300 text-sm">
                {stats.graceWarning} user{stats.graceWarning === 1 ? ' is' : 's are'} in grace period and may lose access soon.
              </p>
            </div>
          </div>
        )}

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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tier
              </label>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Membership
              </label>
              <select
                value={membershipStatusFilter}
                onChange={(e) => setMembershipStatusFilter(e.target.value)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="power_user">Power User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Membership
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === currentUser.id}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                            user.role
                          )} disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-500`}
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
                          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                            user.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity`}
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
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.membership_tier ? TIER_COLORS[user.membership_tier] : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
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
                          className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                            user.membership_status ? STATUS_COLORS[user.membership_status] : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } hover:opacity-80 transition-opacity`}
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
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {Number(user.total_input_tokens || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {Number(user.total_output_tokens || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                        ${Number(user.estimated_cost || 0).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => setPasswordResetModal(user)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
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
                                className="px-2 py-1 text-xs font-medium bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
                              >
                                {resettingMemory ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setResetMemoryConfirm(null)}
                                className="px-2 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetMemoryConfirm(user.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
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
                                className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(user.id)}
                              disabled={user.id === currentUser.id}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalUsers)} of {totalUsers} users
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

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            User Management Notes
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Manage Membership
                </h3>
                <button
                  onClick={() => {
                    setMembershipModal(null);
                    setMembershipNotes('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
                    {(membershipModal.first_name?.[0] || membershipModal.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {membershipModal.first_name} {membershipModal.last_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {membershipModal.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    membershipModal.membership_tier ? TIER_COLORS[membershipModal.membership_tier] : 'bg-gray-100 text-gray-700'
                  }`}>
                    {TIER_LABELS[membershipModal.membership_tier || 'foundations']}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    membershipModal.membership_status ? STATUS_COLORS[membershipModal.membership_status] : 'bg-gray-100 text-gray-700'
                  }`}>
                    {STATUS_LABELS[membershipModal.membership_status || 'active']}
                  </span>
                </div>
                {membershipModal.membership_status === 'grace_period' && membershipModal.grace_period_ends_at && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Grace period ends: {new Date(membershipModal.grace_period_ends_at).toLocaleDateString()} ({formatGracePeriod(membershipModal.grace_period_ends_at)})
                  </div>
                )}
              </div>

              {/* Tier Selection (for reactivation) */}
              {(membershipModal.membership_status === 'expired' || membershipModal.membership_status === 'cancelled' || membershipModal.membership_status === 'paused') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reactivate to Tier
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as MembershipTier)}
                    className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={membershipNotes}
                  onChange={(e) => setMembershipNotes(e.target.value)}
                  placeholder="Add notes about this membership change..."
                  rows={2}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Active status actions */}
                {membershipModal.membership_status === 'active' && (
                  <>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'pause')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pause Membership (7-day grace)
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'cancel')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Membership (7-day grace)
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Reactivate Membership
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Reactivate as {TIER_LABELS[selectedTier]}
                    </button>
                    <button
                      onClick={() => handleMembershipAction(membershipModal.id, 'expire')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Reactivate as {TIER_LABELS[selectedTier]}
                  </button>
                )}
              </div>

              {/* Warning message */}
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
                <p className="font-medium mb-1">Important:</p>
                <ul className="space-y-0.5">
                  <li>• Paused/Cancelled members get 7 days to renew</li>
                  <li>• After grace period, access is permanently revoked</li>
                  <li>• User data is retained but they cannot log in</li>
                  <li>• Reactivation requires admin action</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => {
                  setMembershipModal(null);
                  setMembershipNotes('');
                }}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Reset Password
                  </h3>
                </div>
                <button
                  onClick={closePasswordModal}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    {(passwordResetModal.first_name?.[0] || passwordResetModal.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {passwordResetModal.first_name} {passwordResetModal.last_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {passwordResetModal.email}
                    </p>
                  </div>
                </div>
              </div>

              {!resetResult ? (
                <>
                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password (optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave empty to auto-generate"
                        className="w-full p-2 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      If left empty, a secure random password will be generated.
                    </p>
                  </div>

                  {/* Email Option */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendResetEmail}
                      onChange={(e) => setSendResetEmail(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Send password to user via email
                    </label>
                  </div>

                  {/* Warning */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-400">
                    <p className="font-medium mb-1">Important:</p>
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Password Reset Successful
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {resetResult.email_sent
                        ? 'An email with the new password has been sent to the user.'
                        : 'The password has been reset. Share it with the user securely.'}
                    </p>
                  </div>

                  {!resetResult.email_sent && resetResult.password && (
                    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">New Password:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-sm text-gray-900 dark:text-white">
                          {resetResult.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(resetResult.password!)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                        Make sure to share this password securely. It won&apos;t be shown again.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={closePasswordModal}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
