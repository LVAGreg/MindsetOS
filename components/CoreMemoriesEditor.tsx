'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, History, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CoreMemories {
  id?: string;
  user_id?: string;

  // Section 1: Business Identity
  full_name?: string;
  company_name?: string;
  business_outcome?: string;

  // Section 2: Client Profile
  target_clients?: string;
  client_problems?: string[];
  client_results?: string;

  // Section 3: Methodology
  core_method?: string;
  frameworks?: string[];

  // Section 4: Service Details
  service_description?: string;
  pricing_model?: string;
  delivery_timeline?: string;

  // Section 5: Current State
  revenue_range?: string;
  growth_goals?: string;
  biggest_challenges?: string[];

  created_at?: string;
  updated_at?: string;
}

interface AuditLogEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  source: 'manual' | 'agent' | 'system';
  agent_name?: string;
  changed_at: string;
}

interface CoreMemoriesEditorProps {
  onSave?: (memories: CoreMemories) => void;
  showHistory?: boolean;
}

export default function CoreMemoriesEditor({ onSave, showHistory = false }: CoreMemoriesEditorProps) {
  const [memories, setMemories] = useState<CoreMemories>({});
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCoreMemories();
  }, []);

  const loadCoreMemories = async () => {
    setLoading(true);
    setError(null);

    try {
      const includeAuditLog = showHistory ? '?includeAuditLog=true' : '';
      const response = await apiClient.get(`/api/profile/core-memories${includeAuditLog}`);

      setMemories(response.coreMemories || {});
      setAuditLog(response.auditLog || []);
    } catch (err: any) {
      console.error('Error loading core memories:', err);
      setError(err.message || 'Failed to load core memories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiClient.put('/api/profile/core-memories', memories);

      if (response.success) {
        setSuccess(true);
        setMemories(response.coreMemories);

        if (onSave) {
          onSave(response.coreMemories);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving core memories:', err);
      setError(err.message || 'Failed to save core memories');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CoreMemories, value: any) => {
    setMemories(prev => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges') => {
    const current = memories[field] || [];
    updateField(field, [...current, '']);
  };

  const updateArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges', index: number, value: string) => {
    const current = memories[field] || [];
    const updated = [...current];
    updated[index] = value;
    updateField(field, updated);
  };

  const removeArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges', index: number) => {
    const current = memories[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Core Memories</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your business profile and key information
          </p>
        </div>

        {showHistory && auditLog.length > 0 && (
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <History className="h-4 w-4" />
            {showAuditLog ? 'Hide' : 'Show'} History
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span>Core memories updated successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log */}
      {showAuditLog && auditLog.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Change History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLog.map((entry) => (
              <div key={entry.id} className="text-sm border-l-2 border-purple-400 pl-3 py-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {entry.field_name.replace(/_/g, ' ')}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {entry.source === 'agent' && entry.agent_name && (
                    <span className="text-purple-600 dark:text-purple-400">Updated by {entry.agent_name}</span>
                  )}
                  {entry.source === 'manual' && (
                    <span className="text-blue-600 dark:text-blue-400">Updated manually</span>
                  )}
                  {' • '}
                  {new Date(entry.changed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-8">
        {/* Section 1: Business Identity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Business Identity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={memories.full_name || ''}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={memories.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Outcome
              </label>
              <textarea
                value={memories.business_outcome || ''}
                onChange={(e) => updateField('business_outcome', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="What outcome do you deliver for clients?"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Client Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Client Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Clients
              </label>
              <input
                type="text"
                value={memories.target_clients || ''}
                onChange={(e) => updateField('target_clients', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Who are your ideal clients?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Problems
              </label>
              {(memories.client_problems || []).map((problem, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={problem}
                    onChange={(e) => updateArrayItem('client_problems', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Problem ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('client_problems', index)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('client_problems')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Plus className="h-4 w-4" />
                Add Problem
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Results
              </label>
              <textarea
                value={memories.client_results || ''}
                onChange={(e) => updateField('client_results', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="What tangible results do clients get?"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Methodology */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Methodology</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Core Method
              </label>
              <textarea
                value={memories.core_method || ''}
                onChange={(e) => updateField('core_method', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your core methodology or approach"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frameworks
              </label>
              {(memories.frameworks || []).map((framework, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={framework}
                    onChange={(e) => updateArrayItem('frameworks', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Framework ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('frameworks', index)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('frameworks')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Plus className="h-4 w-4" />
                Add Framework
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Service Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Service Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Description
              </label>
              <textarea
                value={memories.service_description || ''}
                onChange={(e) => updateField('service_description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe your service offering"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pricing Model
                </label>
                <input
                  type="text"
                  value={memories.pricing_model || ''}
                  onChange={(e) => updateField('pricing_model', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., monthly retainer, project-based"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Timeline
                </label>
                <input
                  type="text"
                  value={memories.delivery_timeline || ''}
                  onChange={(e) => updateField('delivery_timeline', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 90 days, 6 months"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Current State */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current State</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Revenue Range
              </label>
              <input
                type="text"
                value={memories.revenue_range || ''}
                onChange={(e) => updateField('revenue_range', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., $10k-$30k/month"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Growth Goals
              </label>
              <textarea
                value={memories.growth_goals || ''}
                onChange={(e) => updateField('growth_goals', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="What are your business growth goals?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Biggest Challenges
              </label>
              {(memories.biggest_challenges || []).map((challenge, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={challenge}
                    onChange={(e) => updateArrayItem('biggest_challenges', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Challenge ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('biggest_challenges', index)}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('biggest_challenges')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Plus className="h-4 w-4" />
                Add Challenge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="
            flex items-center gap-2 px-6 py-3
            bg-purple-600 text-white rounded-md
            hover:bg-purple-700 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Core Memories</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
