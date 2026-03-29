'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ChevronDown, X, Search, Edit3, Clock, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiClient } from '../lib/api-client';

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  conversation_count: number;
}

export function AdminUserSwitcher() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [confirmingEdit, setConfirmingEdit] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, viewAsUser, setViewAsUser, impersonationSession, setImpersonationSession } = useAppStore();

  const isAdmin = user?.role === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch users when dropdown opens
  useEffect(() => {
    if (open && users.length === 0 && !loading) {
      setLoading(true);
      apiClient.get('/api/admin/users?limit=500')
        .then((data: AdminUser[] | { users: AdminUser[] }) => {
          // Handle both response formats: plain array or { users: [...] }
          const userList = Array.isArray(data) ? data : (data.users || []);
          setUsers(userList);
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch users:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [open, users.length, loading]);

  // Check for active impersonation session on mount
  useEffect(() => {
    if (isAdmin) {
      apiClient.getActiveImpersonation()
        .then((data: { session: any }) => {
          if (data.session) {
            setImpersonationSession({
              id: data.session.id,
              status: data.session.status,
              permissions: data.session.permissions,
              expires_at: data.session.expires_at,
            });
            // Also set viewAsUser from session data
            setViewAsUser({
              id: data.session.target_user_id,
              email: data.session.target_email,
              name: `${data.session.target_first_name || ''} ${data.session.target_last_name || ''}`.trim() || data.session.target_email,
              firstName: data.session.target_first_name || undefined,
              lastName: data.session.target_last_name || undefined,
              role: data.session.target_role,
              emailVerified: true,
            });
          }
        })
        .catch(() => { /* no active session */ });
    }
  }, [isAdmin]);

  // Poll for session status changes (when edit_requested, check if approved/declined)
  useEffect(() => {
    if (!impersonationSession || impersonationSession.status !== 'edit_requested') return;
    const interval = setInterval(() => {
      apiClient.getActiveImpersonation()
        .then((data: { session: any }) => {
          if (data.session && data.session.status !== 'edit_requested') {
            setImpersonationSession({
              id: data.session.id,
              status: data.session.status,
              permissions: data.session.permissions,
              expires_at: data.session.expires_at,
            });
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [impersonationSession?.status]);

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleSelectUser = async (selectedUser: AdminUser) => {
    try {
      const result = await apiClient.startImpersonation(selectedUser.id);
      setViewAsUser({
        id: selectedUser.id,
        email: selectedUser.email,
        name: `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email,
        firstName: selectedUser.first_name || undefined,
        lastName: selectedUser.last_name || undefined,
        role: selectedUser.role,
        emailVerified: true,
      });
      setImpersonationSession({
        id: result.session.id,
        status: 'viewing',
        permissions: result.session.permissions,
      });
      setOpen(false);
      setSearch('');
    } catch (err) {
      console.error('Failed to start impersonation:', err);
    }
  };

  const handleRequestEdit = async () => {
    setRequestingEdit(true);
    try {
      await apiClient.requestEditAccess();
      setImpersonationSession({
        ...impersonationSession,
        status: 'edit_requested',
      });
    } catch (err) {
      console.error('Failed to request edit access:', err);
    } finally {
      setRequestingEdit(false);
    }
  };

  const handleEndSession = async () => {
    setEndingSession(true);
    try {
      await apiClient.endImpersonation();
      setViewAsUser(null);
      setImpersonationSession(null);
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setEndingSession(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-600 bg-red-50';
      case 'agency': return 'text-indigo-600 bg-indigo-50';
      case 'power_user': return 'text-purple-600 bg-purple-50';
      case 'trial': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const statusBadge = () => {
    if (!impersonationSession) return null;
    switch (impersonationSession.status) {
      case 'viewing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
            <Eye className="w-3 h-3" /> View Only
          </span>
        );
      case 'edit_requested':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
            <Clock className="w-3 h-3" /> Edit Pending
          </span>
        );
      case 'edit_approved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
            <CheckCircle className="w-3 h-3" /> Edit Active
          </span>
        );
      case 'edit_declined':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
            <XCircle className="w-3 h-3" /> Edit Declined
          </span>
        );
      default:
        return null;
    }
  };

  // Active session banner
  if (viewAsUser && impersonationSession) {
    const canEdit = impersonationSession.status === 'edit_approved';
    const bannerColor = canEdit
      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
    const iconColor = canEdit ? 'text-green-500' : 'text-blue-500';
    const textColor = canEdit ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300';
    const labelColor = canEdit ? 'text-green-500' : 'text-blue-500';

    return (
      <div className="relative" ref={dropdownRef}>
        <div className={`flex items-center gap-2 px-3 py-1.5 ${bannerColor} border rounded-lg`}>
          {canEdit ? (
            <Edit3 className={`w-4 h-4 ${iconColor}`} />
          ) : (
            <Eye className={`w-4 h-4 ${iconColor}`} />
          )}
          <div className="text-left">
            <div className={`text-[10px] font-semibold uppercase tracking-wide leading-none ${labelColor}`}>
              {canEdit ? 'Editing As' : 'Viewing'}
            </div>
            <div className={`text-sm font-bold ${textColor} leading-tight max-w-[140px] truncate`}>
              {viewAsUser.name}
            </div>
          </div>
          {statusBadge()}

          {/* Request Edit button — only show when viewing and not already requested */}
          {impersonationSession.status === 'viewing' && !confirmingEdit && (
            <button
              onClick={() => setConfirmingEdit(true)}
              className="ml-1 px-2 py-1 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded transition-colors"
              title="Request permission to send messages and save playbooks as this user"
            >
              Request Edit
            </button>
          )}
          {/* Confirm dialog for Request Edit */}
          {confirmingEdit && !requestingEdit && (
            <div className="ml-1 flex items-center gap-1">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">Send request?</span>
              <button
                onClick={() => { setConfirmingEdit(false); handleRequestEdit(); }}
                className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingEdit(false)}
                className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
              >
                No
              </button>
            </div>
          )}
          {requestingEdit && (
            <div className="ml-1">
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
            </div>
          )}

          {/* End session button */}
          <button
            onClick={handleEndSession}
            disabled={endingSession}
            className="ml-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="End impersonation session"
          >
            {endingSession ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Default: selector button
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg transition-all shadow-sm hover:shadow-md hover:border-gray-400"
      >
        <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <div className="text-left">
          <div className="text-[10px] font-semibold uppercase tracking-wide leading-none text-gray-500 dark:text-gray-400">
            View As
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            User
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">View As User</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Select a user to view their data. Edit requires their approval.</p>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {u.first_name || u.last_name
                        ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                        : u.email}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleColor(u.role)}`}>
                    {u.role}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-gray-500">View-only by default. Request edit access after selecting.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
