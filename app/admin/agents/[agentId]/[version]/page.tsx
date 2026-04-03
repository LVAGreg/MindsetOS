'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  const agentId = params.agentId as string;
  const version = params.version as string;

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
      await loadAgent();
    } catch (err: any) {
      showFeedback('error', `Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function publishAgent() {
    if (publishing) return;
    setPublishing(true);
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
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4f6ef7', borderTopColor: 'transparent' }} />
          <span className="text-lg" style={{ color: '#9090a8' }}>Loading agent...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="rounded-2xl shadow-xl max-w-md p-8 text-center" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
          <div className="text-lg font-semibold mb-2" style={{ color: '#f87171' }}>Failed to load agent</div>
          <p className="text-sm mb-4" style={{ color: '#9090a8' }}>{loadError}</p>
          <button
            onClick={() => { setLoading(true); loadAgent(); }}
            className="bg-[#4f6ef7] hover:bg-[#3d5ce0] font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
          style={{ color: '#ededf5' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-lg" style={{ color: '#f87171' }}>Agent not found</div>
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
    <div className="min-h-screen py-8" style={{ background: '#09090f' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/agents"
            className="text-sm mb-4 inline-block transition-colors"
            style={{ color: '#7b8ff8' }}
          >
            ← Back to Agents
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>{agent.agent_name}</h1>
              <p className="mt-1 text-sm" style={{ color: '#9090a8' }}>{agent.agent_description}</p>
              <div className="mt-2 flex gap-2">
                <span style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8', borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
                  {agent.agent_version}
                </span>
                {agent.is_published ? (
                  <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
                    Published
                  </span>
                ) : (
                  <span style={{ background: 'rgba(252,200,36,0.1)', border: '1px solid rgba(252,200,36,0.25)', color: '#fcc824', borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
                    Draft
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#9090a8' }}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              {!agent.is_published && (
                <button
                  onClick={publishAgent}
                  disabled={publishing}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              )}
              <button
                onClick={saveAgent}
                disabled={saving}
                className="font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
                style={{ background: '#fcc824', color: '#09090f' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Inline feedback banner */}
        {feedbackMessage && (
          <div
            className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between text-sm"
            style={feedbackMessage.type === 'success'
              ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
              : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="ml-4 font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              {/* Tabs */}
              <div style={{ borderBottom: '1px solid #1e1e30' }}>
                <nav className="flex -mb-px overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors"
                      style={activeTab === tab.id
                        ? { borderBottom: '2px solid #4f6ef7', color: '#7b8ff8' }
                        : { borderBottom: '2px solid transparent', color: '#9090a8' }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#9090a8' }}>
                    {currentTab?.label}
                  </label>
                  <textarea
                    value={agent[currentTab?.field as keyof AgentData] as string || ''}
                    onChange={(e) => setAgent({
                      ...agent,
                      [currentTab?.field as string]: e.target.value
                    })}
                    rows={20}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #1e1e30', color: '#ededf5', fontFamily: 'monospace' }}
                    placeholder={`Enter ${currentTab?.label.toLowerCase()}...`}
                  />
                </div>

                <div className="text-xs" style={{ color: '#9090a8' }}>
                  Character count: {(agent[currentTab?.field as keyof AgentData] as string || '').length}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#ededf5' }}>Agent Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={agent.agent_name}
                    onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Description
                  </label>
                  <textarea
                    value={agent.agent_description}
                    onChange={(e) => setAgent({ ...agent, agent_description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                    Agent ID
                  </label>
                  <input
                    type="text"
                    value={agent.agent_id}
                    disabled
                    className="w-full rounded-xl px-4 py-3 text-sm font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1e1e30', color: '#9090a8' }}
                  />
                </div>
              </div>
            </div>

            {/* Section Stats */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#ededf5' }}>Section Stats</h3>
              <div className="space-y-2 text-sm">
                {tabs.map((tab) => {
                  const content = agent[tab.field as keyof AgentData] as string || '';
                  const wordCount = content.split(/\s+/).filter(Boolean).length;
                  return (
                    <div key={tab.id} className="flex justify-between">
                      <span style={{ color: '#9090a8' }}>{tab.label}:</span>
                      <span className="font-medium" style={{ color: '#ededf5' }}>{wordCount} words</span>
                    </div>
                  );
                })}
                <div className="pt-2 flex justify-between font-semibold" style={{ borderTop: '1px solid #1e1e30' }}>
                  <span style={{ color: '#9090a8' }}>Total:</span>
                  <span style={{ color: '#ededf5' }}>
                    {tabs.reduce((sum, tab) => {
                      const content = agent[tab.field as keyof AgentData] as string || '';
                      return sum + content.split(/\s+/).filter(Boolean).length;
                    }, 0)} words
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#ededf5' }}>Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/admin/agents/${agentId}/${version}/history`}
                  className="block w-full px-4 py-2.5 text-center rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#9090a8' }}
                >
                  View History
                </Link>
                <button
                  onClick={() => showFeedback('error', 'Delete is not yet implemented in this version.')}
                  className="block w-full px-4 py-2.5 text-center rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                >
                  Delete Draft
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30', borderRadius: 16 }}>
              <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
                <h2 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Assembled Prompt Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="transition-opacity hover:opacity-70"
                  style={{ color: '#9090a8' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <pre
                  className="whitespace-pre-wrap text-sm p-4 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #1e1e30', color: '#ededf5', fontFamily: 'monospace' }}
                >
                  {agent.full_prompt}
                </pre>
                <div className="mt-4 text-sm" style={{ color: '#9090a8' }}>
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
