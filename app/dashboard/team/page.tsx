'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Mail, Trash2, ArrowLeft, Copy, Check, X,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Shield,
  Clock, UserCheck, MessageSquare, AlertCircle
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';

interface ManagedUser {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  userActive: boolean;
  allowedAgents: string[];
  isActive: boolean;
  conversationCount: number;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  inviteCode: string;
  allowedAgents: string[];
  expiresAt: string;
  createdAt: string;
}

interface AgentOption {
  id: string;
  name: string;
  description: string;
}

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAppStore();

  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAgents, setInviteAgents] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAgencyOrAdmin = user?.role === 'agency' || user?.role === 'admin';

  useEffect(() => {
    if (!isAgencyOrAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchTeam();
    fetchAgents();
  }, [isAgencyOrAdmin]);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/agency/team') as any;
      setManagedUsers(data.managedUsers || []);
      setPendingInvites(data.pendingInvites || []);
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await apiClient.get('/api/agents') as any;
      setAgents((data.agents || []).map((a: any) => ({ id: a.id, name: a.name, description: a.description })));
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.includes('@')) return;
    setSending(true);
    setError(null);
    try {
      const invite = await apiClient.post('/api/agency/invite', {
        email: inviteEmail,
        allowedAgents: inviteAgents.length > 0 ? inviteAgents : undefined,
      }) as any;
      setPendingInvites(prev => [invite, ...prev]);
      setInviteEmail('');
      setInviteAgents([]);
      setShowInvite(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await apiClient.delete(`/api/agency/invite/${inviteId}`);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Remove this user from your team? They will keep their account but lose managed access.')) return;
    try {
      await apiClient.delete(`/api/agency/team/${userId}`);
      setManagedUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (err) {
      console.error('Failed to remove user:', err);
    }
  };

  const handleToggleUserAgent = async (userId: string, agentId: string, currentAgents: string[]) => {
    const newAgents = currentAgents.includes(agentId)
      ? currentAgents.filter(a => a !== agentId)
      : [...currentAgents, agentId];

    // Optimistic update
    setManagedUsers(prev => prev.map(u => u.userId === userId ? { ...u, allowedAgents: newAgents } : u));

    try {
      await apiClient.patch(`/api/agency/team/${userId}`, { allowedAgents: newAgents });
    } catch (err) {
      // Revert
      setManagedUsers(prev => prev.map(u => u.userId === userId ? { ...u, allowedAgents: currentAgents } : u));
      console.error('Failed to update user agents:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleInviteAgent = (agentId: string) => {
    setInviteAgents(prev => prev.includes(agentId) ? prev.filter(a => a !== agentId) : [...prev, agentId]);
  };

  if (!isAgencyOrAdmin) return null;

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Header */}
      <div style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Users className="w-6 h-6" style={{ color: '#7b8ff8' }} />
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#ededf5' }}>Team Management</h1>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  {managedUsers.length} member{managedUsers.length !== 1 ? 's' : ''} · {pendingInvites.length} pending
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              <Mail className="w-4 h-4" />
              Invite Member
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Invite form */}
        {showInvite && (
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <h2 className="text-base font-bold mb-4" style={{ color: '#ededf5' }}>Invite a Team Member</h2>
            {error && (
              <div className="flex items-center gap-2 text-sm rounded-lg p-3 mb-4" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="colleague@company.com"
                  className="w-full max-w-md bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Agent Access (optional — blank = all agents)</label>
                <div className="flex flex-wrap gap-2">
                  {agents.slice(0, 14).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => toggleInviteAgent(agent.id)}
                      className="px-2.5 py-1 text-xs rounded-full transition-colors"
                      style={
                        inviteAgents.includes(agent.id)
                          ? { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30', color: '#9090a8' }
                      }
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.includes('@') || sending}
                  className="bg-[#4f6ef7] hover:bg-[#3d5ce0] disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
                >
                  {sending ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  onClick={() => { setShowInvite(false); setError(null); setInviteEmail(''); setInviteAgents([]); }}
                  className="px-4 py-2 text-sm rounded-xl transition-colors"
                  style={{ color: '#9090a8' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
              <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />
              Pending Invites ({pendingInvites.length})
            </h2>
            <div className="space-y-2">
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: '#ededf5' }}>{invite.email}</div>
                    <div className="text-xs" style={{ color: '#9090a8' }}>
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(invite.inviteCode)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #1e1e30', color: '#9090a8' }}
                      title="Copy invite code"
                    >
                      {copiedCode === invite.inviteCode ? <Check className="w-3 h-3" style={{ color: '#4ade80' }} /> : <Copy className="w-3 h-3" />}
                      <span className="font-mono">{invite.inviteCode}</span>
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: '#f87171' }}
                      title="Revoke invite"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }} className="p-6">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
            <UserCheck className="w-5 h-5" style={{ color: '#4ade80' }} />
            Team Members ({managedUsers.length})
          </h2>

          {loading ? (
            <div className="text-center py-8" style={{ color: '#9090a8' }}>Loading team...</div>
          ) : managedUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#2a2a42' }} />
              <p className="text-sm" style={{ color: '#9090a8' }}>No team members yet</p>
              <p className="text-xs mt-1" style={{ color: '#5a5a72' }}>Invite someone to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {managedUsers.map(mu => (
                <div key={mu.id} style={{ border: '1px solid #1e1e30', borderRadius: 12, overflow: 'hidden' }}>
                  {/* User row */}
                  <div className="flex items-center gap-4 p-3 transition-colors" style={{ cursor: 'default' }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'rgba(79,110,247,0.2)', border: '1px solid rgba(79,110,247,0.3)', color: '#7b8ff8' }}
                    >
                      {(mu.firstName?.[0] || mu.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: '#ededf5' }}>
                        {mu.firstName || mu.lastName ? `${mu.firstName || ''} ${mu.lastName || ''}`.trim() : mu.email}
                      </div>
                      <div className="text-xs" style={{ color: '#9090a8' }}>{mu.email}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#9090a8' }}>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{mu.conversationCount}</span>
                    </div>
                    <span
                      className="text-[10px] font-bold"
                      style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}
                    >
                      {mu.role}
                    </span>
                    <button
                      onClick={() => setExpandedUser(expandedUser === mu.userId ? null : mu.userId)}
                      className="p-1 rounded transition-colors"
                      style={{ color: '#9090a8' }}
                    >
                      {expandedUser === mu.userId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRemoveUser(mu.userId)}
                      className="p-1 rounded transition-colors"
                      style={{ color: '#f87171' }}
                      title="Remove from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded agent toggles */}
                  {expandedUser === mu.userId && (
                    <div className="px-4 py-3" style={{ background: 'rgba(9,9,15,0.6)', borderTop: '1px solid #1e1e30' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: '#9090a8' }}>
                        Agent Access {mu.allowedAgents.length === 0 ? '(all agents)' : `(${mu.allowedAgents.length} selected)`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {agents.slice(0, 14).map(agent => {
                          const allowed = mu.allowedAgents.length === 0 || mu.allowedAgents.includes(agent.id);
                          return (
                            <button
                              key={agent.id}
                              onClick={() => handleToggleUserAgent(mu.userId, agent.id, mu.allowedAgents)}
                              className="px-2.5 py-1 text-xs rounded-full transition-colors"
                              style={
                                allowed
                                  ? { background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8' }
                                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30', color: '#5a5a72' }
                              }
                            >
                              {agent.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
