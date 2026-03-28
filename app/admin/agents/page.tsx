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

      // Reload agents
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

      // Reset form and close modal
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

      // Reload agents
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
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  // Filter and sort agents
  const filteredAgents = agents
    .filter(agent => {
      // Status filter
      if (filterStatus === 'active' && !agent.is_active) return false;
      if (filterStatus === 'inactive' && agent.is_active) return false;

      // Search filter
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
      // Sort by sort_order first, then by name
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      {/* Action Feedback */}
      {actionMsg && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          actionMsg.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        }`}>
          <span className="text-sm font-medium">{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="ml-4 text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}
      <div>
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MindsetOS Agent Management</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage database-stored agent prompts and configurations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-black rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Agent
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-yellow-600 text-black'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({agents.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({agents.filter(a => a.is_active).length})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
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
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {agent.sort_order}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.description}</div>
                      <div className="text-xs text-gray-400 mt-1">{agent.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
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
                      <span className="text-xs font-mono text-gray-500">
                        {agent.color || agent.accent_color || '#3B82F6'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-mono text-gray-600">
                      <div>Chat: {agent.chat_model || agent.model_preference || 'Not set'}</div>
                      {agent.memory_model && agent.memory_model !== agent.chat_model && (
                        <div className="text-gray-400">Mem: {agent.memory_model}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    <div>tokens: {agent.max_tokens}</div>
                    <div>temp: {agent.temperature}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(agent.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-3 justify-end">
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => toggleActive(agent.id, agent.is_active)}
                        className={`font-medium ${
                          agent.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
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
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'No agents match your filters'
                : 'No agents found'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Agents will appear here when added to the database'}
            </p>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About MindsetOS Agent System</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>✅ <strong>Database-Driven</strong>: Edit agents without redeploying code</p>
            <p>✅ <strong>Live Updates</strong>: Changes take effect immediately after saving</p>
            <p>✅ <strong>Model Configuration</strong>: Choose AI model per agent</p>
            <p>✅ <strong>Cross-Agent Memory</strong>: Agents share user context and memories</p>
            <p>✅ <strong>Greg's Voice</strong>: All agents use warm, conversational expert tone</p>
          </div>
        </div>

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Agent</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Agent ID * <span className="text-xs text-gray-500">(lowercase-with-dashes)</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.id}
                      onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="my-custom-agent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="My Custom Agent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                      placeholder="Custom Category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tier
                    </label>
                    <input
                      type="number"
                      value={createForm.tier}
                      onChange={(e) => setCreateForm({ ...createForm, tier: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                    placeholder="Brief description of what this agent does"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Prompt *
                  </label>
                  <textarea
                    value={createForm.system_prompt}
                    onChange={(e) => setCreateForm({ ...createForm, system_prompt: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                    placeholder="Enter the system prompt that defines this agent's behavior..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={createForm.max_tokens}
                      onChange={(e) => setCreateForm({ ...createForm, max_tokens: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Temperature
                    </label>
                    <input
                      type="text"
                      value={createForm.temperature}
                      onChange={(e) => setCreateForm({ ...createForm, temperature: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Active
                    </label>
                    <div className="flex items-center h-[42px]">
                      <input
                        type="checkbox"
                        checked={createForm.is_active}
                        onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={createAgent}
                  className="px-4 py-2 bg-yellow-600 text-black rounded-lg hover:bg-yellow-700"
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
