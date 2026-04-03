import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConversationHistory, MessageNode } from '../types/conversation';

// Agent types matching MindsetOS backend agents
export const MINDSET_AGENTS = {
  MINDSET_SCORE: {
    id: 'mindset-score',
    name: 'Mindset Score Agent',
    description: 'Your starting point — take the 5-question Mindset Score to reveal your weakest pillar and get your personalized roadmap.',
    icon: '📊',
    color: 'bg-amber-500',   // amber — flagship gold
    tags: ['popular', 'workflow'],
    popularity: 1500,
    releaseDate: '2026-01-01',
    workflowStep: 1,
    starterPrompts: [
      "Take my Mindset Score",
      "What's my weakest mindset pillar?",
      "Start my personalized mindset assessment"
    ]
  },
  RESET_GUIDE: {
    id: 'reset-guide',
    name: 'Reset Guide',
    description: 'Your 48-Hour Mindset Reset facilitator — 6 guided exercises over a weekend that interrupt your reactive patterns.',
    icon: '🔄',
    color: 'bg-sky-500',     // sky blue
    tags: ['popular', 'quick-win'],
    popularity: 1200,
    releaseDate: '2026-01-01',
    workflowStep: 2,
    starterPrompts: [
      "Start my 48-Hour Reset",
      "Guide me through the weekend challenge",
      "I need a mindset pattern interrupt"
    ]
  },
  ARCHITECTURE_COACH: {
    id: 'architecture-coach',
    name: 'Architecture Coach',
    description: 'Your 90-day companion for the Mindset Architecture cohort — guides daily practice, tracks progress, prepares you for weekly calls.',
    icon: '🏗️',
    color: 'bg-violet-600',  // deep violet — premium
    tags: ['workflow', 'advanced'],
    popularity: 900,
    releaseDate: '2026-01-01',
    workflowStep: 3,
    starterPrompts: [
      "Help me prepare for this week's cohort call",
      "Track my 90-day progress",
      "Guide me through the Architecture layers"
    ]
  },
  PRACTICE_BUILDER: {
    id: 'practice-builder',
    name: 'Practice Builder',
    description: 'Creates your personalized 5-10 minute daily mindset routine based on your weakest pillar and available time.',
    icon: '💪',
    color: 'bg-emerald-500',
    tags: ['popular', 'workflow'],
    popularity: 1100,
    releaseDate: '2026-01-01',
    workflowStep: 4,
    starterPrompts: [
      "Build my daily mindset practice",
      "I have 5 minutes — create my routine",
      "Design a practice for my weakest pillar"
    ]
  },
  STORY_EXCAVATOR: {
    id: 'story-excavator',
    name: 'Story Excavator',
    description: 'Uncovers the 5-7 core stories that are actually running your decisions — inherited narratives from family, culture, and early experiences.',
    icon: '📖',
    color: 'bg-orange-600',  // deep orange
    tags: ['workflow', 'advanced'],
    popularity: 850,
    releaseDate: '2026-01-01',
    workflowStep: 5,
    starterPrompts: [
      "Help me excavate my core stories",
      "What narratives are running my decisions?",
      "Uncover my inherited belief patterns"
    ]
  },
  LAUNCH_COMPANION: {
    id: 'launch-companion',
    name: 'Launch Companion',
    description: "Greg's personal strategy assistant — call prep, cohort dashboards, content calendars, and platform insights.",
    icon: '🚀',
    color: 'bg-slate-600',   // slate — admin/internal
    tags: ['advanced'],
    popularity: 300,
    releaseDate: '2026-01-01',
    workflowStep: 6,
    starterPrompts: [
      "Prep me for today's cohort call",
      "Show me my dashboard metrics",
      "Help with this week's content calendar"
    ]
  },
  ACCOUNTABILITY_PARTNER: {
    id: 'accountability-partner',
    name: 'Accountability Partner',
    description: 'Your daily check-in companion — morning intentions, evening reflections, weekly reviews, and streak tracking.',
    icon: '✅',
    color: 'bg-green-600',   // rich green
    tags: ['popular', 'workflow'],
    popularity: 1300,
    releaseDate: '2026-01-01',
    workflowStep: 7,
    starterPrompts: [
      "Morning check-in",
      "Evening reflection",
      "Weekly review"
    ]
  },
  CONVERSATION_CURATOR: {
    id: 'conversation-curator',
    name: 'Conversation Curator',
    description: 'Your podcast matchmaker — recommends specific Mindset.Show episodes based on your current challenge.',
    icon: '🎧',
    color: 'bg-teal-500',    // teal
    tags: ['content'],
    popularity: 700,
    releaseDate: '2026-01-01',
    workflowStep: 8,
    starterPrompts: [
      "Find me an episode about [challenge]",
      "What should I listen to this week?",
      "Recommend episodes for self-sabotage"
    ]
  },
  DECISION_FRAMEWORK: {
    id: 'decision-framework',
    name: 'Decision Framework Agent',
    description: 'Real-time decision support using the DESIGN process — when pressure hits, this agent slows you down so you choose well.',
    icon: '🔀',
    color: 'bg-blue-600',    // blue
    tags: ['workflow', 'popular'],
    popularity: 1000,
    releaseDate: '2026-01-01',
    workflowStep: 9,
    starterPrompts: [
      "Help me think through this decision",
      "I'm facing a tough choice — walk me through DESIGN",
      "I keep making the same reactive decision"
    ]
  },
  INNER_WORLD_MAPPER: {
    id: 'inner-world-mapper',
    name: 'Inner World Mapper',
    description: 'Self-awareness excavation — maps your beliefs, inherited stories, self-talk patterns, and decision defaults into a 4-layer Inner World Map.',
    icon: '🗺️',
    color: 'bg-pink-500',
    tags: ['workflow', 'advanced'],
    popularity: 800,
    releaseDate: '2026-01-01',
    workflowStep: 10,
    starterPrompts: [
      "Map my inner world",
      "What beliefs are running my decisions?",
      "Create my 4-layer Inner World Map"
    ]
  },
  GOAL_ARCHITECT: {
    id: 'goal-architect',
    name: 'Goal Architect',
    description: 'Designs identity-driven goals with milestone maps and daily non-negotiables — goals that survive contact with real life.',
    icon: '🎯',
    color: 'bg-yellow-500',  // yellow
    tags: ['popular', 'workflow'],
    popularity: 950,
    releaseDate: '2026-03-01',
    workflowStep: 11,
    starterPrompts: [
      "Design a goal I'll actually hit",
      "Help me build a 90-day goal architecture",
      "I keep setting the same goal and missing it"
    ]
  },
  BELIEF_DEBUGGER: {
    id: 'belief-debugger',
    name: 'Belief Debugger',
    description: 'Surfaces the limiting beliefs running your decisions — gets the stack trace, not just the symptom.',
    icon: '🔍',
    color: 'bg-purple-600',  // purple (different from violet-600 arch coach)
    tags: ['workflow', 'advanced'],
    popularity: 880,
    releaseDate: '2026-03-01',
    workflowStep: 12,
    starterPrompts: [
      "Debug my money mindset",
      "Why do I keep self-sabotaging?",
      "Find the belief behind this stuck pattern"
    ]
  },
  MORNING_RITUAL_BUILDER: {
    id: 'morning-ritual-builder',
    name: 'Morning Ritual Builder',
    description: 'Designs a morning practice that fits your actual life — not a 5am fantasy that collapses in week two.',
    icon: '🌅',
    color: 'bg-rose-500',    // rose/sunrise (was amber-400 — too close to amber-500)
    tags: ['popular', 'quick-win'],
    popularity: 1050,
    releaseDate: '2026-03-01',
    workflowStep: 13,
    starterPrompts: [
      "Build me a morning routine that actually sticks",
      "Design a 15-minute morning practice",
      "My mornings are chaos — help me design them"
    ]
  },
  ENERGY_OPTIMIZER: {
    id: 'energy-optimizer',
    name: 'Energy Optimizer',
    description: 'Maps your peak energy windows and protects them — stop spending your best hours on your worst tasks.',
    icon: '⚡',
    color: 'bg-lime-500',    // lime
    tags: ['performance', 'popular'],
    popularity: 920,
    releaseDate: '2026-03-01',
    workflowStep: 14,
    starterPrompts: [
      "Map my energy across the week",
      "I'm exhausted by 2pm — help me fix this",
      "Design my ideal energy schedule"
    ]
  },
  FEAR_PROCESSOR: {
    id: 'fear-processor',
    name: 'Fear Processor',
    description: 'Processes the fear-based thinking blocking your next move so you can act with clarity instead of avoidance.',
    icon: '🔥',
    color: 'bg-red-600',     // red
    tags: ['mindset', 'workflow'],
    popularity: 860,
    releaseDate: '2026-03-01',
    workflowStep: 15,
    starterPrompts: [
      "I know what I need to do but I keep avoiding it",
      "Help me process this fear",
      "What's actually blocking me?"
    ]
  },
  RELATIONSHIP_ARCHITECT: {
    id: 'relationship-architect',
    name: 'Relationship Architect',
    description: 'Audits your relationship portfolio and designs it intentionally — who gets your energy and what you need in return.',
    icon: '🤝',
    color: 'bg-cyan-500',    // cyan
    tags: ['mindset', 'advanced'],
    popularity: 720,
    releaseDate: '2026-03-01',
    workflowStep: 16,
    starterPrompts: [
      "Audit my relationships",
      "I'm surrounded by the wrong people",
      "Help me design my relationship portfolio"
    ]
  },
  FOCUS_TRAINER: {
    id: 'focus-trainer',
    name: 'Focus Trainer',
    description: 'Rebuilds your deep work capacity with training protocols — because focus is a skill that deteriorates without practice.',
    icon: '🎯',
    color: 'bg-indigo-500',  // indigo
    tags: ['performance', 'popular'],
    popularity: 980,
    releaseDate: '2026-03-01',
    workflowStep: 17,
    starterPrompts: [
      "Build my deep work capacity",
      "I can't focus for more than 20 minutes",
      "Design a focus training protocol for me"
    ]
  },
  VALUES_CLARIFIER: {
    id: 'values-clarifier',
    name: 'Values Clarifier',
    description: 'Surfaces your actual values — not the ones you inherited or wish you had — so your decisions finally feel right.',
    icon: '⚖️',
    color: 'bg-fuchsia-600', // fuchsia/magenta
    tags: ['mindset', 'workflow'],
    popularity: 790,
    releaseDate: '2026-03-01',
    workflowStep: 18,
    starterPrompts: [
      "Help me clarify my actual values",
      "Why does hitting my goals feel hollow?",
      "Surface my real values vs. inherited ones"
    ]
  },
  TRANSFORMATION_TRACKER: {
    id: 'transformation-tracker',
    name: 'Transformation Tracker',
    description: 'Captures your mindset shifts and wins weekly so you can see how far you\'ve actually come.',
    icon: '📈',
    color: 'bg-green-500',   // green (was emerald-400 — too close to emerald-500)
    tags: ['popular', 'workflow'],
    popularity: 830,
    releaseDate: '2026-03-01',
    workflowStep: 19,
    starterPrompts: [
      "Weekly check-in",
      "Help me see my growth this month",
      "Document my transformation"
    ]
  },
  CONTENT_ARCHITECT: {
    id: 'content-architect',
    name: 'Content Architect',
    description: 'Turns your mindset work and lived experience into content that attracts the right clients — without sounding like AI.',
    icon: '✍️',
    color: 'bg-orange-500',  // orange (was rose-500 — too close to new morning-ritual rose)
    tags: ['sales', 'popular'],
    popularity: 910,
    releaseDate: '2026-03-01',
    workflowStep: 20,
    starterPrompts: [
      "Turn this insight into a LinkedIn post",
      "Help me build a content strategy",
      "Write content from my client story"
    ]
  },
} as const;

