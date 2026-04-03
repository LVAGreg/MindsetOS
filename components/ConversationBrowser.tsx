'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, MessageSquare, Calendar, Filter, Folder, BookOpen, FileText, Star, Trash2, ArrowRight } from 'lucide-react';
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { conversations, currentConversationId, projects } = useAppStore();
  const setCurrentArtifact = useAppStore(s => s.setCurrentArtifact);
  const setCanvasContent = useAppStore(s => s.setCanvasContent);
  const setCanvasPanelOpen = useAppStore(s => s.setCanvasPanelOpen);
  const createConversation = useAppStore(s => s.createConversation);
  const setCurrentConversation = useAppStore(s => s.setCurrentConversation);

  // ── Workflow step lookup: step number → agent key ──────────────────────────
  const stepToAgent = useMemo(() => {
    const map = new Map<number, keyof typeof MINDSET_AGENTS>();
    (Object.keys(MINDSET_AGENTS) as Array<keyof typeof MINDSET_AGENTS>).forEach((key) => {
      const step = MINDSET_AGENTS[key].workflowStep;
      if (step !== undefined) map.set(step, key);
    });
    return map;
  }, []);

  // Max workflow step across all agents
  const maxWorkflowStep = useMemo(() => {
    return Math.max(...Object.values(MINDSET_AGENTS).map(a => a.workflowStep));
  }, []);

  // ── Most-recent conversation per agentId ────────────────────────────────────
  // Used to show the nudge only on the freshest card for each agent.
  const mostRecentConvByAgent = useMemo(() => {
    const map = new Map<string, string>(); // agentId → conversationId
    Object.values(conversations)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .forEach((conv) => {
        if (!map.has(conv.agentId)) map.set(conv.agentId, conv.id);
      });
    return map;
  }, [conversations]);

  // ── Set of agentIds the user already has at least one conversation with ─────
  const agentsWithAnyConv = useMemo(() => {
    return new Set(Object.values(conversations).map(c => c.agentId));
  }, [conversations]);

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
    setDeleteError(null);
    try {
      await deleteArtifact(id);
      setPlays(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setDeleteError('Failed to delete play. Please try again.');
    }
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
      color: '#5a5a72',
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

  // ── Compute the handoff nudge for a given conversation card ─────────────────
  // Returns null if no nudge should be shown.
  type NudgeInfo =
    | { kind: 'next'; agentName: string; agentId: string }
    | { kind: 'explore' };

  const getNudge = (conv: Conversation): NudgeInfo | null => {
    // Only show on the most-recent card for this agent
    if (mostRecentConvByAgent.get(conv.agentId) !== conv.id) return null;

    const agentData = Object.values(MINDSET_AGENTS).find(a => a.id === conv.agentId);
    if (!agentData) return null;

    const nextStep = agentData.workflowStep + 1;
    const nextAgentKey = stepToAgent.get(nextStep);

    if (nextAgentKey) {
      const nextAgent = MINDSET_AGENTS[nextAgentKey];
      // Only show if the user hasn't started a convo with the next agent yet
      if (!agentsWithAnyConv.has(nextAgent.id)) {
        return { kind: 'next', agentName: nextAgent.name, agentId: nextAgent.id };
      }
      return null; // User already has the next step covered
    }

    // This is the last workflow step — offer "Explore more agents"
    if (agentData.workflowStep === maxWorkflowStep) {
      return { kind: 'explore' };
    }

    return null;
  };

  // ── Handle clicking a nudge button ─────────────────────────────────────────
  const handleNudgeClick = (e: React.MouseEvent, nudge: NudgeInfo) => {
    e.stopPropagation(); // Don't also select the existing conversation
    if (nudge.kind === 'explore') {
      onClose();
      return;
    }
    // Create a new conversation with the next agent
    const newConvId = createConversation(nudge.agentId);
    setCurrentConversation(newConvId);
    onSelectConversation(newConvId);
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
        <div
          className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          style={{ background: 'rgba(18,18,31,0.98)', border: '1px solid #1e1e30' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-6 pb-0"
            style={{ borderBottom: '1px solid #1e1e30' }}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                  Search
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#9090a8' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('conversations')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                  style={activeTab === 'conversations'
                    ? { background: 'rgba(18,18,31,0.98)', color: '#ededf5', border: '1px solid #1e1e30', borderBottom: 'none' }
                    : { color: '#9090a8' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Conversations
                  <span className="text-xs" style={{ color: '#5a5a72' }}>({filteredConversations.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('playbook')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                  style={activeTab === 'playbook'
                    ? { background: 'rgba(18,18,31,0.98)', color: '#ededf5', border: '1px solid #1e1e30', borderBottom: 'none' }
                    : { color: '#9090a8' }}
                >
                  <BookOpen className="w-4 h-4" />
                  Playbook
                  <span className="text-xs" style={{ color: '#5a5a72' }}>({filteredPlays.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 space-y-4" style={{ borderBottom: '1px solid #1e1e30' }}>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9090a8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'conversations' ? 'Search conversations, messages, or agents...' : 'Search your saved plays...'}
                className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  background: '#09090f',
                  border: '1px solid #1e1e30',
                  color: '#ededf5',
                  '--tw-ring-color': '#4f6ef7',
                } as React.CSSProperties}
              />
            </div>

            {/* Agent Filters — conversations tab only */}
            {activeTab === 'conversations' && (
              <div className="flex items-center gap-2 flex-wrap pb-2">
                <Filter className="w-4 h-4 flex-shrink-0" style={{ color: '#9090a8' }} />
                <span className="text-xs font-medium flex-shrink-0" style={{ color: '#9090a8' }}>Agent:</span>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  style={selectedAgent === null
                    ? { background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '2px solid #4f6ef7' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#9090a8', border: '2px solid transparent' }}
                >
                  All
                </button>
                {agentsWithConversations.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                    style={selectedAgent === agent.id
                      ? { background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '2px solid #4f6ef7' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#9090a8', border: '2px solid transparent' }}
                  >
                    <AgentIcon agentId={agent.id} className="w-4 h-4" />
                    <span>{agent.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Project Filters — conversations tab only */}
            {activeTab === 'conversations' && projectsWithConversations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pb-2">
                <Folder className="w-4 h-4 flex-shrink-0" style={{ color: '#9090a8' }} />
                <span className="text-xs font-medium flex-shrink-0" style={{ color: '#9090a8' }}>Project:</span>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  style={selectedProject === null
                    ? { background: 'rgba(124,91,246,0.15)', color: '#7c5bf6', border: '2px solid #7c5bf6' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#9090a8', border: '2px solid transparent' }}
                >
                  All
                </button>
                {projectsWithConversations.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                    style={{
                      border: `2px solid ${selectedProject === project.id ? project.color : 'transparent'}`,
                      backgroundColor: selectedProject === project.id ? `${project.color}25` : 'rgba(255,255,255,0.05)',
                      color: selectedProject === project.id ? project.color : '#9090a8',
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
                    <MessageSquare className="w-16 h-16 mb-4" style={{ color: '#5a5a72' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>
                      No conversations found
                    </h3>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {searchQuery ? 'Try adjusting your search or filters' : 'Start a conversation with an agent to see it here'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConversations.map((conv) => {
                      const agent = getAgentInfo(conv.agentId);
                      const isActive = currentConversationId === conv.id;
                      const project = conv.projectId ? projects[conv.projectId] : null;
                      const nudge = getNudge(conv);

                      return (
                        <div key={conv.id}>
                          <button
                            onClick={() => handleSelectConversation(conv.id)}
                            className="w-full text-left p-2 rounded-lg border-2 transition-all hover:shadow-md"
                            style={isActive
                              ? { background: 'rgba(252,200,36,0.08)', borderColor: '#fcc824' }
                              : { background: 'rgba(255,255,255,0.03)', borderColor: '#1e1e30' }}
                          >
                            <div className="flex items-start gap-2">
                              <AgentIcon agentId={agent.id} className="w-6 h-6 flex-shrink-0" style={{ color: '#9090a8' } as React.CSSProperties} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="font-semibold text-xs" style={{ color: '#ededf5' }}>
                                    {agent.name}
                                  </span>
                                  {isActive && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: '#fcc824', color: '#09090f' }}>
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
                                        borderStyle: 'solid',
                                        borderColor: project.color,
                                      }}
                                    >
                                      <Folder className="w-2.5 h-2.5" />
                                      {project.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] mb-1 line-clamp-1" style={{ color: '#9090a8' }}>
                                  {getMessagePreview(conv)}
                                </p>
                                <div className="flex items-center gap-3 text-[10px]" style={{ color: '#5a5a72' }}>
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

                          {/* Agent handoff nudge */}
                          {nudge && (
                            <button
                              onClick={(e) => handleNudgeClick(e, nudge)}
                              className="flex items-center gap-1.5 mt-1 ml-2 px-2.5 py-1 rounded-md transition-opacity"
                              style={{
                                background: 'rgba(79,110,247,0.08)',
                                border: '1px solid rgba(79,110,247,0.2)',
                                color: '#4f6ef7',
                                fontSize: '12px',
                                lineHeight: '1.4',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.14)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,110,247,0.35)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.08)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,110,247,0.2)';
                              }}
                              aria-label={nudge.kind === 'next' ? `Start ${nudge.agentName}` : 'Explore more agents'}
                            >
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {nudge.kind === 'next'
                                  ? `Continue: ${nudge.agentName}`
                                  : 'Explore more agents'}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Playbook Tab */}
            {activeTab === 'playbook' && (
              <>
                {deleteError && (
                  <div
                    className="mb-3 px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    {deleteError}
                  </div>
                )}
                {playsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#fcc824', borderTopColor: 'transparent' }} />
                    <p className="text-sm" style={{ color: '#9090a8' }}>Loading your plays...</p>
                  </div>
                ) : filteredPlays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="w-16 h-16 mb-4" style={{ color: '#5a5a72' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>
                      {searchQuery ? 'No plays match your search' : 'No plays saved yet'}
                    </h3>
                    <p className="text-sm" style={{ color: '#9090a8' }}>
                      {searchQuery ? 'Try a different search term' : 'Use "Save as Play" on any agent response to build your Playbook'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPlays.map((play) => (
                      <button
                        key={play.id}
                        onClick={() => openPlay(play)}
                        className="w-full text-left p-3 rounded-lg border-2 hover:shadow-md transition-all group"
                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: '#1e1e30' }}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm truncate" style={{ color: '#ededf5' }}>
                                {play.title || 'Untitled Play'}
                              </span>
                              {play.is_starred && (
                                <Star className="w-3.5 h-3.5 flex-shrink-0" fill="#fcc824" style={{ color: '#fcc824' }} />
                              )}
                              <span
                                className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded capitalize flex-shrink-0"
                                style={{ background: 'rgba(252,200,36,0.12)', color: '#fcc824' }}
                              >
                                {play.type}
                              </span>
                            </div>
                            <p className="text-xs line-clamp-2" style={{ color: '#9090a8' }}>
                              {play.content?.replace(/[#*_`]/g, '').substring(0, 150)}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: '#5a5a72' }}>
                              <span>{new Date(play.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => removePlay(e, play.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 transition-all flex-shrink-0"
                            style={{ color: '#9090a8' }}
                            aria-label="Delete play"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
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
          <div
            className="p-4 rounded-b-xl"
            style={{ borderTop: '1px solid #1e1e30', background: 'rgba(9,9,15,0.6)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: '#9090a8' }}>
              <span>Tip: Use the search bar to find specific conversations</span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
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
