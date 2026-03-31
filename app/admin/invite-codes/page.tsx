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
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: 'rgba(144,144,168,0.15)', color: '#9090a8' }}>
          Disabled
        </span>
      );
    }
    if (isExpired(code.expires_at)) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
          Expired
        </span>
      );
    }
    if (isExhausted(code)) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>
          Maxed Out
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
        Active
      </span>
    );
  };

  const activeCount = inviteCodes.filter(c => c.is_active && !isExpired(c.expires_at) && !isExhausted(c)).length;
  const totalUses = inviteCodes.reduce((sum, c) => sum + c.uses_count, 0);

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Invite Codes</h1>
          <p className="mt-1" style={{ color: '#9090a8' }}>
            Manage registration access with invite codes
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchInviteCodes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-medium"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Code
          </button>
        </div>
      </div>

      {/* Inline Status Banner */}
      {statusMsg && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
          style={
            statusMsg.type === 'success'
              ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
              : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }
          }
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {statusMsg.text}
          </div>
          <button onClick={() => setStatusMsg(null)} className="hover:opacity-70" style={{ color: 'inherit' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Ticket className="w-5 h-5" style={{ color: '#7b8ff8' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Codes</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{inviteCodes.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <Check className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Active Codes</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <Users className="w-5 h-5" style={{ color: '#c084fc' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Signups</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{totalUses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-md w-full p-6" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#ededf5' }}>Create Invite Code</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Code (optional - auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., EXPERT2025"
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  placeholder="e.g., Launch event attendees"
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCode.max_uses}
                    onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Assigned Role
                  </label>
                  <select
                    value={newCode.assigned_role}
                    onChange={(e) => setNewCode({ ...newCode, assigned_role: e.target.value })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  >
                    <option value="user">User</option>
                    <option value="power_user">Power User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={createInviteCode}
                disabled={saving === 'create'}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
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
      <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}>
          <h2 className="font-semibold" style={{ color: '#ededf5' }}>All Invite Codes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#fcc824' }} />
          </div>
        ) : inviteCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9090a8' }}>
            <Ticket className="w-12 h-12 mb-3 opacity-30" />
            <p>No invite codes yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-3 text-sm hover:opacity-80 transition-opacity"
              style={{ color: '#fcc824' }}
            >
              Create your first invite code
            </button>
          </div>
        ) : (
          <div>
            {inviteCodes.map((inviteCode) => (
              <div
                key={inviteCode.id}
                className="p-4 transition-colors"
                style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <code
                        className="text-lg font-mono font-bold"
                        style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8', fontFamily: 'monospace', padding: '3px 10px', borderRadius: 6 }}
                      >
                        {inviteCode.code}
                      </code>
                      {getStatusBadge(inviteCode)}
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded"
                        style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8' }}
                      >
                        {inviteCode.assigned_role}
                      </span>
                    </div>

                    {inviteCode.description && (
                      <p className="text-sm mb-2" style={{ color: '#9090a8' }}>
                        {inviteCode.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: '#9090a8' }}>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {inviteCode.uses_count} / {inviteCode.max_uses === null ? '∞' : inviteCode.max_uses} uses
                      </span>
                      {inviteCode.expires_at && (
                        <span
                          className="flex items-center gap-1"
                          style={{ color: isExpired(inviteCode.expires_at) ? '#f87171' : '#9090a8' }}
                        >
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
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#9090a8' }}
                      title="Copy code"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {copiedCode === inviteCode.code ? (
                        <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => copyToClipboard(inviteCode.code)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#9090a8' }}
                      title="Copy registration link"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleActive(inviteCode)}
                      disabled={saving === inviteCode.id}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                      style={{ background: inviteCode.is_active ? '#22c55e' : '#1e1e30' }}
                    >
                      {saving === inviteCode.id ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className="inline-block h-4 w-4 transform rounded-full shadow transition-transform"
                          style={{
                            background: '#ededf5',
                            transform: inviteCode.is_active ? 'translateX(24px)' : 'translateX(4px)',
                          }}
                        />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteInviteCode(inviteCode)}
                      disabled={saving === inviteCode.id}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#f87171' }}
                      title="Delete code"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.2)', borderRadius: 16 }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
        <div className="text-sm" style={{ color: '#ededf5' }}>
          <p className="font-medium mb-1" style={{ color: '#fcc824' }}>Invite Code Tips</p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#9090a8' }}>
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
