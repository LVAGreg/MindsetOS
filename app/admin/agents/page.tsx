'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { API_URL } from '@/lib/api-client';

interface Agent {
  id: string;
  name: string;
  tier: number;
  category: string;
  description: string;
  system_prompt: string;
  model_preference: string | null;
  chat_model: string | null;
  memory_model: string | null;
  widget_model: string | null;
  max_tokens: number;
  temperature: string;
  is_active: boolean;
  accent_color?: string;
  color?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AgentsAdminPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    tier: 1,
    category: '',
    description: '',
    system_prompt: '',
    model_preference: 'anthropic/claude-sonnet-4.6',
    max_tokens: 2000,
    temperature: '0.7',
    is_active: true
  });

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to load agents: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Loaded agents:', data);
      setAgents(data.agents);
    } catch (err: any) {
      console.error('❌ Load agents error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(agentId: string, currentlyActive: boolean) {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentlyActive })
      });

      if (!res.ok) throw new Error(`Failed to toggle agent status`);

      await loadAgents();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
      setTimeout(() => setActionMsg(null), 4000);
    }
  }

  async function createAgent() {
    try {
      if (!createForm.id || !createForm.name || !createForm.category || !createForm.description || !createForm.system_prompt) {
        setActionMsg({ type: 'error', text: 'Please fill in all required fields' });
        setTimeout(() => setActionMsg(null), 4000);
        return;
      }

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      setCreateForm({
        id: '',
        name: '',
        tier: 1,
        category: '',
        description: '',
        system_prompt: '',
        model_preference: 'anthropic/claude-sonnet-4.6',
        max_tokens: 2000,
        temperature: '0.7',
        is_active: true
      });
      setShowCreateModal(false);

      await loadAgents();
      setActionMsg({ type: 'success', text: 'Agent created successfully!' });
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
      setTimeout(() => setActionMsg(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-lg" style={{ color: '#9090a8' }}>Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-lg text-[#fca5a5]">Error: {error}</div>
      </div>
    );
  }

  const filteredAgents = agents
    .filter(agent => {
      if (filterStatus === 'active' && !agent.is_active) return false;
      if (filterStatus === 'inactive' && agent.is_active) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          agent.name.toLowerCase().includes(search) ||
          agent.id.toLowerCase().includes(search) ||
          agent.description.toLowerCase().includes(search) ||
          agent.category.toLowerCase().includes(search)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      {/* Action Feedback */}
      {actionMsg && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            background: actionMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: actionMsg.type === 'error' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: actionMsg.type === 'error' ? '#f87171' : '#4ade80' }}>
            {actionMsg.text}
          </span>
          <button onClick={() => setActionMsg(null)} style={{ color: '#9090a8' }}>&times;</button>
        </div>
      )}
      <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>MindsetOS Agent Management</h1>
            <p className="mt-2 text-sm" style={{ color: '#9090a8' }}>
              Manage database-stored agent prompts and configurations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Agent
            </button>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#ededf5' }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={filterStatus === 'all'
                  ? { background: '#4f6ef7', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#9090a8' }}
              >
                All ({agents.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={filterStatus === 'active'
                  ? { background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#9090a8' }}
              >
                Active ({agents.filter(a => a.is_active).length})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={filterStatus === 'inactive'
                  ? { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#9090a8' }}
              >
                Inactive ({agents.filter(a => !a.is_active).length})
              </button>
            </div>

            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Agents Table */}
        <div className="rounded-xl overflow-x-auto" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#9090a8' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => (
                <tr
                  key={agent.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #1e1e30' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,110,247,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#ededf5' }}>
                    {agent.sort_order}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#ededf5' }}>{agent.name}</div>
                      <div className="text-sm" style={{ color: '#9090a8' }}>{agent.description}</div>
                      <div className="text-xs mt-1 font-mono" style={{ color: '#9090a8' }}>{agent.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-lg"
                      style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8' }}
                    >
                      {agent.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md border-2"
                        style={{
                          backgroundColor: agent.color || agent.accent_color || '#3B82F6',
                          borderColor: agent.color || agent.accent_color || '#3B82F6',
                        }}
                        title={agent.color || agent.accent_color || '#3B82F6'}
                      />
                      <span className="text-xs font-mono" style={{ color: '#9090a8' }}>
                        {agent.color || agent.accent_color || '#3B82F6'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-mono" style={{ color: '#9090a8' }}>
                      <div>Chat: {agent.chat_model || agent.model_preference || 'Not set'}</div>
                      {agent.memory_model && agent.memory_model !== agent.chat_model && (
                        <div style={{ color: '#9090a8' }}>Mem: {agent.memory_model}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs" style={{ color: '#9090a8' }}>
                    <div>tokens: {agent.max_tokens}</div>
                    <div>temp: {agent.temperature}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.is_active ? (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-lg"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                      >
                        Active
                      </span>
                    ) : (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                      >
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#9090a8' }}>
                    {new Date(agent.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-3 justify-end">
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="font-medium transition-colors"
                        style={{ color: '#7b8ff8' }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleActive(agent.id, agent.is_active)}
                        className="font-medium transition-colors"
                        style={{ color: agent.is_active ? '#f87171' : '#4ade80' }}
                      >
                        {agent.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
            <p style={{ color: '#9090a8' }}>
              {searchTerm || filterStatus !== 'all'
                ? 'No agents match your filters'
                : 'No agents found'}
            </p>
            <p className="text-sm mt-2" style={{ color: '#9090a8' }}>
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Agents will appear here when added to the database'}
            </p>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 rounded-xl p-6" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>About MindsetOS Agent System</h3>
          <div className="text-sm space-y-2" style={{ color: '#9090a8' }}>
            <p>✅ <strong style={{ color: '#ededf5' }}>Database-Driven</strong>: Edit agents without redeploying code</p>
            <p>✅ <strong style={{ color: '#ededf5' }}>Live Updates</strong>: Changes take effect immediately after saving</p>
            <p>✅ <strong style={{ color: '#ededf5' }}>Model Configuration</strong>: Choose AI model per agent</p>
            <p>✅ <strong style={{ color: '#ededf5' }}>Cross-Agent Memory</strong>: Agents share user context and memories</p>
            <p>✅ <strong style={{ color: '#ededf5' }}>Greg's Voice</strong>: All agents use warm, conversational expert tone</p>
          </div>
        </div>

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#12121f', border: '1px solid #1e1e30' }}>
              <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
                <h2 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Create New Agent</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ color: '#9090a8' }}
                  className="hover:text-[#ededf5] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Agent ID * <span className="text-xs" style={{ color: '#9090a8' }}>(lowercase-with-dashes)</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.id}
                      onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="my-custom-agent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="My Custom Agent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Category *
                    </label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Custom Category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Tier
                    </label>
                    <input
                      type="number"
                      value={createForm.tier}
                      onChange={(e) => setCreateForm({ ...createForm, tier: parseInt(e.target.value) })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Description *
                  </label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    placeholder="Brief description of what this agent does"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    System Prompt *
                  </label>
                  <textarea
                    value={createForm.system_prompt}
                    onChange={(e) => setCreateForm({ ...createForm, system_prompt: e.target.value })}
                    rows={10}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    placeholder="Enter the system prompt that defines this agent's behavior..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={createForm.max_tokens}
                      onChange={(e) => setCreateForm({ ...createForm, max_tokens: parseInt(e.target.value) })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Temperature
                    </label>
                    <input
                      type="text"
                      value={createForm.temperature}
                      onChange={(e) => setCreateForm({ ...createForm, temperature: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Active
                    </label>
                    <div className="flex items-center h-[46px]">
                      <input
                        type="checkbox"
                        checked={createForm.is_active}
                        onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#4f6ef7' }}
                      />
                      <span className="ml-2 text-sm" style={{ color: '#9090a8' }}>Enabled</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6" style={{ borderTop: '1px solid #1e1e30' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#9090a8', border: '1px solid #1e1e30' }}
                >
                  Cancel
                </button>
                <button
                  onClick={createAgent}
                  className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
                >
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
