'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MessageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  onSave: (newContent: string) => Promise<void>;
}

export default function MessageEditModal({
  isOpen,
  onClose,
  originalContent,
  onSave,
}: MessageEditModalProps) {
  const [content, setContent] = useState(originalContent);
  const [isSaving, setIsSaving] = useState(false);

  // Update content when modal opens with new message
  useEffect(() => {
    if (isOpen) {
      setContent(originalContent);
    }
  }, [originalContent, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (content.trim() === originalContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (error) {
      console.error('Error saving message:', error);
      alert('Failed to save message. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Edit Message
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Editing this message will create a new conversation branch. You can navigate between
            branches using the arrows.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter your message..."
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || content.trim() === ''}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Update & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
