'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, CustomAgent } from '@/lib/store';
import {
  ArrowLeft,
  Plus,
  Wand2,
  Pencil,
  Trash2,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Settings2,
} from 'lucide-react';

const ICON_OPTIONS = [
  'Wand2', 'Target', 'Lightbulb', 'BookOpen', 'Megaphone', 'Users',
  'TrendingUp', 'Shield', 'Heart', 'Briefcase', 'Code', 'Palette',
  'MessageSquare', 'FileText', 'Zap',
];

const COLOR_OPTIONS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1',
];

const STEPS = ['Basics', 'Persona & Prompt', 'Starters & Settings'];

interface AgentForm {
  name: string;
  description: string;
  category: string;
  systemPrompt: string;
  icon: string;
  color: string;
  conversationStarters: string[];
  visibility: string;
}

const emptyForm: AgentForm = {
  name: '',
  description: '',
  category: 'custom',
  systemPrompt: '',
  icon: 'Wand2',
  color: '#8b5cf6',
  conversationStarters: [''],
  visibility: 'private',
};

export default function MyAgentsPage() {
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const customAgents = useAppStore(s => s.customAgents);
  const fetchCustomAgents = useAppStore(s => s.fetchCustomAgents);
  const createCustomAgent = useAppStore(s => s.createCustomAgent);
  const updateCustomAgent = useAppStore(s => s.updateCustomAgent);
  const deleteCustomAgent = useAppStore(s => s.deleteCustomAgent);
  const theme = useAppStore(s => s.theme);

  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual create flow
  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [form, setForm] = useState<AgentForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit form (reuse same shape)
  const [editForm, setEditForm] = useState<AgentForm>({ ...emptyForm });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user && user.role !== 'agency' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchCustomAgents().finally(() => setLoading(false));
  }, [fetchCustomAgents]);

  const handleEdit = (agent: CustomAgent) => {
    setEditingId(agent.id);
    setEditForm({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      category: agent.category,
      color: agent.color,
      icon: agent.metadata?.icon || 'Wand2',
      conversationStarters: agent.metadata?.conversation_starters || ["Let's GO!"],
      visibility: agent.visibility || 'private',
    });
  };

  const handleSave = async () => {
    if (!editingId || !editForm.name || !editForm.systemPrompt) return;
    setSaving(true);
    try {
      await updateCustomAgent(editingId, {
        name: editForm.name,
        description: editForm.description,
        systemPrompt: editForm.systemPrompt,
        category: editForm.category,
        color: editForm.color,
        icon: editForm.icon,
        conversationStarters: editForm.conversationStarters.filter(s => s.trim()),
      } as any);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      await deleteCustomAgent(agentId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  const handleToggleActive = async (agent: CustomAgent) => {
    try {
      await updateCustomAgent(agent.id, { isActive: !agent.isActive } as any);
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const handleManualCreate = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createCustomAgent({
        name: form.name.trim(),
        description: form.description.trim(),
        systemPrompt: form.systemPrompt.trim(),
        category: form.category || 'custom',
        color: form.color,
        conversationStarters: form.conversationStarters.filter(s => s.trim()),
        icon: form.icon,
        visibility: form.visibility,
      });
      setShowCreate(false);
      setForm({ ...emptyForm });
      setCreateStep(0);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  if (!user || (user.role !== 'agency' && user.role !== 'admin')) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-500" />
                  My Agents
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {customAgents.length} custom agent{customAgents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreatePicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : customAgents.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <Wand2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No custom agents yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Build agents that follow your frameworks, speak in your style, and serve your clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard?agent=agent-creator')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Create with AI Guide
              </button>
              <button
                onClick={() => { setShowCreate(true); setCreateStep(0); setForm({ ...emptyForm }); }}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-500 rounded-xl font-medium transition-colors"
              >
                <Settings2 className="w-5 h-5" />
                Create Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {customAgents.map((agent) => (
              <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: agent.color || '#8b5cf6' }}
                    >
                      <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {agent.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          agent.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {agent.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {agent.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {agent.conversationCount} conversations
                        </span>
                        <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggleActive(agent)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title={agent.isActive ? 'Deactivate' : 'Activate'}>
                        {agent.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button onClick={() => router.push(`/dashboard?agent=${agent.id}`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Test agent">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                      </button>
                      <button onClick={() => handleEdit(agent)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-5 h-5 text-gray-500" />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View prompt">
                        {expandedId === agent.id ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                      </button>
                      <button onClick={() => setDeleteConfirmId(agent.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {expandedId === agent.id && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">System Prompt</h4>
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">{agent.systemPrompt}</pre>
                    </div>
                  )}
                  {deleteConfirmId === agent.id && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">Delete <strong>{agent.name}</strong>?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(agent.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Method Picker */}
      {showCreatePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreatePicker(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create a Custom Agent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose how you want to build it</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => { setShowCreatePicker(false); router.push('/dashboard?agent=agent-creator'); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">AI-Guided Setup</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Have a conversation — the Agent Creator walks you through it step by step
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </button>
              <button
                onClick={() => { setShowCreatePicker(false); setShowCreate(true); setCreateStep(0); setForm({ ...emptyForm }); }}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-500 flex items-center justify-center flex-shrink-0">
                  <Settings2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">Manual Setup</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Fill out the form yourself — name, prompt, starters, and go
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Modal — ChatGPT-style multi-step */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header with steps */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Agent</h2>
                <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setCreateStep(0); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {/* Step indicator */}
              <div className="flex gap-2">
                {STEPS.map((step, idx) => (
                  <button
                    key={step}
                    onClick={() => setCreateStep(idx)}
                    className={`flex-1 text-center py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      idx === createStep
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : idx < createStep
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {idx < createStep ? '✓ ' : ''}{step}
                  </button>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto p-6">
              {createStep === 0 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Calendar Clarity Coach"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      placeholder="What does this agent do? One or two sentences."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations, Sales, Marketing"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => setForm({ ...form, color: c })}
                          className={`w-9 h-9 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 dark:border-white scale-110 ring-2 ring-offset-2 ring-purple-400' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_OPTIONS.map(i => (
                        <button key={i} onClick={() => setForm({ ...form, icon: i })}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${form.icon === i ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      System Prompt *
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      This is the instruction set that defines your agent's behavior, personality, and process. Write it as "You are..."
                    </p>
                    <textarea
                      placeholder={`You are the [Agent Name], a [role/personality] that helps [audience] with [task].\n\nYour tone is [warm/direct/professional]. You follow this process:\n\n1. First, ask...\n2. Then, guide them through...\n3. Finally, deliver...`}
                      value={form.systemPrompt}
                      onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
                      rows={18}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono text-sm leading-relaxed"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">{form.systemPrompt.length} characters</span>
                      <span className="text-xs text-gray-400">~{Math.round(form.systemPrompt.length / 4)} tokens</span>
                    </div>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Conversation Starters
                    </label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                      Quick-start prompts users see when they open the agent
                    </p>
                    {form.conversationStarters.map((starter, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={starter}
                          onChange={e => {
                            const updated = [...form.conversationStarters];
                            updated[idx] = e.target.value;
                            setForm({ ...form, conversationStarters: updated });
                          }}
                          placeholder="e.g. Help me build my weekly plan"
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                        />
                        {form.conversationStarters.length > 1 && (
                          <button onClick={() => setForm({ ...form, conversationStarters: form.conversationStarters.filter((_, i) => i !== idx) })}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.conversationStarters.length < 5 && (
                      <button
                        onClick={() => setForm({ ...form, conversationStarters: [...form.conversationStarters, ''] })}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-1"
                      >
                        + Add another
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: form.color }}>
                          <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{form.name || 'Agent Name'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{form.category || 'custom'}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{form.description || 'No description yet'}</p>
                      <div className="flex flex-wrap gap-2">
                        {form.conversationStarters.filter(s => s.trim()).map((s, i) => (
                          <span key={i} className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {createError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                      {createError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
              <button
                onClick={() => createStep > 0 ? setCreateStep(createStep - 1) : (setShowCreate(false), setForm({ ...emptyForm }))}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                {createStep > 0 ? 'Back' : 'Cancel'}
              </button>
              {createStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={createStep === 0 && !form.name.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleManualCreate}
                  disabled={creating || !form.name.trim() || !form.systemPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Agent
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Agent</h2>
              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input type="text" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${editForm.color === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Prompt</label>
                <textarea value={editForm.systemPrompt} onChange={e => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                  rows={14} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conversation Starters</label>
                {editForm.conversationStarters.map((starter, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" value={starter} onChange={e => {
                      const updated = [...editForm.conversationStarters];
                      updated[idx] = e.target.value;
                      setEditForm({ ...editForm, conversationStarters: updated });
                    }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
                    <button onClick={() => setEditForm({ ...editForm, conversationStarters: editForm.conversationStarters.filter((_, i) => i !== idx) })}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
                <button onClick={() => setEditForm({ ...editForm, conversationStarters: [...editForm.conversationStarters, ''] })}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline">+ Add starter</button>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !editForm.name || !editForm.systemPrompt}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
