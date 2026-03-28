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

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load prompts and models
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch system prompts
      const promptsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/system-prompts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Fetch AI models
      const modelsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (promptsRes.ok && modelsRes.ok) {
        const promptsData = await promptsRes.json();
        const modelsData = await modelsRes.json();

        // Normalize prompts data - ensure temperature and maxTokens are numbers
        const normalizedPrompts = (promptsData.prompts || []).map((p: SystemPrompt) => ({
          ...p,
          temperature: typeof p.temperature === 'string' ? parseFloat(p.temperature) : p.temperature,
          maxTokens: typeof p.maxTokens === 'string' ? parseInt(p.maxTokens) : p.maxTokens
        }));

        setPrompts(normalizedPrompts);
        setModels(modelsData.models || []);

        // Select first prompt by default
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
    // Ensure temperature and maxTokens are numbers
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

      // Clear success message after 3 seconds
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading system prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Prompts</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure AI system prompts and models</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Cpu className="w-4 h-4" />
                <span>AI Models</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-900 dark:text-red-100">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-900 dark:text-green-100">{success}</span>
          </div>
        )}

        {/* Prompt Tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelectPrompt(prompt)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                selectedPrompt?.id === prompt.id
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-[#ffc82c]/20 dark:to-[#f8c824]/20 border-2 border-[#ffc82c] text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#ffc82c]/50'
              }`}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            {/* Prompt Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {editedPrompt.promptName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {editedPrompt.promptDescription}
              </p>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Model
                </label>
                <select
                  value={editedPrompt.modelId}
                  onChange={(e) => setEditedPrompt({ ...editedPrompt, modelId: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ffc82c] focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature: {editedPrompt.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editedPrompt.temperature}
                  onChange={(e) => setEditedPrompt({ ...editedPrompt, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={editedPrompt.maxTokens}
                  onChange={(e) => setEditedPrompt({ ...editedPrompt, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ffc82c] focus:border-transparent"
                  min="100"
                  max="10000"
                  step="100"
                />
              </div>
            </div>

            {/* System Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={editedPrompt.systemPrompt}
                onChange={(e) => setEditedPrompt({ ...editedPrompt, systemPrompt: e.target.value })}
                rows={20}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ffc82c] focus:border-transparent font-mono text-sm"
                placeholder="Enter system prompt..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Use placeholders for dynamic content: {'{aiResponse}'} for widget formatter, {'{conversationText}'} for memory agent
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Changes
                </button>
              </div>

              <div className="flex gap-3 items-center">
                {hasChanges() && (
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges()}
                  className="flex items-center gap-2 px-6 py-2 bg-[#ffc82c] text-black font-semibold rounded-lg hover:bg-[#f8c824] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
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
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
              Last updated: {new Date(editedPrompt.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
