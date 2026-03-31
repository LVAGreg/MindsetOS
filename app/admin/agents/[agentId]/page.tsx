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

      const starters = agentData.metadata?.conversationStarters || [];
      setConversationStarter1(starters[0] || '');
      setConversationStarter2(starters[1] || '');
      setConversationStarter3(starters[2] || '');

      setAllowedRoles(agentData.allowed_roles || ['admin', 'power_user', 'user']);

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
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/knowledge-base?agent_id=${params.agentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledgeFiles(data.documents || []);
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('category', 'knowledge');
      formData.append('agent_id', params.agentId);

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/knowledge-base/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setSuccessMessage(`✅ Successfully uploaded "${file.name}" - ${data.chunks_processed} chunks processed, ${data.total_chars} characters`);
      await loadKnowledgeFiles();
      e.target.value = '';
      setTimeout(() => setSuccessMessage(null), 10000);
    } catch (err: any) {
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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Delete failed');

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
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-lg" style={{ color: '#9090a8' }}>Loading agent...</div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <div className="text-lg text-red-400">Error: {error}</div>
      </div>
    );
  }

  // Shared input class
  const inputClass = "w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]";
  const selectClass = "w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]";

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>Edit Agent</h1>
            <p className="mt-2 text-sm" style={{ color: '#9090a8' }}>
              Modify agent configuration and system prompt
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#ededf5' }}
          >
            ← Back to Agents
          </Link>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <p className="font-medium" style={{ color: '#4ade80' }}>{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="font-medium" style={{ color: '#f87171' }}>Error: {error}</p>
          </div>
        )}

        {/* Agent Info Card */}
        {agent && (
          <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium" style={{ color: '#ededf5' }}>Agent ID:</span>
                <span className="ml-2 font-mono" style={{ color: '#7b8ff8' }}>{agent.id}</span>
              </div>
              <div>
                <span className="font-medium" style={{ color: '#ededf5' }}>Category:</span>
                <span className="ml-2" style={{ color: '#9090a8' }}>{agent.category}</span>
              </div>
              <div>
                <span className="font-medium" style={{ color: '#ededf5' }}>Created:</span>
                <span className="ml-2" style={{ color: '#9090a8' }}>{new Date(agent.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium" style={{ color: '#ededf5' }}>Last Updated:</span>
                <span className="ml-2" style={{ color: '#9090a8' }}>{new Date(agent.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className="rounded-2xl p-6 space-y-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>Basic Information</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Mindset Score Agent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputClass}
                  placeholder="Brief description of what this agent does"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Display Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Controls the order this agent appears in the Browse Agents list (lower numbers appear first)
                </p>
              </div>

              {/* Agent Color */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Agent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-20 rounded-xl cursor-pointer"
                    style={{ border: '1px solid #1e1e30', background: '#09090f' }}
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
                    className="flex-1 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] uppercase"
                    placeholder="#3B82F6"
                    maxLength={7}
                  />
                  <div
                    className="w-10 h-10 rounded-xl shadow-sm"
                    style={{ backgroundColor: color, border: '1px solid #1e1e30' }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
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
                  className="h-4 w-4 rounded"
                  style={{ accentColor: '#4f6ef7' }}
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium" style={{ color: '#9090a8' }}>
                  Active (available for users to select)
                </label>
              </div>

              {/* Allowed Roles */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
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
                        className="h-4 w-4 rounded"
                        style={{ accentColor: '#4f6ef7' }}
                      />
                      <label htmlFor={`role-${role.value}`} className="ml-2 text-sm" style={{ color: '#9090a8' }}>
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Select which user roles can access this agent. Uncheck all to make it admin-only.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e1e30' }} />

          {/* Conversation Starters */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>Conversation Starters</h2>
            <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
              Add up to 3 suggested conversation starters that users can click to begin chatting with this agent.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Conversation Starter 1
                </label>
                <input
                  type="text"
                  value={conversationStarter1}
                  onChange={(e) => setConversationStarter1(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Help me take my Mindset Score"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Conversation Starter 2 (Optional)
                </label>
                <input
                  type="text"
                  value={conversationStarter2}
                  onChange={(e) => setConversationStarter2(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., What's the fastest way to validate my offer?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Conversation Starter 3 (Optional)
                </label>
                <input
                  type="text"
                  value={conversationStarter3}
                  onChange={(e) => setConversationStarter3(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., How do I price my services?"
                />
              </div>

              <p className="text-xs mt-2" style={{ color: '#9090a8' }}>
                💡 Keep them short, specific, and action-oriented. These appear as clickable buttons when users start a new chat.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e1e30' }} />

          {/* AI Configuration */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>AI Configuration</h2>

            <div className="space-y-4">
              <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
                💡 Model overrides allow this agent to use different models for specific operations. Leave blank to use system defaults.
              </p>

              {/* Chat Model Override */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Chat Model Override (optional)
                </label>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Use default (Claude Sonnet 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Model used for main chat conversations
                </p>
              </div>

              {/* Memory Model Override */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Memory Extraction Model Override (optional)
                </label>
                <select
                  value={memoryModel}
                  onChange={(e) => setMemoryModel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Use system default (Claude Haiku 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Model used for extracting user information from conversations
                </p>
              </div>

              {/* Widget Model Override */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Widget Formatting Model Override (optional)
                </label>
                <select
                  value={widgetModel}
                  onChange={(e) => setWidgetModel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Use system default (Claude Haiku 4.5)</option>
                  {Object.entries(availableModels).map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName || model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Model used for detecting and formatting interactive widgets
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="100"
                  max="32000"
                  step="100"
                  className={inputClass}
                />
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Maximum length of AI responses (100-32000)
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ background: '#1e1e30', accentColor: '#4f6ef7' }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: '#9090a8' }}>
                  <span>0.0 (Focused)</span>
                  <span>1.0 (Balanced)</span>
                  <span>2.0 (Creative)</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: '#9090a8' }}>
                  Controls randomness in responses. Lower = more focused, Higher = more creative
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e1e30' }} />

          {/* Knowledge Base */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>Knowledge Base</h2>

            <div className="space-y-4">
              <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
                📚 Upload documents to give this agent specific knowledge. Supports PDF, DOCX, TXT, MD files.
              </p>

              {/* Upload Section */}
              <div
                className="rounded-xl p-6 text-center transition-colors"
                style={{ border: '2px dashed #1e1e30', background: 'rgba(0,0,0,0.2)' }}
              >
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
                      <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#4f6ef7' }} />
                      <p className="text-sm" style={{ color: '#9090a8' }}>Uploading and processing...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12" style={{ color: '#9090a8' }} />
                      <p className="text-sm font-medium" style={{ color: '#ededf5' }}>
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs" style={{ color: '#9090a8' }}>
                        PDF, DOCX, TXT, MD up to 10MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Uploaded Files List */}
              {knowledgeFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium" style={{ color: '#ededf5' }}>
                    Uploaded Documents ({knowledgeFiles.length})
                  </h3>
                  <div className="space-y-2">
                    {knowledgeFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e1e30' }}
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5" style={{ color: '#7b8ff8' }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#ededf5' }}>
                              {file.title}
                            </p>
                            <p className="text-xs" style={{ color: '#9090a8' }}>
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteKnowledge(file.id)}
                          className="p-1 rounded-md transition-colors"
                          title="Delete document"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e1e30' }} />

          {/* System Prompt */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>System Prompt</h2>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium" style={{ color: '#9090a8' }}>
                  Agent Instructions
                </label>
                <span className="text-xs" style={{ color: '#9090a8' }}>
                  {systemPrompt.length} characters
                </span>
              </div>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={20}
                className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontFamily: 'monospace' }}
                placeholder="Enter the system prompt that defines this agent's behavior, personality, and expertise..."
              />

              <p className="text-xs" style={{ color: '#9090a8' }}>
                💡 This prompt defines the agent's personality, expertise, and how it responds to users.
                Use Greg's warm, conversational, expert voice. No AI disclaimers or robotic language.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #1e1e30' }} />

          {/* Behavior Suffix */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#ededf5' }}>Behavior Suffix (Optional)</h2>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium" style={{ color: '#9090a8' }}>
                  Additional Instructions Appended to System Prompt
                </label>
                <span className="text-xs" style={{ color: behaviorSuffix.length > 2000 ? '#f87171' : '#9090a8' }}>
                  {behaviorSuffix.length} / 2000 characters
                </span>
              </div>

              <textarea
                value={behaviorSuffix}
                onChange={(e) => setBehaviorSuffix(e.target.value)}
                rows={10}
                maxLength={2000}
                className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontFamily: 'monospace' }}
                placeholder="Optional: Enter additional instructions that will be appended to the system prompt at runtime..."
              />

              <div className="rounded-xl p-3" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
                <p className="text-xs" style={{ color: '#9090a8' }}>
                  <strong style={{ color: '#ededf5' }}>💡 Use Case:</strong> This suffix is dynamically appended to the system prompt when the agent responds.
                  Perfect for adding user-specific context like brand voice guidelines, writing style preferences, or personalization
                  instructions that should apply to all responses without modifying the core system prompt.
                </p>
                <p className="text-xs mt-2" style={{ color: '#9090a8' }}>
                  <strong style={{ color: '#ededf5' }}>Example:</strong> "Always write in a warm, conversational tone matching the user's energy level.
                  Use their preferred terminology: [specific terms]. Keep responses concise but actionable."
                </p>
              </div>

              {behaviorSuffix.length > 2000 && (
                <p className="text-xs" style={{ color: '#f87171' }}>
                  ⚠️ Behavior suffix exceeds maximum length of 2000 characters. Please shorten your input.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4" style={{ borderTop: '1px solid #1e1e30' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>

            <Link
              href="/admin/agents"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: '1px solid #1e1e30', color: '#9090a8' }}
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>⚠️ Important Notes</h3>
          <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: '#9090a8' }}>
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
