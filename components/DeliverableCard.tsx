'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { copyDeliverable, formatContentPreview, CopyFormat } from '../utils/clipboard';

interface DeliverableCardProps {
  title: string;
  content: any;
  agentId: string;
  timestamp: Date;
  icon?: string;
}

export function DeliverableCard({ title, content, agentId, timestamp, icon }: DeliverableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{
    text: boolean;
    json: boolean;
    markdown: boolean;
  }>({
    text: false,
    json: false,
    markdown: false,
  });

  const handleCopy = async (format: CopyFormat) => {
    const success = await copyDeliverable(
      {
        title,
        content,
        agentId,
        timestamp,
      },
      format
    );

    if (success) {
      setCopyStatus((prev) => ({ ...prev, [format]: true }));
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [format]: false }));
      }, 2000);
    }
  };

  const preview = formatContentPreview(content, 150);
  const contentText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  // Get agent color based on agentId
  const getAgentColor = (id: string) => {
    const colors: Record<string, string> = {
      'mindset-score': 'teal',
      'reset-guide': 'blue',
      'architecture-coach': 'yellow',
      'inner-world-mapper': 'purple',
      'accountability-partner': 'green',
      'practice-builder': 'red',
      'story-excavator': 'indigo',
    };
    return colors[id] || 'gray';
  };

  const color = getAgentColor(agentId);

  const colorClasses = {
    teal: 'border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-300',
    blue: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300',
    yellow: 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-300',
    purple: 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-300',
    green: 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300',
    red: 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300',
    indigo: 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300',
    gray: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/10 text-gray-700 dark:text-gray-300',
  };

  return (
    <div className={`border-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1 text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Preview (when collapsed) */}
        {!isExpanded && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {preview}
          </p>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-current/20">
          <div className="p-4">
            <pre className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-3 rounded border border-current/20 overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words">
              {contentText}
            </pre>
          </div>
        </div>
      )}

      {/* Copy Buttons Footer */}
      <div className="border-t border-current/20 p-3 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">
          Copy as:
        </span>

        {/* Text Button */}
        <button
          onClick={() => handleCopy('text')}
          disabled={copyStatus.text}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-current/30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {copyStatus.text ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span>Text</span>
            </>
          )}
        </button>

        {/* JSON Button */}
        <button
          onClick={() => handleCopy('json')}
          disabled={copyStatus.json}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-current/30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {copyStatus.json ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>JSON</span>
            </>
          )}
        </button>

        {/* Markdown Button */}
        <button
          onClick={() => handleCopy('markdown')}
          disabled={copyStatus.markdown}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-gray-800 border border-current/30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {copyStatus.markdown ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
