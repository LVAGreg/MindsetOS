'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api-client';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  tier: number;
  category: string;
  description: string;
  system_prompt: string;
  behavior_suffix?: string;
  model_preference: string;
  chat_model: string | null;
  memory_model: string | null;
  widget_model: string | null;
  max_tokens: number;
  temperature: string;
  is_active: boolean;
  accent_color?: string;
  color?: string;
  sort_order: number;
  allowed_roles?: string[];
  created_at: string;
  updated_at: string;
  metadata?: {
    conversationStarters?: string[];
  };
}

interface AIModel {
  id: string;
  name: string;
  modelName?: string;
  provider: string;
  openrouter_id: string;
  description: string;
  speed: string;
  quality: string;
}

export default function EditAgentPage({ params }: { params: { agentId: string } }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, AIModel>>({});

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [behaviorSuffix, setBehaviorSuffix] = useState('');
  const [modelPreference, setModelPreference] = useState('openai/gpt-4o');
  const [chatModel, setChatModel] = useState<string>('');
  const [memoryModel, setMemoryModel] = useState<string>('');
  const [widgetModel, setWidgetModel] = useState<string>('');
  const [maxTokens, setMaxTokens] = useState(5000);
  const [temperature, setTemperature] = useState(0.7);
  const [isActive, setIsActive] = useState(true);
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [color, setColor] = useState('#3B82F6');
  const [sortOrder, setSortOrder] = useState(0);
  const [conversationStarter1, setConversationStarter1] = useState('');
  const [conversationStarter2, setConversationStarter2] = useState('');
  const [conversationStarter3, setConversationStarter3] = useState('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['admin', 'power_user', 'user']);

  // Knowledge base upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [knowledgeFiles, setKnowledgeFiles] = useState<any[]>([]);

  useEffect(() => {
    loadAgent();
  }, [params.agentId]);

  async function loadAgent() {
    try {
      // Load agent data
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/agents/${params.agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load agent: ${res.status}`);
      }

      const data = await res.json();
      const agentData = data.agent;

      setAgent(agentData);
      setName(agentData.name);
      setDescription(agentData.description);
      setSystemPrompt(agentData.system_prompt);
      setBehaviorSuffix(agentData.behavior_suffix || '');
      setModelPreference(agentData.model_preference);
      setChatModel(agentData.chat_model || '');
      setMemoryModel(agentData.memory_model || '');
      setWidgetModel(agentData.widget_model || '');
      setMaxTokens(agentData.max_tokens);
      setTemperature(parseFloat(agentData.temperature));
      setIsActive(agentData.is_active);
      setAccentColor(agentData.accent_color || '#3B82F6');
      setColor(agentData.color || agentData.accent_color || '#3B82F6');
      setSortOrder(agentData.sort_order || 0);

      // Load conversation starters from metadata
      const starters = agentData.metadata?.conversationStarters || [];
      setConversationStarter1(starters[0] || '');
      setConversationStarter2(starters[1] || '');
      setConversationStarter3(starters[2] || '');

      // Load allowed roles
      setAllowedRoles(agentData.allowed_roles || ['admin', 'power_user', 'user']);

      // Load available AI models
      const modelsRes = await fetch(`${API_URL}/api/admin/ai-models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const modelsRecord = modelsData.models.reduce((acc: Record<string, AIModel>, model: AIModel) => {
          acc[model.id] = model;
          return acc;
        }, {});
        setAvailableModels(modelsRecord);
      }

      // Load knowledge base files for this agent
      await loadKnowledgeFiles();
    } catch (err: any) {
      console.error('❌ Load agent error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadKnowledgeFiles() {
    try {
      console.log('📚 [KNOWLEDGE] Loading knowledge files for agent:', params.agentId);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/knowledge-base?agent_id=${params.agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📚 [KNOWLEDGE] Response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('📚 [KNOWLEDGE] Loaded documents:', data.documents?.length || 0);
        setKnowledgeFiles(data.documents || []);
      } else {
        console.error('📚 [KNOWLEDGE] Failed to load:', res.status);
      }
    } catch (err) {
      console.error('📚 [KNOWLEDGE] Error loading knowledge files:', err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('📤 [UPLOAD] Starting upload:', file.name);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('category', 'knowledge');
      formData.append('agent_id', params.agentId);

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/knowledge-base/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📥 [UPLOAD] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ [UPLOAD] Success:', data);

      setSuccessMessage(`✅ Successfully uploaded "${file.name}" - ${data.chunks_processed} chunks processed, ${data.total_chars} characters`);

      // Reload knowledge files
      console.log('🔄 [UPLOAD] Reloading knowledge files...');
      await loadKnowledgeFiles();
      console.log('✅ [UPLOAD] Knowledge files reloaded');

      // Reset file input
      e.target.value = '';

      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(null), 10000);
    } catch (err: any) {
      console.error('❌ [UPLOAD] Error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  }

  async function handleDeleteKnowledge(id: string) {
    if (!confirm('Are you sure you want to delete this knowledge base document?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      setSuccessMessage('Knowledge document deleted');
      await loadKnowledgeFiles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Build conversation starters array, filtering out empty strings
      const conversationStarters = [
        conversationStarter1,
        conversationStarter2,
        conversationStarter3
      ].filter(starter => starter.trim() !== '');

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/agents/${params.agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          system_prompt: systemPrompt,
          behavior_suffix: behaviorSuffix || null,
          model_preference: modelPreference,
          chat_model: chatModel || null,
          memory_model: memoryModel || null,
          widget_model: widgetModel || null,
          max_tokens: maxTokens,
          temperature,
          is_active: isActive,
          accent_color: accentColor,
          sort_order: sortOrder,
          allowed_roles: allowedRoles.length > 0 ? allowedRoles : ['admin'],
          metadata: {
            conversationStarters: conversationStarters.length > 0 ? conversationStarters : undefined
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to update agent: ${res.status}`);
      }

      const data = await res.json();
      setAgent(data.agent);
      setSuccessMessage('✅ Agent updated successfully! Changes are now live.');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('❌ Save agent error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading agent...</div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Agent</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Modify agent configuration and system prompt
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Back to Agents
          </Link>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Agent Info Card */}
        {agent && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">Agent ID:</span>
                <span className="ml-2 text-blue-800 font-mono">{agent.id}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Category:</span>
                <span className="ml-2 text-blue-800">{agent.category}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Created:</span>
                <span className="ml-2 text-blue-800">{new Date(agent.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Last Updated:</span>
                <span className="ml-2 text-blue-800">{new Date(agent.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Money Model Maker"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of what this agent does"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Controls the order this agent appears in the Browse Agents list (lower numbers appear first)
                </p>
              </div>

              {/* Agent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const hex = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(hex) || hex.length === 0 || hex === '#') {
                        setColor(hex);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                    placeholder="#3B82F6"
                    maxLength={7}
                  />
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This color will be used for the agent's icon, borders, and UI accents
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active (available for users to select)
                </label>
              </div>

              {/* Allowed Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Control (Who can see this agent?)
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'admin', label: 'Admin' },
                    { value: 'power_user', label: 'Power User' },
                    { value: 'user', label: 'User' }
                  ].map(role => (
                    <div key={role.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`role-${role.value}`}
                        checked={allowedRoles.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllowedRoles([...allowedRoles, role.value]);
                          } else {
                            setAllowedRoles(allowedRoles.filter(r => r !== role.value));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor={`role-${role.value}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select which user roles can access this agent. Uncheck all to make it admin-only.
                </p>
              </div>
            </div>
          </div>

          {/* Conversation Starters */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Conversation Starters</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add up to 3 suggested conversation starters that users can click to begin chatting with this agent.
            </p>

            <div className="space-y-3">
              {/* Starter 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Conversation Starter 1
                </label>
                <input
                  type="text"
                  value={conversationStarter1}
                  onChange={(e) => setConversationStarter1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Help me define my Money Model"
                />
              </div>

              {/* Starter 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Conversation Starter 2 (Optional)
                </label>
                <input
                  type="text"
                  value={conversationStarter2}
                  onChange={(e) => setConversationStarter2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., What's the fastest way to validate my offer?"
                />
              </div>

              {/* Starter 3 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Conversation Starter 3 (Optional)
                </label>
                <input
                  type="text"
                  value={conversationStarter3}
                  onChange={(e) => setConversationStarter3(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., How do I price my services?"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Keep them short, specific, and action-oriented. These appear as clickable buttons when users start a new chat.
              </p>
            </div>
          </div>

          {/* AI Configuration */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Configuration</h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                💡 Model overrides allow this agent to use different models for specific operations. Leave blank to use system defaults.
              </p>

              {/* Chat Model Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chat Model Override (optional)
                </label>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Use default (Claude Sonnet 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Model used for main chat conversations
                </p>
              </div>

              {/* Memory Model Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Memory Extraction Model Override (optional)
                </label>
                <select
                  value={memoryModel}
                  onChange={(e) => setMemoryModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Use system default (Claude Haiku 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Model used for extracting user information from conversations
                </p>
              </div>

              {/* Widget Model Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Widget Formatting Model Override (optional)
                </label>
                <select
                  value={widgetModel}
                  onChange={(e) => setWidgetModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Use system default (Claude Haiku 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Model used for detecting and formatting interactive widgets
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="100"
                  max="32000"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum length of AI responses (100-32000)
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0.0 (Focused)</span>
                  <span>1.0 (Balanced)</span>
                  <span>2.0 (Creative)</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Controls randomness in responses. Lower = more focused, Higher = more creative
                </p>
              </div>
            </div>
          </div>

          {/* Knowledge Base */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Knowledge Base</h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                📚 Upload documents to give this agent specific knowledge. Supports PDF, DOCX, TXT, MD files.
              </p>

              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="knowledge-upload"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
                <label
                  htmlFor="knowledge-upload"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Uploading and processing...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, DOCX, TXT, MD up to 10MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Uploaded Files List */}
              {knowledgeFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploaded Documents ({knowledgeFiles.length})
                  </h3>
                  <div className="space-y-2">
                    {knowledgeFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteKnowledge(file.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                          title="Delete document"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Prompt</h2>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agent Instructions
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {systemPrompt.length} characters
                </span>
              </div>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter the system prompt that defines this agent's behavior, personality, and expertise..."
              />

              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 This prompt defines the agent's personality, expertise, and how it responds to users.
                Use Greg's warm, conversational, expert voice. No AI disclaimers or robotic language.
              </p>
            </div>
          </div>

          {/* Behavior Suffix */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Behavior Suffix (Optional)</h2>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Instructions Appended to System Prompt
                </label>
                <span className={`text-xs ${behaviorSuffix.length > 2000 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {behaviorSuffix.length} / 2000 characters
                </span>
              </div>

              <textarea
                value={behaviorSuffix}
                onChange={(e) => setBehaviorSuffix(e.target.value)}
                rows={10}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Optional: Enter additional instructions that will be appended to the system prompt at runtime..."
              />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>💡 Use Case:</strong> This suffix is dynamically appended to the system prompt when the agent responds.
                  Perfect for adding user-specific context like brand voice guidelines, writing style preferences, or personalization
                  instructions that should apply to all responses without modifying the core system prompt.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  <strong>Example:</strong> "Always write in a warm, conversational tone matching the user's energy level.
                  Use their preferred terminology: [specific terms]. Keep responses concise but actionable."
                </p>
              </div>

              {behaviorSuffix.length > 2000 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ Behavior suffix exceeds maximum length of 2000 characters. Please shorten your input.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 px-6 py-3 rounded-lg font-medium text-white ${
                saving
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>

            <Link
              href="/admin/agents"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h3>
          <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
            <li>Changes take effect immediately for all new conversations</li>
            <li>System prompt should use Greg's warm, conversational expert voice</li>
            <li>Avoid AI disclaimers like "As an AI assistant..."</li>
            <li>Use contractions and natural language ("you're" not "you are")</li>
            <li>Higher temperature = more creative but less consistent responses</li>
            <li>Inactive agents won't appear in the agent selector for users</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
