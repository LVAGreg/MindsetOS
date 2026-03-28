import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConversationHistory, MessageNode } from '../types/conversation';

// Agent types matching backend
export const MINDSET_AGENTS = {
  GENERAL: {
    id: 'ecos-super-agent',
    name: 'MindsetAI',
    description: 'Complete MindsetOS system with RAG knowledge retrieval and memory management. Your main mindset coaching AI.',
    icon: '🎓',
    color: 'bg-gray-500',
    tags: ['popular'],
    popularity: 1250,
    releaseDate: '2024-09-01',
    workflowStep: 1,
    starterPrompts: [
      "Help me understand the MindsetOS workflow",
      "What's the best way to start building my mindset coaching for entrepreneurs?",
      "Explain how all the agents work together"
    ]
  },
  CLIENT_ONBOARDING: {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    description: 'Build your complete business profile - 11 questions, 5 sections',
    icon: '👋',
    color: 'bg-teal-500',
    tags: ['workflow', 'popular'],
    popularity: 980,
    releaseDate: '2024-09-10',
    workflowStep: 2,
    starterPrompts: [
      "Let's begin!",
      "Help me build my business profile",
      "Guide me through onboarding"
    ]
  },
  MONEY_MODEL_MAKER: {
    id: 'money-model-maker',
    name: 'Money Model Mapper',
    description: 'Define your PEOPLE, PROMISE, and 3 PRINCIPLES',
    icon: '💰',
    color: 'bg-blue-500',
    tags: ['workflow', 'popular'],
    popularity: 1450,
    releaseDate: '2024-08-15',
    workflowStep: 3,
    starterPrompts: [
      "Help me clarify who I help",
      "I need to define my big promise",
      "What are the 3 principles for my money model?"
    ]
  },
  MMM_5IN30: {
    id: 'mmm-5in30',
    name: 'MONEY MODEL MAPPER (5in30)',
    description: 'Create A High Converting Offer Using The Money Model Framework',
    icon: '💎',
    color: 'bg-cyan-500',
    tags: ['workflow', 'new'],
    popularity: 1500,
    releaseDate: '2025-11-12',
    workflowStep: 3,
    starterPrompts: [
      "Help me build my Money Model",
      "I want to create a high-converting offer",
      "Guide me through the Money Model framework"
    ]
  },
  FAST_FIX_FINDER: {
    id: 'fast-fix-finder',
    name: 'Fast Fix Finder',
    description: 'Create your quick-win IN OFFER',
    icon: '⚡',
    color: 'bg-yellow-500',
    tags: ['workflow', 'quick-win'],
    popularity: 720,
    releaseDate: '2024-08-20',
    workflowStep: 4,
    starterPrompts: [
      "Help me create a quick-win offer",
      "What should my IN OFFER be?",
      "I need a fast-selling entry offer"
    ]
  },
  OFFER_PROMO_PRINTER: {
    id: 'offer-promo-printer',
    name: 'The Offer Invitation Architect',
    description: 'Generate your promotional invitation (6 Ps)',
    icon: '📢',
    color: 'bg-purple-500',
    tags: ['workflow', 'content'],
    popularity: 890,
    releaseDate: '2024-09-05',
    workflowStep: 5,
    starterPrompts: [
      "Create a promotional invitation for my offer",
      "Help me write the 6 Ps for my offer",
      "Generate compelling copy for my offer"
    ]
  },
  PROMO_PLANNER: {
    id: 'promo-planner',
    name: 'LinkedIn Events Builder Buddy',
    description: 'Build your 10-day campaign (30 messages)',
    icon: '📅',
    color: 'bg-green-500',
    tags: ['workflow', 'content', 'popular'],
    popularity: 1120,
    releaseDate: '2024-09-12',
    workflowStep: 6,
    starterPrompts: [
      "Build a 10-day campaign for my offer",
      "I need 30 messages for my promotion",
      "Create a complete campaign strategy"
    ]
  },
  QUALIFICATION_CALL_BUILDER: {
    id: 'qualification-call-builder',
    name: 'Qualification Call Builder',
    description: 'Create your EXPERT sales script',
    icon: '📞',
    color: 'bg-red-500',
    tags: ['workflow'],
    popularity: 650,
    releaseDate: '2024-09-18',
    workflowStep: 7,
    starterPrompts: [
      "Help me create a qualification call script",
      "Build my EXPERT sales process",
      "I need a conversion script for calls"
    ]
  },
  LINKEDIN_EVENTS_BUILDER: {
    id: 'linkedin-events-builder',
    name: 'LinkedIn Events Builder',
    description: 'Design compelling event topics (WHAT-WHAT-HOW)',
    icon: '🎯',
    color: 'bg-indigo-500',
    tags: ['workflow', 'lead-gen'],
    popularity: 540,
    releaseDate: '2024-09-20',
    workflowStep: 8,
    starterPrompts: [
      "Help me create a LinkedIn event topic",
      "Design an event using WHAT-WHAT-HOW",
      "I need a compelling event idea"
    ]
  },
  LINKEDIN_EVENTS_BUILDER_V2: {
    id: 'linkedin-events-builder-v2',
    name: 'LinkedIn Events Builder v2',
    description: 'High-converting events with multi-select and sharp positioning',
    icon: '🎯',
    color: 'bg-purple-500',
    tags: ['advanced', 'lead-gen'],
    popularity: 420,
    releaseDate: '2024-10-05',
    starterPrompts: [
      "Create a high-converting LinkedIn event",
      "Build event with 3x3 audience selection",
      "Design magnetic event that fills"
    ]
  },
  LINKEDIN_EVENTS_BUILDER_V3: {
    id: 'linkedin-events-builder-v3',
    name: 'LinkedIn Events Builder v3',
    description: 'Mega Prompt Edition - Educational 6-step event creation with Greg\'s voice',
    icon: '✨',
    color: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    tags: ['advanced', 'lead-gen'],
    popularity: 380,
    releaseDate: '2024-10-10',
    starterPrompts: [
      "Create event that fills and converts",
      "Build LinkedIn event with mega prompt guidance",
      "Design NOW-worthy event with educational support"
    ]
  },
  LINKEDIN_EVENTS_BUILDER_V6: {
    id: 'linkedin-events-builder-v6',
    name: 'LinkedIn Events Builder V6',
    description: 'Widget-Optimized - Progress tracker, rating widgets, 100% widget accuracy',
    icon: '🎨',
    color: 'bg-gradient-to-r from-purple-600 to-pink-600',
    tags: ['new', 'advanced', 'lead-gen'],
    popularity: 290,
    releaseDate: '2025-10-12',
    starterPrompts: [
      "Build LinkedIn event with intelligent widgets",
      "Create event with progress tracker",
      "Design event with rating feedback system"
    ]
  },
  MONEY_MODEL_MAKER_V2: {
    id: 'money-model-makerv2',
    name: 'Money Model Maker v2',
    description: 'High-converting offer creation with Big Promise + 3 Principles',
    icon: '💎',
    color: 'bg-emerald-500',
    tags: ['advanced'],
    popularity: 680,
    releaseDate: '2024-09-25',
    starterPrompts: [
      "Help me build a high-converting Money Model",
      "Create my Big Promise and 3 Principles",
      "I need a compelling offer framework"
    ],
  },
  MONEY_MODEL_MAKER_V3: {
    id: 'money-model-makerv3',
    name: 'Money Model Maker v3',
    description: 'Interactive multi-choice offer builder with edit capabilities',
    icon: '💠',
    color: 'bg-cyan-500',
    tags: ['advanced'],
    popularity: 510,
    releaseDate: '2024-10-02',
    starterPrompts: [
      "Build Money Model with multiple choices",
      "Create offer with interactive options",
      "Guide me step-by-step with choices"
    ],
  },
  MONEY_MODEL_MAKER_V4: {
    id: 'money-model-makerv4',
    name: 'Money Model Maker v4',
    description: '3x3 multi-select grid builder with yellow highlights',
    icon: '🌟',
    color: 'bg-yellow-500',
    tags: ['advanced'],
    popularity: 470,
    releaseDate: '2024-10-08',
    starterPrompts: [
      "Build Money Model with 3x3 grid selections",
      "Create offer with multi-select categories",
      "Guide me with beautiful grid choices"
    ],
  },
  MONEY_MODEL_MAKER_V5: {
    id: 'money-model-makerv5',
    name: 'Money Model Maker v5',
    description: 'Mega prompt intelligence - flexible formats, sharp Greg voice',
    icon: '⚡',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    tags: ['advanced', 'popular'],
    popularity: 830,
    releaseDate: '2024-10-15',
    starterPrompts: [
      "Build Money Model with intelligent formatting",
      "Create offer with mega prompt style",
      "Sharp strategic Money Model guidance"
    ],
  },
  VALUE_QUANTIFIER_V6: {
    id: 'value-quantifier-v6',
    name: 'Value Quantifier V6',
    description: 'ROI Calculator - Turn "too expensive" into "when can we start?" in 5-10 minutes',
    icon: '🧮',
    color: 'bg-gradient-to-r from-green-600 to-emerald-600',
    tags: ['new', 'quick-win', 'popular'],
    popularity: 1340,
    releaseDate: '2025-10-20',
    starterPrompts: [
      "Build my ROI calculator",
      "Create client proposal with ROI proof",
      "Calculate value of my services"
    ]
  },
  MEMORY_INSIGHTS_V6: {
    id: 'memory-insights-v6',
    name: 'Memory Insights V6',
    description: 'Beautiful memory visualization - Transform stored memories into stunning visual insights',
    tags: ['new', 'advanced'],
    popularity: 240,
    releaseDate: '2025-10-25',
    icon: '🧠',
    color: 'bg-gradient-to-r from-purple-600 to-pink-600',
    starterPrompts: [
      "Show me my memory insights",
      "Visualize my mindset coaching journey",
      "Find patterns in my memories"
    ]
  },
  MINDSET_SUPER_AGENT: {
    id: 'ecos-super-agent',
    name: 'MindsetOS Super Agent',
    description: 'Complete MindsetOS system with RAG knowledge retrieval and memory management. Your main mindset coaching AI.',
    tags: ['new', 'advanced', 'workflow'],
    popularity: 1500,
    releaseDate: '2025-11-27',
    icon: '🚀',
    color: 'bg-orange-500',
    starterPrompts: [
      "Let's GO!",
      "Help me build my complete mindset coaching system",
      "Guide me through the entire MindsetOS workflow"
    ]
  },
  DEEP_RESEARCH_EXPERT: {
    id: 'deep-research-expert',
    name: 'Deep Research Expert',
    description: 'Comprehensive deep research with citations using Perplexity Sonar. Perfect for market research, competitor analysis, and strategic insights.',
    tags: ['new', 'research', 'analysis'],
    popularity: 1200,
    releaseDate: '2025-12-06',
    icon: '🔬',
    color: 'bg-purple-600',
    starterPrompts: [
      "Research my industry trends and competitors",
      "Find the latest insights on [topic]",
      "Analyze the market for my mindset coaching niche",
      "Deep dive into [subject] with citations"
    ]
  },
  CONTENT_CATALYST: {
    id: 'content-catalyst',
    name: 'Content Catalyst',
    description: 'Generate strategic content ideas using your saved research, memories, and all MindsetOS agent knowledge combined.',
    tags: ['new', 'content', 'marketing'],
    popularity: 1100,
    releaseDate: '2025-12-06',
    icon: '✍️',
    color: 'bg-pink-500',
    starterPrompts: [
      "Generate content ideas aligned with my Money Model",
      "Create a content calendar for LinkedIn",
      "Help me write thought leadership content",
      "Suggest email newsletter topics based on my research"
    ]
  },
  FIVE_ONES_FORMULA: {
    id: 'five-ones-formula',
    name: 'The Five Ones Formula',
    description: 'Build your personalised LinkedIn strategy in under 5 minutes',
    icon: '🎯',
    color: 'bg-amber-500',
    tags: ['new', 'workflow', 'strategy'],
    popularity: 1400,
    releaseDate: '2026-03-23',
    workflowStep: 9,
    starterPrompts: [
      "Build my Five Ones Formula",
      "Help me create my LinkedIn strategy",
      "I want to find my Perfect Future Client"
    ]
  },
  AUTHORITY_CONTENT_ENGINE: {
    id: 'authority-content-engine',
    name: 'Authority Content Engine',
    description: 'Turn one idea into three pieces of LinkedIn content ready to publish',
    icon: '✍️',
    color: 'bg-violet-500',
    tags: ['new', 'content', 'marketing'],
    popularity: 1350,
    releaseDate: '2026-03-23',
    workflowStep: 10,
    starterPrompts: [
      "Turn my idea into 3 pieces of content",
      "Help me write LinkedIn posts",
      "I need a short post, long post, and video script"
    ]
  },
  DAILY_LEAD_SEQUENCE: {
    id: 'daily-lead-sequence',
    name: 'Daily Lead Sequence Builder',
    description: 'Create 4-part outreach sequences that generate leads on LinkedIn',
    icon: '📨',
    color: 'bg-sky-500',
    tags: ['new', 'lead-gen', 'outreach'],
    popularity: 1300,
    releaseDate: '2026-03-23',
    workflowStep: 11,
    starterPrompts: [
      "Build my Daily Lead Sequence",
      "Create my 4-message LinkedIn outreach",
      "I need connection request and follow-up messages"
    ]
  },
  EASY_EVENT_ARCHITECT: {
    id: 'easy-event-architect',
    name: 'Easy Event Architect',
    description: 'Build easy event outlines to generate leads and bookings',
    icon: '🎪',
    color: 'bg-emerald-500',
    tags: ['new', 'lead-gen', 'events'],
    popularity: 1250,
    releaseDate: '2026-03-23',
    workflowStep: 12,
    starterPrompts: [
      "Design my LinkedIn Conversion Event",
      "Build my event blueprint",
      "Help me create an event that converts"
    ]
  },
  PROFILE_POWER_UP: {
    id: 'profile-power-up',
    name: 'The Profile Power-Up',
    description: 'Get your complete LinkedIn profile written in minutes',
    icon: '💼',
    color: 'bg-pink-500',
    tags: ['new', 'linkedin', 'profile'],
    popularity: 1200,
    releaseDate: '2026-03-23',
    workflowStep: 13,
    starterPrompts: [
      "Write my LinkedIn profile",
      "Power up my LinkedIn presence",
      "Help me create a client-attracting profile"
    ]
  },
  AGENT_CREATOR: {
    id: 'agent-creator',
    name: 'Agent Creator',
    description: 'Build custom AI agents for your mindset coaching for entrepreneurs practice',
    icon: '🪄',
    color: 'bg-purple-500',
    tags: ['agency'],
    popularity: 0,
    releaseDate: '2026-03-25',
    workflowStep: 99,
    starterPrompts: [
      "I want to build a custom agent",
      "Help me create an agent for my clients",
      "Let's design a new AI assistant"
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
      currentAgent: 'general' as AgentId | null,
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
                  agentId: 'general',
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const token = localStorage.getItem('accessToken');
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
        const customAgent = data.customAgent;

        set((state) => ({
          customAgents: [customAgent, ...state.customAgents],
        }));

        return customAgent;
      },

      updateCustomAgent: async (agentId, updates) => {
        const token = localStorage.getItem('accessToken');
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
        const updatedAgent = data.customAgent;

        set((state) => ({
          customAgents: state.customAgents.map((a) =>
            a.id === agentId ? { ...a, ...updatedAgent } : a
          ),
        }));
      },

      deleteCustomAgent: async (agentId) => {
        const token = localStorage.getItem('accessToken');
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

