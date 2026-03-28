'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api-client';

interface AgentData {
  agent_id: string;
  agent_name: string;
  agent_description: string;
  agent_version: string;
  security_instructions: string;
  voice_tone_instructions: string;
  system_prompt: string;
  workflow_instructions: string;
  handoff_instructions: string;
  is_published: boolean;
  is_active: boolean;
  full_prompt: string;
}

export default function AgentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const version = params.version as string;

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('security');
  const [showPreview, setShowPreview] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAgent();
  }, [agentId, version]);

  async function loadAgent() {
    try {
      setLoadError(null);
      const res = await fetch(`${API_URL}/api/v7/agents/${agentId}/${version}`);
      if (!res.ok) throw new Error('Failed to load agent');

      const data = await res.json();
      setAgent(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }

  function showFeedback(type: 'success' | 'error', text: string) {
    setFeedbackMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  }

  async function saveAgent() {
    if (!agent) return;

    setSaving(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v7/agents/${agentId}/${version}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_name: agent.agent_name,
          agent_description: agent.agent_description,
          security_instructions: agent.security_instructions,
          voice_tone_instructions: agent.voice_tone_instructions,
          system_prompt: agent.system_prompt,
          workflow_instructions: agent.workflow_instructions,
          handoff_instructions: agent.handoff_instructions
        })
      });

      if (!res.ok) throw new Error('Failed to save agent');

      showFeedback('success', 'Agent saved successfully!');
      await loadAgent(); // Reload to get updated full_prompt
    } catch (err: any) {
      showFeedback('error', `Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function publishAgent() {
    setFeedbackMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v7/agents/${agentId}/${version}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) throw new Error('Failed to publish');

      showFeedback('success', 'Agent published!');
      await loadAgent();
    } catch (err: any) {
      showFeedback('error', `Error publishing: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg text-gray-600">Loading agent...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Failed to load agent</div>
          <p className="text-gray-600 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => { setLoading(true); loadAgent(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Agent not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'security', label: 'Security Instructions', field: 'security_instructions' },
    { id: 'voice', label: 'Voice & Tone', field: 'voice_tone_instructions' },
    { id: 'system', label: 'System Prompt', field: 'system_prompt' },
    { id: 'workflow', label: 'Workflow', field: 'workflow_instructions' },
    { id: 'handoff', label: 'Handoff', field: 'handoff_instructions' }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/agents"
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Agents
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{agent.agent_name}</h1>
              <p className="mt-1 text-sm text-gray-600">{agent.agent_description}</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {agent.agent_version}
                </span>
                {agent.is_published ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              {!agent.is_published && (
                <button
                  onClick={publishAgent}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Publish
                </button>
              )}
              <button
                onClick={saveAgent}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Inline feedback banner */}
        {feedbackMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between text-sm ${
              feedbackMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className={`ml-4 font-medium hover:underline ${
                feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {currentTab?.label}
                  </label>
                  <textarea
                    value={agent[currentTab?.field as keyof AgentData] as string || ''}
                    onChange={(e) => setAgent({
                      ...agent,
                      [currentTab?.field as string]: e.target.value
                    })}
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder={`Enter ${currentTab?.label.toLowerCase()}...`}
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Character count: {(agent[currentTab?.field as keyof AgentData] as string || '').length}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={agent.agent_name}
                    onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={agent.agent_description}
                    onChange={(e) => setAgent({ ...agent, agent_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent ID
                  </label>
                  <input
                    type="text"
                    value={agent.agent_id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Section Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Stats</h3>
              <div className="space-y-2 text-sm">
                {tabs.map((tab) => {
                  const content = agent[tab.field as keyof AgentData] as string || '';
                  const wordCount = content.split(/\s+/).filter(Boolean).length;
                  return (
                    <div key={tab.id} className="flex justify-between">
                      <span className="text-gray-600">{tab.label}:</span>
                      <span className="font-medium">{wordCount} words</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>
                    {tabs.reduce((sum, tab) => {
                      const content = agent[tab.field as keyof AgentData] as string || '';
                      return sum + content.split(/\s+/).filter(Boolean).length;
                    }, 0)} words
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/admin/agents/${agentId}/${version}/history`}
                  className="block w-full px-4 py-2 text-center bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  View History
                </Link>
                <button className="block w-full px-4 py-2 text-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                  Delete Draft
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Assembled Prompt Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-lg">
                  {agent.full_prompt}
                </pre>
                <div className="mt-4 text-sm text-gray-500">
                  Total prompt length: {agent.full_prompt.length} characters
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
