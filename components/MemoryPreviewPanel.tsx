'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';

interface MemoryItem {
  key: string;
  label: string;
  value: string;
  source: string; // Which agent provided this data
}

interface MemoryPreviewPanelProps {
  importedMemory: MemoryItem[];
  onMemoryUpdate?: (updatedMemory: MemoryItem[]) => void;
  onConfirm?: () => void;
}

export function MemoryPreviewPanel({ importedMemory, onMemoryUpdate, onConfirm }: MemoryPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMemory, setEditedMemory] = useState<MemoryItem[]>(importedMemory);
  const [confirmed, setConfirmed] = useState(false);

  // If no imported memory, don't render
  if (!importedMemory || importedMemory.length === 0) {
    return null;
  }

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMemory([...importedMemory]);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (onMemoryUpdate) {
      onMemoryUpdate(editedMemory);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedMemory([...importedMemory]);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleFieldChange = (index: number, newValue: string) => {
    const updated = [...editedMemory];
    updated[index].value = newValue;
    setEditedMemory(updated);
  };

  // Get unique source agents for color coding
  const sourceColors: Record<string, string> = {
    'client-onboarding': 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700',
    'money-model-maker': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    'fast-fix-finder': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    'offer-promo-printer': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    'promo-planner': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    'default': 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
  };

  const getSourceColor = (source: string) => {
    return sourceColors[source] || sourceColors['default'];
  };

  const getSourceName = (source: string) => {
    const names: Record<string, string> = {
      'client-onboarding': 'Client Onboarding',
      'mindset-score': 'Mindset Score Agent',
      'reset-guide': 'Reset Guide',
      'architecture-coach': 'Architecture Coach',
      'inner-world-mapper': 'Inner World Mapper',
      'practice-builder': 'Practice Builder',
      'decision-framework': 'Decision Framework Agent',
      'accountability-partner': 'Accountability Partner',
      'story-excavator': 'Story Excavator',
      'conversation-curator': 'Conversation Curator',
      'launch-companion': 'Launch Companion',
    };
    return names[source] || 'Previous Coach';
  };

  return (
    <div className="mb-4 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            <span>📋 Imported Context ({importedMemory.length} items)</span>
          </button>
          {confirmed && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <Check className="w-4 h-4" /> Confirmed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!confirmed && !isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-md transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md transition-colors flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Confirm & Continue
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900/30 rounded-md transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md transition-colors flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This agent will use the following context from your previous conversations.
            {!confirmed && ' Review and edit if needed, then confirm to continue.'}
          </p>

          <div className="space-y-2">
            {(isEditing ? editedMemory : importedMemory).map((item, index) => (
              <div
                key={item.key}
                className={`border-2 rounded-md p-3 ${getSourceColor(item.source)}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {item.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                    from {getSourceName(item.source)}
                  </span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedMemory[index].value}
                    onChange={(e) => handleFieldChange(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {item.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!confirmed && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> The agent will use this context to provide more personalized and relevant guidance.
                Click "Edit" to modify any information before proceeding.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
