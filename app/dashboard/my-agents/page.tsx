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
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: '#9090a8' }} />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
                  <Wand2 className="w-5 h-5 text-[#8b5cf6]" />
                  My Agents
                </h1>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  {customAgents.length} custom agent{customAgents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreatePicker(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-sm bg-[#4f6ef7] hover:bg-[#3d5ce0]"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f6ef7]" />
          </div>
        ) : customAgents.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <Wand2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e1e30' }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#ededf5' }}>
              No custom agents yet
            </h2>
            <p className="mb-8 max-w-md mx-auto" style={{ color: '#9090a8' }}>
              Build agents that follow your frameworks, speak in your style, and serve your clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard?agent=agent-creator')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white rounded-xl font-semibold transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Create with AI Guide
              </button>
              <button
                onClick={() => { setShowCreate(true); setCreateStep(0); setForm({ ...emptyForm }); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors"
                style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                <Settings2 className="w-5 h-5" />
                Create Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {customAgents.map((agent) => (
              <div key={agent.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: (agent.color || '#8b5cf6') + '15',
                        border: '1px solid ' + (agent.color || '#8b5cf6') + '30',
                      }}
                    >
                      <Wand2 className="w-5 h-5" style={{ color: agent.color || '#8b5cf6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold truncate" style={{ color: '#ededf5' }}>
                          {agent.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          agent.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-white/5 text-[#9090a8]'
                        }`}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#4f6ef7]/10 text-[#7b8ff8]">
                          {agent.category}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: '#9090a8' }}>
                        {agent.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#9090a8' }}>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {agent.conversationCount} conversations
                        </span>
                        <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggleActive(agent)} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title={agent.isActive ? 'Deactivate' : 'Activate'}>
                        {agent.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" style={{ color: '#9090a8' }} />}
                      </button>
                      <button onClick={() => router.push(`/dashboard?agent=${agent.id}`)} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="Test agent">
                        <MessageSquare className="w-5 h-5 text-[#7b8ff8]" />
                      </button>
                      <button onClick={() => handleEdit(agent)} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-5 h-5" style={{ color: '#9090a8' }} />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title="View prompt">
                        {expandedId === agent.id ? <EyeOff className="w-5 h-5" style={{ color: '#9090a8' }} /> : <Eye className="w-5 h-5" style={{ color: '#9090a8' }} />}
                      </button>
                      <button onClick={() => setDeleteConfirmId(agent.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {expandedId === agent.id && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: '#09090f', border: '1px solid #1e1e30' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9090a8' }}>System Prompt</h4>
                      <pre className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto font-mono" style={{ color: '#ededf5' }}>{agent.systemPrompt}</pre>
                    </div>
                  )}
                  {deleteConfirmId === agent.id && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <p className="text-sm text-red-400 mb-3">Delete <strong>{agent.name}</strong>?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(agent.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-sm rounded-lg" style={{ color: '#9090a8' }}>Cancel</button>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreatePicker(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid #1e1e30' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Create a Custom Agent</h2>
              <p className="text-sm mt-1" style={{ color: '#9090a8' }}>Choose how you want to build it</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => { setShowCreatePicker(false); router.push('/dashboard?agent=agent-creator'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all group"
                style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.1), rgba(124,91,246,0.08))', border: '1px solid rgba(79,110,247,0.25)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#4f6ef7] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold" style={{ color: '#ededf5' }}>AI-Guided Setup</div>
                  <div className="text-sm" style={{ color: '#9090a8' }}>
                    Have a conversation — the Agent Creator walks you through it step by step
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#7b8ff8] group-hover:text-[#4f6ef7] transition-colors" />
              </button>
              <button
                onClick={() => { setShowCreatePicker(false); setShowCreate(true); setCreateStep(0); setForm({ ...emptyForm }); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all group hover:bg-white/5"
                style={{ border: '1px solid #1e1e30' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1e1e30' }}>
                  <Settings2 className="w-6 h-6" style={{ color: '#9090a8' }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold" style={{ color: '#ededf5' }}>Manual Setup</div>
                  <div className="text-sm" style={{ color: '#9090a8' }}>
                    Fill out the form yourself — name, prompt, starters, and go
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 transition-colors" style={{ color: '#9090a8' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Modal — ChatGPT-style multi-step */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            {/* Header with steps */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e1e30' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Create Agent</h2>
                <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setCreateStep(0); }} className="p-2 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5" style={{ color: '#9090a8' }} />
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
                        ? 'bg-[#4f6ef7]/15 text-[#7b8ff8]'
                        : idx < createStep
                        ? 'bg-green-500/10 text-green-400'
                        : 'text-[#9090a8]'
                    }`}
                    style={idx !== createStep && idx >= createStep ? { background: '#1e1e30' } : undefined}
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
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Agent Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Calendar Clarity Coach"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Description</label>
                    <textarea
                      placeholder="What does this agent do? One or two sentences."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations, Sales, Marketing"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => setForm({ ...form, color: c })}
                          className={`w-9 h-9 rounded-full border-2 transition-all ${form.color === c ? 'scale-110 ring-2 ring-offset-2 ring-[#4f6ef7]/60' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c, borderColor: form.color === c ? c : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {ICON_OPTIONS.map(i => (
                        <button key={i} onClick={() => setForm({ ...form, icon: i })}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            form.icon === i
                              ? 'bg-[#4f6ef7]/15 text-[#7b8ff8]'
                              : 'text-[#9090a8] hover:bg-white/5'
                          }`}
                          style={{ border: `1px solid ${form.icon === i ? 'rgba(79,110,247,0.4)' : '#1e1e30'}` }}
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
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      System Prompt *
                    </label>
                    <p className="text-xs mb-2" style={{ color: '#9090a8' }}>
                      This is the instruction set that defines your agent&apos;s behavior, personality, and process. Write it as &quot;You are...&quot;
                    </p>
                    <textarea
                      placeholder={`You are the [Agent Name], a [role/personality] that helps [audience] with [task].\n\nYour tone is [warm/direct/professional]. You follow this process:\n\n1. First, ask...\n2. Then, guide them through...\n3. Finally, deliver...`}
                      value={form.systemPrompt}
                      onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
                      rows={18}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 font-mono leading-relaxed"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs" style={{ color: '#9090a8' }}>{form.systemPrompt.length} characters</span>
                      <span className="text-xs" style={{ color: '#9090a8' }}>~{Math.round(form.systemPrompt.length / 4)} tokens</span>
                    </div>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                      Conversation Starters
                    </label>
                    <p className="text-xs mb-3" style={{ color: '#9090a8' }}>
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
                          className="flex-1 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                        />
                        {form.conversationStarters.length > 1 && (
                          <button onClick={() => setForm({ ...form, conversationStarters: form.conversationStarters.filter((_, i) => i !== idx) })}
                            className="p-2 hover:bg-red-500/10 rounded-lg">
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.conversationStarters.length < 5 && (
                      <button
                        onClick={() => setForm({ ...form, conversationStarters: [...form.conversationStarters, ''] })}
                        className="text-sm text-[#7b8ff8] hover:underline mt-1"
                      >
                        + Add another
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="pt-5" style={{ borderTop: '1px solid #1e1e30' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: '#9090a8' }}>Preview</h3>
                    <div className="rounded-xl p-4" style={{ background: '#09090f', border: '1px solid #1e1e30' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: form.color + '15', border: '1px solid ' + form.color + '30' }}>
                          <Wand2 className="w-5 h-5" style={{ color: form.color }} />
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: '#ededf5' }}>{form.name || 'Agent Name'}</div>
                          <div className="text-xs" style={{ color: '#9090a8' }}>{form.category || 'custom'}</div>
                        </div>
                      </div>
                      <p className="text-sm mb-3" style={{ color: '#9090a8' }}>{form.description || 'No description yet'}</p>
                      <div className="flex flex-wrap gap-2">
                        {form.conversationStarters.filter(s => s.trim()).map((s, i) => (
                          <span key={i} className="px-3 py-1 text-xs rounded-full" style={{ background: '#12121f', border: '1px solid #1e1e30', color: '#9090a8' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {createError && (
                    <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      {createError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-between" style={{ borderTop: '1px solid #1e1e30' }}>
              <button
                onClick={() => createStep > 0 ? setCreateStep(createStep - 1) : (setShowCreate(false), setForm({ ...emptyForm }))}
                className="px-4 py-2 text-sm rounded-lg transition-colors hover:bg-white/5"
                style={{ color: '#9090a8' }}
              >
                {createStep > 0 ? 'Back' : 'Cancel'}
              </button>
              {createStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={createStep === 0 && !form.name.trim()}
                  className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleManualCreate}
                  disabled={creating || !form.name.trim() || !form.systemPrompt.trim()}
                  className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
            <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(18,18,31,0.97)', borderBottom: '1px solid #1e1e30' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Edit Agent</h2>
              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#9090a8' }} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Description</label>
                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Category</label>
                <input type="text" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${editForm.color === c ? 'scale-110 ring-2 ring-offset-2 ring-[#4f6ef7]/60' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c, borderColor: editForm.color === c ? c : 'transparent' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>System Prompt</label>
                <textarea value={editForm.systemPrompt} onChange={e => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                  rows={14} className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>Conversation Starters</label>
                {editForm.conversationStarters.map((starter, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" value={starter} onChange={e => {
                      const updated = [...editForm.conversationStarters];
                      updated[idx] = e.target.value;
                      setEditForm({ ...editForm, conversationStarters: updated });
                    }} className="flex-1 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40" />
                    <button onClick={() => setEditForm({ ...editForm, conversationStarters: editForm.conversationStarters.filter((_, i) => i !== idx) })}
                      className="p-2 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
                <button onClick={() => setEditForm({ ...editForm, conversationStarters: [...editForm.conversationStarters, ''] })}
                  className="text-sm text-[#7b8ff8] hover:underline">+ Add starter</button>
              </div>
            </div>
            <div className="sticky bottom-0 px-6 py-4 flex justify-end gap-3" style={{ background: 'rgba(18,18,31,0.97)', borderTop: '1px solid #1e1e30' }}>
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5" style={{ color: '#9090a8' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !editForm.name || !editForm.systemPrompt}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
