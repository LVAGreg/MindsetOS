/**
 * Gemini Live API Service
 * Real-time voice interaction using WebSocket streaming
 *
 * Audio Format:
 * - Input: 16-bit PCM, 16kHz, mono (base64 encoded)
 * - Output: 24kHz PCM audio
 */

const WebSocket = require('ws');

const GEMINI_LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

class GeminiLiveSession {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.onAudio = null;
    this.onText = null;
    this.onError = null;
    this.onClose = null;
    this.onInterrupted = null;

    this.config = {
      model: config.model || 'models/gemini-2.0-flash-exp',
      systemInstruction: config.systemInstruction || 'You are a helpful voice assistant. Keep responses concise and conversational.',
      voiceName: config.voiceName || 'Aoede', // Options: Puck, Charon, Kore, Fenrir, Aoede
      ...config
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_URL}?key=${this.apiKey}`;

      console.log('🔌 Connecting to Gemini Live API...');

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ Connected to Gemini Live API');
        this.isConnected = true;

        // Send setup message
        const setupMessage = {
          setup: {
            model: this.config.model,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: this.config.voiceName
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: this.config.systemInstruction }]
            }
          }
        };

        this.ws.send(JSON.stringify(setupMessage));
        console.log('📤 Sent setup message');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error('❌ Failed to parse Gemini message:', err);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ Gemini WebSocket error:', error);
        this.isConnected = false;
        if (this.onError) this.onError(error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log('🔌 Gemini connection closed:', code, reason?.toString());
        this.isConnected = false;
        if (this.onClose) this.onClose(code, reason);
      });
    });
  }

  handleMessage(message) {
    // Handle setup complete
    if (message.setupComplete) {
      console.log('✅ Gemini Live setup complete');
      return;
    }

    // Handle server content (audio response)
    if (message.serverContent) {
      const { modelTurn, interrupted, turnComplete } = message.serverContent;

      if (interrupted && this.onInterrupted) {
        console.log('🛑 Gemini was interrupted');
        this.onInterrupted();
      }

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          // Audio response
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            if (this.onAudio) {
              this.onAudio(part.inlineData.data, part.inlineData.mimeType);
            }
          }
          // Text response (transcript)
          if (part.text) {
            if (this.onText) {
              this.onText(part.text);
            }
          }
        }
      }

      if (turnComplete) {
        console.log('✅ Gemini turn complete');
      }
    }
  }

  /**
   * Send audio data to Gemini
   * @param {string} base64Audio - Base64 encoded 16-bit PCM audio at 16kHz
   */
  sendAudio(base64Audio) {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ Cannot send audio - not connected');
      return false;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send text message to Gemini
   * @param {string} text - Text message
   */
  sendText(text) {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ Cannot send text - not connected');
      return false;
    }

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Signal end of user's turn (after they stop speaking)
   */
  endTurn() {
    if (!this.isConnected || !this.ws) return;

    const message = {
      clientContent: {
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close the connection
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

/**
 * Create a WebSocket handler for client connections
 */
function createGeminiLiveHandler(wss, apiKey) {
  wss.on('connection', (clientWs, req) => {
    // Get authenticated user from upgrade handler
    const user = req.authenticatedUser;
    const userLabel = user ? `${user.email} (${user.id})` : 'anonymous';
    console.log(`🎙️ New voice client connected: ${userLabel}`);

    // Extract config from query params or use defaults
    const url = new URL(req.url, 'http://localhost');
    const systemInstruction = url.searchParams.get('systemInstruction') || undefined;
    const voiceName = url.searchParams.get('voice') || 'Aoede';

    // Create Gemini session
    const session = new GeminiLiveSession(apiKey, {
      systemInstruction,
      voiceName
    });

    // Set up callbacks to forward to client
    session.onAudio = (audioData, mimeType) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'audio',
          data: audioData,
          mimeType
        }));
      }
    };

    session.onText = (text) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'transcript',
          text
        }));
      }
    };

    session.onInterrupted = () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'interrupted' }));
      }
    };

    session.onError = (error) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    };

    session.onClose = () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'closed' }));
        clientWs.close();
      }
    };

    // Connect to Gemini
    session.connect()
      .then(() => {
        clientWs.send(JSON.stringify({ type: 'connected' }));
      })
      .catch((err) => {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: 'Failed to connect to Gemini: ' + err.message
        }));
        clientWs.close();
      });

    // Handle client messages
    clientWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'audio') {
          session.sendAudio(message.data);
        } else if (message.type === 'text') {
          session.sendText(message.text);
        } else if (message.type === 'endTurn') {
          session.endTurn();
        }
      } catch (err) {
        console.error('❌ Failed to handle client message:', err);
      }
    });

    // Clean up on disconnect
    clientWs.on('close', () => {
      console.log('🔌 Voice client disconnected');
      session.close();
    });
  });
}

module.exports = {
  GeminiLiveSession,
  createGeminiLiveHandler
};
