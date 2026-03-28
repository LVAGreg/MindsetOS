'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Brain,
  Sun,
  Moon,
  Sparkles,
  MessageSquare,
  Trophy,
  Search,
  Shield,
  Users,
  Star,
  Clock,
  Folder,
  Check,
  Lock,
  PenLine,
  Ticket,
  Mail,
  Settings,
  BarChart3,
  MessageCircle,
  Paperclip,
  Send,
  PanelRightOpen,
  BookOpen,
  Wand2,
  Settings2,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { useAppStore, MINDSET_AGENTS, AgentId } from '@/lib/store';
import { apiClient, API_URL } from '@/lib/api-client';
import { AgentIcon } from '@/lib/agent-icons';
import ChatWindow from '@/components/ChatWindow';
import ConversationHistory from '@/components/ConversationHistory';
import CollapsibleSection from '@/components/CollapsibleSection';
import { PlaybookList } from '@/components/PlaybookList';
import MemoryDashboard from '@/components/MemoryDashboard';
import { ConversationBrowser } from '@/components/ConversationBrowser';
import ProjectList from '@/components/ProjectList';
import NewProjectDialog from '@/components/NewProjectDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { ClientProfileSwitcher } from '@/components/ClientProfileSwitcher';
import { AdminUserSwitcher } from '@/components/AdminUserSwitcher';
import { ResearchPanel } from '@/components/ResearchPanel';
import TrialExpiredPopup from '@/components/TrialExpiredPopup';
import WelcomeGuide from '@/components/WelcomeGuide';
import { CanvasPanel } from '@/components/CanvasPanel';

