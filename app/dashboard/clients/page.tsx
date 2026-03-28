'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, Edit3, Archive, Check, X,
  MessageSquare, Brain, Palette, Search, ToggleLeft, ToggleRight,
  BookOpen, ArrowLeft
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import type { ClientProfile } from '@/lib/store';

const PROFILE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface AgentSetting {
  id: string;
  name: string;
  description: string;
  category: string;
  accentColor: string;
  color: string;
  isActive: boolean;
}

export default function ClientsPage() {
  const router = useRouter();
  const { user, clientProfiles, fetchClientProfiles, updateClientProfile, deleteClientProfile, setActiveClientProfile } = useAppStore();

  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [creating, setCreating] = useState(false);
  const [agentSettings, setAgentSettings] = useState<AgentSetting[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [savingAgents, setSavingAgents] = useState(false);
  const [search, setSearch] = useState('');

  const isAgencyOrAdmin = user?.role === 'agency' || user?.role === 'admin';

  useEffect(() => {
    if (!isAgencyOrAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchClientProfiles();
  }, [isAgencyOrAdmin]);

  // Fetch agent settings when a client is selected
  useEffect(() => {
    if (selectedClient) {
      setLoadingAgents(true);
      apiClient.get(`/api/client-profiles/${selectedClient.id}/agents`)
        .then((data: any) => setAgentSettings(data.agents || []))
        .catch(err => console.error('Failed to fetch agent settings:', err))
        .finally(() => setLoadingAgents(false));
    }
  }, [selectedClient?.id]);

  const handleSelectClient = (client: ClientProfile) => {
    setSelectedClient(client);
    setEditMode(false);
    setEditName(client.clientName);
    setEditIndustry(client.industry || '');
    setEditDescription(client.description || '');
    setEditColor(client.color || '#3b82f6');
  };

  const handleSaveEdit = async () => {
    if (!selectedClient || !editName.trim()) return;
    setSaving(true);
    try {
      await updateClientProfile(selectedClient.id, {
        clientName: editName.trim(),
        industry: editIndustry.trim() || null,
        description: editDescription.trim() || null,
        color: editColor,
      });
      await fetchClientProfiles();
      // Update selected client with new values
      setSelectedClient(prev => prev ? { ...prev, clientName: editName.trim(), industry: editIndustry.trim() || null, description: editDescription.trim() || null, color: editColor } : null);
      setEditMode(false);
    } catch (err) {
      console.error('Failed to update client:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (client: ClientProfile) => {
    if (!confirm(`Archive "${client.clientName}"? Their data will be preserved but the profile will be hidden.`)) return;
    try {
      await deleteClientProfile(client.id);
      if (selectedClient?.id === client.id) setSelectedClient(null);
    } catch (err) {
      console.error('Failed to archive client:', err);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const colorIdx = clientProfiles.length % PROFILE_COLORS.length;
      const { createClientProfile } = useAppStore.getState();
      const profile = await createClientProfile({
        clientName: newName.trim(),
        industry: newIndustry.trim() || undefined,
        color: PROFILE_COLORS[colorIdx],
      });
      setNewName('');
      setNewIndustry('');
      setShowCreate(false);
      await fetchClientProfiles();
      handleSelectClient(profile);
    } catch (err) {
      console.error('Failed to create client:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAgent = async (agentId: string, currentActive: boolean) => {
    if (!selectedClient) return;
    // Optimistic update
    setAgentSettings(prev => prev.map(a => a.id === agentId ? { ...a, isActive: !currentActive } : a));

    setSavingAgents(true);
    try {
      await apiClient.put(`/api/client-profiles/${selectedClient.id}/agents`, {
        agents: [{ id: agentId, isActive: !currentActive }]
      });
    } catch (err) {
      // Revert on failure
      setAgentSettings(prev => prev.map(a => a.id === agentId ? { ...a, isActive: currentActive } : a));
      console.error('Failed to toggle agent:', err);
    } finally {
      setSavingAgents(false);
    }
  };

  const handleSetActiveAndGo = (client: ClientProfile) => {
    setActiveClientProfile(client.id);
    router.push('/dashboard');
  };

  const filteredClients = clientProfiles.filter(cp => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cp.clientName.toLowerCase().includes(q) || (cp.industry || '').toLowerCase().includes(q);
  });

  if (!isAgencyOrAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <Building2 className="w-6 h-6 text-indigo-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Client Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{clientProfiles.length} client{clientProfiles.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left panel - client list */}
          <div className="w-80 flex-shrink-0">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Client list */}
            <div className="space-y-2">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    selectedClient?.id === client.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: client.color || '#3b82f6' }}>
                    {client.clientName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{client.clientName}</div>
                    {client.industry && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.industry}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-[10px] text-gray-400">
                    <span>{client.conversationCount}c</span>
                    <span>{client.memoryCount}m</span>
                  </div>
                </button>
              ))}

              {filteredClients.length === 0 && !showCreate && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No clients yet</p>
                  <button onClick={() => setShowCreate(true)} className="text-sm text-indigo-500 hover:text-indigo-600 mt-1">Add your first client</button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - detail/edit */}
          <div className="flex-1 min-w-0">
            {showCreate ? (
              /* Create form */
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Client</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. Acme Corp" className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                    <input type="text" value={newIndustry} onChange={e => setNewIndustry(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. SaaS, Healthcare, Finance" className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCreate} disabled={!newName.trim() || creating} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">{creating ? 'Creating...' : 'Create Client'}</button>
                    <button onClick={() => { setShowCreate(false); setNewName(''); setNewIndustry(''); }} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            ) : selectedClient ? (
              /* Client detail */
              <div className="space-y-6">
                {/* Client info card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: editMode ? editColor : (selectedClient.color || '#3b82f6') }}>
                        {(editMode ? editName : selectedClient.clientName)[0]?.toUpperCase()}
                      </div>
                      <div>
                        {editMode ? (
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none" autoFocus />
                        ) : (
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedClient.clientName}</h2>
                        )}
                        {editMode ? (
                          <input type="text" value={editIndustry} onChange={e => setEditIndustry(e.target.value)} placeholder="Industry..." className="text-sm text-gray-500 dark:text-gray-400 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none mt-1 w-full" />
                        ) : (
                          selectedClient.industry && <p className="text-sm text-gray-500 dark:text-gray-400">{selectedClient.industry}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editMode ? (
                        <>
                          <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditMode(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleSetActiveAndGo(selectedClient)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                            <MessageSquare className="w-4 h-4" /> Open
                          </button>
                          <button onClick={() => setEditMode(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => handleArchive(selectedClient)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Archive">
                            <Archive className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit description + color */}
                  {editMode && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} placeholder="Notes about this client..." className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                        <div className="flex gap-2">
                          {PROFILE_COLORS.map(c => (
                            <button key={c} onClick={() => setEditColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${editColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  {!editMode && (
                    <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>{selectedClient.conversationCount} conversations</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Brain className="w-4 h-4" />
                        <span>{selectedClient.memoryCount} memories</span>
                      </div>
                    </div>
                  )}

                  {/* Description display */}
                  {!editMode && selectedClient.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{selectedClient.description}</p>
                  )}
                </div>

                {/* Agent Activation */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      Agent Access
                    </h3>
                    {savingAgents && <span className="text-xs text-gray-400">Saving...</span>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Toggle which agents are available when working in this client&#39;s context.</p>

                  {loadingAgents ? (
                    <div className="text-center py-8 text-gray-400">Loading agents...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {agentSettings.map(agent => (
                        <div key={agent.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${agent.isActive ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60'}`}>
                          <button onClick={() => handleToggleAgent(agent.id, agent.isActive)} className="flex-shrink-0">
                            {agent.isActive ? (
                              <ToggleRight className="w-6 h-6 text-indigo-500" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{agent.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{agent.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Select a client to view details</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
