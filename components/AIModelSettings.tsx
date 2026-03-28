'use client';

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Settings } from 'lucide-react';
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
      setSaveMessage('❌ Error saving settings');
      console.error('Failed to save selections:', error);
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
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">AI Models</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={() => setIsExpanded(false)}
      />
      <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-[600px] max-w-[90vw] animate-slide-down">
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h3 className="font-semibold">AI Model Configuration</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white transition-colors text-2xl leading-none hover:bg-white/20 rounded px-2 py-1"
                title="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/80 mt-1">
              Select AI models for each component - ranked by performance
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  💬 Chat Agents
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    (All 6 MindsetOS agents)
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Powers Money Model Mapper, Offer Invitation Architect, and all other agent conversations
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
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  🧠 Memory Extraction
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    (Background process)
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
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
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  ✨ Memory Optimization
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    (Manual trigger)
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Intelligently merges duplicate memories when you click "Optimize Memory"
                </p>
              </div>
              <ModelSelector
                component="memory_optimization"
                currentModel={selections.memory_optimization}
                onModelChange={(modelId) => handleModelChange('memory_optimization', modelId)}
              />
            </div>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                💡 Model Selection Tips
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• <strong>Gemini 2.0 Flash</strong>: FREE and excellent quality!</li>
                <li>• <strong>GPT-4o Mini</strong>: Best value for background tasks</li>
                <li>• <strong>Claude Sonnet 4.5</strong>: Highest quality reasoning</li>
                <li>• Rankings show overall performance (#1 = best)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            {saveMessage && (
              <div className={`mb-3 text-sm text-center ${saveMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