export type AgentId = keyof typeof MINDSET_AGENTS;

// Legacy Message interface for backwards compatibility
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentId?: string;
  widget?: any;
  // Fork/branch fields
  parentMessageId?: string | null;
  branchIndex?: number;
  siblingCount?: number;
  isEdited?: boolean;
  editedAt?: Date | string;
}

export interface Conversation {
  id: string;
  agentId: string;
  history: ConversationHistory; // Tree structure instead of messages array
  createdAt: Date | string;
  updatedAt: Date | string;
  title?: string;
  messageCount?: number;
  isStarred?: boolean;
  projectId?: string | null;
  isArchived?: boolean;
  archivedAt?: Date | string | null;
  modelOverride?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
  conversationCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  emailVerified: boolean;
  lettaAgentId?: string;
  membershipTier?: string;
  trialExpiresAt?: string;
}

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount: number;
  embeddingCount: number;
  createdAt: Date;
}

export interface RecentMemory {
  id: string;
  content: string;
  memory_type: string;
  importance_score: number;
  conversationId: string;
  messageId: string;
  timestamp: Date;
}

export interface MemoryItem {
  key: string;
  label: string;
  value: string;
  source: string; // Which agent provided this data
}

export interface ImportedMemory {
  items: MemoryItem[];
  confirmed: boolean;
  lastUpdated: Date;
}

