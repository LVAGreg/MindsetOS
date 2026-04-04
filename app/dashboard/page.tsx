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
import DecisionRehearsalPanel from '@/components/DecisionRehearsalPanel';
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
import TrialUpsellModal from '@/components/TrialUpsellModal';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import WelcomeGuide from '@/components/WelcomeGuide';
import FirstTimeModal from '@/components/FirstTimeModal';
import { MindsetScoreWidget, JourneyProgressStepper } from '@/components/MindsetScoreWidget';
import { CanvasPanel } from '@/components/CanvasPanel';
import DashboardSidebar from '@/components/DashboardSidebar';
import { CoworkModal } from '@/components/CoworkModal';
import QuickAgentSwitch from '@/components/QuickAgentSwitch';
import MorningCheckin from '@/components/MorningCheckin';
import dynamic from 'next/dynamic';
const BrainInterface = dynamic(() => import('@/components/BrainInterface'), { ssr: false });

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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-left group relative ${
        isActive && !agent.locked ? 'border-l-2 shadow-sm' : 'border'
      }`}
      style={
        agent.locked
          ? { background: 'rgba(18,18,31,0.3)', border: '1px solid rgba(30,30,48,0.5)', opacity: 0.5, cursor: 'not-allowed' }
          : isActive
          ? { background: `rgba(252,200,36,0.05)`, borderColor: '#fcc824', borderRightColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent' }
          : { background: 'rgba(18,18,31,0.5)', border: '1px solid #1e1e30' }
      }
    >
      {/* Accent color dot indicator */}
      {!agent.locked && (
        <span
          className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ backgroundColor: accentColor, display: isActive ? 'none' : undefined }}
        />
      )}

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
          {/* Accent dot — always visible next to agent name */}
          {!agent.locked && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor, opacity: isActive ? 1 : 0.5 }}
            />
          )}
          <span className="font-semibold text-sm truncate" style={{ color: isActive ? '#fcc824' : '#ededf5' }}>
            {agent.name}
          </span>
          {isActive && !agent.locked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#fcc824] text-black text-[10px] font-bold rounded-full flex-shrink-0">
              <Check className="w-2.5 h-2.5" /> ACTIVE
            </span>
          )}
          {agent.locked && (
            <Lock className="w-3 h-3 flex-shrink-0" style={{ color: '#9090a8' }} />
          )}
          {isCustom && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${accentColor}15`, color: accentColor }}>
              CUSTOM
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: '#9090a8' }}>
          {agent.description}
        </p>
      </div>

      {/* Manage gear for power_user/admin */}
      {canManage && !agent.locked && (
        <a
          href={`/admin/agents/${agent.id}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          style={{ background: 'transparent' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.8)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          title="Manage agent & knowledge base"
        >
          <Settings2 className="w-3.5 h-3.5" style={{ color: '#9090a8' }} />
        </a>
      )}

      {/* Arrow — visible on hover */}
      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ color: '#9090a8' }} />
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

  // On initial /dashboard load (no conversation in URL), clear persisted agent
  // so the welcome/brain screen shows instead of jumping straight into a chat
  useEffect(() => {
    if (window.location.pathname === '/dashboard') {
      setCurrentAgent(null as any);
      setCurrentConversation(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track onboarding status to refetch agents when it changes
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  // Counter incremented to trigger agent refetch without null→value setTimeout cycling
  const [agentRefetchTrigger, setAgentRefetchTrigger] = useState(0);

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
            // Increment trigger counter so the fetchAgents effect re-runs immediately
            setAgentRefetchTrigger(prev => prev + 1);
          }

          // If onboarding not completed, start with Mindset Score
          if (!status.completed) {
            console.log('⚠️ [ONBOARDING] Not completed - redirecting to Mindset Score agent');
            setCurrentAgent('MINDSET_SCORE');
            // Create conversation with mindset-score agent
            const newConvId = createConversation('mindset-score');
            setCurrentConversation(newConvId);
          } else {
            console.log('✅ [ONBOARDING] Completed - all agents should be unlocked');
            // If user completed onboarding but has no agent set, switch to Mindset Score
            if (currentAgent === 'MINDSET_SCORE' && !currentConversationId) {
              console.log('🔄 [ONBOARDING] Setting default agent to Mindset Score');
              setCurrentAgent('MINDSET_SCORE');
            }
          }
        }
      } catch (error) {
        console.error('❌ [ONBOARDING] Failed to check status:', error);
      }
    };

    checkOnboarding();
  }, [user, hasHydrated, createConversation, setCurrentAgent, setCurrentConversation]);

  // No auto-select — users land on the welcome/brain screen and pick an agent themselves

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

  const [isLoading, setIsLoading] = useState(true);
  const [v7Agents, setV7Agents] = useState<any[]>([]);
  const [showConversationBrowser, setShowConversationBrowser] = useState(false);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  // Sidebar active section state for new DashboardSidebar
  const [sidebarSection, setSidebarSection] = useState<'home' | 'agents' | 'playbook' | 'conversations' | 'profile' | null>('home');
  const [hasMindsetScore, setHasMindsetScore] = useState(false);
  const [aiGreeting, setAiGreeting] = useState<string | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [selectedView, setSelectedView] = useState<'all' | 'starred' | 'project' | null>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [conversationBrowserProjectId, setConversationBrowserProjectId] = useState<string | null>(null);
  const [displayAgents, setDisplayAgents] = useState<any[]>([]);
  const [agentLoadError, setAgentLoadError] = useState<string | null>(null);
  const [agentBrowserTab, setAgentBrowserTab] = useState<'core' | 'custom'>('core');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quickSwitchOpen, setQuickSwitchOpen] = useState(false);
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
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [showCoworkModal, setShowCoworkModal] = useState(false);

  // Show first-time modal for brand new users, welcome guide for returning-but-unseen
  useEffect(() => {
    if (!user || !hasHydrated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('guide') === 'true') {
      setShowWelcomeGuide(true);
      return;
    }
    const hasSeenGuide = localStorage.getItem('mindset_os_welcome_guide_seen');
    if (!hasSeenGuide) {
      // Check if truly first time (no conversations yet) → show richer FirstTimeModal
      const hasSeenFirstTime = localStorage.getItem('mindset_os_first_time_modal_seen');
      if (!hasSeenFirstTime) {
        setShowFirstTimeModal(true);
      } else {
        setShowWelcomeGuide(true);
      }
    }
  }, [user, hasHydrated]);

  const dismissFirstTimeModal = () => {
    setShowFirstTimeModal(false);
    localStorage.setItem('mindset_os_first_time_modal_seen', 'true');
    localStorage.setItem('mindset_os_welcome_guide_seen', 'true');
  };

  const handleStartMindsetScore = () => {
    dismissFirstTimeModal();
    // Use handleSelectAgent which resolves agent keys correctly for both static and dynamic agents
    // This runs after the component has initialized agents, so displayAgents may not be populated yet.
    // Fall back to URL param approach which is always reliable.
    router.push('/dashboard?agent=mindset-score');
  };

  const dismissWelcomeGuide = () => {
    setShowWelcomeGuide(false);
    localStorage.setItem('mindset_os_welcome_guide_seen', 'true');
  };

  // ⌘⇧W (Mac) / Ctrl+Shift+W (Win/Linux) → Cowork Instruction Generator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'W' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowCoworkModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ⌘K / Ctrl+K → Quick Agent Switch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSwitchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  // Check if user has completed the Mindset Score (for sidebar CTA)
  useEffect(() => {
    const checkMindsetScore = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const response = await fetch(`${API_URL}/api/conversations?agentId=mindset-score&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const convList = Array.isArray(data) ? data : (data.conversations || []);
          setHasMindsetScore(convList.length > 0);
        }
      } catch {
        // fail silently — CTA defaults to visible
      }
    };
    checkMindsetScore();
  }, [user]);

  // Fetch AI-generated personalized greeting
  useEffect(() => {
    const fetchGreeting = async () => {
      if (!user || !hasHydrated) return;
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/user/greeting`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.greeting) setAiGreeting(data.greeting);
        }
      } catch { /* fail silently */ }
    };
    fetchGreeting();
  }, [user, hasHydrated]);

  // Sync sidebarSection with showAgentBrowser
  useEffect(() => {
    if (showAgentBrowser) setSidebarSection('agents');
  }, [showAgentBrowser]);

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
      setAgentLoadError(null);
      try {
        const token = localStorage.getItem('accessToken');
        const viewAsUserId = viewAsUser?.id || '';
        const agentUrl = viewAsUserId ? `${API_URL}/api/agents?viewAsUserId=${viewAsUserId}` : `${API_URL}/api/agents`;
        const response = await fetch(agentUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.error('Failed to fetch agents:', response.status);
          setAgentLoadError('Failed to load agents. Please refresh.');
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
        setAgentLoadError('Could not load agents. Check your connection.');
      }
    };

    fetchAgents();
  }, [showAgentBrowser, onboardingCompleted, agentRefetchTrigger, activeClientProfileId, viewAsUser?.id]); // Refetch when agent browser opens/closes, onboarding changes, client switches, or viewAs user changes

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
    ? ((currentAgent as string) === 'MINDSET_SUPER_AGENT'
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-center animate-float-up-1">
          <div className="w-14 h-14 border-[3px] border-[#fcc824]/20 border-t-[#fcc824] rounded-full animate-spin mx-auto mb-5" />
          <p className="text-sm font-medium tracking-wide" style={{ color: '#9090a8' }}>Loading MindsetOS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex relative" style={{ background: '#09090f' }}>
      {/* Trial Expired Popup */}
      <TrialExpiredPopup
        membershipTier={user?.membershipTier}
        trialExpiresAt={user?.trialExpiresAt}
      />

      {/* Trial Upsell Modal — shows 3 days before expiry */}
      <TrialUpsellModal
        membershipTier={user?.membershipTier}
        trialExpiresAt={user?.trialExpiresAt}
      />

      {/* Trial Days Remaining Banner */}
      {user?.membershipTier === 'trial' && user?.trialExpiresAt && new Date(user.trialExpiresAt) > new Date() && (
        <div className="fixed top-0 left-0 right-0 z-50 text-center py-1.5 text-[13px] font-semibold" style={{ background: 'linear-gradient(to right, #fcc824, #fcc824cc, #fcc824)', color: '#000', boxShadow: '0 4px 12px rgba(252,200,36,0.1)' }}>
          <span className="opacity-80">Free trial:</span> {Math.max(0, Math.ceil((new Date(user.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left &mdash;{' '}
          <a href="/join" className="underline font-bold transition-colors" style={{ color: '#000' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#7a5a00')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#000')}>Upgrade now</a>
        </div>
      )}

      {/* First-time modal — shown to brand new users, directs to Mindset Score */}
      <FirstTimeModal
        show={showFirstTimeModal}
        onDismiss={dismissFirstTimeModal}
        onStartMindsetScore={handleStartMindsetScore}
      />

      {/* Welcome Guide for returning-but-unseen users */}
      <WelcomeGuide show={showWelcomeGuide} onDismiss={dismissWelcomeGuide} />

      {/* Cowork Instruction Generator — ⌘⇧W / Ctrl+Shift+W */}
      {showCoworkModal && <CoworkModal onClose={() => setShowCoworkModal(false)} />}


      {/* ── DashboardSidebar (new, replaces old expanded + collapsed sidebars) ── */}
      <DashboardSidebar
        key={`sidebar-${viewAsKey}`}
        activeSection={sidebarSection}
        onSectionChange={(section) => {
          setSidebarSection(section);
          if (section === 'home') {
            setCurrentAgent(null as any);
            setCurrentConversation(null);
            setShowAgentBrowser(false);
          } else if (section === 'agents') setShowAgentBrowser(true);
          else if (section === 'conversations') setShowConversationBrowser(true);
          else if (section === 'playbook') {
            // Playbook is surfaced in the sidebar children slot below
          }
        }}
        onNewChat={() => {
          if (currentAgentData) handleNewConversation();
          else setShowAgentBrowser(true);
        }}
        onSearch={() => setShowConversationBrowser(true)}
        onLogout={handleLogout}
        hasMindsetScore={hasMindsetScore}
        unreadFeedbackCount={unreadFeedbackCount}
        onFeedbackClick={() => setShowFeedbackModal(true)}
        viewAsUser={viewAsUser}
        onAccountabilityPartnerClick={() => handleSelectAgent('accountability-partner')}
      >
        {/* Conversation history + playbook injected as children */}
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
        <CollapsibleSection
          title="Playbook"
          icon={<BookOpen className="w-4 h-4" />}
          defaultOpen={false}
          isCollapsed={false}
        >
          <PlaybookList />
        </CollapsibleSection>
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
      </DashboardSidebar>

      {/* Legacy collapsed sidebar removed — DashboardSidebar handles collapsed state */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header - Compact with Agent Selector and Search */}
        <header className="header-glass border-b px-3 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-3" style={{ background: 'rgba(9,9,15,0.92)', borderColor: '#1e1e30', backdropFilter: 'blur(12px)' }}>
          {/* Mobile hamburger — only visible on mobile when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="flex md:hidden min-w-[44px] min-h-[44px] items-center justify-center p-2 rounded-xl transition-all duration-200 flex-shrink-0"
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" style={{ color: '#9090a8' }} />
            </button>
          )}

          {/* Admin User Switcher — Admin only, appears first */}
          <AdminUserSwitcher />

          {/* Client Profile Switcher — Agency/Admin only, appears before agent selector */}
          <ClientProfileSwitcher key={`client-${viewAsKey}`} />

          {/* Agent Selector - Opens Agent Browser - Left Aligned */}
          <button
            onClick={() => setShowAgentBrowser(!showAgentBrowser)}
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-2 border rounded-xl transition-all duration-200 hover:shadow-md group min-w-0 max-w-[180px] sm:max-w-none"
            style={{
              background: currentAgentData?.accent_color
                ? `linear-gradient(135deg, ${currentAgentData.accent_color}08, transparent)`
                : undefined,
              borderColor: currentAgentData?.accent_color
                ? `${currentAgentData.accent_color}40`
                : 'rgba(252,200,36,0.3)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: `${currentAgentData?.accent_color || '#fcc824'}15`,
              }}
            >
              {currentAgent ? (
                <AgentIcon
                  agentId={currentAgent}
                  className="w-4.5 h-4.5"
                  style={{ color: currentAgentData?.accent_color || '#fcc824' }}
                />
              ) : (
                <Users className="w-4.5 h-4.5" style={{ color: '#fcc824' }} />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-bold leading-tight truncate" style={{ color: '#ededf5' }}>
                {currentAgentData?.name || 'Select Agent'}
              </div>
              <div
                className="text-[10px] font-medium uppercase tracking-wider leading-none mt-0.5"
                style={{ color: currentAgentData?.accent_color || '#fcc824' }}
              >
                {currentAgentData ? 'Active' : 'Browse Agents'}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: '#9090a8' }} />
          </button>

          {/* Search Conversations - Moved from sidebar */}
          <button
            onClick={() => setShowConversationBrowser(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
            title="Search conversations"
          >
            <Search className="w-4 h-4" style={{ color: '#9090a8' }} />
            <span className="text-[13px] font-medium hidden sm:inline" style={{ color: '#9090a8' }}>Search</span>
          </button>

          {/* Spacer to push notification bell to right */}
          <div className="flex-1" />

          {/* Feedback Button */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="relative p-2 rounded-lg transition-all"
            style={{ color: '#9090a8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; (e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.8)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Send Feedback"
            aria-label="Send Feedback"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadFeedbackCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1" style={{ color: '#ededf5', background: '#dc2626' }}>
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
          {/* Morning Check-in — shows between 5am–12pm if not done today */}
          <MorningCheckin />
          {showAgentBrowser ? (
            <div className="h-full overflow-y-auto custom-scrollbar px-3 sm:px-6 py-4 sm:py-5" style={{ background: '#09090f' }}>
              <div className="max-w-3xl mx-auto">
                {/* Agent load error banner */}
                {agentLoadError && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171' }}>
                    {agentLoadError}
                  </div>
                )}
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: '#ededf5' }}>Browse Agents</h1>
                    <p className="text-sm mt-0.5" style={{ color: '#9090a8' }}>Choose a coach to begin your session</p>
                  </div>
                  {(effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin') && (
                    <button
                      onClick={() => router.push('/dashboard/my-agents')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      style={{ background: 'rgba(124,91,246,0.15)', color: '#7c5bf6' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.25)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.15)')}
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

                  // Category filter tab definitions
                  const FILTER_TABS = [
                    { key: 'all', label: 'All' },
                    { key: 'mindset', label: 'Mindset' },
                    { key: 'performance', label: 'Performance' },
                    { key: 'sales', label: 'Sales' },
                  ];

                  // Count agents per filter tab
                  const tabCounts: Record<string, number> = {
                    all: coreAgents.length,
                    mindset: coreAgents.filter(a => (a.category || '').toLowerCase() === 'mindset').length,
                    performance: coreAgents.filter(a => (a.category || '').toLowerCase() === 'performance').length,
                    sales: coreAgents.filter(a => (a.category || '').toLowerCase() === 'sales').length,
                  };

                  // Apply category filter to core agents
                  const filteredCoreAgents = categoryFilter === 'all'
                    ? coreAgents
                    : coreAgents.filter(a => (a.category || '').toLowerCase() === categoryFilter);

                  // Group core agents by category, sort by sort_order
                  const CATEGORY_ORDER = ['Getting Started', 'mindset', 'performance', 'sales', 'Strategy & Foundations', 'Marketing & Content', 'Events & LinkedIn', 'Sales & Voice', 'Research & Support', 'Practice Tools'];
                  const CATEGORY_LABELS: Record<string, string> = {
                    'mindset': 'Mindset Work',
                    'performance': 'Performance',
                    'sales': 'Pipeline & Outreach',
                  };
                  const coreByCategory: Record<string, typeof coreAgents> = {};
                  filteredCoreAgents.forEach((a: any) => {
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
                      {/* Category filter pills */}
                      <div className="flex gap-1.5 mb-4 flex-wrap">
                        {FILTER_TABS.map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setCategoryFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                              categoryFilter === tab.key
                                ? 'bg-[#fcc824]/10 text-[#fcc824] border border-[#fcc824]/30'
                                : 'text-[#9090a8] hover:text-[#ededf5] border border-transparent hover:border-white/10'
                            }`}
                          >
                            {tab.label}
                            {tabCounts[tab.key] > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={
                                  categoryFilter === tab.key
                                    ? { background: 'rgba(252,200,36,0.2)', color: '#fcc824' }
                                    : { background: 'rgba(30,30,48,0.6)', color: '#9090a8' }
                                }
                              >
                                {tabCounts[tab.key]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {(isAgency || hasCustom) && (
                        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#1e1e30' }}>
                          <button
                            onClick={() => setAgentBrowserTab('core')}
                            className="px-3 py-2 text-sm font-medium transition-colors relative"
                            style={{ color: agentBrowserTab === 'core' ? '#ededf5' : '#9090a8' }}
                            onMouseEnter={e => { if (agentBrowserTab !== 'core') (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
                            onMouseLeave={e => { if (agentBrowserTab !== 'core') (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
                          >
                            Core Agents
                            {agentBrowserTab === 'core' && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#fcc824' }} />}
                          </button>
                          <button
                            onClick={() => setAgentBrowserTab('custom')}
                            className="px-3 py-2 text-sm font-medium transition-colors relative"
                            style={{ color: agentBrowserTab === 'custom' ? '#ededf5' : '#9090a8' }}
                            onMouseEnter={e => { if (agentBrowserTab !== 'custom') (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
                            onMouseLeave={e => { if (agentBrowserTab !== 'custom') (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
                          >
                            My Agents
                            {customAgents.length > 0 && <span className="ml-1 text-xs" style={{ color: '#9090a8' }}>({customAgents.length})</span>}
                            {agentBrowserTab === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#fcc824' }} />}
                          </button>
                        </div>
                      )}

                      {/* Core Agents — compact list grouped by category */}
                      {agentBrowserTab === 'core' && (
                        <div className="space-y-5">
                          {categoryOrder.map((category, categoryIndex) => (
                            <div key={category} className={categoryIndex > 0 ? 'border-t border-[#1e1e30] pt-4 mt-2' : ''}>
                              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#9090a8' }}>
                                {CATEGORY_LABELS[category] || category}
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
                              <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: '#5a5a72' }} />
                              <h3 className="text-lg font-bold mb-1" style={{ color: '#ededf5' }}>No custom agents yet</h3>
                              <p className="text-sm mb-5" style={{ color: '#9090a8' }}>
                                Build agents tailored to your practice.
                              </p>
                              <div className="flex gap-3 justify-center">
                                <button
                                  onClick={() => {
                                    handleSelectAgent('agent-creator');
                                    setShowAgentBrowser(false);
                                  }}
                                  className="px-4 py-2 text-sm rounded-lg transition-colors font-medium flex items-center gap-2"
                                  style={{ background: '#7c5bf6', color: '#ededf5' }}
                                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#6a4de0')}
                                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#7c5bf6')}
                                >
                                  <Wand2 className="w-4 h-4" /> AI-Guided Setup
                                </button>
                                <button
                                  onClick={() => router.push('/dashboard/my-agents')}
                                  className="px-4 py-2 text-sm rounded-lg transition-colors font-medium flex items-center gap-2"
                                  style={{ background: 'rgba(18,18,31,0.8)', color: '#ededf5', border: '1px solid #1e1e30' }}
                                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.9)')}
                                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.8)')}
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
                                  accentColor={agent.accent_color || '#7c5bf6'}
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
            <>
              {currentAgent === 'DECISION_FRAMEWORK' && <DecisionRehearsalPanel />}
              <ChatWindow
                key={`chat-${currentAgent}-${currentConversationId || 'new'}`}
                agentId={(currentAgent as string) === 'MINDSET_SUPER_AGENT'
                  ? 'mindset-super-agent'
                  : MINDSET_AGENTS[currentAgent as AgentId]?.id || currentAgent.toLowerCase().replace(/_/g, '-')
                }
                userRole={effectiveUser?.role}
                conversationId={currentConversationId ?? undefined}
              />
            </>
          ) : (
            /* ===== WELCOME HOME SCREEN — PATHWAY ===== */
            <div className="h-full overflow-y-auto custom-scrollbar" style={{ background: '#09090f' }}>
              <div className="relative min-h-full">
                {/* Ambient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(252,200,36,0.03)' }} />
                <div className="absolute top-40 right-1/3 w-72 h-72 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(79,110,247,0.03)' }} />

                {/* Content */}
                <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-20">

                  {/* ---- AI Greeting ---- */}
                  {(() => {
                    const hour = new Date().getHours();
                    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
                    const fallback = `Good ${timeOfDay}${user?.firstName ? `, ${user.firstName}` : ''}.`;
                    return (
                      <div className="mb-10 animate-float-up-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5" style={{ color: 'rgba(252,200,36,0.6)' }}>
                          Your mindset OS
                        </p>
                        {aiGreeting ? (
                          <p className="text-2xl font-bold leading-snug" style={{ color: '#ededf5' }}>
                            {aiGreeting}
                          </p>
                        ) : (
                          <h1 className="text-3xl font-black tracking-tight leading-tight" style={{ color: '#ededf5' }}>
                            {fallback}
                          </h1>
                        )}
                      </div>
                    );
                  })()}

                  {/* ---- Mindset Score Widget ---- */}
                  <div className="mb-3 animate-float-up-2">
                    <MindsetScoreWidget onNavigateToAgent={handleSelectAgent} />
                  </div>

                  {/* ---- Journey Progress Stepper ---- */}
                  <div className="mb-10 animate-float-up-2">
                    <JourneyProgressStepper
                      conversations={conversations}
                      onNavigateToAgent={handleSelectAgent}
                    />
                  </div>

                  {/* ---- Interactive Brain ---- */}
                  <div className="mb-10 animate-float-up-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#4a4a60' }}>
                      Your agent network
                    </p>
                    <BrainInterface
                      onAgentSelect={(slug) => handleSelectAgent(slug as any)}
                      activeSlug={currentAgentData?.id}
                    />
                  </div>

                  {/* ---- Journey Pathway ---- */}
                  {(() => {
                    const PATHWAY_STAGES = [
                      { id: 'mindset-score', label: 'Mindset Score', subtitle: 'Start here · Free', color: '#fcc824', step: 1 },
                      { id: 'reset-guide', label: '48-Hour Reset', subtitle: '$47 · Entry', color: '#7c5bf6', step: 2 },
                      { id: 'architecture-coach', label: '90-Day Architecture', subtitle: '$997 · Core', color: '#4f6ef7', step: 3 },
                      { id: 'launch-companion', label: 'Architecture Intensive', subtitle: '$1,997 · Premium', color: '#ec4899', step: 4 },
                    ];

                    const allConvs = Object.values(conversations) as any[];
                    const stages = PATHWAY_STAGES.map(stage => {
                      const sessionCount = allConvs.filter(c => c.agentId === stage.id).length;
                      const dbAgent = displayAgents.find(a => a.id === stage.id);
                      const locked = dbAgent ? dbAgent.locked : (stage.step > 1 && !hasMindsetScore);
                      const lastConv = allConvs
                        .filter(c => c.agentId === stage.id && c.updatedAt)
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                      const lastActive = lastConv?.updatedAt
                        ? new Date(lastConv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : null;
                      return { ...stage, sessionCount, locked, lastActive };
                    });

                    const s0 = stages[0]; const s1 = stages[1]; const s2 = stages[2];
                    let recommendedId: string;
                    if (s0.sessionCount === 0) recommendedId = 'mindset-score';
                    else if (s1.sessionCount === 0 && !s1.locked) recommendedId = 'reset-guide';
                    else if (s2.sessionCount === 0 && !s2.locked) recommendedId = 'architecture-coach';
                    else recommendedId = stages.filter(s => s.sessionCount > 0 && !s.locked).sort((a, b) => b.sessionCount - a.sessionCount)[0]?.id || 'mindset-score';

                    return (
                      <div className="mb-10 animate-float-up-2">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#4a4a60' }}>Your journey</h2>
                        <div className="relative">
                          <div className="absolute left-[27px] top-12 bottom-12 w-px pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(30,30,48,0), #1e1e30 15%, #1e1e30 85%, rgba(30,30,48,0))' }} />
                          <div className="space-y-2">
                            {stages.map(stage => {
                              const isRecommended = stage.id === recommendedId;
                              const isDone = stage.sessionCount > 0;
                              const isLocked = stage.locked;
                              return (
                                <button
                                  key={stage.id}
                                  disabled={isLocked}
                                  onClick={() => !isLocked && handleSelectAgent(stage.id)}
                                  className="group relative w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200"
                                  style={{
                                    background: isRecommended ? 'rgba(18,18,31,0.95)' : 'rgba(18,18,31,0.6)',
                                    border: isRecommended ? `1px solid ${stage.color}45` : `1px solid ${isDone ? '#2a2a3f' : '#1e1e30'}`,
                                    boxShadow: isRecommended ? `0 0 24px ${stage.color}0f` : 'none',
                                    opacity: isLocked ? 0.45 : 1,
                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                  }}
                                  onMouseEnter={e => { if (!isLocked) { (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}55`; (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.98)'; } }}
                                  onMouseLeave={e => { if (!isLocked) { (e.currentTarget as HTMLElement).style.borderColor = isRecommended ? `${stage.color}45` : (isDone ? '#2a2a3f' : '#1e1e30'); (e.currentTarget as HTMLElement).style.background = isRecommended ? 'rgba(18,18,31,0.95)' : 'rgba(18,18,31,0.6)'; } }}
                                >
                                  <div className="relative z-10 flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ background: isDone ? `${stage.color}20` : isLocked ? 'rgba(30,30,48,0.8)' : `${stage.color}14`, border: `1.5px solid ${isDone ? stage.color + '50' : isLocked ? '#2a2a3f' : stage.color + '28'}` }}>
                                    {isLocked ? (
                                      <Lock className="w-4 h-4" style={{ color: '#4a4a60' }} />
                                    ) : (
                                      <AgentIcon agentId={stage.id} className="w-5 h-5" style={{ color: isDone ? stage.color : stage.color + 'cc' }} />
                                    )}
                                    {isDone && !isLocked && (
                                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: stage.color, border: '2px solid #09090f' }}>
                                        <Check className="w-2 h-2 text-black" strokeWidth={3} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-bold leading-none" style={{ color: isLocked ? '#4a4a60' : '#ededf5' }}>{stage.label}</span>
                                      {isRecommended && !isLocked && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}40` }}>Next</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs" style={{ color: '#4a4a60' }}>{stage.subtitle}</span>
                                      {stage.sessionCount > 0 && <><span style={{ color: '#2a2a3f' }}>·</span><span className="text-xs" style={{ color: '#9090a8' }}>{stage.sessionCount} session{stage.sessionCount !== 1 ? 's' : ''}</span></>}
                                      {stage.lastActive && <><span style={{ color: '#2a2a3f' }}>·</span><span className="text-xs" style={{ color: '#4a4a60' }}>Last: {stage.lastActive}</span></>}
                                    </div>
                                  </div>
                                  {!isLocked && <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: stage.color }} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ---- Specialist Coaches ---- */}
                  {(() => {
                    const SPECIALIST_IDS = ['accountability-partner', 'practice-builder', 'decision-framework', 'inner-world-mapper', 'story-excavator', 'conversation-curator'];
                    const specialists = SPECIALIST_IDS.map(id => displayAgents.find(a => a.id === id)).filter(Boolean) as any[];
                    if (specialists.length === 0) return null;
                    return (
                      <div className="mb-10 animate-float-up-3">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#4a4a60' }}>Specialist coaches</h2>
                        <div className="grid grid-cols-2 gap-2">
                          {specialists.map((agent: any) => {
                            const sessionCount = (Object.values(conversations) as any[]).filter(c => c.agentId === agent.id).length;
                            return (
                              <button key={agent.id} onClick={() => !agent.locked && handleSelectAgent(agent.id)} disabled={agent.locked}
                                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                                style={{ background: 'rgba(18,18,31,0.6)', border: '1px solid #1e1e30', opacity: agent.locked ? 0.45 : 1, cursor: agent.locked ? 'not-allowed' : 'pointer' }}
                                onMouseEnter={e => { if (!agent.locked) { (e.currentTarget as HTMLElement).style.borderColor = `${agent.accent_color}35`; (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.98)'; } }}
                                onMouseLeave={e => { if (!agent.locked) { (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30'; (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.6)'; } }}
                              >
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${agent.accent_color}14`, border: `1.5px solid ${agent.accent_color}28` }}>
                                  {agent.locked ? <Lock className="w-3.5 h-3.5" style={{ color: '#4a4a60' }} /> : <AgentIcon agentId={agent.id} className="w-4 h-4" style={{ color: agent.accent_color }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold leading-none mb-0.5 truncate" style={{ color: agent.locked ? '#4a4a60' : '#ededf5' }}>{agent.name}</p>
                                  {sessionCount > 0 && <p className="text-[10px]" style={{ color: '#9090a8' }}>{sessionCount} session{sessionCount !== 1 ? 's' : ''}</p>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ---- Recent Conversations ---- */}
                  {(() => {
                    const recentConvs = Object.values(conversations)
                      .filter((c: any) => c.messages && c.messages.length > 0)
                      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .slice(0, 4);
                    if (recentConvs.length === 0) return null;
                    return (
                      <div className="animate-float-up-4">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#4a4a60' }}>Continue where you left off</h2>
                          <button onClick={() => setShowConversationBrowser(true)}
                            className="text-xs font-semibold flex items-center gap-0.5 transition-colors"
                            style={{ color: 'rgba(252,200,36,0.6)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fcc824'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(252,200,36,0.6)'; }}>
                            View all<ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {recentConvs.map((conv: any) => {
                            const agent = displayAgents.find(a => a.id === conv.agentId);
                            const lastMsg = conv.messages?.[conv.messages.length - 1];
                            return (
                              <button key={conv.id}
                                onClick={() => { if (agent) setCurrentAgent(conv.agentId as AgentId); setCurrentConversation(conv.id); }}
                                className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left"
                                style={{ background: 'rgba(18,18,31,0.6)', border: '1px solid #1e1e30' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,110,247,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.98)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30'; (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.6)'; }}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${agent?.accent_color || '#fcc824'}14`, border: `1.5px solid ${agent?.accent_color || '#fcc824'}22` }}>
                                  {agent ? <AgentIcon agentId={agent.id} className="w-3.5 h-3.5" style={{ color: agent.accent_color }} /> : <MessageSquare className="w-3.5 h-3.5" style={{ color: '#9090a8' }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 truncate" style={{ color: '#4a4a60' }}>{agent?.name || conv.agentId}</p>
                                  <p className="text-sm truncate font-medium leading-snug" style={{ color: '#ededf5' }}>{conv.title || lastMsg?.content?.slice(0, 60) || 'Conversation'}</p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#9090a8' }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ---- Empty state ---- */}
                  {displayAgents.length === 0 && (
                    <div className="text-center py-16 animate-float-up-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(252,200,36,0.08)', border: '1px solid rgba(252,200,36,0.15)' }}>
                        <Brain className="w-7 h-7" style={{ color: '#fcc824' }} />
                      </div>
                      <h3 className="text-base font-bold mb-2" style={{ color: '#ededf5' }}>Setting up your coaches</h3>
                      <p className="text-sm mb-5 max-w-xs mx-auto" style={{ color: '#9090a8' }}>Your AI mindset coaches are loading.</p>
                      <button onClick={() => setShowAgentBrowser(true)} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-colors" style={{ background: '#fcc824', color: '#09090f' }}>
                        Browse Agents
                      </button>
                    </div>
                  )}

                </div>
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

      {/* ⌘K Quick Agent Switch */}
      <QuickAgentSwitch
        isOpen={quickSwitchOpen}
        onClose={() => setQuickSwitchOpen(false)}
        onSelect={(key) => {
          handleSelectAgent(
            MINDSET_AGENTS[key as AgentId]?.id || key.toLowerCase().replace(/_/g, '-')
          );
          setQuickSwitchOpen(false);
        }}
        displayAgents={displayAgents}
      />

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
            <div className="fixed inset-0 transition-opacity" style={{ background: 'rgba(9,9,15,0.85)' }} aria-hidden="true"></div>

            <div className="inline-block align-bottom rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                 style={{ background: 'rgba(18,18,31,0.97)', border: '1px solid #1e1e30' }}
                 onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: '#1e1e30' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold" style={{ color: '#ededf5' }}>
                    Send Feedback
                  </h3>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="transition-colors"
                    style={{ color: '#9090a8' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ededf5')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9090a8')}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {feedbackSuccess ? (
                  <div className="text-center py-8">
                    <Check className="w-16 h-16 mx-auto mb-4" style={{ color: '#4ade80' }} />
                    <h4 className="text-xl font-bold mb-2" style={{ color: '#ededf5' }}>
                      Thank You!
                    </h4>
                    <p style={{ color: '#9090a8' }}>
                      Your feedback has been submitted successfully.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    {/* User Info Display */}
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(30,30,48,0.6)', border: '1px solid #1e1e30' }}>
                      <p className="text-sm" style={{ color: '#9090a8' }}>
                        Submitting as: <span className="font-medium" style={{ color: '#ededf5' }}>{user?.firstName} {user?.lastName}</span>
                      </p>
                      <p className="text-sm" style={{ color: '#5a5a72' }}>{user?.email}</p>
                    </div>

                    {/* Message Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                        Message
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={feedbackForm.message}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg focus:outline-none resize-none"
                        style={{ background: 'rgba(9,9,15,0.8)', border: '1px solid #1e1e30', color: '#ededf5', outline: 'none' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#4f6ef7')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#1e1e30')}
                        placeholder="Tell us what you think..."
                      />
                    </div>

                    {/* Attachment Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#9090a8' }}>
                        Screenshot (optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                          style={{ background: 'rgba(9,9,15,0.8)', border: '1px solid #1e1e30' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(30,30,48,0.8)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(9,9,15,0.8)')}>
                          <Paperclip className="w-4 h-4" style={{ color: '#9090a8' }} />
                          <span className="text-sm truncate" style={{ color: '#9090a8' }}>
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
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: '#f87171' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.12)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
                      className="block text-center text-sm transition-colors"
                      style={{ color: '#9090a8' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ededf5')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9090a8')}
                    >
                      View your feedback history
                      {unreadFeedbackCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1" style={{ color: '#ededf5', background: '#dc2626' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4" style={{ border: '2px solid #1e1e30', borderTopColor: '#4f6ef7' }} />
          <p style={{ color: '#9090a8' }}>Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
