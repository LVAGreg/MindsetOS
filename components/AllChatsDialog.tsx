'use client';

import { useState, useMemo } from 'react';
import { X, Search, Archive, FolderInput, Star } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { format } from 'date-fns';

interface AllChatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AllChatsDialog({ isOpen, onClose }: AllChatsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const { conversations, projects, moveConversationToProject, deleteConversation } = useAppStore();

  // Get all conversations
  const allConversations = Object.values(conversations);

  // Get abbreviated agent name
  const getAgentAbbreviation = (agentId: string) => {
    const agent = Object.values(MINDSET_AGENTS).find(a => a.id === agentId);
    if (!agent) return '';
    const words = agent.name.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.map(w => w[0]).join('').toUpperCase();
  };

  const getConversationTitle = (conversation: typeof allConversations[0]) => {
    const abbreviation = getAgentAbbreviation(conversation.agentId);
    const prefix = abbreviation ? `${abbreviation}: ` : '';

    if (conversation.title) return prefix + conversation.title;

    const firstUserMessage = conversation.history?.messages
      ? Object.values(conversation.history.messages).find(
          (msg) => msg.role === 'user'
        )
      : null;

    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
      return prefix + firstUserMessage.content.slice(0, 50) + '...';
    }

    return prefix + 'New Conversation';
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return allConversations;

    const query = searchQuery.toLowerCase();
    return allConversations.filter(conv => {
      const title = getConversationTitle(conv).toLowerCase();
      const agent = Object.values(MINDSET_AGENTS).find(a => a.id === conv.agentId);
      const agentName = agent?.name.toLowerCase() || '';
      return title.includes(query) || agentName.includes(query);
    });
  }, [searchQuery, allConversations]);

  // Sort by most recent
  const sortedConversations = filteredConversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Toggle conversation selection
  const toggleSelection = (convId: string) => {
    const newSelected = new Set(selectedConvIds);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedConvIds(newSelected);
  };

  // Select all filtered conversations
  const selectAll = () => {
    setSelectedConvIds(new Set(sortedConversations.map(c => c.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedConvIds(new Set());
  };

  // Archive selected conversations
  const archiveSelected = async () => {
    for (const convId of Array.from(selectedConvIds)) {
      await deleteConversation(convId);
    }
    clearSelection();
  };

  // Move selected to project
  const moveToProject = async (projectId: string) => {
    for (const convId of Array.from(selectedConvIds)) {
      await moveConversationToProject(convId, projectId);
    }
    clearSelection();
    setShowProjectSelector(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              All Conversations
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Selection Actions */}
          {selectedConvIds.size > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedConvIds.size} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowProjectSelector(!showProjectSelector)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                  >
                    <FolderInput className="w-4 h-4" />
                    Move to Project
                  </button>
                  <button
                    onClick={archiveSelected}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                </div>
              </div>

              {/* Project Selector Dropdown */}
              {showProjectSelector && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Project:
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {Object.values(projects).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => moveToProject(project.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color || '#3B82F6' }}
                        />
                        <span className="truncate text-gray-900 dark:text-gray-100">
                          {project.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-4">
            {sortedConversations.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {sortedConversations.length} conversation{sortedConversations.length !== 1 ? 's' : ''}
                  </p>
                  {sortedConversations.length > 0 && (
                    <button
                      onClick={selectAll}
                      className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
                    >
                      Select All
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {sortedConversations.map((conversation) => {
                    const isSelected = selectedConvIds.has(conversation.id);
                    const agent = Object.values(MINDSET_AGENTS).find(a => a.id === conversation.agentId);

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => toggleSelection(conversation.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-yellow-500 bg-yellow-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Conversation Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{agent?.icon || '💬'}</span>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {getConversationTitle(conversation)}
                              </p>
                              {conversation.isStarred && (
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>{agent?.name || 'Unknown Agent'}</span>
                              <span>•</span>
                              <span>{Object.keys(conversation.history?.messages || {}).length} msgs</span>
                              <span>•</span>
                              <span>{format(new Date(conversation.updatedAt), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
