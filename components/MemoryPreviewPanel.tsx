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

// Token map for source-agent card accents (bg, border) — all inline, no Tailwind color tokens
const sourceStyles: Record<string, { background: string; border: string }> = {
  'mindset-score':        { background: 'rgba(20,184,166,0.08)',  border: '1px solid rgba(20,184,166,0.3)'  },
  'reset-guide':          { background: 'rgba(79,110,247,0.08)',  border: '1px solid rgba(79,110,247,0.3)'  },
  'architecture-coach':   { background: 'rgba(252,200,36,0.08)',  border: '1px solid rgba(252,200,36,0.3)'  },
  'inner-world-mapper':   { background: 'rgba(124,91,246,0.08)',  border: '1px solid rgba(124,91,246,0.3)'  },
  'accountability-partner': { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)'  },
  'default':              { background: 'rgba(144,144,168,0.08)', border: '1px solid rgba(144,144,168,0.3)' },
};

function getSourceStyle(source: string) {
  return sourceStyles[source] ?? sourceStyles['default'];
}

const getSourceName = (source: string) => {
  const names: Record<string, string> = {
    'client-onboarding':      'Welcome Guide',
    'mindset-score':          'Mindset Score Agent',
    'reset-guide':            'Reset Guide',
    'architecture-coach':     'Architecture Coach',
    'inner-world-mapper':     'Inner World Mapper',
    'practice-builder':       'Practice Builder',
    'decision-framework':     'Decision Framework Agent',
    'accountability-partner': 'Accountability Partner',
    'story-excavator':        'Story Excavator',
    'conversation-curator':   'Conversation Curator',
    'launch-companion':       'Launch Companion',
  };
  return names[source] || 'Previous Coach';
};

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

  return (
    <div
      className="mb-4 rounded-lg shadow-sm"
      style={{
        border: '2px solid rgba(79,110,247,0.4)',
        background: 'rgba(79,110,247,0.06)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse imported context' : 'Expand imported context'}
            className="flex items-center gap-2 font-semibold transition-colors"
            style={{ color: '#4f6ef7' }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            <span>📋 Imported Context ({importedMemory.length} items)</span>
          </button>
          {confirmed && (
            <span
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: '#4ade80' }}
            >
              <Check className="w-4 h-4" aria-hidden="true" /> Confirmed
            </span>
          )}
        </div>

        {/* Action buttons — flex-wrap so they stack on mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          {!confirmed && !isEditing && (
            <>
              <button
                onClick={handleEdit}
                aria-label="Edit imported context"
                className="px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                style={{ color: '#4f6ef7', background: 'rgba(79,110,247,0.1)' }}
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
                Edit
              </button>
              <button
                onClick={handleConfirm}
                aria-label="Confirm and continue"
                className="px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                style={{ color: '#ededf5', background: '#4f6ef7' }}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Confirm &amp; Continue
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                aria-label="Cancel editing"
                className="px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                style={{ color: '#9090a8', background: 'rgba(144,144,168,0.1)' }}
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                aria-label="Save changes"
                className="px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                style={{ color: '#ededf5', background: '#4f6ef7' }}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm" style={{ color: '#9090a8' }}>
            This agent will use the following context from your previous conversations.
            {!confirmed && ' Review and edit if needed, then confirm to continue.'}
          </p>

          <div className="space-y-2">
            {(isEditing ? editedMemory : importedMemory).map((item, index) => {
              const accentStyle = getSourceStyle(item.source);
              return (
                <div
                  key={item.key}
                  className="rounded-md p-3"
                  style={{
                    background: accentStyle.background,
                    border: accentStyle.border,
                  }}
                >
                  <div className="flex items-start justify-between mb-1 flex-wrap gap-1">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#9090a8' }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="text-xs italic"
                      style={{ color: '#5a5a72' }}
                    >
                      from {getSourceName(item.source)}
                    </span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedMemory[index].value}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md"
                      style={{
                        background: 'rgba(18,18,31,0.8)',
                        border: '1px solid #1e1e30',
                        color: '#ededf5',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium" style={{ color: '#ededf5' }}>
                      {item.value}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {!confirmed && (
            <div
              className="mt-3 p-3 rounded-md"
              style={{
                background: 'rgba(79,110,247,0.08)',
                border: '1px solid rgba(79,110,247,0.25)',
              }}
            >
              <p className="text-xs" style={{ color: '#9090a8' }}>
                💡 <strong style={{ color: '#ededf5' }}>Tip:</strong>{' '}
                The agent will use this context to provide more personalized and relevant guidance.
                Click &ldquo;Edit&rdquo; to modify any information before proceeding.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