export interface UIPreferences {
  suggestionsSidebarVisible: boolean;
  responseFormat: 'normal' | 'tweet';
  deliverablesPanelExpanded: boolean;
}

export interface MemoryCategories {
  profile: boolean;     // core_memories + user_business_profiles
  knowledge: boolean;   // user_document_chunks
  history: boolean;     // semantic memories + cross-agent context
  brandVoice: boolean;  // brand_voice_profiles
}

export interface MemorySettings {
  masterEnabled: boolean;
  categories: MemoryCategories;
}

export interface ClientProfile {
  id: string;
  clientName: string;
  clientType: string;
  industry: string | null;
  description: string | null;
  color: string | null;
  isActive: boolean;
  isArchived: boolean;
  metadata: Record<string, any>;
  conversationCount: number;
  memoryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  category: string;
  modelPreference: string;
  maxTokens: number;
  temperature: string;
  isActive: boolean;
  accentColor: string;
  color: string;
  metadata: Record<string, any>;
  visibility: string;
  customConfig: Record<string, any>;
  clientProfileId: string | null;
  conversationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  conversation_id?: string;
  message_id?: string;
  user_id?: string;
  agent_id?: string;
  type: 'document' | 'framework' | 'campaign' | 'profile' | 'script' | 'email' | 'code';
  title: string;
  content: string;
  language?: string;
  version: number;
  is_starred: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;

