'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Settings, Save, RotateCcw, AlertCircle, Cpu, RefreshCw, FileText, Bug } from 'lucide-react';

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  updated_at: string;
  updated_by: string;
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

export default function SystemSettingsPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [availableModels, setAvailableModels] = useState<Record<string, AIModel>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPrompts, setUpdatingPrompts] = useState(false);
  const [editedConfigs, setEditedConfigs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [togglingDebug, setTogglingDebug] = useState(false);

  // Wait for hydration
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect if not admin or power_user
  useEffect(() => {
    if (hasHydrated && user && user.role !== 'admin' && user.role !== 'power_user') {
      router.push('/dashboard');
    }
  }, [user, router, hasHydrated]);

  // Load configs and models
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Load system config
      const configResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/system-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!configResponse.ok) throw new Error('Failed to load system config');
      const configData = await configResponse.json();
      setConfigs(configData);

      // Initialize edited configs
      const initial: Record<string, string> = {};
      configData.forEach((c: SystemConfig) => {
        initial[c.config_key] = c.config_value;
      });
      setEditedConfigs(initial);

      // Load available AI models
      const modelsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!modelsResponse.ok) throw new Error('Failed to load AI models');
      const modelsData = await modelsResponse.json();

      // Convert models array to Record<string, AIModel> — key by both id and openrouter_id
      const modelsRecord = modelsData.models.reduce((acc: Record<string, AIModel>, model: AIModel) => {
        acc[model.id] = model;
        if (model.openrouter_id) acc[model.openrouter_id] = model;
        return acc;
      }, {});

      setAvailableModels(modelsRecord);

      // Load debug mode status
      const debugResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/debug-mode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setDebugMode(debugData.debugMode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configKey: string) => {
    try {
      setSaving(configKey);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/system-config/${configKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_value: editedConfigs[configKey],
        }),
      });

      if (!response.ok) throw new Error('Failed to save config');

      const updated = await response.json();

      // Update local state
      setConfigs((prev) =>
        prev.map((c) => (c.config_key === configKey ? updated : c))
      );

      const configName = configKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setSuccess(`✅ ${configName} saved successfully!`);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (configKey: string) => {
    const original = configs.find((c) => c.config_key === configKey);
    if (original) {
      setEditedConfigs((prev) => ({
        ...prev,
        [configKey]: original.config_value,
      }));
    }
  };

  const hasChanges = (configKey: string) => {
    const original = configs.find((c) => c.config_key === configKey);
    return original && editedConfigs[configKey] !== original.config_value;
  };

  // Deduplicated list of models for dropdowns (avoid showing both id and openrouter_id entries)
  const modelsData_deduped = useMemo(() => {
    const seen = new Set<string>();
    return Object.values(availableModels).filter((model) => {
      const key = model.openrouter_id || model.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [availableModels]);

  const getModelDisplayName = (modelId: string) => {
    const model = availableModels[modelId];
    if (!model) return modelId || 'Not selected';
    const displayName = model.modelName || model.name || modelId;
    return model.provider ? `${displayName} (${model.provider})` : displayName;
  };

  const handleRefreshModels = async () => {
    try {
      setRefreshing(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to refresh models');

      const data = await response.json();

      await loadData();

      setSuccess(`✅ Successfully refreshed ${data.count} models from OpenRouter!`);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  };

  const [showPromptConfirm, setShowPromptConfirm] = useState(false);

  const handleUpdateAgentPrompts = async () => {
    try {
      setShowPromptConfirm(false);
      setUpdatingPrompts(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/update-agent-prompts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to update agent prompts');

      const result = await response.json();

      if (result.success) {
        setSuccess(`✅ Updated ${result.successCount} agent prompts successfully!`);
        console.log('Agent prompt update results:', result.results);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError('Failed to update agent prompts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent prompts');
    } finally {
      setUpdatingPrompts(false);
    }
  };

  const handleToggleDebug = async () => {
    try {
      setTogglingDebug(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const newDebugMode = !debugMode;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/debug-mode`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled: newDebugMode })
        }
      );

      if (!response.ok) throw new Error('Failed to toggle debug mode');

      const result = await response.json();
      setDebugMode(result.debugMode);

      if (result.debugMode) {
        setSuccess('🔍 Debug mode enabled - Verbose logging is now active. Check server console for detailed logs.');
      } else {
        setSuccess('✅ Debug mode disabled - Verbose logging turned off.');
      }

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle debug mode');
    } finally {
      setTogglingDebug(false);
    }
  };

  // Loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f6ef7] mx-auto mb-4"></div>
          <p style={{ color: '#9090a8' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin access after hydration
  if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#f87171] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#ededf5' }}>
            Access Denied
          </h1>
          <p style={{ color: '#9090a8' }}>
            This page is only accessible to administrators and power users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f6ef7] mx-auto mb-4"></div>
          <p style={{ color: '#9090a8' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>
              Admin — Settings
            </p>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#ededf5' }}>
              System Settings
            </h1>
            <p style={{ color: '#9090a8' }}>
              Configure AI models used for memory extraction and widget formatting
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshModels}
              disabled={refreshing}
              className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fetch latest models from OpenRouter"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Models</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowPromptConfirm(true)}
              disabled={updatingPrompts}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#7c5bf6' }}
              title="Update all agent prompts from instruction files"
            >
              {updatingPrompts ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Update Agent Prompts</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle className="w-5 h-5 text-[#fca5a5] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#fca5a5]">Error</h3>
              <p className="text-[#fca5a5] text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <p className="text-[#4ade80] font-medium">{success}</p>
          </div>
        )}

        {/* Debug Mode Toggle */}
        <div className="mb-6 overflow-hidden" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="p-6 border-b border-[#1e1e30]">
            <div className="flex items-center gap-3 mb-2">
              <Bug className="w-6 h-6 text-[#fca5a5]" />
              <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>
                Debug Mode
              </h2>
            </div>
            <p className="text-sm mb-3" style={{ color: '#9090a8' }}>
              Enable verbose logging for vector searches and AI prompts (admin debugging only)
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleToggleDebug}
                  disabled={togglingDebug}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={debugMode ? { background: '#c0392b' } : { background: '#1e1e30' }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      debugMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="font-medium" style={{ color: '#ededf5' }}>
                  {debugMode ? 'ON' : 'OFF'}
                </span>
                {togglingDebug && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4f6ef7]"></div>
                )}
              </div>

              {debugMode && (
                <div className="text-right">
                  <p className="text-sm text-[#fca5a5] font-semibold">
                    🔍 Active - Check server console for logs
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                    Logs include: RAG searches, prompts, memory loads
                  </p>
                </div>
              )}
            </div>

            {debugMode && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <p className="text-sm text-[#fcc824] font-medium">
                  ⚠️ Debug Output Active
                </p>
                <p className="text-xs text-[#fcc824]/70 mt-1">
                  Verbose logging is enabled. The server console will show:
                </p>
                <ul className="text-xs text-[#fcc824]/70 mt-2 space-y-1 list-disc list-inside">
                  <li>Vector database searches with similarity scores</li>
                  <li>Full AI prompts sent to OpenRouter</li>
                  <li>Memory loading operations</li>
                  <li>RAG search results and chunk details</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Model Selectors — only for configs ending in _model */}
        <div className="space-y-6">
          {configs.filter(c => c.config_key.endsWith('_model')).map((config) => (
            <div
              key={config.id}
              className="overflow-hidden"
              style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}
            >
              <div className="p-6 border-b border-[#1e1e30]">
                <div className="flex items-center gap-3 mb-2">
                  <Cpu className="w-6 h-6" style={{ color: '#7c5bf6' }} />
                  <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>
                    {config.config_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h2>
                </div>
                {config.description && (
                  <p className="text-sm mb-3" style={{ color: '#9090a8' }}>
                    {config.description}
                  </p>
                )}
                {config.updated_by && (
                  <p className="text-xs" style={{ color: '#9090a8' }}>
                    Last updated by {config.updated_by} on{' '}
                    {new Date(config.updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                  Select AI Model
                </label>
                <select
                  value={editedConfigs[config.config_key] || ''}
                  onChange={(e) =>
                    setEditedConfigs((prev) => ({
                      ...prev,
                      [config.config_key]: e.target.value,
                    }))
                  }
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 text-sm"
                >
                  {modelsData_deduped.map((model) => (
                    <option key={model.openrouter_id || model.id} value={model.openrouter_id || model.id}>
                      {model.modelName || model.name || model.openrouter_id || model.id} ({model.provider || 'unknown'})
                    </option>
                  ))}
                </select>

                <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  <p className="text-sm" style={{ color: '#ededf5' }}>
                    <strong>Current:</strong> {getModelDisplayName(editedConfigs[config.config_key])}
                  </p>
                  {availableModels[editedConfigs[config.config_key]]?.description && (
                    <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                      {availableModels[editedConfigs[config.config_key]].description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleSave(config.config_key)}
                    disabled={!hasChanges(config.config_key) || saving === config.config_key}
                    className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving === config.config_key ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleReset(config.config_key)}
                    disabled={!hasChanges(config.config_key)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(144,144,168,0.1)', color: '#ededf5', border: '1px solid #1e1e30' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>

                  {hasChanges(config.config_key) && (
                    <span className="text-sm font-medium" style={{ color: '#fcc824' }}>
                      Unsaved changes
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* General Settings — feature flags, trial config, etc. */}
        {configs.filter(c => !c.config_key.endsWith('_model')).length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#ededf5' }}>
              <Settings className="w-5 h-5" style={{ color: '#9090a8' }} />
              General Settings
            </h2>
            <div
              className="overflow-hidden"
              style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}
            >
              <div className="divide-y divide-[#1e1e30]">
                {configs.filter(c => !c.config_key.endsWith('_model')).map((config) => {
                  const val = editedConfigs[config.config_key] || '';
                  const isBool = val === 'true' || val === 'false';
                  const isNumber = !isBool && !isNaN(Number(val)) && val.trim() !== '';
                  const label = config.config_key
                    .replace(/^(ff:|trial:)/, '')
                    .replace(/[_:]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  const category = config.config_key.startsWith('ff:') ? 'Feature Flag' :
                    config.config_key.startsWith('trial:') ? 'Trial' : 'Config';

                  return (
                    <div key={config.id} className="p-4 flex flex-wrap items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={
                              category === 'Feature Flag'
                                ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }
                                : category === 'Trial'
                                ? { background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.2)', color: '#7b8ff8' }
                                : { background: 'rgba(144,144,168,0.1)', border: '1px solid #1e1e30', color: '#9090a8' }
                            }>
                            {category}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                            {label}
                          </span>
                        </div>
                        {config.description && (
                          <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>{config.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isBool ? (
                          <button
                            onClick={() =>
                              setEditedConfigs((prev) => ({
                                ...prev,
                                [config.config_key]: val === 'true' ? 'false' : 'true',
                              }))
                            }
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors`}
                            style={val === 'true' ? { background: '#4f6ef7' } : { background: '#1e1e30' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                val === 'true' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : (
                          <input
                            type={isNumber ? 'number' : 'text'}
                            value={val}
                            onChange={(e) =>
                              setEditedConfigs((prev) => ({
                                ...prev,
                                [config.config_key]: e.target.value,
                              }))
                            }
                            className="w-full sm:w-48 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 text-sm"
                          />
                        )}

                        <button
                          onClick={() => handleSave(config.config_key)}
                          disabled={!hasChanges(config.config_key) || saving === config.config_key}
                          className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving === config.config_key ? '...' : 'Save'}
                        </button>

                        {hasChanges(config.config_key) && (
                          <button
                            onClick={() => handleReset(config.config_key)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors"
                            style={{ background: 'rgba(144,144,168,0.1)', color: '#ededf5', border: '1px solid #1e1e30' }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-6 rounded-xl" style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#ededf5' }}>
            💡 About AI Model Selection
          </h3>
          <ul className="text-sm space-y-1" style={{ color: '#9090a8' }}>
            <li>
              <strong style={{ color: '#ededf5' }}>Memory Extraction:</strong> Used for analyzing conversations and extracting important information about users (goals, challenges, outcomes, etc.)
            </li>
            <li>
              <strong style={{ color: '#ededf5' }}>Widget Formatting:</strong> Used for detecting lists in AI responses and converting them to interactive widgets
            </li>
            <li>
              <strong style={{ color: '#ededf5' }}>Speed vs Quality:</strong> Haiku models are faster and cheaper, while larger models provide more accurate results
            </li>
            <li>
              <strong style={{ color: '#ededf5' }}>Changes take effect immediately</strong> for new memory extractions and widget formatting operations
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal for Update Agent Prompts */}
      {showPromptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl shadow-xl p-6 max-w-md mx-4" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#ededf5' }}>
              Update All Agent Prompts?
            </h3>
            <p className="text-sm mb-4" style={{ color: '#9090a8' }}>
              This will overwrite all agent system prompts from their instruction files. Any manual edits to prompts will be lost.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowPromptConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                style={{ background: 'rgba(144,144,168,0.1)', color: '#ededf5', border: '1px solid #1e1e30' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAgentPrompts}
                className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ background: '#7c5bf6' }}
              >
                Yes, Update All Prompts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
