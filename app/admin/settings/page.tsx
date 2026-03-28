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

      // Clear success message after 3 seconds
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

      // Reload models
      await loadData();

      setSuccess(`✅ Successfully refreshed ${data.count} models from OpenRouter!`);

      // Clear success message after 5 seconds
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

        // Clear success message after 5 seconds
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

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle debug mode');
    } finally {
      setTogglingDebug(false);
    }
  };

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check admin access after hydration
  if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              System Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure AI models used for memory extraction and widget formatting
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshModels}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-900 dark:text-green-100 font-medium">{success}</p>
          </div>
        )}

        {/* Debug Mode Toggle */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Bug className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Debug Mode
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Enable verbose logging for vector searches and AI prompts (admin debugging only)
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleToggleDebug}
                  disabled={togglingDebug}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    debugMode
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      debugMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-gray-900 dark:text-white font-medium">
                  {debugMode ? 'ON' : 'OFF'}
                </span>
                {togglingDebug && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
              </div>

              {debugMode && (
                <div className="text-right">
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                    🔍 Active - Check server console for logs
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Logs include: RAG searches, prompts, memory loads
                  </p>
                </div>
              )}
            </div>

            {debugMode && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
                  ⚠️ Debug Output Active
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Verbose logging is enabled. The server console will show:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 list-disc list-inside">
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {config.config_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h2>
                </div>
                {config.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {config.description}
                  </p>
                )}
                {config.updated_by && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Last updated by {config.updated_by} on{' '}
                    {new Date(config.updated_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                >
                  {modelsData_deduped.map((model) => (
                    <option key={model.openrouter_id || model.id} value={model.openrouter_id || model.id}>
                      {model.modelName || model.name || model.openrouter_id || model.id} ({model.provider || 'unknown'})
                    </option>
                  ))}
                </select>

                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Current:</strong> {getModelDisplayName(editedConfigs[config.config_key])}
                  </p>
                  {availableModels[editedConfigs[config.config_key]]?.description && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {availableModels[editedConfigs[config.config_key]].description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleSave(config.config_key)}
                    disabled={!hasChanges(config.config_key) || saving === config.config_key}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving === config.config_key ? (
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

                  <button
                    onClick={() => handleReset(config.config_key)}
                    disabled={!hasChanges(config.config_key)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>

                  {hasChanges(config.config_key) && (
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              General Settings
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
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
                    <div key={config.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            category === 'Feature Flag'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : category === 'Trial'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {category}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {label}
                          </span>
                        </div>
                        {config.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.description}</p>
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
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                              val === 'true'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
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
                            className="w-48 p-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                          />
                        )}

                        <button
                          onClick={() => handleSave(config.config_key)}
                          disabled={!hasChanges(config.config_key) || saving === config.config_key}
                          className="px-3 py-1.5 text-xs font-semibold bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving === config.config_key ? '...' : 'Save'}
                        </button>

                        {hasChanges(config.config_key) && (
                          <button
                            onClick={() => handleReset(config.config_key)}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 About AI Model Selection
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>
              <strong>Memory Extraction:</strong> Used for analyzing conversations and extracting important information about users (goals, challenges, outcomes, etc.)
            </li>
            <li>
              <strong>Widget Formatting:</strong> Used for detecting lists in AI responses and converting them to interactive widgets
            </li>
            <li>
              <strong>Speed vs Quality:</strong> Haiku models are faster and cheaper, while larger models provide more accurate results
            </li>
            <li>
              <strong>Changes take effect immediately</strong> for new memory extractions and widget formatting operations
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal for Update Agent Prompts */}
      {showPromptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Update All Agent Prompts?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will overwrite all agent system prompts from their instruction files. Any manual edits to prompts will be lost.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowPromptConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAgentPrompts}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
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
