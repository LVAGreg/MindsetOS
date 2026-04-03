'use client';

import { useState, useMemo } from 'react';
import { X, Search, Archive, FolderInput, Star, Loader2 } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { format } from 'date-fns';

interface AllChatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Token palette ────────────────────────────────────────────────────────────
const T = {
  bg:         '#09090f',
  bgPanel:    'rgba(18,18,31,0.8)',
  bgCard:     '#1e1e30',
  textPri:    '#ededf5',
  textSec:    '#9090a8',
  textMuted:  '#5a5a72',
  accent:     '#4f6ef7',
  amber:      '#fcc824',
  amberAlpha: 'rgba(252,200,36,0.15)',
  purple:     '#7c5bf6',
  border:     'rgba(237,237,245,0.08)',
  borderHov:  'rgba(237,237,245,0.14)',
} as const;
// ──────────────────────────────────────────────────────────────────────────────

export default function AllChatsDialog({ isOpen, onClose }: AllChatsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { conversations, projects, moveConversationToProject, deleteConversation } = useAppStore();

  // Get all conversations
  const allConversations = Object.values(conversations);

  // Get abbreviated agent name
  const getAgentAbbreviation = (agentId: string) => {
    const agent = Object.values(MINDSET_AGENTS).find(a => a.id === agentId);
    if (!agent) return '';
    const words = agent.name.split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase();
  };

  const getConversationTitle = (conversation: typeof allConversations[0]) => {
    const abbreviation = getAgentAbbreviation(conversation.agentId);
    const prefix = abbreviation ? `${abbreviation}: ` : '';

    if (conversation.title) return prefix + conversation.title;

    const firstUserMessage = conversation.history?.messages
      ? Object.values(conversation.history.messages).find(msg => msg.role === 'user')
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

  const toggleSelection = (convId: string) => {
    const newSelected = new Set(selectedConvIds);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedConvIds(newSelected);
  };

  const selectAll = () => {
    setSelectedConvIds(new Set(sortedConversations.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedConvIds(new Set());
    setError(null);
  };

  const archiveSelected = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      for (const convId of Array.from(selectedConvIds)) {
        await deleteConversation(convId);
      }
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive conversations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToProject = async (projectId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      for (const convId of Array.from(selectedConvIds)) {
        await moveConversationToProject(convId, projectId);
      }
      clearSelection();
      setShowProjectSelector(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move conversations');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
          style={{ background: T.bgCard, border: `1px solid ${T.border}` }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            <h2 className="text-lg font-semibold" style={{ color: T.textPri }}>
              All Conversations
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded transition-colors"
              style={{ color: T.textSec }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.bgPanel; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: T.textMuted }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  color: T.textPri,
                  // ring color via focus ring below can't be inline — use a wrapper or accept outline
                }}
              />
            </div>
          </div>

          {/* Selection Actions */}
          {selectedConvIds.size > 0 && (
            <div
              className="p-4"
              style={{
                background: T.amberAlpha,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {/* Error banner */}
              {error && (
                <p className="text-xs mb-2 px-2 py-1 rounded" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium" style={{ color: T.textPri }}>
                  {selectedConvIds.size} selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={clearSelection}
                    disabled={isSubmitting}
                    aria-label="Clear selection"
                    className="px-3 py-1 text-sm rounded transition-colors"
                    style={{ color: T.textSec }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.bgPanel; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowProjectSelector(!showProjectSelector)}
                    disabled={isSubmitting}
                    aria-label="Move selected to project"
                    className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                    style={{
                      background: T.accent,
                      color: T.textPri,
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    <FolderInput className="w-4 h-4" />
                    Move to Project
                  </button>
                  <button
                    onClick={archiveSelected}
                    disabled={isSubmitting}
                    aria-label="Archive selected conversations"
                    className="flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors"
                    style={{
                      background: '#c0392b',
                      color: T.textPri,
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    Archive
                  </button>
                </div>
              </div>

              {/* Project Selector Dropdown */}
              {showProjectSelector && (
                <div
                  className="mt-3 p-3 rounded-lg"
                  style={{ background: T.bg, border: `1px solid ${T.border}` }}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: T.textSec }}>
                    Select Project:
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {Object.values(projects).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => moveToProject(project.id)}
                        disabled={isSubmitting}
                        aria-label={`Move to project: ${project.name}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-colors"
                        style={{
                          color: T.textPri,
                          opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = T.bgPanel; }}
                        onMouseLeave={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color || T.accent }}
                        />
                        <span className="truncate">{project.name}</span>
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
                <Search className="w-12 h-12 mx-auto mb-3" style={{ color: T.textMuted }} />
                <p className="text-sm" style={{ color: T.textSec }}>
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                  <p className="text-sm" style={{ color: T.textSec }}>
                    {sortedConversations.length} conversation{sortedConversations.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={selectAll}
                    aria-label="Select all conversations"
                    className="text-sm hover:underline"
                    style={{ color: T.amber }}
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-2">
                  {sortedConversations.map((conversation) => {
                    const isSelected = selectedConvIds.has(conversation.id);
                    const agent = Object.values(MINDSET_AGENTS).find(a => a.id === conversation.agentId);

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => toggleSelection(conversation.id)}
                        className="p-3 rounded-lg cursor-pointer transition-colors"
                        style={{
                          border: `2px solid ${isSelected ? T.amber : T.border}`,
                          background: isSelected ? T.amberAlpha : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = T.bgPanel;
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{
                                border: `2px solid ${isSelected ? T.amber : T.textMuted}`,
                                background: isSelected ? T.amber : 'transparent',
                              }}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="#09090f"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
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
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: T.textPri }}
                              >
                                {getConversationTitle(conversation)}
                              </p>
                              {conversation.isStarred && (
                                <Star
                                  className="w-3 h-3 flex-shrink-0"
                                  style={{ fill: T.amber, color: T.amber }}
                                  aria-label="Starred"
                                />
                              )}
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                              style={{ color: T.textMuted }}
                            >
                              <span>{agent?.name || 'Unknown Agent'}</span>
                              <span aria-hidden="true">•</span>
                              <span>{Object.keys(conversation.history?.messages || {}).length} msgs</span>
                              <span aria-hidden="true">•</span>
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
