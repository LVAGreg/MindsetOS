'use client';

import { useState } from 'react';
import { MoreVertical, Star, FolderInput, Edit, Archive, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ConversationMenuProps {
  conversationId: string;
  isStarred: boolean;
  onRename: () => void;
  onMoveToProject: () => void;
}

export default function ConversationMenu({
  conversationId,
  isStarred,
  onRename,
  onMoveToProject,
}: ConversationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toggleStarConversation, archiveConversation, deleteConversation } = useAppStore();

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleStarConversation(conversationId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archiveConversation(conversationId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await deleteConversation(conversationId);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        aria-label="Conversation options"
      >
        <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              {/* Star/Unstar */}
              <button
                onClick={handleToggleStar}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
                <span>{isStarred ? 'Unstar' : 'Star'} conversation</span>
              </button>

              {/* Move to Project */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onMoveToProject();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FolderInput className="w-4 h-4 text-gray-500" />
                <span>Move to project</span>
              </button>

              {/* Rename */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onRename();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4 text-gray-500" />
                <span>Rename</span>
              </button>

              {/* Archive */}
              <button
                onClick={handleArchive}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Archive className="w-4 h-4 text-gray-500" />
                <span>Archive</span>
              </button>

              {/* Delete */}
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
