'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronRight, Copy, Check, Edit3 } from 'lucide-react';

interface MemoryContextSuggestionProps {
  contextMessage: string;
  memoryCount: number;
  onUseContext: (message: string) => void;
  onDismiss: () => void;
}

export default function MemoryContextSuggestion({
  contextMessage,
  memoryCount,
  onUseContext,
  onDismiss
}: MemoryContextSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(contextMessage);
  const [copied, setCopied] = useState(false);

  const handleUseContext = () => {
    onUseContext(editedMessage);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="text-left">
            <div className="font-semibold text-blue-900 dark:text-blue-100">
              💡 Memory Context Available
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              Found {memoryCount} relevant {memoryCount === 1 ? 'memory' : 'memories'} from your previous conversations
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-blue-200 dark:border-blue-800">
          {/* Message Preview/Edit */}
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={8}
              />
            ) : (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                  {editedMessage}
                </pre>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleUseContext}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Use This Context
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2"
              title={isEditing ? "Preview" : "Edit"}
            >
              <Edit3 className="w-4 h-4" />
              {isEditing ? 'Preview' : 'Edit'}
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={onDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
