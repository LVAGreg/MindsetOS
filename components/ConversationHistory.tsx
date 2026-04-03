'use client';

import { MessageSquare, Star, List, BarChart2, ArrowRight } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { useState } from 'react';
import ConversationMenu from './ConversationMenu';
import RenameDialog from './RenameDialog';
import ProjectSelector from './ProjectSelector';
import AllChatsDialog from './AllChatsDialog';

interface ConversationHistoryProps {
  currentAgentData?: {
    id: string;
    name: string;
    icon: string;
    accent_color?: string;
  } | null;
  filterStarred?: boolean;
  allAgents?: Array<{
    id: string;
    name: string;
    accent_color?: string;
  }>;
  onConversationSelect?: () => void;
}

export default function ConversationHistory({ currentAgentData, filterStarred, allAgents = [], onConversationSelect }: ConversationHistoryProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [projectSelectorConvId, setProjectSelectorConvId] = useState<string | null>(null);
  const [allChatsDialogOpen, setAllChatsDialogOpen] = useState(false);
  const [showAllStarred, setShowAllStarred] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    currentAgent,
    setCurrentAgent,
    createConversation,
  } = useAppStore();

  // Handle conversation click - also update the active agent
  const handleConversationClick = (conversation: { id: string; agentId: string }) => {
    setCurrentConversation(conversation.id);

    // Update the current agent to match the conversation's agent
    // Convert lowercase-hyphenated ID to uppercase key (e.g., 'mindset-score' -> 'MINDSET_SCORE')
    const agentKey = conversation.agentId.toUpperCase().replace(/-/g, '_');
    setCurrentAgent(agentKey as Parameters<typeof setCurrentAgent>[0]);

    // Close agent browser if callback provided
    onConversationSelect?.();
  };

  // Use passed agent data - only use fallback if currentAgentData is undefined (not explicitly null)
  const agentData = currentAgentData !== null
    ? (currentAgentData || (currentAgent ? MINDSET_AGENTS[currentAgent] : null))
    : null; // Explicitly null means show all agents

  // Filter conversations based on agent and starred status
  let agentConversations = agentData
    ? Object.values(conversations).filter(
        (conv) => conv.agentId === agentData.id
      )
    : Object.values(conversations); // Show all conversations when agentData is null

  // Apply starred filter if specified
  if (filterStarred !== undefined) {
    agentConversations = agentConversations.filter(
      (conv) => filterStarred ? conv.isStarred === true : conv.isStarred !== true
    );
  }

  const handleNewConversation = () => {
    if (!agentData) return;
    const newConvId = createConversation(agentData.id);
    setCurrentConversation(newConvId);
  };

  const handleRename = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setRenameDialogOpen(true);
  };

  const handleMoveToProject = (conversationId: string) => {
    setProjectSelectorConvId(conversationId);
    setProjectSelectorOpen(true);
  };

  // Get abbreviated agent name
  const getAgentAbbreviation = (agentId: string) => {
    // First try to find agent in allAgents (from database)
    let agent = allAgents.find(a => a.id === agentId);
    let agentName = agent?.name;

    // If not found, try to find in MINDSET_AGENTS
    if (!agent) {
      const ecosAgent = Object.values(MINDSET_AGENTS).find(a => a.id === agentId);
      agentName = ecosAgent?.name;
    }

    if (!agentName) return '';

    // Create abbreviation from agent name
    const words = agentName.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.map(w => w[0]).join('').toUpperCase();
  };

  // Get agent accent color
  const getAgentAccentColor = (agentId: string): string => {
    const agent = allAgents.find(a => a.id === agentId);
    return agent?.accent_color || '#3B82F6';
  };

  const getConversationTitle = (conversation: typeof agentConversations[0], includePrefix = false) => {
    const abbreviation = includePrefix ? getAgentAbbreviation(conversation.agentId) : '';
    const prefix = abbreviation ? `${abbreviation}: ` : '';

    if (conversation.title && !conversation.title.startsWith('Conversation with ')) return prefix + conversation.title;

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

  // Format date for display - short format
  const getShortDate = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return '';
      if (isToday(date)) {
        return format(date, 'h:mm a'); // "3:45 PM"
      }
      if (isYesterday(date)) {
        return 'Yesterday';
      }
      if (isThisWeek(date)) {
        return format(date, 'EEE'); // "Mon", "Tue"
      }
      return format(date, 'MMM d'); // "Dec 15"
    } catch {
      return '';
    }
  };

  // Get conversation title without agent abbreviation prefix (for editing)
  const getRawConversationTitle = (conversation: typeof agentConversations[0]) => {
    if (conversation.title) return conversation.title;

    const firstUserMessage = conversation.history?.messages
      ? Object.values(conversation.history.messages).find(
          (msg) => msg.role === 'user'
        )
      : null;

    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
      return firstUserMessage.content.slice(0, 50) + '...';
    }

    return 'New Conversation';
  };

  // Date grouping helpers
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPrevious7Days = (date: Date) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    return date > sevenDaysAgo && !isToday(date);
  };

  const isThisMonth = (date: Date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear() &&
           !isToday(date) &&
           !isPrevious7Days(date);
  };

  const isLastMonth = (date: Date) => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    return date.getMonth() === lastMonth.getMonth() &&
           date.getFullYear() === lastMonth.getFullYear();
  };

  // Sort conversations by most recent
  const sortedConversations = agentConversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // For starred: show top 5, expandable to all
  // For recent: show top 5, expandable to 30, then "All Chats" dialog
  const isStarredView = filterStarred === true;
  const isRecentView = filterStarred === undefined;

  let displayedConversations = sortedConversations;
  if (isStarredView) {
    displayedConversations = showAllStarred ? sortedConversations : sortedConversations.slice(0, 5);
  } else if (isRecentView) {
    displayedConversations = showAllRecent ? sortedConversations.slice(0, 30) : sortedConversations.slice(0, 5);
  }

  // Group conversations by time period (only for recent view with expanded list)
  const shouldGroupByDate = isRecentView && showAllRecent;

  const groupedConversations = shouldGroupByDate ? {
    today: displayedConversations.filter(c => isToday(new Date(c.updatedAt))),
    previous7Days: displayedConversations.filter(c => isPrevious7Days(new Date(c.updatedAt))),
    thisMonth: displayedConversations.filter(c => isThisMonth(new Date(c.updatedAt))),
    lastMonth: displayedConversations.filter(c => isLastMonth(new Date(c.updatedAt))),
  } : {
    today: [],
    previous7Days: [],
    thisMonth: [],
    lastMonth: [],
  };

  // Render conversation item
  const renderConversation = (conversation: typeof agentConversations[0]) => {
    const isActive = currentConversationId === conversation.id;
    const accentColor = getAgentAccentColor(conversation.agentId);
    // Show prefix only when viewing all agents (Recent/Starred sections)
    const showPrefix = !agentData;
    const title = getConversationTitle(conversation, showPrefix);
    const fullTitle = getConversationTitle(conversation, true); // Always include prefix for tooltip
    const shortDate = getShortDate(conversation.updatedAt);

    return (
      <div
        key={conversation.id}
        onClick={() => handleConversationClick(conversation)}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.8)';
        }}
        title={fullTitle}
        className="w-full text-left px-2 py-1.5 rounded-lg transition-colors group cursor-pointer relative"
        style={{
          background: isActive ? 'rgba(252,200,36,0.1)' : 'rgba(18,18,31,0.8)',
          border: isActive ? '1px solid #fcc824' : '1px solid #1e1e30',
          borderLeftWidth: '3px',
          borderLeftColor: accentColor,
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0 flex items-center gap-1">
            {conversation.isStarred && (
              <Star className="w-3 h-3 flex-shrink-0" style={{ color: '#fcc824', fill: '#fcc824' }} />
            )}
            <p
              className="text-xs font-medium truncate flex-1"
              style={{ color: isActive ? '#ededf5' : '#ededf5' }}
            >
              {title}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {shortDate && (
              <span className="text-[10px] whitespace-nowrap" style={{ color: '#5a5a72' }}>
                {shortDate}
              </span>
            )}
            <ConversationMenu
              conversationId={conversation.id}
              isStarred={conversation.isStarred || false}
              onRename={() => handleRename(conversation.id)}
              onMoveToProject={() => handleMoveToProject(conversation.id)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-transparent flex flex-col">
      {/* Conversation list */}
      <div className="w-full">
        {agentConversations.length === 0 ? (
          filterStarred === true ? (
            /* Starred empty state */
            <div className="px-3 py-4 text-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                style={{ background: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.18)' }}
              >
                <Star className="w-4 h-4" style={{ color: '#fcc824' }} />
              </div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#ededf5' }}>Nothing starred yet</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#9090a8' }}>
                Star any conversation to pin it here for quick access.
              </p>
            </div>
          ) : currentAgentData ? (
            /* This Agent empty state — encourage first message */
            <div className="px-3 py-4 text-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e30' }}
              >
                <MessageSquare className="w-4 h-4" style={{ color: '#9090a8' }} />
              </div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#ededf5' }}>No sessions yet</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#9090a8' }}>
                Start a conversation to see it here.
              </p>
            </div>
          ) : (
            /* Recent / All empty state — first-time nudge toward Mindset Score */
            <div className="px-3 py-4">
              <div
                className="rounded-xl border border-dashed p-3.5 text-center"
                style={{ borderColor: 'rgba(252,200,36,0.3)', background: 'rgba(252,200,36,0.04)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                  style={{ background: 'rgba(252,200,36,0.1)', border: '1.5px solid rgba(252,200,36,0.2)' }}
                >
                  <BarChart2 className="w-4 h-4" style={{ color: '#fcc824' }} />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#ededf5' }}>
                  Start with your Mindset Score
                </p>
                <p className="text-[11px] leading-relaxed mb-3" style={{ color: '#9090a8' }}>
                  Free, 5 questions, 3 minutes. Find out exactly where to focus first.
                </p>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = '/dashboard?agent=mindset-score';
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #fcc824, #e6b400)', color: '#09090f' }}
                >
                  Take the score
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* For starred or recent (not expanded): show simple list */}
            {!shouldGroupByDate && (
              <>
                <div className="space-y-1">
                  {displayedConversations.map(renderConversation)}
                </div>

                {/* Show More button */}
                {isStarredView && !showAllStarred && sortedConversations.length > 5 && (
                  <div className="mt-2 px-2">
                    <button
                      onClick={() => setShowAllStarred(true)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ color: '#9090a8', background: 'transparent' }}
                    >
                      Show More ({sortedConversations.length - 5} more)
                    </button>
                  </div>
                )}

                {isRecentView && !showAllRecent && sortedConversations.length > 5 && (
                  <div className="mt-2 px-2">
                    <button
                      onClick={() => setShowAllRecent(true)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{ color: '#9090a8', background: 'transparent' }}
                    >
                      Show More ({Math.min(sortedConversations.length - 5, 25)} more)
                    </button>
                  </div>
                )}
              </>
            )}

            {/* For recent expanded: show grouped by date */}
            {shouldGroupByDate && (
              <>
                {/* Today */}
                {groupedConversations.today.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold px-2 mb-1" style={{ color: '#9090a8' }}>
                      Today
                    </h3>
                    <div className="space-y-1">
                      {groupedConversations.today.map(renderConversation)}
                    </div>
                  </div>
                )}

                {/* Previous 7 Days */}
                {groupedConversations.previous7Days.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold px-2 mb-1" style={{ color: '#9090a8' }}>
                      Previous 7 Days
                    </h3>
                    <div className="space-y-1">
                      {groupedConversations.previous7Days.map(renderConversation)}
                    </div>
                  </div>
                )}

                {/* Earlier this Month */}
                {groupedConversations.thisMonth.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold px-2 mb-1" style={{ color: '#9090a8' }}>
                      Earlier this Month
                    </h3>
                    <div className="space-y-1">
                      {groupedConversations.thisMonth.map(renderConversation)}
                    </div>
                  </div>
                )}

                {/* Last Month */}
                {groupedConversations.lastMonth.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold px-2 mb-1" style={{ color: '#9090a8' }}>
                      Last Month
                    </h3>
                    <div className="space-y-1">
                      {groupedConversations.lastMonth.map(renderConversation)}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* All Chats Button - Only show for Recent Chats after expanded */}
            {isRecentView && showAllRecent && sortedConversations.length > 30 && (
              <div className="mt-4 px-2">
                <button
                  onClick={() => setAllChatsDialogOpen(true)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: '#9090a8', background: 'transparent' }}
                >
                  <List className="w-4 h-4" />
                  All Chats ({sortedConversations.length - 30} more)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AllChatsDialog
        isOpen={allChatsDialogOpen}
        onClose={() => setAllChatsDialogOpen(false)}
      />
      {selectedConversationId && (
        <RenameDialog
          conversationId={selectedConversationId}
          currentTitle={getRawConversationTitle(conversations[selectedConversationId])}
          isOpen={renameDialogOpen}
          onClose={() => {
            setRenameDialogOpen(false);
            setSelectedConversationId(null);
          }}
        />
      )}

      {projectSelectorConvId && (
        <ProjectSelector
          conversationId={projectSelectorConvId}
          currentProjectId={conversations[projectSelectorConvId]?.projectId || null}
          isOpen={projectSelectorOpen}
          onClose={() => {
            setProjectSelectorOpen(false);
            setProjectSelectorConvId(null);
          }}
        />
      )}
    </div>
  );
}