  // Agent state
  currentAgent: AgentId | null;
  setCurrentAgent: (agentId: AgentId | null) => void;

  // Conversation state
  conversations: Record<string, Conversation>;
  currentConversationId: string | null;
  currentConversation: string | null; // Alias for currentConversationId
  addMessage: (conversationId: string, message: MessageNode) => void;
  createConversation: (agentId: string) => string;
  setCurrentConversation: (conversationId: string | null) => void;
  getConversationsByAgent: (agentId: string) => Conversation[];
  getAllConversations: () => Conversation[];
  loadConversations: (conversations: Conversation[]) => void;
  loadConversationHistory: (conversationId: string, history: ConversationHistory) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  toggleStarConversation: (id: string) => Promise<void>;
  moveConversationToProject: (conversationId: string, projectId: string | null) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Fork/Branch management
  editMessage: (messageId: string, newContent: string) => Promise<{ success: boolean; newMessage?: Message }>;
  regenerateMessage: (messageId: string) => Promise<{ success: boolean; regenerateData?: any }>;
  switchBranch: (conversationId: string, messageId: string, branchIndex: number) => Promise<void>;
  getSiblings: (messageId: string) => Promise<Message[]>;

  // Projects state
  projects: Record<string, Project>;
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string, color?: string) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Client Profile state (agency/admin only)
  clientProfiles: ClientProfile[];
  activeClientProfileId: string | null;
  fetchClientProfiles: () => Promise<void>;
  createClientProfile: (data: { clientName: string; clientType?: string; industry?: string; description?: string; color?: string }) => Promise<ClientProfile>;
  updateClientProfile: (profileId: string, updates: Partial<ClientProfile>) => Promise<void>;
  deleteClientProfile: (profileId: string) => Promise<void>;
  setActiveClientProfile: (profileId: string | null) => void;

  // Custom Agents state (agency/admin only)
  customAgents: CustomAgent[];
  fetchCustomAgents: () => Promise<void>;
  createCustomAgent: (data: { name: string; description?: string; systemPrompt: string; category?: string; color?: string; conversationStarters?: string[]; icon?: string; visibility?: string; clientProfileId?: string | null }) => Promise<CustomAgent>;
  updateCustomAgent: (agentId: string, updates: Partial<CustomAgent> & { conversationStarters?: string[]; icon?: string }) => Promise<void>;
  deleteCustomAgent: (agentId: string) => Promise<void>;

  // Document state
  documents: Document[];
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;

  // Memory state
  recentMemories: RecentMemory[];
  addRecentMemory: (memory: RecentMemory) => void;
  removeRecentMemory: (memoryId: string) => void;
  clearOldMemories: () => void;

  // Imported Memory state
  importedMemory: ImportedMemory | null;
  setImportedMemory: (memory: ImportedMemory | null) => void;
  confirmMemory: () => void;
  updateMemoryItem: (key: string, value: string) => void;

  // Admin impersonation system
  viewAsUser: User | null;
  setViewAsUser: (user: User | null) => void;
  impersonationSession: {
    id: string;
    status: 'viewing' | 'edit_requested' | 'edit_approved' | 'edit_declined';
    permissions: { view: boolean; edit: boolean; sendMessages: boolean; savePlaybooks: boolean };
    expires_at?: string;
  } | null;
  setImpersonationSession: (session: any) => void;

  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isStreamingResponse: boolean;
  setStreamingResponse: (isStreaming: boolean) => void;
  memoryEnabled: boolean;
  setMemoryEnabled: (enabled: boolean) => void;
  memorySettings: MemorySettings;
  setMemorySettings: (settings: Partial<MemorySettings>) => void;
  setMemoryCategory: (category: keyof MemoryCategories, enabled: boolean) => void;
  brandVoiceEnabled: boolean;
  setBrandVoiceEnabled: (enabled: boolean) => void;
  widgetFormattingEnabled: boolean;
  setWidgetFormattingEnabled: (enabled: boolean) => void;

  // Canvas/Artifact state
  canvasEnabled: boolean;
  setCanvasEnabled: (enabled: boolean) => void;
  canvasPanelOpen: boolean;
  setCanvasPanelOpen: (open: boolean) => void;
  currentArtifact: Artifact | null;
  setCurrentArtifact: (artifact: Artifact | null) => void;
  canvasContent: string | null;
  setCanvasContent: (content: string | null) => void;
  canvasMessageId: string | null;
  openCanvas: (content: string, messageId: string, agentId?: string) => void;
  closeCanvas: () => void;

  // Playbook refresh trigger — bump to refetch PlaybookList
  playbookRefreshKey: number;
  triggerPlaybookRefresh: () => void;

  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // UI Preferences
  uiPreferences: UIPreferences;
  setUIPreference: <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => void;
}

