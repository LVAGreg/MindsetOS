'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Brain, Sparkles, Save, RotateCcw, AlertCircle, Cpu, ArrowLeft, CheckCircle } from 'lucide-react';

interface SystemPrompt {
  id: string;
  promptType: string;
  promptName: string;
  promptDescription: string;
  systemPrompt: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  updatedAt: string;
}

interface AIModel {
  id: number;
  modelId: string;
  modelName: string;
  provider: string;
}

export default function SystemPromptsPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<SystemPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const promptsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/system-prompts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const modelsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (promptsRes.ok && modelsRes.ok) {
        const promptsData = await promptsRes.json();
        const modelsData = await modelsRes.json();

        const normalizedPrompts = (promptsData.prompts || []).map((p: SystemPrompt) => ({
          ...p,
          temperature: typeof p.temperature === 'string' ? parseFloat(p.temperature) : p.temperature,
          maxTokens: typeof p.maxTokens === 'string' ? parseInt(p.maxTokens) : p.maxTokens
        }));

        setPrompts(normalizedPrompts);
        setModels(modelsData.models || []);

        if (normalizedPrompts.length > 0) {
          const first = normalizedPrompts[0];
          setSelectedPrompt(first);
          setEditedPrompt({ ...first });
        }
      } else {
        throw new Error('Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: SystemPrompt) => {
    const normalizedPrompt = {
      ...prompt,
      temperature: typeof prompt.temperature === 'string' ? parseFloat(prompt.temperature) : prompt.temperature,
      maxTokens: typeof prompt.maxTokens === 'string' ? parseInt(prompt.maxTokens) : prompt.maxTokens
    };
    setSelectedPrompt(normalizedPrompt);
    setEditedPrompt({ ...normalizedPrompt });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!editedPrompt) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/system-prompts/${editedPrompt.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: editedPrompt.systemPrompt,
          modelId: editedPrompt.modelId,
          temperature: editedPrompt.temperature,
          maxTokens: editedPrompt.maxTokens,
          isActive: editedPrompt.isActive
        })
      });

      if (!response.ok) throw new Error('Failed to save prompt');

      setSuccess('Prompt saved successfully!');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedPrompt) {
      setEditedPrompt({ ...selectedPrompt });
      setError(null);
      setSuccess(null);
    }
  };

  const hasChanges = () => {
    if (!selectedPrompt || !editedPrompt) return false;
    return (
      selectedPrompt.systemPrompt !== editedPrompt.systemPrompt ||
      selectedPrompt.modelId !== editedPrompt.modelId ||
      selectedPrompt.temperature !== editedPrompt.temperature ||
      selectedPrompt.maxTokens !== editedPrompt.maxTokens
    );
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#f87171' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#ededf5' }}>Access Denied</h1>
          <p style={{ color: '#9090a8' }}>This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f6ef7] mx-auto mb-4" />
          <p style={{ color: '#9090a8' }}>Loading system prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      {/* Header */}
      <div className="rounded-2xl" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>System Prompts</h1>
              <p className="text-sm mt-1" style={{ color: '#9090a8' }}>Configure AI system prompts and models</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                <Cpu className="w-4 h-4" />
                <span>AI Models</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#f87171' }} />
            <span className="font-medium" style={{ color: '#fca5a5' }}>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#4ade80' }} />
            <span className="font-medium" style={{ color: '#86efac' }}>{success}</span>
          </div>
        )}

        {/* Prompt Tabs */}
        {prompts.length === 0 && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#9090a8' }} />
            <p className="text-sm" style={{ color: '#9090a8' }}>No system prompts found. Prompts are seeded by the backend on first run.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelectPrompt(prompt)}
              className="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
              style={
                selectedPrompt?.id === prompt.id
                  ? { background: 'rgba(79,110,247,0.15)', border: '2px solid #4f6ef7', color: '#ededf5' }
                  : { background: 'rgba(18,18,31,0.8)', border: '2px solid #1e1e30', color: '#9090a8' }
              }
            >
              {prompt.promptType === 'memory_agent' ? (
                <Brain className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {prompt.promptName}
            </button>
          ))}
        </div>

        {/* Prompt Editor */}
        {editedPrompt && (
          <div className="rounded-2xl p-8" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            {/* Prompt Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#ededf5' }}>
                {editedPrompt.promptName}
              </h2>
              <p className="text-sm" style={{ color: '#9090a8' }}>
                {editedPrompt.promptDescription}
              </p>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                  AI Model
                </label>
                <select
                  value={editedPrompt.modelId}
                  onChange={(e) => setEditedPrompt({ ...editedPrompt, modelId: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  {models.map((model) => (
                    <option key={model.modelId} value={model.modelId}>
                      {model.modelName} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                  Temperature: {editedPrompt.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editedPrompt.temperature}
                  onChange={(e) => setEditedPrompt({ ...editedPrompt, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: '#1e1e30', accentColor: '#4f6ef7' }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: '#9090a8' }}>
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={editedPrompt.maxTokens}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setEditedPrompt({ ...editedPrompt, maxTokens: val });
                  }}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  min="100"
                  max="10000"
                  step="100"
                />
              </div>
            </div>

            {/* System Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                System Prompt
              </label>
              <textarea
                value={editedPrompt.systemPrompt}
                onChange={(e) => setEditedPrompt({ ...editedPrompt, systemPrompt: e.target.value })}
                rows={20}
                className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] max-h-[60vh] resize-y"
                placeholder="Enter system prompt..."
              />
              <p className="text-xs mt-2" style={{ color: '#9090a8' }}>
                Use placeholders for dynamic content: {'{aiResponse}'} for widget formatter, {'{conversationText}'} for memory agent
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6" style={{ borderTop: '1px solid #1e1e30' }}>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#9090a8' }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Changes
                </button>
              </div>

              <div className="flex gap-3 items-center">
                {hasChanges() && (
                  <span className="text-sm font-medium" style={{ color: '#fcc824' }}>
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges()}
                  className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Last Updated */}
            <div className="mt-4 text-sm text-right" style={{ color: '#9090a8' }}>
              Last updated: {new Date(editedPrompt.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
