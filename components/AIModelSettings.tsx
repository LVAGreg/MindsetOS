'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Settings, Loader2 } from 'lucide-react';
import ModelSelector from './ModelSelector';

export default function AIModelSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selections, setSelections] = useState({
    chat_agents: 'google/gemini-2.0-flash-exp',
    memory_extraction: 'openai/gpt-4o-mini',
    memory_optimization: 'openai/gpt-4o-mini'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchCurrentSelections();
  }, []);

  const fetchCurrentSelections = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models/selections`);
      if (res.ok) {
        const data = await res.json();
        setSelections(data);
      }
    } catch (error) {
      console.error('Failed to fetch selections:', error);
      setSaveMessage('❌ Failed to load current model selections');
    }
  };

  const handleModelChange = (component: string, modelId: string) => {
    setSelections(prev => ({
      ...prev,
      [component]: modelId
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models/selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selections)
      });

      if (res.ok) {
        setSaveMessage('✅ Settings saved! Backend will use new models.');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('❌ Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save selections:', error);
      setSaveMessage('❌ Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default model selections?')) {
      setSelections({
        chat_agents: 'google/gemini-2.0-flash-exp',
        memory_extraction: 'openai/gpt-4o-mini',
        memory_optimization: 'openai/gpt-4o-mini'
      });
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={() => setIsExpanded(true)}
          aria-label="Open AI model settings"
          style={{
            background: 'linear-gradient(to right, #4f6ef7, #7c5bf6)',
            color: '#ededf5',
            padding: '8px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          <Settings className="w-5 h-5" />
          <span style={{ fontWeight: 500 }}>AI Models</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={() => setIsExpanded(false)}
      />
      <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-[600px] max-w-[90vw] animate-slide-down">
        <div
          className="rounded-b-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            background: '#09090f',
            border: '1px solid #1e1e30',
          }}
        >
          {/* Header */}
          <div
            className="p-4"
            style={{
              borderBottom: '1px solid #1e1e30',
              background: 'linear-gradient(to right, #4f6ef7, #7c5bf6)',
              color: '#ededf5',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h3 style={{ fontWeight: 600, margin: 0 }}>AI Model Configuration</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Close AI model settings"
                style={{
                  color: 'rgba(237,237,245,0.8)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#ededf5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(237,237,245,0.8)';
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(237,237,245,0.8)', marginTop: '4px' }}>
              Select AI models for each component - ranked by performance
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="mb-2">
                <h4 className="flex items-center gap-2" style={{ fontWeight: 600, color: '#ededf5', margin: 0 }}>
                  💬 Chat Agents
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9090a8' }}>
                    (All 10 MindsetOS coaches)
                  </span>
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#9090a8', marginTop: '2px' }}>
                  Powers Mindset Score Agent, Reset Guide, Architecture Coach, and all other coach conversations
                </p>
              </div>
              <ModelSelector
                component="chat_agents"
                currentModel={selections.chat_agents}
                onModelChange={(modelId) => handleModelChange('chat_agents', modelId)}
              />
            </div>
            <div>
              <div className="mb-2">
                <h4 className="flex items-center gap-2" style={{ fontWeight: 600, color: '#ededf5', margin: 0 }}>
                  🧠 Memory Extraction
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9090a8' }}>
                    (Background process)
                  </span>
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#9090a8', marginTop: '2px' }}>
                  Analyzes conversations and extracts important memories after each chat
                </p>
              </div>
              <ModelSelector
                component="memory_extraction"
                currentModel={selections.memory_extraction}
                onModelChange={(modelId) => handleModelChange('memory_extraction', modelId)}
              />
            </div>
            <div>
              <div className="mb-2">
                <h4 className="flex items-center gap-2" style={{ fontWeight: 600, color: '#ededf5', margin: 0 }}>
                  ✨ Memory Optimization
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9090a8' }}>
                    (Manual trigger)
                  </span>
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#9090a8', marginTop: '2px' }}>
                  Intelligently merges duplicate memories when you click "Optimize Memory"
                </p>
              </div>
              <ModelSelector
                component="memory_optimization"
                currentModel={selections.memory_optimization}
                onModelChange={(modelId) => handleModelChange('memory_optimization', modelId)}
              />
            </div>

            {/* Tips box */}
            <div
              className="mt-6 p-4 rounded-lg"
              style={{
                background: 'rgba(79,110,247,0.12)',
                border: '1px solid rgba(79,110,247,0.3)',
              }}
            >
              <h4 style={{ fontWeight: 600, color: '#4f6ef7', marginBottom: '8px' }}>
                💡 Model Selection Tips
              </h4>
              <ul style={{ fontSize: '0.875rem', color: '#9090a8', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• <strong style={{ color: '#ededf5' }}>Gemini 2.0 Flash</strong>: FREE and excellent quality!</li>
                <li>• <strong style={{ color: '#ededf5' }}>GPT-4o Mini</strong>: Best value for background tasks</li>
                <li>• <strong style={{ color: '#ededf5' }}>Claude Sonnet 4.5</strong>: Highest quality reasoning</li>
                <li>• Rankings show overall performance (#1 = best)</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div
            className="p-4"
            style={{
              borderTop: '1px solid #1e1e30',
              background: 'rgba(18,18,31,0.8)',
            }}
          >
            {saveMessage && (
              <div
                className="mb-3 text-sm text-center"
                style={{ color: saveMessage.startsWith('✅') ? '#4ade80' : '#f87171' }}
              >
                {saveMessage}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleReset}
                aria-label="Reset to default model selections"
                style={{
                  flex: '1 1 120px',
                  padding: '8px 16px',
                  background: '#1e1e30',
                  color: '#ededf5',
                  border: '1px solid #5a5a72',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#2a2a40';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#1e1e30';
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                aria-label={isSaving ? 'Saving settings…' : 'Save AI model settings'}
                style={{
                  flex: '1 1 120px',
                  padding: '8px 16px',
                  background: isSaving ? '#5a5a72' : 'linear-gradient(to right, #4f6ef7, #7c5bf6)',
                  color: '#ededf5',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1,
                  transition: 'opacity 0.15s, background 0.15s',
                }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
