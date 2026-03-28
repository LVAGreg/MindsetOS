'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, MessageSquare, Calendar, User, Filter, Folder, BookOpen, FileText, Star, Trash2 } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS, Conversation } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';
import { fetchArtifacts, deleteArtifact } from '@/lib/api-client';

interface ConversationBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  initialProjectId?: string | null;
}

export function ConversationBrowser({ isOpen, onClose, onSelectConversation, initialProjectId }: ConversationBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'playbook'>('conversations');
  const [plays, setPlays] = useState<any[]>([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const { conversations, currentConversationId, projects } = useAppStore();
  const setCurrentArtifact = useAppStore(s => s.setCurrentArtifact);
  const setCanvasContent = useAppStore(s => s.setCanvasContent);
  const setCanvasPanelOpen = useAppStore(s => s.setCanvasPanelOpen);

  // Set initial project filter when provided
  useEffect(() => {
    if (isOpen && initialProjectId) {
      setSelectedProject(initialProjectId);
    }
  }, [isOpen, initialProjectId]);

  // Load plays when switching to playbook tab
  useEffect(() => {
    if (isOpen && activeTab === 'playbook') {
      const loadPlays = async () => {
        setPlaysLoading(true);
        try {
          const data = await fetchArtifacts({ limit: 50 });
          setPlays(Array.isArray(data) ? data : []);
        } catch { setPlays([]); }
        finally { setPlaysLoading(false); }
      };
      loadPlays();
    }
  }, [isOpen, activeTab]);

  // Filter plays by search query
  const filteredPlays = useMemo(() => {
    if (!searchQuery.trim()) return plays;
    const q = searchQuery.toLowerCase();
    return plays.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.type?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q)
    );
  }, [plays, searchQuery]);

  const openPlay = (play: any) => {
    setCurrentArtifact(play);
    setCanvasContent(play.content);
    setCanvasPanelOpen(true);
    onClose();
  };

  const removePlay = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteArtifact(id);
      setPlays(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  // Convert conversations object to array and sort by most recent
  const allConversations = useMemo(() => {
    return Object.values(conversations).sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [conversations]);

  // Filter conversations based on search, agent, and project filters
  const filteredConversations = useMemo(() => {
    let filtered = allConversations;

    // Filter by agent
    if (selectedAgent) {
      filtered = filtered.filter(conv => conv.agentId === selectedAgent);
    }

    // Filter by project
    if (selectedProject) {
      filtered = filtered.filter(conv => conv.projectId === selectedProject);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        // Search in title
        if (conv.title?.toLowerCase().includes(query)) return true;

        // Search in messages (using tree structure)
        const hasMatchingMessage = conv.history?.messages
          ? Object.values(conv.history.messages).some(msg =>
              msg.content.toLowerCase().includes(query)
            )
          : false;
        if (hasMatchingMessage) return true;

        // Search in agent name
        const agent = Object.values(MINDSET_AGENTS).find(a => a.id === conv.agentId);
        if (agent?.name.toLowerCase().includes(query)) return true;

        // Search in project name
        if (conv.projectId && projects[conv.projectId]) {
          const project = projects[conv.projectId];
          if (project.name.toLowerCase().includes(query)) return true;
        }

        return false;
      });
    }

    return filtered;
  }, [allConversations, searchQuery, selectedAgent, selectedProject, projects]);

  // Get unique agents from conversations
  const agentsWithConversations = useMemo(() => {
    const agentIds = new Set(allConversations.map(conv => conv.agentId));
    return Object.values(MINDSET_AGENTS).filter(agent => agentIds.has(agent.id));
  }, [allConversations]);

  // Get unique projects from conversations
  const projectsWithConversations = useMemo(() => {
    const projectIds = new Set(
      allConversations
        .map(conv => conv.projectId)
        .filter((id): id is string => !!id)
    );
    return Object.values(projects).filter(project => projectIds.has(project.id));
  }, [allConversations, projects]);

  // Reset filters when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedAgent(null);
      setSelectedProject(null);
      setActiveTab('conversations');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    onClose();
  };

  const getAgentInfo = (agentId: string) => {
    // Try to find by id directly
    let agent = Object.values(MINDSET_AGENTS).find(a => a.id === agentId);

    // If not found, try converting the agentId to the MINDSET_AGENTS key format
    if (!agent) {
      const agentKey = agentId.toUpperCase().replace(/-/g, '_') as keyof typeof MINDSET_AGENTS;
      agent = MINDSET_AGENTS[agentKey];
    }

    return agent || {
      id: agentId,
      name: 'Unknown Agent',
      icon: '❓',
      description: '',
      color: 'bg-gray-500',
      starterPrompts: []
    };
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined
    });
  };

  const getMessagePreview = (conv: Conversation) => {
    if (!conv.history?.messages || !conv.history.currentId) return 'No messages yet';
    const lastMessage = conv.history.messages[conv.history.currentId];
    if (!lastMessage) return 'No messages yet';
    const preview = lastMessage.content.replace(/[*_~`#]/g, '').substring(0, 100);
    return preview.length === lastMessage.content.length ? preview : preview + '...';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Search
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'conversations'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-b-0 border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Conversations
                  <span className="text-xs text-gray-400">({filteredConversations.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('playbook')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'playbook'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-b-0 border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Playbook
                  <span className="text-xs text-gray-400">({filteredPlays.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'conversations' ? 'Search conversations, messages, or agents...' : 'Search your saved plays...'}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            {/* Agent Filters — conversations tab only */}
            {activeTab === 'conversations' && <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">Agent:</span>
              <button
                onClick={() => setSelectedAgent(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedAgent === null
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500 dark:border-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {agentsWithConversations.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    selectedAgent === agent.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <AgentIcon agentId={agent.id} className="w-4 h-4" />
                  <span>{agent.name}</span>
                </button>
              ))}
            </div>}

            {/* Project Filters — conversations tab only */}
            {activeTab === 'conversations' && projectsWithConversations.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">Project:</span>
                <button
                  onClick={() => setSelectedProject(null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    selectedProject === null
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-500 dark:border-purple-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {projectsWithConversations.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      selectedProject === project.id
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-500 dark:border-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={{
                      borderColor: selectedProject === project.id ? project.color : undefined,
                      backgroundColor: selectedProject === project.id ? `${project.color}20` : undefined,
                    }}
                  >
                    <span>{project.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <>
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No conversations found
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'Try adjusting your search or filters' : 'Start a conversation with an agent to see it here'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConversations.map((conv) => {
                      const agent = getAgentInfo(conv.agentId);
                      const isActive = currentConversationId === conv.id;
                      const project = conv.projectId ? projects[conv.projectId] : null;

                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          className={`w-full text-left p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                            isActive
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-[#ffc82c]'
                              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AgentIcon agentId={agent.id} className="w-6 h-6 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                  {agent.name}
                                </span>
                                {isActive && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500 text-black rounded">
                                    Active
                                  </span>
                                )}
                                {project && (
                                  <span
                                    className="px-1.5 py-0.5 text-[10px] font-medium rounded flex items-center gap-1"
                                    style={{
                                      backgroundColor: `${project.color}20`,
                                      color: project.color,
                                      borderWidth: '1px',
                                      borderColor: project.color,
                                    }}
                                  >
                                    <Folder className="w-2.5 h-2.5" />
                                    {project.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-700 dark:text-gray-300 mb-1 line-clamp-1">
                                {getMessagePreview(conv)}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>{conv.messageCount || Object.keys(conv.history?.messages || {}).length || 0} msgs</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(new Date(conv.updatedAt))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Playbook Tab */}
            {activeTab === 'playbook' && (
              <>
                {playsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-8 h-8 border-2 border-[#fcc824] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading your plays...</p>
                  </div>
                ) : filteredPlays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No plays match your search' : 'No plays saved yet'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'Try a different search term' : 'Use "Save as Play" on any agent response to build your Playbook'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPlays.map((play) => (
                      <button
                        key={play.id}
                        onClick={() => openPlay(play)}
                        className="w-full text-left p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-[#fcc824] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {play.title || 'Untitled Play'}
                              </span>
                              {play.is_starred && (
                                <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" fill="currentColor" />
                              )}
                              <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-[#fcc824] rounded capitalize flex-shrink-0">
                                {play.type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {play.content?.replace(/[#*_`]/g, '').substring(0, 150)}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                              <span>{new Date(play.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => removePlay(e, play.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-400 transition-all flex-shrink-0"
                            title="Delete play"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>💡 Tip: Use the search bar to find specific conversations</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
