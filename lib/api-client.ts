import axios, { AxiosInstance, AxiosError } from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Don't intercept auth endpoints - let them handle their own errors
        // IMPORTANT: Include /api/auth/refresh to prevent infinite 401 loop
        const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') ||
                               originalRequest?.url?.includes('/api/auth/register') ||
                               originalRequest?.url?.includes('/api/auth/register-trial') ||
                               originalRequest?.url?.includes('/api/auth/forgot-password') ||
                               originalRequest?.url?.includes('/api/auth/refresh');

        if (isAuthEndpoint) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              this.clearTokens();
              window.location.href = '/login';
              return Promise.reject(error);
            }

            const { data } = await this.client.post('/api/auth/refresh', { refreshToken });
            this.setAccessToken(data.accessToken);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    name: string;
    inviteCode: string;
    role?: string;
  }) {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async registerTrial(data: {
    email: string;
    password: string;
    name: string;
  }) {
    const response = await this.client.post('/api/auth/register-trial', data);
    if (response.data.accessToken) {
      this.setAccessToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    }
    return response.data;
  }

  async getTrialStatus() {
    const response = await this.client.get('/api/trial/status');
    return response.data;
  }

  async validateInviteCode(code: string) {
    const response = await this.client.post('/api/auth/validate-invite-code', { code });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', {
      email,
      password,
    });
    this.setAccessToken(response.data.accessToken);
    this.setRefreshToken(response.data.refreshToken);
    return response.data;
  }

  async logout() {
    await this.client.post('/api/auth/logout');
    this.clearTokens();
  }

  async verifyEmail(token: string) {
    const response = await this.client.post('/api/auth/verify-email', {
      token,
    });
    return response.data;
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/api/auth/forgot-password', {
      email,
    });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.client.post('/api/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Letta chat endpoints
  async sendMessage(agentId: string, message: string) {
    // Convert KEY format to database id format
    const { MINDSET_AGENTS } = await import('./store');
    const safeAgentId = agentId ?? 'mindset-score';
    const dbAgentId = MINDSET_AGENTS[safeAgentId as keyof typeof MINDSET_AGENTS]?.id || safeAgentId.toLowerCase().replace(/_/g, '-');

    const response = await this.client.post('/api/letta/chat', {
      agentId: dbAgentId,
      message,
    });
    return response.data;
  }

  async *streamMessage(agentId: string, message: string, messages: Array<{role: string, content: string}> = [], memoryEnabled: boolean = true, conversationId?: string, signal?: AbortSignal, documentIds?: string[], widgetFormattingEnabled: boolean = false, modelOverride?: string | null, memorySettings?: { masterEnabled: boolean; categories: { profile: boolean; knowledge: boolean; history: boolean; brandVoice: boolean } }, clientProfileId?: string | null, viewAsUserId?: string | null) {
    // Import MINDSET_AGENTS to get the database ID
    const { MINDSET_AGENTS } = await import('./store');
    // Convert KEY format to database id format
    const safeAgentId = agentId ?? 'mindset-score';
    const dbAgentId = MINDSET_AGENTS[safeAgentId as keyof typeof MINDSET_AGENTS]?.id || safeAgentId.toLowerCase().replace(/_/g, '-');

    // Build request body, only include modelOverride if it's set
    const requestBody: Record<string, unknown> = { agentId: dbAgentId, message, messages, memoryEnabled, conversationId, documentIds, widgetFormattingEnabled };
    // Send granular memory settings if available (backend uses these over memoryEnabled)
    if (memorySettings) {
      requestBody.memorySettings = memorySettings;
    }
    // Send client profile ID for agency/admin scoping
    if (clientProfileId) {
      requestBody.clientProfileId = clientProfileId;
    }
    // Send viewAsUserId so memory pipeline uses target user's context
    if (viewAsUserId) {
      requestBody.viewAsUserId = viewAsUserId;
    }
    if (modelOverride) {
      requestBody.modelOverride = modelOverride;
      console.log(`🔄 [API] Model override requested: ${modelOverride}`);
    }

    // Set up 60s stall timeout — aborts if stream produces no data for 60s
    const stallController = new AbortController();
    let stallTimeoutId: ReturnType<typeof setTimeout> = setTimeout(() => stallController.abort(), 60000);
    const resetStallTimeout = () => {
      clearTimeout(stallTimeoutId);
      stallTimeoutId = setTimeout(() => stallController.abort(), 60000);
    };
    // Combine external signal with internal stall timeout
    const combinedSignal = signal
      ? (AbortSignal.any ? AbortSignal.any([signal, stallController.signal]) : stallController.signal)
      : stallController.signal;

    const response = await fetch(`${API_URL}/api/letta/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAccessToken()}`,
      },
      body: JSON.stringify(requestBody),
      credentials: 'include',
      signal: combinedSignal,
    });

    if (!response.ok) {
      clearTimeout(stallTimeoutId);
      throw new Error('Stream failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      clearTimeout(stallTimeoutId);
      throw new Error('No reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetStallTimeout(); // Reset stall timeout on each received chunk

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);

              // Check for typed events FIRST - these may have 'content' field, so must be checked before generic content
              if (parsed.type === 'format_update') {
                // Widget formatter replaced entire message content
                yield { type: 'format_update', content: parsed.content };
              } else if (parsed.type === 'response_log') {
                // Response metadata logging
                yield { type: 'response_log', metadata: parsed.metadata };
              } else if (parsed.type === 'widget') {
                yield { type: 'widget', widget: parsed.widget };
              } else if (parsed.type === 'conversation_id') {
                yield { type: 'conversation_id', conversationId: parsed.conversationId };
              } else if (parsed.type === 'conversation_title') {
                yield { type: 'conversation_title', conversationId: parsed.conversationId, title: parsed.title };
              } else if (parsed.type === 'quick_add_options') {
                // Quick Add options extracted by widget agent
                yield { type: 'quick_add_options', options: parsed.options };
              } else if (parsed.type === 'assistant_message_id') {
                // Real database ID for assistant message
                yield { type: 'assistant_message_id', messageId: parsed.messageId };
              } else if (parsed.type === 'user_message_id') {
                // Real database ID for user message
                yield { type: 'user_message_id', messageId: parsed.messageId };
              } else if (parsed.type === 'onboarding_complete') {
                // Onboarding workflow completed
                yield { type: 'onboarding_complete' };
              } else if (parsed.type === 'error') {
                // Error from backend
                yield { type: 'error', error: parsed.error || parsed.content, statusCode: parsed.statusCode };
              } else if (parsed.type === 'status') {
                // Status updates (e.g., summarization progress)
                yield { type: 'status', status: parsed.status, message: parsed.message };
              } else if (parsed.type === 'artifact_start') {
                yield { type: 'artifact_start', artifact: { id: parsed.id, artifactType: parsed.artifactType, title: parsed.title } };
              } else if (parsed.type === 'artifact_content') {
                yield { type: 'artifact_content', content: parsed.content };
              } else if (parsed.type === 'artifact_end') {
                yield { type: 'artifact_end', id: parsed.id };
              } else if (parsed.content) {
                // Generic content chunk (incremental streaming)
                yield { type: 'content', content: parsed.content };
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      clearTimeout(stallTimeoutId);
      reader.releaseLock();
    }
  }

  async getConversationHistory(agentId: string, limit: number = 50) {
    // Convert KEY format to database id format
    const { MINDSET_AGENTS } = await import('./store');
    const dbAgentId = MINDSET_AGENTS[agentId as keyof typeof MINDSET_AGENTS]?.id || agentId.toLowerCase().replace(/_/g, '-');

    const response = await this.client.get(
      `/api/letta/conversations/${dbAgentId}`,
      { params: { limit } }
    );
    return response.data;
  }

  async getUserConversations(clientProfileId?: string | null, viewAsUserId?: string) {
    const params = new URLSearchParams();
    if (clientProfileId) {
      params.set('clientProfileId', clientProfileId);
    } else if (clientProfileId === null) {
      // Explicitly null = personal context only (no client)
      params.set('clientProfileId', '');
    }
    if (viewAsUserId) {
      params.set('viewAsUserId', viewAsUserId);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.client.get(`/api/conversations${qs}`);
    return response.data.conversations || [];
  }

  async getConversationMessages(conversationId: string) {
    const response = await this.client.get(`/api/conversations/${conversationId}/messages`);
    // Backend now returns tree structure directly
    return response.data.history || { currentId: null, messages: {} };
  }

  async deleteConversation(conversationId: string) {
    const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }

    return response.json();
  }

  async getUserAgent() {
    const response = await this.client.get('/api/letta/agent');
    return response.data;
  }

  async createUserAgent(agentName: string) {
    const response = await this.client.post('/api/letta/agent', {
      agentName,
    });
    return response.data;
  }

  // Document endpoints
  async uploadDocument(file: File, agentId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    const response = await this.client.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async listDocuments(agentId?: string) {
    const response = await this.client.get('/api/documents', {
      params: { agentId },
    });
    return response.data;
  }

  async deleteDocument(documentId: string) {
    const response = await this.client.delete(`/api/documents/${documentId}`);
    return response.data;
  }

  async getDocumentStatus(documentId: string) {
    const response = await this.client.get(`/api/documents/${documentId}/status`);
    return response.data;
  }

  // Knowledge base search
  async searchKnowledgeBase(query: string, agentId?: string, limit: number = 5) {
    const response = await this.client.post('/api/knowledge-base/search', {
      query,
      agentId,
      limit,
    });
    return response.data;
  }

  // Get agents list
  async getAgents() {
    const response = await this.client.get('/api/agents');
    return response.data;
  }

  // ========================================
  // NOTIFICATIONS API
  // ========================================

  async getNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.unreadOnly) params.append('unread', 'true');
    const response = await this.client.get(`/api/notifications?${params.toString()}`);
    return response.data;
  }

  async getNotificationCount() {
    const response = await this.client.get('/api/notifications/count');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.client.post(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/api/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.client.delete(`/api/notifications/${notificationId}`);
    return response.data;
  }

  // ========================================
  // RESEARCH API
  // ========================================

  async getResearchJobs(options?: { status?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    const response = await this.client.get(`/api/research?${params.toString()}`);
    return response.data;
  }

  async getResearchJob(jobId: string) {
    const response = await this.client.get(`/api/research/${jobId}`);
    return response.data;
  }

  async getUserResearch(options?: { category?: string; pinnedOnly?: boolean; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.pinnedOnly) params.append('pinned', 'true');
    if (options?.limit) params.append('limit', options.limit.toString());
    const response = await this.client.get(`/api/user-research?${params.toString()}`);
    return response.data;
  }

  async getUserResearchById(researchId: string) {
    const response = await this.client.get(`/api/user-research/${researchId}`);
    return response.data;
  }

  async updateUserResearch(researchId: string, updates: { is_pinned?: boolean; is_archived?: boolean; tags?: string[]; category?: string }) {
    const response = await this.client.patch(`/api/user-research/${researchId}`, updates);
    return response.data;
  }

  async deleteUserResearch(researchId: string) {
    const response = await this.client.delete(`/api/user-research/${researchId}`);
    return response.data;
  }

  // ========================================
  // ADMIN BROADCASTS API
  // ========================================

  async getAdminBroadcasts() {
    const response = await this.client.get('/api/admin/broadcasts');
    return response.data;
  }

  async createBroadcast(data: {
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    target_type: 'all' | 'role' | 'users';
    target_roles?: string[];
    target_user_ids?: string[];
    scheduled_for?: string;
    expires_at?: string;
  }) {
    const response = await this.client.post('/api/admin/broadcasts', data);
    return response.data;
  }

  async sendBroadcast(broadcastId: string) {
    const response = await this.client.post(`/api/admin/broadcasts/${broadcastId}/send`);
    return response.data;
  }

  // ========================================
  // ADMIN IMPERSONATION API
  // ========================================

  async startImpersonation(targetUserId: string) {
    const response = await this.client.post('/api/admin/impersonate/start', { targetUserId });
    return response.data;
  }

  async getActiveImpersonation() {
    const response = await this.client.get('/api/admin/impersonate/active');
    return response.data;
  }

  async requestEditAccess(message?: string) {
    const response = await this.client.post('/api/admin/impersonate/request-edit', { message });
    return response.data;
  }

  async endImpersonation() {
    const response = await this.client.post('/api/admin/impersonate/end');
    return response.data;
  }

  async respondToImpersonation(sessionId: string, action: 'accept' | 'decline', message?: string) {
    const response = await this.client.post('/api/impersonate/respond', { sessionId, action, message });
    return response.data;
  }

  // ========================================
  // ADMIN EMAIL TEMPLATES API
  // ========================================

  async getEmailTemplates() {
    const response = await this.client.get('/api/admin/email-templates');
    return response.data;
  }

  async updateEmailTemplate(templateId: string, data: {
    enabled?: boolean;
    subject?: string;
    name?: string;
    description?: string;
    html_template?: string;
  }) {
    const response = await this.client.put(`/api/admin/email-templates/${templateId}`, data);
    return response.data;
  }

  // ========================================
  // ADMIN INVITE CODES API
  // ========================================

  async getInviteCodes() {
    const response = await this.client.get('/api/admin/invite-codes');
    return response.data;
  }

  async createInviteCode(data: {
    code?: string;
    description?: string;
    max_uses?: number;
    expires_at?: string | null;
    assigned_role?: string;
    created_by?: string;
  }) {
    const response = await this.client.post('/api/admin/invite-codes', data);
    return response.data;
  }

  async updateInviteCode(codeId: string, data: {
    description?: string;
    max_uses?: number;
    expires_at?: string | null;
    is_active?: boolean;
    assigned_role?: string;
  }) {
    const response = await this.client.put(`/api/admin/invite-codes/${codeId}`, data);
    return response.data;
  }

  async deleteInviteCode(codeId: string) {
    const response = await this.client.delete(`/api/admin/invite-codes/${codeId}`);
    return response.data;
  }

  // Generic HTTP methods for flexibility
  async get(url: string, config?: any) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch(url: string, data?: any, config?: any) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any) {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Custom Agent endpoints (agency/admin only)
  async getCustomAgents() {
    const response = await this.client.get('/api/custom-agents');
    return response.data.customAgents || [];
  }

  async createCustomAgent(data: {
    name: string;
    description?: string;
    systemPrompt: string;
    category?: string;
    modelPreference?: string;
    maxTokens?: number;
    temperature?: string;
    color?: string;
    metadata?: Record<string, any>;
    visibility?: string;
    customConfig?: Record<string, any>;
    clientProfileId?: string | null;
    conversationStarters?: string[];
    icon?: string;
  }) {
    const response = await this.client.post('/api/custom-agents', data);
    return response.data.customAgent;
  }

  async getCustomAgent(agentId: string) {
    const response = await this.client.get(`/api/custom-agents/${encodeURIComponent(agentId)}`);
    return response.data.customAgent;
  }

  async updateCustomAgent(agentId: string, updates: Record<string, any>) {
    const response = await this.client.patch(`/api/custom-agents/${encodeURIComponent(agentId)}`, updates);
    return response.data.customAgent;
  }

  async deleteCustomAgent(agentId: string) {
    const response = await this.client.delete(`/api/custom-agents/${encodeURIComponent(agentId)}`);
    return response.data;
  }
}

export const apiClient = new APIClient();

// Playbook/Artifact API helpers
export async function fetchArtifacts(params?: {
  conversation_id?: string;
  agent_id?: string;
  starred?: boolean;
  limit?: number;
  offset?: number;
  client_profile_id?: string;
  viewAsUserId?: string;
  search?: string;
  tag?: string;
}): Promise<any[]> {
  const token = localStorage.getItem('accessToken');
  const searchParams = new URLSearchParams();
  if (params?.conversation_id) searchParams.set('conversation_id', params.conversation_id);
  if (params?.agent_id) searchParams.set('agent_id', params.agent_id);
  if (params?.starred) searchParams.set('starred', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.client_profile_id) searchParams.set('client_profile_id', params.client_profile_id);
  if (params?.viewAsUserId) searchParams.set('viewAsUserId', params.viewAsUserId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.tag) searchParams.set('tag', params.tag);

  const url = `${API_URL}/api/artifacts?${searchParams}`;
  const res = await fetch(url, { credentials: 'include', headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  const data = await res.json();
  return Array.isArray(data) ? data : data?.artifacts || [];
}

export async function createArtifact(data: {
  conversation_id?: string;
  message_id?: string;
  agent_id?: string;
  type: string;
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, any>;
  viewAsUserId?: string;
  client_profile_id?: string;
}): Promise<any> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create artifact');
  return res.json();
}

export async function updateArtifact(id: string, data: {
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update artifact');
  return res.json();
}

export async function deleteArtifact(id: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete artifact');
}

export async function cleanupArtifact(id: string): Promise<{ trimmed: boolean; content: string; prefixRemoved?: string; suffixRemoved?: string }> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts/${id}/cleanup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to cleanup artifact');
  return res.json();
}

export async function toggleArtifactStar(id: string): Promise<any> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts/${id}/star`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to toggle star');
  return res.json();
}

export async function updateArtifactTags(id: string, tags: string[]): Promise<any> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/api/artifacts/${id}/tags`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error('Failed to update tags');
  return res.json();
}
