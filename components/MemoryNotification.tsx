'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Edit2, Tag, Undo, Check, X } from 'lucide-react';

interface MemoryNotificationProps {
  memory: {
    id: string;
    content: string;
    memory_type: string;
    importance_score: number;
  };
  onUndo: (memoryId: string) => void;
  onEdit: (memoryId: string, newContent: string, newImportance: number) => void;
  onTag: (memoryId: string, tags: string[]) => void;
}

export default function MemoryNotification({ memory, onUndo, onEdit, onTag }: MemoryNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [editImportance, setEditImportance] = useState(memory.importance_score);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isTagging, setIsTagging] = useState(false);

  const handleSaveEdit = () => {
    onEdit(memory.id, editContent, editImportance);
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      onTag(memory.id, newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    onTag(memory.id, newTags);
  };

  return (
    <div className="my-3 mx-auto max-w-3xl">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Memory Added
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded">
              {memory.memory_type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-purple-200 dark:border-purple-700 pt-3">
            {/* Memory Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-sm p-2 border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Importance:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editImportance}
                    onChange={(e) => setEditImportance(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium">{(editImportance * 100).toFixed(0)}%</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{memory.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>Importance: {(memory.importance_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag Input */}
            {isTagging && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 text-sm px-2 py-1 border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-purple-200 dark:border-purple-700">
              <button
                onClick={() => onUndo(memory.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <Undo className="w-3 h-3" />
                Undo
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => setIsTagging(!isTagging)}
                className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              >
                <Tag className="w-3 h-3" />
                Tag
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