// Compact agent row for Browse Agents view
function AgentBrowserRow({ agent, accentColor, isActive, isCustom, onSelect, userRole }: {
  agent: any;
  accentColor: string;
  isActive: boolean;
  isCustom?: boolean;
  onSelect: () => void;
  userRole?: string;
}) {
  const canManage = userRole === 'power_user' || userRole === 'admin';
  return (
    <button
      onClick={onSelect}
      disabled={agent.locked}
      title={agent.locked ? agent.lockedReason || 'Complete onboarding to unlock' : ''}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group ${
        agent.locked
          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
          : isActive
          ? 'border-2 shadow-sm'
          : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      style={
        !agent.locked && isActive
          ? { borderColor: accentColor, background: `linear-gradient(135deg, ${accentColor}08, transparent)` }
          : {}
      }
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={!agent.locked ? { background: `${accentColor}12`, border: `1.5px solid ${accentColor}30` } : {}}
      >
        <AgentIcon
          agentId={agent.id}
          className="w-5 h-5"
          style={!agent.locked ? { color: accentColor } : {}}
        />
      </div>

      {/* Name + Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {agent.name}
          </span>
          {isActive && !agent.locked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#ffc82c] text-black text-[10px] font-bold rounded-full flex-shrink-0">
              <Check className="w-2.5 h-2.5" /> ACTIVE
            </span>
          )}
          {agent.locked && (
            <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
          {isCustom && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${accentColor}15`, color: accentColor }}>
              CUSTOM
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {agent.description}
        </p>
      </div>

      {/* Manage gear for power_user/admin */}
      {canManage && !agent.locked && (
        <a
          href={`/admin/agents/${agent.id}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0"
          title="Manage agent & knowledge base"
        >
          <Settings2 className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        </a>
      )}

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 flex-shrink-0 transition-colors" />
    </button>
  );
}

// Wrap main content to handle useSearchParams with Suspense
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [hasHydrated, setHasHydrated] = useState(false);
  // Use ref to track processed URL to avoid stale closure issues
  const processedUrlRef = useRef<string | null>(null);

  const {
    user,
    isAuthenticated,
    setUser,
    clearUser,
    currentAgent,
    setCurrentAgent,
    isSidebarOpen,
    toggleSidebar,
    memoryEnabled,
    setMemoryEnabled,
    brandVoiceEnabled,
    setBrandVoiceEnabled,
    widgetFormattingEnabled,
    setWidgetFormattingEnabled,
    theme,
    setTheme,
    createConversation,
    setCurrentConversation,
    currentConversation,
    currentConversationId,
    conversations,
    getConversationsByAgent,
    getAllConversations,
    loadConversations,
    loadConversationHistory,
    activeClientProfileId,
    viewAsUser,
    impersonationSession,
  } = useAppStore();

  const canvasPanelOpen = useAppStore(s => s.canvasPanelOpen);
  const canvasEnabled = useAppStore(s => s.canvasEnabled);

  // When admin is "viewing as" another user, use that user's role for UI gating
  const effectiveUser = viewAsUser || user;
  // Key for forcing sidebar re-render when impersonation changes
  const viewAsKey = viewAsUser?.id || 'self';

  // Wait for Zustand persist to hydrate from localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Track onboarding status to refetch agents when it changes
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Check onboarding status and force new users to Client Onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !hasHydrated) return;

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const status = await response.json();
          console.log('📋 [ONBOARDING] Status:', status);

          // Update onboarding status state
          const previouslyCompleted = onboardingCompleted;
          setOnboardingCompleted(status.completed);

          // If onboarding just completed (changed from false to true), force agent refetch
          if (status.completed && previouslyCompleted === false) {
            console.log('🎉 [ONBOARDING] Just completed! Forcing agent refetch to unlock all agents');
            // Force immediate refetch by toggling a state that triggers the agent fetch effect
            setTimeout(() => {
              setOnboardingCompleted(null); // Temporarily null
              setTimeout(() => {
                setOnboardingCompleted(true); // Back to true, triggering refetch
              }, 100);
            }, 500);
          }

          // If onboarding not completed, force user to client-onboarding agent
          if (!status.completed) {
            console.log('⚠️ [ONBOARDING] Not completed - redirecting to client-onboarding agent');
            setCurrentAgent('CLIENT_ONBOARDING');
            // Create conversation with client-onboarding agent
            const newConvId = createConversation('client-onboarding');
            setCurrentConversation(newConvId);
          } else {
            console.log('✅ [ONBOARDING] Completed - all agents should be unlocked');
            // If user completed onboarding but is still on Client Onboarding agent, switch to MindsetAI
            if (currentAgent === 'CLIENT_ONBOARDING') {
              console.log('🔄 [ONBOARDING] Switching from Client Onboarding to MindsetAI');
              setCurrentAgent('GENERAL');
            }
          }
        }
      } catch (error) {
        console.error('❌ [ONBOARDING] Failed to check status:', error);
      }
    };

    checkOnboarding();
  }, [user, hasHydrated, createConversation, setCurrentAgent, setCurrentConversation]);

  // Set MindsetAI as default agent if no agent selected (only after onboarding check)
  useEffect(() => {
    if (!currentAgent && hasHydrated) {
      setCurrentAgent('GENERAL');
    }
  }, [currentAgent, hasHydrated, setCurrentAgent]);

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Navigate to /c/[id] when conversation changes, or to /dashboard for welcome screen
  useEffect(() => {
    if (currentConversation) {
      console.log(`🔄 [NAVIGATION] Redirecting to /c/${currentConversation}`);
      router.replace(`/c/${currentConversation}`, { scroll: false });
    } else if (hasHydrated && user) {
      // No conversation selected - show welcome screen at /dashboard
      // IMPORTANT: Preserve URL search params (like ?agent=xxx) when replacing
      const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
      const targetUrl = `/dashboard${currentSearch}`;

      // Only replace if we're not already at the target URL to avoid stripping params
      if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== targetUrl) {
        console.log(`👋 [NAVIGATION] No conversation - navigating to ${targetUrl}`);
        router.replace(targetUrl, { scroll: false });
      }
    }
  }, [currentConversation, router, hasHydrated, user]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [v7Agents, setV7Agents] = useState<any[]>([]);
  const [showConversationBrowser, setShowConversationBrowser] = useState(false);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [selectedView, setSelectedView] = useState<'all' | 'starred' | 'project' | null>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [conversationBrowserProjectId, setConversationBrowserProjectId] = useState<string | null>(null);
  const [displayAgents, setDisplayAgents] = useState<any[]>([]);
  const [agentBrowserTab, setAgentBrowserTab] = useState<'core' | 'custom'>('core');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    name: user?.firstName || user?.name || '',
    email: user?.email || '',
    message: '',
    attachment: null as File | null,
  });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);

  // Show welcome guide for new users who haven't seen it, or via ?guide=true URL param
  useEffect(() => {
    if (!user || !hasHydrated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('guide') === 'true') {
      setShowWelcomeGuide(true);
      return;
    }
    const hasSeenGuide = localStorage.getItem('mindset_os_welcome_guide_seen');
    if (!hasSeenGuide) {
      setShowWelcomeGuide(true);
    }
  }, [user, hasHydrated]);

  const dismissWelcomeGuide = () => {
    setShowWelcomeGuide(false);
    localStorage.setItem('mindset_os_welcome_guide_seen', 'true');
  };

  // Fetch unread feedback reply count
  useEffect(() => {
    const fetchFeedbackCount = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/user/feedback/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadFeedbackCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch feedback count:', error);
      }
    };

    fetchFeedbackCount();
    // Refresh when tab becomes active (no polling)
    const handleFocus = () => fetchFeedbackCount();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Fetch V7 agents on mount
  useEffect(() => {
    const loadV7Agents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/letta/agents`);
        if (response.ok) {
          const agents = await response.json();
          console.log('✅ Loaded V7 agents:', agents);
          setV7Agents(agents);
        } else {
          console.warn('⚠️  Failed to load V7 agents, using hardcoded');
        }
      } catch (error) {
        console.error('❌ Error loading V7 agents:', error);
      }
    };

    loadV7Agents();
  }, []);

  // Fetch agents from database for Browse All Agents dialog
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const viewAsUserId = viewAsUser?.id || '';
        const agentUrl = viewAsUserId ? `${API_URL}/api/agents?viewAsUserId=${viewAsUserId}` : `${API_URL}/api/agents`;
        const response = await fetch(agentUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.error('Failed to fetch agents:', response.status);
          return;
        }

        const data = await response.json();
        const agents = data.agents || [];

        // Transform to match display format (preserving backend sort_order)
        const transformedAgents = agents
          // Hide Agent Creator when a sub-client profile is active (agency tools only on main profile)
          .filter((agent: any) => {
            if (agent.id === 'agent-creator' && activeClientProfileId) return false;
            return true;
          })
          .map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            category: agent.category || 'General',
            icon: agent.icon || '🤖',
            accent_color: agent.accent_color || '#3B82F6',
            locked: agent.locked || false,
            lockedReason: agent.lockedReason || null,
            requiresOnboarding: agent.requiresOnboarding || false,
            sort_order: agent.sort_order || 0,
            isCustom: agent.isCustom || false,
          }));

        // Agents already ordered by sort_order from backend
        setDisplayAgents(transformedAgents);
        console.log('✅ Loaded agents from database:', transformedAgents.length);
        console.log('🔓 Locked agents count:', transformedAgents.filter((a: any) => a.locked).length);
        console.log('✅ Unlocked agents count:', transformedAgents.filter((a: any) => !a.locked).length);
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [showAgentBrowser, onboardingCompleted, activeClientProfileId, viewAsUser?.id]); // Refetch when agent browser opens/closes, onboarding changes, client switches, or viewAs user changes

  // Handle ?agent= URL parameter for direct agent links
  useEffect(() => {
    // Build the full URL string for tracking
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    const agentParam = searchParams.get('agent');

    console.log(`🔗 [URL PARAM DEBUG] Effect triggered:`, {
      hasHydrated,
      hasUser: !!user,
      agentParam,
      displayAgentsCount: displayAgents.length,
      currentUrl,
      processedUrl: processedUrlRef.current
    });

    if (!hasHydrated || !user || displayAgents.length === 0) {
      console.log(`⏳ [URL PARAM] Waiting for dependencies...`);
      return;
    }

    // Skip if no agent param
    if (!agentParam) {
      console.log(`ℹ️ [URL PARAM] No agent parameter in URL`);
      return;
    }

    // Skip if we already processed this exact URL (prevents double-processing)
    if (processedUrlRef.current === currentUrl) {
      console.log(`⏭️ [URL PARAM] Already processed this URL: ${currentUrl}`);
      return;
    }

    console.log(`🔗 [URL PARAM] Processing agent parameter: ${agentParam}`);
    console.log(`📋 [URL PARAM] Available agents:`, displayAgents.map(a => a.id));

    // Find the agent by ID (case-insensitive)
    const targetAgent = displayAgents.find(a =>
      a.id === agentParam || a.id.toLowerCase() === agentParam.toLowerCase()
    );

    if (targetAgent && !targetAgent.locked) {
      console.log(`✅ [URL PARAM] Opening agent: ${targetAgent.name} (id: ${targetAgent.id})`);

      // Mark as processed BEFORE calling handleSelectAgent to prevent race conditions
      processedUrlRef.current = currentUrl;

      handleSelectAgent(targetAgent.id);

      // Clear the URL parameter after a short delay to ensure state updates complete
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        console.log(`🧹 [URL PARAM] Cleared URL parameter`);
      }, 100);
    } else if (targetAgent?.locked) {
      console.log(`🔒 [URL PARAM] Agent is locked: ${targetAgent.name}`);
      processedUrlRef.current = currentUrl;
    } else {
      console.log(`❌ [URL PARAM] Agent not found: ${agentParam}`);
      console.log(`   Available IDs: ${displayAgents.map(a => a.id).join(', ')}`);
      processedUrlRef.current = currentUrl;
    }
  }, [hasHydrated, user, pathname, searchParams, displayAgents]);

  useEffect(() => {
    // Don't check auth until store has hydrated from localStorage
    if (!hasHydrated) {
      console.log('⏳ [DASHBOARD] Waiting for hydration...');
      return;
    }

    const initializeUser = async () => {
      // Check for access token in localStorage (from persist middleware)
      const accessToken = localStorage.getItem('accessToken');

      console.log('🔍 [DASHBOARD] Auth check:', {
        hasUser: !!user,
        userEmail: user?.email,
        isAuthenticated,
        hasToken: !!accessToken
      });

      // If we have user data from persisted storage AND a valid token, trust it
      if (user && isAuthenticated && accessToken) {
        console.log('✅ Restored authenticated user from storage:', user.email);
        setIsLoading(false);
        return;
      }

      // If we have a token but no user in store, something went wrong - clear token
      if (!user && accessToken) {
        console.log('⚠️  Found orphaned access token, clearing...');
        localStorage.removeItem('accessToken');
      }

      // No auto-guest login - require proper authentication
      // If no user is authenticated, redirect to login page
      if (!user || !isAuthenticated) {
        console.log('🔒 No authenticated user - redirecting to login');
        setIsLoading(false);
        router.push('/login');
        return;
      }

      setIsLoading(false);
    };

    initializeUser();
  }, [hasHydrated, setUser, user, isAuthenticated, router]);

  // Load conversations when user is authenticated, active client changes, or viewAs user changes
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !isAuthenticated) return;

      try {
        // Only pass client filter for agency/admin users who have the switcher
        const isAgencyOrAdmin = effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin';
        const viewAsUserId = viewAsUser?.id || undefined;
        const conversations = await apiClient.getUserConversations(isAgencyOrAdmin ? (activeClientProfileId || undefined) : undefined, viewAsUserId);
        loadConversations(conversations);
        console.log(`✅ Loaded ${conversations.length} conversations from database${viewAsUserId ? ` (viewing as: ${viewAsUserId.substring(0, 8)}...)` : ''}${activeClientProfileId ? ` (client: ${activeClientProfileId.substring(0, 8)}...)` : ''}`);

        // Clear current conversation to show welcome screen
        setCurrentConversation(null);
      } catch (error) {
        console.error('❌ Failed to load conversations:', error);
      }
    };

    fetchConversations();
  }, [user, isAuthenticated, loadConversations, setCurrentConversation, activeClientProfileId, viewAsUser?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversationId) return;

      const conversation = conversations[currentConversationId];
      if (!conversation) return;

      // Check if history is already loaded (tree structure)
      if (conversation.history && Object.keys(conversation.history.messages).length > 0) {
        console.log(`✅ History already loaded for conversation ${currentConversationId}`);
        return;
      }

      // Note: With tree-based architecture, conversations are loaded with full history
      // This path should rarely be hit since backend returns complete tree
      console.log(`ℹ️ Conversation ${currentConversationId} has no history - backend should include tree`);
    };

    loadMessages();
  }, [currentConversationId]);

  const handleLogout = async () => {
    try {
      // Try to call backend logout, but don't block if it fails
      await apiClient.logout();
    } catch (error) {
      console.error('Backend logout failed (continuing anyway):', error);
    } finally {
      // Clear user state
      clearUser();
      // Only clear auth token, keep other persisted data (theme, etc.)
      localStorage.removeItem('accessToken');
      router.push('/login');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSubmitting(true);

    try {
      // Gather user context for admin (stored separately, not shown to user)
      let adminContext = '';
      try {
        const token = localStorage.getItem('accessToken');
        const conversationsResponse = await fetch(`${API_URL}/api/conversations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (conversationsResponse.ok) {
          const data = await conversationsResponse.json();
          const convList = Array.isArray(data) ? data : (data.conversations || []);
          const agentCounts: { [key: string]: number } = {};
          let totalMsgs = 0;
          const recentAgentIds: string[] = [];

          convList.forEach((conv: any) => {
            if (conv.agent_id) {
              agentCounts[conv.agent_id] = (agentCounts[conv.agent_id] || 0) + 1;
              if (!recentAgentIds.includes(conv.agent_id)) {
                recentAgentIds.push(conv.agent_id);
              }
            }
            totalMsgs += conv.message_count || 0;
          });

          adminContext = JSON.stringify({
            totalConversations: convList.length,
            uniqueAgents: Object.keys(agentCounts).length,
            totalMessages: totalMsgs,
            recentAgents: recentAgentIds.slice(0, 3),
            agentUsage: agentCounts,
            submittedAt: new Date().toISOString(),
          });
        }
      } catch (contextError) {
        console.error('Failed to gather admin context:', contextError);
      }

      // Use user data for name/email
      const submitName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : feedbackForm.name;
      const submitEmail = user?.email || feedbackForm.email;

      // Use FormData if attachment present, otherwise JSON
      let response;
      if (feedbackForm.attachment) {
        const formData = new FormData();
        formData.append('name', submitName);
        formData.append('email', submitEmail);
        formData.append('message', feedbackForm.message);
        formData.append('admin_context', adminContext);
        formData.append('attachment', feedbackForm.attachment);

        response = await fetch(`${API_URL}/api/user/feedback/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/api/user/feedback/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: submitName,
            email: submitEmail,
            message: feedbackForm.message,
            admin_context: adminContext,
          }),
        });
      }

      if (!response.ok) throw new Error('Failed to submit feedback');

      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
        setFeedbackForm({
          name: user?.firstName || user?.name || '',
          email: user?.email || '',
          message: '',
          attachment: null,
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    console.log(`🎯 [AGENT SELECT] Selected agent: ${agentId}`);

    // Map database IDs to MINDSET_AGENTS keys (for backward compatibility)
    let agentKey = agentId;
    if (agentId === 'mindset-super-agent') {
      agentKey = 'MINDSET_SUPER_AGENT';
    } else {
      // Try to find the key in MINDSET_AGENTS that matches this ID
      const matchingKey = Object.keys(MINDSET_AGENTS).find(
        key => MINDSET_AGENTS[key as AgentId].id === agentId
      );
      if (matchingKey) {
        agentKey = matchingKey;
      } else {
        // For database-only agents (like live-workshop-admin), use uppercase with underscores
        agentKey = agentId.toUpperCase().replace(/-/g, '_');
      }
    }

    setCurrentAgent(agentKey as AgentId);
    setShowAgentBrowser(false);

    // Convert uppercase key to lowercase hyphenated ID for backend
    const agentData = MINDSET_AGENTS[agentKey as AgentId];
    const backendAgentId = agentData?.id || agentId;

    // Check if there are existing conversations for this agent
    const existingConversations = Object.values(conversations).filter(
      conv => conv.agentId === backendAgentId
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (existingConversations.length > 0) {
      // Select the most recent conversation
      console.log(`📂 [AGENT SELECT] Found ${existingConversations.length} existing conversations, selecting most recent: ${existingConversations[0].id}`);
      setCurrentConversation(existingConversations[0].id);
    } else {
      // Create new conversation only if none exist for this agent
      const newConvId = createConversation(backendAgentId);
      console.log(`✨ [AGENT SELECT] No existing conversations, created new: ${newConvId} for agent: ${backendAgentId}`);
      setCurrentConversation(newConvId);
    }
  };

  const handleNewConversation = () => {
    if (!currentAgentData) return;
    const newConvId = createConversation(currentAgentData.id);
    setCurrentConversation(newConvId);
  };

  // Get current agent data from database-fetched agents (displayAgents)
  // Fallback to hardcoded MINDSET_AGENTS for compatibility with older agents
  const currentAgentData = currentAgent
    ? (currentAgent === 'MINDSET_SUPER_AGENT'
        ? displayAgents.find(a => a.id === 'mindset-super-agent')
        : // Try to find by mapped ID from MINDSET_AGENTS first
          displayAgents.find(a => a.id === MINDSET_AGENTS[currentAgent as AgentId]?.id)
          // If not found, try direct ID match (for database-only agents like live-workshop-admin)
          || displayAgents.find(a => a.id === currentAgent.toLowerCase().replace(/_/g, '-'))
          // Final fallback to hardcoded MINDSET_AGENTS
          || MINDSET_AGENTS[currentAgent as AgentId])
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 relative">
      {/* Trial Expired Popup */}
      <TrialExpiredPopup
        membershipTier={user?.membershipTier}
        trialExpiresAt={user?.trialExpiresAt}
      />

      {/* Trial Days Remaining Banner */}
      {user?.membershipTier === 'trial' && user?.trialExpiresAt && new Date(user.trialExpiresAt) > new Date() && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-center py-1.5 text-sm font-medium shadow-md">
          Free trial: {Math.max(0, Math.ceil((new Date(user.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left &mdash;{' '}
          <a href="/join" className="underline font-bold hover:text-amber-900">Upgrade now</a>
        </div>
      )}

      {/* Welcome Guide for new users */}
      <WelcomeGuide show={showWelcomeGuide} onDismiss={dismissWelcomeGuide} />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Expanded */}
      {isSidebarOpen && (
        <div key={`sidebar-${viewAsKey}`} className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 flex flex-col md:relative absolute inset-y-0 left-0 z-30">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/mindset-os-logo.png"
                  alt="MindsetOS Logo"
                  className="h-12 w-auto dark:brightness-0 dark:invert"
                />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">MindsetOS</span>
              </div>
              {/* Collapse Button */}
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

          </div>

          {/* Sidebar Content - Organized Sections */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* New Chat */}
            <div className="px-3 py-2">
              <button
                onClick={() => {
                  if (currentAgentData) {
                    // Create new conversation with current agent
                    handleNewConversation();
                  } else {
                    // No agent selected, open agent browser
                    setShowAgentBrowser(true);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title={currentAgentData ? `New chat with ${currentAgentData.name}` : "Select an agent"}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New Chat</span>
              </button>
            </div>

            {/* Research Section - Collapsible - Admin/Power User only */}
            {(effectiveUser?.role === 'admin' || effectiveUser?.role === 'power_user') && (
              <CollapsibleSection
                title="Research"
                icon={<Search className="w-4 h-4" />}
                defaultOpen={false}
                isCollapsed={false}
              >
                <ResearchPanel isCollapsed={false} />
              </CollapsibleSection>
            )}

            {/* Projects Section - Collapsible */}
            <CollapsibleSection
              title="Projects"
              icon={<Folder className="w-4 h-4" />}
              defaultOpen={false}
              isCollapsed={false}
            >
              <ProjectList
                onSelectProject={(projectId) => {
                  setConversationBrowserProjectId(projectId);
                  setShowConversationBrowser(true);
                }}
                selectedProjectId={selectedProjectId}
                onCreateNew={() => setShowNewProjectDialog(true)}
              />
            </CollapsibleSection>

            {/* Playbook - Saved Plays */}
            <CollapsibleSection
              title="Playbook"
              icon={<BookOpen className="w-4 h-4" />}
              defaultOpen={false}
              isCollapsed={false}
            >
              <PlaybookList />
            </CollapsibleSection>

            {/* This Agent's Conversations - Collapsible */}
            {currentAgentData && (
              <CollapsibleSection
                title="This Agent"
                icon={<MessageSquare className="w-4 h-4" />}
                defaultOpen={true}
                isCollapsed={false}
              >
                <ConversationHistory
                  currentAgentData={currentAgentData}
                  filterStarred={false}
                  allAgents={displayAgents}
                  onConversationSelect={() => setShowAgentBrowser(false)}
                />
              </CollapsibleSection>
            )}

            {/* Starred Conversations - Collapsible */}
            <CollapsibleSection
              title="Starred"
              icon={<Star className="w-4 h-4" />}
              defaultOpen={false}
              isCollapsed={false}
            >
              <ConversationHistory
                currentAgentData={null}
                filterStarred={true}
                allAgents={displayAgents}
                onConversationSelect={() => setShowAgentBrowser(false)}
              />
            </CollapsibleSection>

            {/* Recent Conversations (All Agents) - Collapsible */}
            <CollapsibleSection
              title="Recent"
              icon={<Clock className="w-4 h-4" />}
              defaultOpen={false}
              isCollapsed={false}
            >
              <ConversationHistory
                currentAgentData={null}
                filterStarred={false}
                allAgents={displayAgents}
                onConversationSelect={() => setShowAgentBrowser(false)}
              />
            </CollapsibleSection>
          </div>

          {/* Sidebar Footer - User Menu with Settings */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${viewAsUser ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-gradient-to-br from-yellow-400 to-orange-500'}`}>
                  {(effectiveUser?.name?.[0] || effectiveUser?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {viewAsUser ? `👁 ${effectiveUser?.name || effectiveUser?.email}` : (user?.name || user?.email)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                    {effectiveUser?.role?.replace('_', ' ') || ''}
                    {viewAsUser && <span className="text-blue-400 ml-1">(viewing as)</span>}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[80vh] overflow-y-auto">
                    <div className="py-1">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        {viewAsUser ? (
                          <>
                            <p className="text-xs text-blue-400 font-semibold">Viewing as</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {effectiveUser?.name || effectiveUser?.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{effectiveUser?.role?.replace('_', ' ')}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user?.email}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Profile Section */}
                      <button
                        onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        <User className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>

                      {/* Admin Section - admin/power_user only */}
                      {(effectiveUser?.role === 'admin' || effectiveUser?.role === 'power_user') && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Administration
                            </p>
                          </div>

                          {effectiveUser?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => { router.push('/admin'); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                              >
                                <BarChart3 className="w-4 h-4" />
                                <span>Dashboard</span>
                                <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                              </button>
                              <button
                                onClick={() => { router.push('/admin/users'); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                              >
                                <Users className="w-4 h-4" />
                                <span>Users</span>
                                <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                              </button>
                              <button
                                onClick={() => { router.push('/admin/invite-codes'); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                              >
                                <Ticket className="w-4 h-4" />
                                <span>Invite Codes</span>
                                <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                              </button>
                              <button
                                onClick={() => { router.push('/admin/emails'); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                              >
                                <Mail className="w-4 h-4" />
                                <span>Email Templates</span>
                                <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                              </button>
                              <button
                                onClick={() => { router.push('/admin/feedback'); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>Feedback Management</span>
                                <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Coaching Practice Tools Section - agency/admin only */}
                      {(effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin') && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Practice Tools
                            </p>
                          </div>
                          <button
                            onClick={() => { router.push('/dashboard/clients'); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Clients</span>
                            <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                          </button>
                          <button
                            onClick={() => { router.push('/dashboard/team'); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                          >
                            <Users className="w-4 h-4" />
                            <span>Team</span>
                            <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                          </button>
                          <button
                            onClick={() => { router.push('/dashboard/my-agents'); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>My Agents</span>
                            <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                          </button>
                        </div>
                      )}

                      {/* Preferences Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-2">
                          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Preferences
                          </p>
                        </div>

                        {/* Dark Mode Toggle */}
                        <div className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                              <span>Dark Mode</span>
                            </div>
                            <button
                              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Widget Toggle - Available to all users */}
                        {user && (
                          <div className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Sparkles className="w-4 h-4" />
                                <span>Widgets</span>
                              </div>
                              <button
                                onClick={() => setWidgetFormattingEnabled(!widgetFormattingEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${widgetFormattingEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${widgetFormattingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Memory Toggle - Admin/Power User only */}
                        {effectiveUser && (effectiveUser.role === 'admin' || effectiveUser.role === 'power_user') && (
                          <div className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Brain className="w-4 h-4" />
                                <span title="Memories are always captured. Toggle controls whether they're included in AI context.">
                                  Memory Context
                                </span>
                              </div>
                              <button
                                onClick={() => setMemoryEnabled(!memoryEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memoryEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                title={memoryEnabled ? 'Including memories in AI context' : 'Memories captured but not included in context'}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memoryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Playbook toggle */}
                        {user && (
                          <div className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <PanelRightOpen className="w-4 h-4" />
                                <span title="Enable Playbook panel for saving and formatting AI outputs">
                                  Playbook
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const newVal = !canvasEnabled;
                                  const store = useAppStore.getState();
                                  store.setCanvasEnabled(newVal);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${canvasEnabled ? 'bg-[#fcc824]' : 'bg-gray-300'}`}
                                title={canvasEnabled ? 'Playbook enabled' : 'Playbook disabled'}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${canvasEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Feedback */}
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => { setShowFeedbackModal(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Send Feedback</span>
                        </button>
                        <button
                          onClick={() => { router.push('/feedback'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>My Feedback</span>
                        </button>
                      </div>

                      {/* Coaching Practice Upgrade — show for non-agency users */}
                      {effectiveUser && effectiveUser.role !== 'agency' && effectiveUser.role !== 'admin' && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => { router.push('/agency'); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-sm"
                          >
                            <GraduationCap className="w-4 h-4" />
                            <span>Upgrade to Coaching Practice</span>
                          </button>
                        </div>
                      )}

                      {/* Sign Out */}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-700"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Collapsed (Hidden on mobile) */}
      {!isSidebarOpen && (
        <div className="hidden md:flex w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col py-4">
          {/* Logo at Top */}
          <div className="px-2 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-full"
              title="Expand sidebar"
            >
              <img
                src="/mindset-os-logo.png"
                alt="MindsetOS Logo"
                className="h-8 w-auto dark:brightness-0 dark:invert mx-auto"
              />
            </button>
          </div>

          {/* Middle Menu Icons */}
          <div className="flex-1 flex flex-col items-center gap-2 py-4 overflow-y-auto">
            {/* Start New Chat */}
            <button
              onClick={() => setShowAgentBrowser(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Start New Chat"
            >
              <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Search */}
            <button
              onClick={() => setShowConversationBrowser(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* User Profile at Bottom */}
          <div className="px-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-full relative"
              title={user?.name || user?.email || 'User menu'}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header - Compact with Agent Selector and Search */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800/50 px-4 py-1.5 flex items-center gap-3">
          {/* Admin User Switcher — Admin only, appears first */}
          <AdminUserSwitcher />

          {/* Client Profile Switcher — Agency/Admin only, appears before agent selector */}
          <ClientProfileSwitcher key={`client-${viewAsKey}`} />

          {/* Agent Selector - Opens Agent Browser - Left Aligned */}
          <button
            onClick={() => setShowAgentBrowser(!showAgentBrowser)}
            className="flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all shadow-sm hover:shadow-md"
            style={{
              background: currentAgentData?.accent_color
                ? `linear-gradient(135deg, ${currentAgentData.accent_color}15, ${currentAgentData.accent_color}08)`
                : 'linear-gradient(to right, rgb(254 252 232), rgb(254 249 195))',
              borderColor: currentAgentData?.accent_color || '#ffc82c',
            }}
          >
            {currentAgent ? (
              <AgentIcon
                agentId={currentAgent}
                className="w-5 h-5"
                style={{ color: currentAgentData?.accent_color || '#f8c824' }}
              />
            ) : (
              <Users className="w-5 h-5" style={{ color: '#ffc82c' }} />
            )}
            <div className="flex-1 text-left">
              <div
                className="text-[10px] font-semibold uppercase tracking-wide leading-none"
                style={{ color: currentAgentData?.accent_color || '#f8c824' }}
              >
                Browse Agents
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {currentAgentData?.name ? `Active: ${currentAgentData.name}` : 'No Agent Selected'}
              </div>
            </div>
            <Users className="w-4 h-4" style={{ color: currentAgentData?.accent_color || '#ffc82c' }} />
          </button>

          {/* Search Conversations - Moved from sidebar */}
          <button
            onClick={() => setShowConversationBrowser(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-all"
            title="Search conversations"
          >
            <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
          </button>

          {/* Spacer to push notification bell to right */}
          <div className="flex-1" />

          {/* Feedback Button */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            title="Send Feedback"
            aria-label="Send Feedback"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadFeedbackCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
              </span>
            )}
          </button>

          {/* Notification Bell */}
          <NotificationBell />
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 min-w-0">
          {showAgentBrowser ? (
            <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 py-5">
              <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Agents</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Select an agent to start a conversation</p>
                  </div>
                  {(effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin') && (
                    <button
                      onClick={() => router.push('/dashboard/my-agents')}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Agent
                    </button>
                  )}
                </div>

                {/* Tabs */}
                {(() => {
                  const coreAgents = displayAgents.filter(a => !a.isCustom);
                  const customAgents = displayAgents.filter(a => a.isCustom);
                  const hasCustom = customAgents.length > 0;
                  const isAgency = effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin';

                  // Group core agents by category, sort by sort_order
                  const CATEGORY_ORDER = ['Getting Started', 'Strategy & Foundations', 'Marketing & Content', 'Events & LinkedIn', 'Sales & Voice', 'Research & Support', 'Practice Tools'];
                  const coreByCategory: Record<string, typeof coreAgents> = {};
                  coreAgents.forEach(a => {
                    const cat = a.category || 'General';
                    if (!coreByCategory[cat]) coreByCategory[cat] = [];
                    coreByCategory[cat].push(a);
                  });
                  const categoryOrder = CATEGORY_ORDER.filter(c => coreByCategory[c]);
                  // Add any remaining categories not in the fixed order
                  Object.keys(coreByCategory).forEach(c => {
                    if (!categoryOrder.includes(c)) categoryOrder.push(c);
                  });

                  return (
                    <>
                      {(isAgency || hasCustom) && (
                        <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => setAgentBrowserTab('core')}
                            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
                              agentBrowserTab === 'core'
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            Core Agents
                            {agentBrowserTab === 'core' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffc82c]" />}
                          </button>
                          <button
                            onClick={() => setAgentBrowserTab('custom')}
                            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
                              agentBrowserTab === 'custom'
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            My Agents
                            {customAgents.length > 0 && <span className="ml-1 text-xs text-gray-400">({customAgents.length})</span>}
                            {agentBrowserTab === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffc82c]" />}
                          </button>
                        </div>
                      )}

                      {/* Core Agents — compact list grouped by category */}
                      {agentBrowserTab === 'core' && (
                        <div className="space-y-5">
                          {categoryOrder.map(category => (
                            <div key={category}>
                              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                                {category}
                              </h2>
                              <div className="space-y-1.5">
                                {coreByCategory[category].map((agent) => (
                                  <AgentBrowserRow
                                    key={agent.id}
                                    agent={agent}
                                    accentColor={agent.accent_color || '#3B82F6'}
                                    isActive={currentAgent === agent.id}
                                    userRole={effectiveUser?.role}
                                    onSelect={() => {
                                      if (!agent.locked) {
                                        handleSelectAgent(agent.id);
                                        setShowAgentBrowser(false);
                                      }
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Custom Agents Tab */}
                      {agentBrowserTab === 'custom' && (
                        <div>
                          {customAgents.length === 0 ? (
                            <div className="text-center py-12">
                              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No custom agents yet</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                Build agents tailored to your practice.
                              </p>
                              <div className="flex gap-3 justify-center">
                                <button
                                  onClick={() => {
                                    handleSelectAgent('agent-creator');
                                    setShowAgentBrowser(false);
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                                >
                                  <Wand2 className="w-4 h-4" /> AI-Guided Setup
                                </button>
                                <button
                                  onClick={() => router.push('/dashboard/my-agents')}
                                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
                                >
                                  <Settings2 className="w-4 h-4" /> Manual Setup
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {customAgents.map((agent) => (
                                <AgentBrowserRow
                                  key={agent.id}
                                  agent={agent}
                                  accentColor={agent.accent_color || '#8b5cf6'}
                                  isActive={currentAgent === agent.id}
                                  isCustom
                                  userRole={effectiveUser?.role}
                                  onSelect={() => {
                                    handleSelectAgent(agent.id);
                                    setShowAgentBrowser(false);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : currentAgent ? (
            <ChatWindow
              key={`chat-${currentAgent}-${currentConversationId || 'new'}`}
              agentId={currentAgent === 'MINDSET_SUPER_AGENT'
                ? 'mindset-super-agent'
                : MINDSET_AGENTS[currentAgent as AgentId]?.id || currentAgent.toLowerCase().replace(/_/g, '-')
              }
              userRole={effectiveUser?.role}
              conversationId={currentConversationId ?? undefined}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-2xl">
                <div className="mb-6 flex justify-center">
                  <img
                    src="/mindset-os-logo.png"
                    alt="MindsetOS Logo"
                    className="h-24 w-auto dark:brightness-0 dark:invert"
                  />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Welcome to MindsetOS
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                  MindsetOS — Mindset Operating System. MindsetAI is ready to help you build your mindset coaching practice systematically.
                </p>
                <button
                  onClick={() => setShowAgentBrowser(true)}
                  className="px-6 py-3 bg-[#ffc82c] text-black rounded-xl hover:bg-[#f8c824] transition-colors shadow-md hover:shadow-lg font-semibold"
                >
                  Choose Your Agent
                </button>
              </div>
            </div>
          )}
          </div>
          {canvasEnabled && canvasPanelOpen && (
            <CanvasPanel />
          )}
        </div>
      </div>

      {/* Memory Analytics Drawer - slides in from right - Admin/Power User only */}
      {effectiveUser && (effectiveUser.role === 'admin' || effectiveUser.role === 'power_user') && <MemoryDashboard />}

      {/* Conversation Browser Modal */}
      <ConversationBrowser
        isOpen={showConversationBrowser}
        onClose={() => {
          setShowConversationBrowser(false);
          setConversationBrowserProjectId(null);
        }}
        onSelectConversation={(conversationId) => {
          setCurrentConversation(conversationId);
          setShowConversationBrowser(false);
          setConversationBrowserProjectId(null);
          setShowAgentBrowser(false); // Also close agent browser if open
          // Switch to the agent for that conversation
          const conv = conversations[conversationId];
          if (conv) {
            setCurrentAgent(conv.agentId as AgentId);
          }
        }}
        initialProjectId={conversationBrowserProjectId}
      />

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
      />

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowFeedbackModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" aria-hidden="true"></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                 onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Send Feedback
                  </h3>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {feedbackSuccess ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Thank You!
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your feedback has been submitted successfully.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    {/* User Info Display */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Submitting as: <span className="font-medium text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">{user?.email}</p>
                    </div>

                    {/* Message Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Message
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={feedbackForm.message}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        style={{ '--tw-ring-color': '#fcc824' } as React.CSSProperties}
                        placeholder="Tell us what you think..."
                      />
                    </div>

                    {/* Attachment Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Screenshot (optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {feedbackForm.attachment ? feedbackForm.attachment.name : 'Attach an image'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setFeedbackForm({ ...feedbackForm, attachment: e.target.files?.[0] || null })}
                          />
                        </label>
                        {feedbackForm.attachment && (
                          <button
                            type="button"
                            onClick={() => setFeedbackForm({ ...feedbackForm, attachment: null })}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={feedbackSubmitting}
                      className="w-full py-3 px-4 text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#fcc824' }}
                    >
                      {feedbackSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </>
                      )}
                    </button>

                    {/* View Feedback History Link */}
                    <a
                      href="/feedback"
                      className="block text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      View your feedback history
                      {unreadFeedbackCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                          {unreadFeedbackCount}
                        </span>
                      )}
                    </a>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export with Suspense boundary for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
