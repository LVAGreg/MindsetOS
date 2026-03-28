'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertCircle,
  Users,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface InviteCode {
  id: string;
  code: string;
  description: string | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  assigned_role: string;
  created_at: string;
  created_by_email: string | null;
  created_by_name: string | null;
}

export default function AdminInviteCodesPage() {
  const user = useAppStore((state) => state.user);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    max_uses: 1,
    expires_at: '',
    assigned_role: 'user',
  });

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getInviteCodes();
      setInviteCodes(data.inviteCodes || []);
    } catch (error) {
      console.error('Failed to fetch invite codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInviteCode = async () => {
    try {
      setSaving('create');
      const data = await apiClient.createInviteCode({
        code: newCode.code || undefined,
        description: newCode.description || undefined,
        max_uses: newCode.max_uses || 1,
        expires_at: newCode.expires_at || null,
        assigned_role: newCode.assigned_role,
        created_by: user?.id,
      });
      setInviteCodes([data.inviteCode, ...inviteCodes]);
      setShowCreateForm(false);
      setNewCode({ code: '', description: '', max_uses: 1, expires_at: '', assigned_role: 'user' });
    } catch (error: any) {
      console.error('Failed to create invite code:', error);
      showStatus('error', error.response?.data?.error || 'Failed to create invite code');
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (inviteCode: InviteCode) => {
    try {
      setSaving(inviteCode.id);
      await apiClient.updateInviteCode(inviteCode.id, { is_active: !inviteCode.is_active });
      setInviteCodes(inviteCodes.map(c =>
        c.id === inviteCode.id ? { ...c, is_active: !c.is_active } : c
      ));
    } catch (error) {
      console.error('Failed to update invite code:', error);
      showStatus('error', 'Failed to update invite code');
    } finally {
      setSaving(null);
    }
  };

  const deleteInviteCode = async (inviteCode: InviteCode) => {
    if (!confirm(`Are you sure you want to delete invite code "${inviteCode.code}"?`)) return;

    try {
      setSaving(inviteCode.id);
      await apiClient.deleteInviteCode(inviteCode.id);
      setInviteCodes(inviteCodes.filter(c => c.id !== inviteCode.id));
    } catch (error) {
      console.error('Failed to delete invite code:', error);
      showStatus('error', 'Failed to delete invite code');
    } finally {
      setSaving(null);
    }
  };

  const copyToClipboard = async (code: string) => {
    const registerUrl = `${window.location.origin}/register?code=${code}`;
    await navigator.clipboard.writeText(registerUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyCodeOnly = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isExhausted = (code: InviteCode) => {
    if (code.max_uses === null) return false;
    return code.uses_count >= code.max_uses;
  };

  const getStatusBadge = (code: InviteCode) => {
    if (!code.is_active) {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Disabled</span>;
    }
    if (isExpired(code.expires_at)) {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Expired</span>;
    }
    if (isExhausted(code)) {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Maxed Out</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">Active</span>;
  };

  const activeCount = inviteCodes.filter(c => c.is_active && !isExpired(c.expires_at) && !isExhausted(c)).length;
  const totalUses = inviteCodes.reduce((sum, c) => sum + c.uses_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Codes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage registration access with invite codes
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchInviteCodes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-black rounded-lg transition-colors"
            style={{ backgroundColor: '#fcc824' }}
          >
            <Plus className="w-4 h-4" />
            Create Code
          </button>
        </div>
      </div>

      {/* Inline Status Banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            statusMsg.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {statusMsg.text}
          </div>
          <button onClick={() => setStatusMsg(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Codes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{inviteCodes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Codes</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Signups</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Invite Code</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code (optional - auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., EXPERT2025"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  placeholder="e.g., Launch event attendees"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={newCode.assigned_role}
                    onChange={(e) => setNewCode({ ...newCode, assigned_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="user">User</option>
                    <option value="power_user">Power User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createInviteCode}
                disabled={saving === 'create'}
                className="flex items-center gap-2 px-4 py-2 text-black rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#fcc824' }}
              >
                {saving === 'create' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Code'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Codes List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Invite Codes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-yellow-500 animate-spin" />
          </div>
        ) : inviteCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Ticket className="w-12 h-12 mb-3 opacity-30" />
            <p>No invite codes yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-3 text-sm hover:opacity-80"
              style={{ color: '#fcc824' }}
            >
              Create your first invite code
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {inviteCodes.map((inviteCode) => (
              <div key={inviteCode.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {inviteCode.code}
                      </code>
                      {getStatusBadge(inviteCode)}
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {inviteCode.assigned_role}
                      </span>
                    </div>

                    {inviteCode.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {inviteCode.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {inviteCode.uses_count} / {inviteCode.max_uses === null ? '∞' : inviteCode.max_uses} uses
                      </span>
                      {inviteCode.expires_at && (
                        <span className={`flex items-center gap-1 ${isExpired(inviteCode.expires_at) ? 'text-red-500' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          Expires: {new Date(inviteCode.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      {inviteCode.created_by_email && (
                        <span>
                          Created by: {inviteCode.created_by_name || inviteCode.created_by_email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Copy Code Button */}
                    <button
                      onClick={() => copyCodeOnly(inviteCode.code)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy code"
                    >
                      {copiedCode === inviteCode.code ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => copyToClipboard(inviteCode.code)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy registration link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleActive(inviteCode)}
                      disabled={saving === inviteCode.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                        inviteCode.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {saving === inviteCode.id ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            inviteCode.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteInviteCode(inviteCode)}
                      disabled={saving === inviteCode.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">Invite Code Tips</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
            <li>Share the registration link (with code) for easy signup: {typeof window !== 'undefined' ? window.location.origin : ''}/register?code=CODE</li>
            <li>Set max uses to control how many people can use each code</li>
            <li>Assign roles to automatically give users specific permissions</li>
            <li>Use expiration dates for time-limited offers or events</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
