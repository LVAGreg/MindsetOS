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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <Users className="w-6 h-6 text-indigo-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{managedUsers.length} member{managedUsers.length !== 1 ? 's' : ''} · {pendingInvites.length} pending</p>
              </div>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Invite a Team Member</h2>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="colleague@company.com"
                  className="w-full max-w-md px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Access (optional — blank = all agents)</label>
                <div className="flex flex-wrap gap-2">
                  {agents.slice(0, 14).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => toggleInviteAgent(agent.id)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        inviteAgents.includes(agent.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleInvite} disabled={!inviteEmail.includes('@') || sending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {sending ? 'Sending...' : 'Send Invite'}
                </button>
                <button onClick={() => { setShowInvite(false); setError(null); setInviteEmail(''); setInviteAgents([]); }} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Invites ({pendingInvites.length})
            </h2>
            <div className="space-y-2">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex items-center gap-4 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{invite.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(invite.inviteCode)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors"
                      title="Copy invite code"
                    >
                      {copiedCode === invite.inviteCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      <span className="font-mono">{invite.inviteCode}</span>
                    </button>
                    <button onClick={() => handleRevokeInvite(invite.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors" title="Revoke invite">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            Team Members ({managedUsers.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading team...</div>
          ) : managedUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No team members yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Invite someone to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {managedUsers.map(mu => (
                <div key={mu.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* User row */}
                  <div className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {(mu.firstName?.[0] || mu.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mu.firstName || mu.lastName ? `${mu.firstName || ''} ${mu.lastName || ''}`.trim() : mu.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{mu.email}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{mu.conversationCount}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      mu.role === 'agency' ? 'text-indigo-600 bg-indigo-50' :
                      mu.role === 'power_user' ? 'text-purple-600 bg-purple-50' :
                      mu.role === 'admin' ? 'text-red-600 bg-red-50' :
                      'text-gray-600 bg-gray-50'
                    }`}>{mu.role}</span>
                    <button onClick={() => setExpandedUser(expandedUser === mu.userId ? null : mu.userId)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                      {expandedUser === mu.userId ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button onClick={() => handleRemoveUser(mu.userId)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Remove from team">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  {/* Expanded agent toggles */}
                  {expandedUser === mu.userId && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Agent Access {mu.allowedAgents.length === 0 ? '(all agents)' : `(${mu.allowedAgents.length} selected)`}</p>
                      <div className="flex flex-wrap gap-2">
                        {agents.slice(0, 14).map(agent => {
                          const allowed = mu.allowedAgents.length === 0 || mu.allowedAgents.includes(agent.id);
                          return (
                            <button
                              key={agent.id}
                              onClick={() => handleToggleUserAgent(mu.userId, agent.id, mu.allowedAgents)}
                              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                allowed
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                              }`}
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