/** SSR-safe token accessor — returns null on the server where localStorage is unavailable. */
function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),
      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          conversations: {}, // Clear conversations on logout
          currentConversationId: null,
          currentAgent: null
        }),

      // Admin impersonation system
      viewAsUser: null,
      setViewAsUser: (user) => set({ viewAsUser: user, activeClientProfileId: null }),
      impersonationSession: null,
      setImpersonationSession: (session) => set({ impersonationSession: session }),

      // Agent state
      currentAgent: 'MINDSET_SCORE' as AgentId | null,
      setCurrentAgent: (agentId) =>
        set({ currentAgent: agentId }),

      // Conversation state
      conversations: {},
      currentConversationId: null,
      get currentConversation() {
        return this.currentConversationId;
      },

      addMessage: (conversationId, message) =>
        set((state) => {
          const existingConversation = state.conversations[conversationId];

          // If conversation doesn't exist, create it first
          if (!existingConversation) {
            console.warn(`⚠️ Conversation ${conversationId} not found in store, creating placeholder`);
            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  id: conversationId,
                  agentId: 'mindset-score',
                  title: 'New Conversation',
                  history: {
                    currentId: message.id,
                    messages: {
                      [message.id]: message,
                    },
                  },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isArchived: false,
                  isStarred: false,
                },
              },
            };
          }

          // Normal case: add message to existing conversation tree
          const newMessages = {
            ...existingConversation.history.messages,
            [message.id]: message,
          };

          // If message has a parent, update parent's childrenIds
          if (message.parentId && newMessages[message.parentId]) {
            const parent = newMessages[message.parentId];
            if (!parent.childrenIds.includes(message.id)) {
              newMessages[message.parentId] = {
                ...parent,
                childrenIds: [...parent.childrenIds, message.id],
              };
            }
          }

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...existingConversation,
                history: {
                  currentId: message.id, // Update currentId to the new message
                  messages: newMessages,
                },
                updatedAt: new Date(),
              },
            },
          };
        }),

      createConversation: (agentId) => {
        // Generate a proper UUID for the conversation
        // Using crypto.randomUUID() for browser-native UUID generation
        const conversationId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}-4${Math.random().toString(16).slice(2, 5)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 14)}`;
        const newConversation: Conversation = {
          id: conversationId,
          agentId,
          history: {
            currentId: null,
            messages: {},
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: newConversation,
          },
          currentConversationId: conversationId,
        }));

        console.log(`📝 Created conversation: ${conversationId}`);
        return conversationId;
      },

      setCurrentConversation: (conversationId) =>
        set({ currentConversationId: conversationId }),

      getConversationsByAgent: (agentId) => {
        const { conversations } = get();
        return Object.values(conversations).filter(
          (conv) => conv.agentId === agentId
        );
      },

      getAllConversations: () => {
        const { conversations } = get();
        return Object.values(conversations).sort(
          (a, b) => {
            const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
            const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
            return bTime - aTime;
          }
        );
      },

      loadConversations: (loadedConversations) => {
        const conversationsMap: Record<string, Conversation> = {};
        loadedConversations.forEach((conv) => {
          // Ensure each conversation has a valid history structure
          if (!conv.history) {
            conv.history = {
              currentId: null,
              messages: {},
            };
          }
          conversationsMap[conv.id] = conv;
        });
        set({ conversations: conversationsMap });
        console.log(`📚 Loaded ${loadedConversations.length} conversations into store`);
      },

      loadConversationHistory: (conversationId, history) => {
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                history,
              },
            },
          };
        });
        const messageCount = Object.keys(history.messages).length;
        console.log(`📨 Loaded history with ${messageCount} messages for conversation ${conversationId}, currentId: ${history.currentId}`);
      },

      updateConversation: async (id, updates) => {
        const token = getToken();
        const user = get().user;

        console.log('[updateConversation] Token exists:', !!token, 'User exists:', !!user);

        if (!token) {
          console.error('[updateConversation] No token found in localStorage. User needs to log in.');
          throw new Error('Not authenticated - please log in again');
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations/${id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[updateConversation] Server error:', response.status, errorText);
            throw new Error(`Failed to update conversation: ${response.status} ${errorText}`);
          }

          set((state) => ({
            conversations: {
              ...state.conversations,
              [id]: {
                ...state.conversations[id],
                ...updates,
                updatedAt: new Date(),
              },
            },
          }));

          console.log('[updateConversation] Successfully updated conversation:', id, updates);
        } catch (error) {
          console.error('[updateConversation] Error:', error);
          throw error;
        }
      },

      toggleStarConversation: async (id) => {
        const { conversations, updateConversation } = get();
        const conversation = conversations[id];
        if (!conversation) return;

        await updateConversation(id, { isStarred: !conversation.isStarred });
      },

      moveConversationToProject: async (conversationId, projectId) => {
        await get().updateConversation(conversationId, { projectId });
      },

      archiveConversation: async (id) => {
        await get().updateConversation(id, { isArchived: true });
      },

      renameConversation: async (id, title) => {
        await get().updateConversation(id, { title });
      },

      deleteConversation: async (id) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to delete conversation');

        set((state) => {
          const { [id]: removed, ...rest } = state.conversations;
          return {
            conversations: rest,
            currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
          };
        });
      },

      // Fork/Branch management functions
      editMessage: async (messageId, newContent) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/messages/${messageId}/edit`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: newContent }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to edit message');
          }

          const result = await response.json();

          // Note: Conversations will be reloaded by the component after edit
          // The backend has already updated the active_branch_leaf_id

          return { success: true, newMessage: result.newMessage };
        } catch (error) {
          console.error('Error editing message:', error);
          return { success: false };
        }
      },

      regenerateMessage: async (messageId) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/messages/${messageId}/regenerate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to regenerate message');
          }

          const result = await response.json();
          return { success: true, regenerateData: result };
        } catch (error) {
          console.error('Error regenerating message:', error);
          return { success: false };
        }
      },

      switchBranch: async (conversationId, messageId, branchIndex) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations/${conversationId}/switch-branch`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageId, branchIndex }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to switch branch');
          }

          // Note: Conversations will be reloaded by the component after branch switch
          // The backend has already updated the active_branch_leaf_id
        } catch (error) {
          console.error('Error switching branch:', error);
          throw error;
        }
      },

      getSiblings: async (messageId) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/messages/${messageId}/siblings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get siblings');
          }

          const result = await response.json();
          return result.siblings || [];
        } catch (error) {
          console.error('Error getting siblings:', error);
          return [];
        }
      },

      // Projects state
      projects: {},

      fetchProjects: async () => {
        const token = getToken();
        if (!token) {
          // Silently return if not authenticated - user might not be logged in yet
          return;
        }

        try {
          const viewAsUser = get().viewAsUser;
          const params = viewAsUser ? `?viewAsUserId=${viewAsUser.id}` : '';
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/projects${params}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error('Failed to fetch projects:', response.status);
            return;
          }

          const data = await response.json();
          const projectsList = data.projects || [];
          const projectsMap: Record<string, Project> = {};
          projectsList.forEach((project: Project) => {
            projectsMap[project.id] = project;
          });

          set({ projects: projectsMap });
        } catch (error) {
          console.error('Error fetching projects:', error);
        }
      },

      createProject: async (name, description, color) => {
        const token = getToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/projects`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description, color }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create project: ${error}`);
          }

          const project = await response.json();
          set((state) => ({
            projects: {
              ...state.projects,
              [project.id]: project,
            },
          }));

          return project;
        } catch (error) {
          console.error('Error creating project:', error);
          throw error;
        }
      },

      updateProject: async (projectId, updates) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update project');

        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              ...updates,
              updatedAt: new Date(),
            },
          },
        }));
      },

      deleteProject: async (projectId) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to delete project');

        set((state) => {
          const { [projectId]: removed, ...rest } = state.projects;
          return { projects: rest };
        });
      },

      // Client Profile state (agency/admin only)
      clientProfiles: [],
      activeClientProfileId: null,

      fetchClientProfiles: async () => {
        const token = getToken();
        if (!token) return;
        try {
          // If admin is viewing as another user, fetch that user's client profiles
          const viewAsUser = get().viewAsUser;
          const params = viewAsUser ? `?viewAsUserId=${viewAsUser.id}` : '';
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/client-profiles${params}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) return; // Silently fail for non-agency users (403)
          const data = await response.json();
          set({ clientProfiles: data.clientProfiles || [] });
        } catch (err) {
          console.error('Failed to fetch client profiles:', err);
        }
      },

      createClientProfile: async (profileData) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/client-profiles`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create client profile');
        }

        const data = await response.json();
        set((state) => ({ clientProfiles: [data.clientProfile, ...state.clientProfiles] }));
        return data.clientProfile;
      },

      updateClientProfile: async (profileId, updates) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/client-profiles/${profileId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update client profile');
        const data = await response.json();

        set((state) => ({
          clientProfiles: state.clientProfiles.map((cp) =>
            cp.id === profileId ? { ...cp, ...data.clientProfile } : cp
          ),
        }));
      },

      deleteClientProfile: async (profileId) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/client-profiles/${profileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to delete client profile');

        set((state) => ({
          clientProfiles: state.clientProfiles.filter((cp) => cp.id !== profileId),
          activeClientProfileId: state.activeClientProfileId === profileId ? null : state.activeClientProfileId,
        }));
      },

      setActiveClientProfile: (profileId) => {
        set({ activeClientProfileId: profileId });
      },

      // Custom Agents state
      customAgents: [],

      fetchCustomAgents: async () => {
        const token = getToken();
        if (!token) return;

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/custom-agents`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!response.ok) return;
          const data = await response.json();
          set({ customAgents: data.customAgents || [] });
        } catch (error) {
          console.error('Failed to fetch custom agents:', error);
        }
      },

      createCustomAgent: async (agentData) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/custom-agents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create custom agent');
        }

        const data = await response.json();
        if (!data?.customAgent) throw new Error('Invalid response from server');
        const customAgent = data.customAgent;

        set((state) => ({
          customAgents: [customAgent, ...state.customAgents],
        }));

        return customAgent;
      },

      updateCustomAgent: async (agentId, updates) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/custom-agents/${encodeURIComponent(agentId)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update custom agent');

        const data = await response.json();
        if (!data?.customAgent) throw new Error('Invalid response from server');
        const updatedAgent = data.customAgent;

        set((state) => ({
          customAgents: state.customAgents.map((a) =>
            a.id === agentId ? { ...a, ...updatedAgent } : a
          ),
        }));
      },

      deleteCustomAgent: async (agentId) => {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/custom-agents/${encodeURIComponent(agentId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to delete custom agent');

        set((state) => ({
          customAgents: state.customAgents.filter((a) => a.id !== agentId),
        }));
      },

      // Document state
      documents: [],
      setDocuments: (documents) => set({ documents }),

      addDocument: (document) =>
        set((state) => ({
          documents: [...state.documents, document],
        })),

      updateDocument: (documentId, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === documentId ? { ...doc, ...updates } : doc
          ),
        })),

      // Memory state
      recentMemories: [],
      addRecentMemory: (memory) =>
        set((state) => ({
          recentMemories: [...state.recentMemories, memory],
        })),

      removeRecentMemory: (memoryId) =>
        set((state) => ({
          recentMemories: state.recentMemories.filter((m) => m.id !== memoryId),
        })),

      clearOldMemories: () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        set((state) => ({
          recentMemories: state.recentMemories.filter(
            (m) => m.timestamp > fiveMinutesAgo
          ),
        }));
      },

      // Imported Memory state
      importedMemory: null,
      setImportedMemory: (memory) => set({ importedMemory: memory }),
      confirmMemory: () =>
        set((state) => {
          if (!state.importedMemory) return state;
          return {
            importedMemory: {
              ...state.importedMemory,
              confirmed: true,
              lastUpdated: new Date(),
            },
          };
        }),
      updateMemoryItem: (key, value) =>
        set((state) => {
          if (!state.importedMemory) return state;
          return {
            importedMemory: {
              ...state.importedMemory,
              items: state.importedMemory.items.map((item) =>
                item.key === key ? { ...item, value } : item
              ),
              lastUpdated: new Date(),
            },
          };
        }),

      // UI state
      isSidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      isStreamingResponse: false,
      setStreamingResponse: (isStreaming) =>
        set({ isStreamingResponse: isStreaming }),
      memoryEnabled: true,
      setMemoryEnabled: (enabled) => set((state) => ({
        memoryEnabled: enabled,
        memorySettings: { ...state.memorySettings, masterEnabled: enabled }
      })),
      memorySettings: {
        masterEnabled: true,
        categories: { profile: true, knowledge: true, history: true, brandVoice: true }
      },
      setMemorySettings: (settings) => set((state) => ({
        memorySettings: { ...state.memorySettings, ...settings },
        memoryEnabled: settings.masterEnabled ?? state.memorySettings.masterEnabled,
      })),
      setMemoryCategory: (category, enabled) => set((state) => ({
        memorySettings: {
          ...state.memorySettings,
          categories: { ...state.memorySettings.categories, [category]: enabled }
        }
      })),
      brandVoiceEnabled: false, // Disabled by default until user configures
      setBrandVoiceEnabled: (enabled) => set({ brandVoiceEnabled: enabled }),
      widgetFormattingEnabled: true, // Enabled by default for all users
      setWidgetFormattingEnabled: (enabled) => set({ widgetFormattingEnabled: enabled }),

      // Canvas/Artifact state
      canvasEnabled: true,
      setCanvasEnabled: (enabled) => set({ canvasEnabled: enabled }),
      canvasPanelOpen: false,
      setCanvasPanelOpen: (open) => set({ canvasPanelOpen: open }),
      currentArtifact: null,
      setCurrentArtifact: (artifact) => set({ currentArtifact: artifact }),
      canvasContent: null,
      setCanvasContent: (content) => set({ canvasContent: content }),
      canvasMessageId: null,
      openCanvas: (content, messageId, agentId) => set({
        canvasContent: content,
        canvasMessageId: messageId,
        canvasPanelOpen: true,
        currentArtifact: null
      }),
      closeCanvas: () => set({
        canvasPanelOpen: false,
        canvasContent: null,
        canvasMessageId: null,
        currentArtifact: null
      }),

      playbookRefreshKey: 0,
      triggerPlaybookRefresh: () => set((state) => ({ playbookRefreshKey: state.playbookRefreshKey + 1 })),

      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        // Immediately apply theme class to html element
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
          } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
          }
        }
      },
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // UI Preferences
      uiPreferences: {
        suggestionsSidebarVisible: true,
        responseFormat: 'normal',
        deliverablesPanelExpanded: true,
      },
      setUIPreference: (key, value) =>
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            [key]: value,
          },
        })),
    }),
    {
      name: 'ecos-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        memoryEnabled: state.memoryEnabled,
        memorySettings: state.memorySettings,
        brandVoiceEnabled: state.brandVoiceEnabled,
        widgetFormattingEnabled: state.widgetFormattingEnabled,
        currentAgent: state.currentAgent,
        currentConversationId: state.currentConversationId,
        uiPreferences: state.uiPreferences,
        importedMemory: state.importedMemory,
        activeClientProfileId: state.activeClientProfileId,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 [PERSIST] Hydration complete, state:', {
          hasUser: !!state?.user,
          userEmail: state?.user?.email,
          isAuthenticated: state?.isAuthenticated,
          currentAgent: state?.currentAgent,
          currentConversation: state?.currentConversationId
        });
        // Clear stale canvasEnabled from old persisted state
        if (state) {
          state.canvasEnabled = true;
        }
      },
    }
  )
)

