/**
 * Voice Service - Eleven Labs Integration for ECOS Voice Agents
 * Handles voice input/output, session management, and real-time conversation
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class VoiceService {
  constructor(config = {}) {
    this.elevenLabsApiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    this.voiceId = config.voiceId || process.env.ELEVENLABS_VOICE_ID; // Rana's cloned voice
    this.modelId = config.modelId || 'eleven_flash_v2_5'; // Low latency model

    // Active sessions
    this.sessions = new Map();

    // Eleven Labs Conversational AI endpoint
    this.wsEndpoint = 'wss://api.elevenlabs.io/v1/convai/conversation';

    console.log('[VoiceService] Initialized with voice:', this.voiceId);
  }

  /**
   * Start a new voice session
   */
  async startSession(userId, agentType, options = {}) {
    const sessionId = uuidv4();

    const session = {
      id: sessionId,
      userId,
      agentType, // 'expert_voice' or 'sales_roleplay'
      difficulty: options.difficulty || 'medium', // For roleplay
      scenarioType: options.scenarioType || null,
      startedAt: new Date(),
      transcript: [],
      status: 'active',
      ws: null,
      audioChunks: []
    };

    this.sessions.set(sessionId, session);

    console.log(`[VoiceService] Started session ${sessionId} for user ${userId}`);

    return {
      sessionId,
      status: 'ready',
      config: {
        sampleRate: 16000,
        encoding: 'pcm_s16le',
        channels: 1
      }
    };
  }

  /**
   * Connect to Eleven Labs WebSocket for real-time conversation
   */
  async connectWebSocket(sessionId, systemPrompt) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsEndpoint, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });

      ws.on('open', () => {
        console.log(`[VoiceService] WebSocket connected for session ${sessionId}`);

        // Send initial configuration
        ws.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              prompt: {
                prompt: systemPrompt
              },
              first_message: session.agentType === 'sales_roleplay'
                ? "Hey there! Ready to practice your sales skills? I can be a kind prospect, give you a realistic challenge, or be a total hard-ass. What difficulty do you want today?"
                : "Hey! I'm your Voice Expert. What are you working on today - your offer, marketing, sales? Tell me what's on your mind.",
              language: 'en'
            },
            tts: {
              voice_id: this.voiceId,
              model_id: this.modelId,
              optimize_streaming_latency: 4
            }
          }
        }));

        session.ws = ws;
        resolve({ status: 'connected' });
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(sessionId, message);
        } catch (e) {
          // Binary audio data
          if (Buffer.isBuffer(data)) {
            this.handleAudioChunk(sessionId, data);
          }
        }
      });

      ws.on('error', (error) => {
        console.error(`[VoiceService] WebSocket error for session ${sessionId}:`, error);
        reject(error);
      });

      ws.on('close', () => {
        console.log(`[VoiceService] WebSocket closed for session ${sessionId}`);
        session.status = 'disconnected';
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleWebSocketMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'conversation_initiation_metadata':
        console.log(`[VoiceService] Conversation initiated: ${message.conversation_id}`);
        session.conversationId = message.conversation_id;
        break;

      case 'agent_response':
        // Agent text response
        session.transcript.push({
          role: 'assistant',
          content: message.agent_response,
          timestamp: new Date().toISOString()
        });
        break;

      case 'user_transcript':
        // User speech transcript
        session.transcript.push({
          role: 'user',
          content: message.user_transcript,
          timestamp: new Date().toISOString()
        });
        break;

      case 'interruption':
        console.log(`[VoiceService] User interrupted agent in session ${sessionId}`);
        break;

      case 'ping':
        session.ws?.send(JSON.stringify({ type: 'pong', event_id: message.event_id }));
        break;

      default:
        console.log(`[VoiceService] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle incoming audio chunks
   */
  handleAudioChunk(sessionId, chunk) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.audioChunks.push(chunk);

    // Emit to client via callback if set
    if (session.onAudioChunk) {
      session.onAudioChunk(chunk);
    }
  }

  /**
   * Send user audio to the conversation
   */
  sendAudio(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session?.ws) {
      throw new Error('Session not connected');
    }

    // Send audio as binary
    session.ws.send(audioData);
  }

  /**
   * Send text input (for testing without voice)
   */
  sendText(sessionId, text) {
    const session = this.sessions.get(sessionId);
    if (!session?.ws) {
      throw new Error('Session not connected');
    }

    session.ws.send(JSON.stringify({
      type: 'user_input',
      user_input: text
    }));

    session.transcript.push({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End a voice session
   */
  async endSession(sessionId, options = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Close WebSocket
    if (session.ws) {
      session.ws.close();
    }

    // Calculate session stats
    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt - session.startedAt) / 1000);

    // Prepare session result
    const result = {
      sessionId,
      userId: session.userId,
      agentType: session.agentType,
      difficulty: session.difficulty,
      durationSeconds,
      transcript: session.transcript,
      status: 'completed',
      startedAt: session.startedAt,
      endedAt
    };

    // For roleplay, generate score and feedback
    if (session.agentType === 'sales_roleplay' && options.generateFeedback !== false) {
      result.score = await this.generateRoleplayScore(session);
      result.feedback = await this.generateRoleplayFeedback(session);
    }

    // Clean up
    this.sessions.delete(sessionId);

    console.log(`[VoiceService] Ended session ${sessionId} after ${durationSeconds}s`);

    return result;
  }

  /**
   * Generate roleplay score based on transcript
   */
  async generateRoleplayScore(session) {
    // Analyze transcript for scoring criteria
    const transcript = session.transcript;

    // Simple scoring algorithm (can be enhanced with LLM)
    let score = 50; // Base score

    // Check for good patterns
    const userMessages = transcript.filter(t => t.role === 'user').map(t => t.content.toLowerCase());

    // Discovery questions (+5 each, max 20)
    const discoveryPatterns = ['what', 'how', 'tell me', 'can you share', 'help me understand'];
    const discoveryCount = userMessages.filter(m =>
      discoveryPatterns.some(p => m.includes(p))
    ).length;
    score += Math.min(discoveryCount * 5, 20);

    // Acknowledgment patterns (+5 each, max 15)
    const acknowledgmentPatterns = ['i understand', 'that makes sense', 'i hear you', 'you\'re right'];
    const acknowledgmentCount = userMessages.filter(m =>
      acknowledgmentPatterns.some(p => m.includes(p))
    ).length;
    score += Math.min(acknowledgmentCount * 5, 15);

    // Closing attempts (+10, max 15)
    const closingPatterns = ['shall we', 'ready to', 'next step', 'move forward', 'get started'];
    const closingCount = userMessages.filter(m =>
      closingPatterns.some(p => m.includes(p))
    ).length;
    score += Math.min(closingCount * 10, 15);

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Generate roleplay feedback
   */
  async generateRoleplayFeedback(session) {
    // This would ideally use an LLM for detailed feedback
    // Simplified version for now
    return {
      strengths: [
        'Good conversational flow',
        'Asked relevant questions'
      ],
      improvements: [
        'Try to address objections more directly',
        'Build more rapport at the start'
      ],
      tips: [
        'Use the "Feel-Felt-Found" technique for trust objections'
      ]
    };
  }

  /**
   * Get session status
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      userId: session.userId,
      agentType: session.agentType,
      status: session.status,
      durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
      messageCount: session.transcript.length
    };
  }

  /**
   * Set audio callback for streaming
   */
  setAudioCallback(sessionId, callback) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.onAudioChunk = callback;
    }
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId) {
    const sessions = [];
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        sessions.push({
          sessionId: id,
          agentType: session.agentType,
          status: session.status,
          startedAt: session.startedAt
        });
      }
    }
    return sessions;
  }

  /**
   * Text-to-Speech only (for non-interactive use)
   */
  async textToSpeech(text, options = {}) {
    const voiceId = options.voiceId || this.voiceId;
    const modelId = options.modelId || this.modelId;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    return response.body; // Returns readable stream
  }
}

// Singleton instance
let voiceServiceInstance = null;

function getVoiceService() {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService();
  }
  return voiceServiceInstance;
}

module.exports = {
  VoiceService,
  getVoiceService
};
