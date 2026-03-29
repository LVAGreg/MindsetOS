/**
 * Voice Routes Module
 * Handles ECOS Voice Agents - Voice Expert & Sales Roleplay Coach
 * Real-time voice sessions with Eleven Labs integration
 */

const { getVoiceService } = require('../services/voiceService.cjs');

/**
 * Helper function to parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * Register voice-related routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerVoiceRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * GET /api/voice/agents
     * List available voice agents (admin only)
     */
    getAgents: async (req, res, isAdmin = false) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        // Voice agents are admin-only - return empty for non-admins (invisible)
        if (!isAdmin) {
          return res.end(JSON.stringify({ success: true, agents: [] }));
        }

        const result = await pool.query(`
          SELECT id, name, description, accent_color, metadata
          FROM agents
          WHERE metadata->>'type' = 'voice' AND is_active = true
          ORDER BY name
        `);

        res.end(JSON.stringify({
          success: true,
          agents: result.rows.map(agent => ({
            id: agent.id,
            name: agent.name,
            slug: agent.id,
            description: agent.description,
            accentColor: agent.accent_color,
            features: agent.metadata?.features || [],
            difficultyLevels: agent.metadata?.difficulty_levels || null
          }))
        }));
      } catch (error) {
        console.error('[Voice] Error fetching agents:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to fetch voice agents' }));
      }
    },

    /**
     * POST /api/voice/session/start
     * Start a new voice session (admin only)
     */
    startSession: async (req, res, isAdmin = false) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        // Voice agents are admin-only - silently reject non-admins
        if (!isAdmin) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Agent not found' }));
        }

        const body = req.body || await parseBody(req);
        const { agentSlug, difficulty, scenarioType, userId } = body;

        if (!userId) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'User ID required' }));
        }

        // Get agent - query by id only (slug column doesn't exist in production)
        const agentResult = await pool.query(`
          SELECT id, name, system_prompt, metadata
          FROM agents
          WHERE id = $1 AND is_active = true
        `, [agentSlug]);

        if (agentResult.rows.length === 0) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Voice agent not found' }));
        }

        const agent = agentResult.rows[0];
        const agentType = agent.id === 'sales-roleplay-coach' ? 'sales_roleplay' : 'expert_voice';

        // Start session
        const voiceService = getVoiceService();
        const session = await voiceService.startSession(userId, agentType, {
          difficulty,
          scenarioType
        });

        // Store in database
        await pool.query(`
          INSERT INTO voice_sessions (id, user_id, agent_type, difficulty, scenario_type, status)
          VALUES ($1, $2, $3, $4, $5, 'active')
        `, [session.sessionId, userId, agentType, difficulty || 'medium', scenarioType]);

        // Get user profile for personalization
        const profileResult = await pool.query(`
          SELECT full_name, company_name, target_clients, core_method
          FROM core_memories
          WHERE user_id = $1
          LIMIT 1
        `, [userId]);

        const profile = profileResult.rows[0] || {};

        res.end(JSON.stringify({
          success: true,
          session: {
            id: session.sessionId,
            agentName: agent.name,
            agentSlug: agent.id,
            agentType,
            difficulty: difficulty || 'medium',
            status: 'ready',
            systemPrompt: agent.system_prompt
          },
          userProfile: {
            name: profile.full_name,
            company: profile.company_name
          },
          config: session.config,
          wsEndpoint: `/api/voice/ws/${session.sessionId}`
        }));
      } catch (error) {
        console.error('[Voice] Error starting session:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to start voice session' }));
      }
    },

    /**
     * POST /api/voice/session/:id/end
     * End a voice session
     */
    endSession: async (req, res, sessionId) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const voiceService = getVoiceService();
        const result = await voiceService.endSession(sessionId);

        // Update database
        await pool.query(`
          UPDATE voice_sessions
          SET status = 'completed',
              ended_at = NOW(),
              duration_seconds = $1,
              transcript = $2,
              score = $3,
              feedback = $4,
              strengths = $5,
              improvements = $6,
              tips = $7,
              updated_at = NOW()
          WHERE id = $8
        `, [
          result.durationSeconds,
          JSON.stringify(result.transcript),
          result.score || null,
          JSON.stringify(result.feedback || {}),
          JSON.stringify(result.feedback?.strengths || []),
          JSON.stringify(result.feedback?.improvements || []),
          JSON.stringify(result.feedback?.tips || []),
          sessionId
        ]);

        // Update user stats
        await updateUserVoiceStats(pool, result.userId, result);

        res.end(JSON.stringify({
          success: true,
          session: {
            id: sessionId,
            durationSeconds: result.durationSeconds,
            messageCount: result.transcript.length,
            score: result.score,
            feedback: result.feedback
          }
        }));
      } catch (error) {
        console.error('[Voice] Error ending session:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to end voice session' }));
      }
    },

    /**
     * GET /api/voice/session/:id
     * Get session status
     */
    getSession: async (req, res, sessionId) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const voiceService = getVoiceService();

        // Check active session first
        const activeSession = voiceService.getSession(sessionId);
        if (activeSession) {
          return res.end(JSON.stringify({
            success: true,
            session: activeSession
          }));
        }

        // Check database
        const result = await pool.query(`
          SELECT id, user_id, agent_type, difficulty, duration_seconds,
                 transcript, score, feedback, status, started_at, ended_at
          FROM voice_sessions
          WHERE id = $1
        `, [sessionId]);

        if (result.rows.length === 0) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Session not found' }));
        }

        res.end(JSON.stringify({
          success: true,
          session: result.rows[0]
        }));
      } catch (error) {
        console.error('[Voice] Error getting session:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to get session' }));
      }
    },

    /**
     * GET /api/voice/history
     * Get user's voice session history
     */
    getHistory: async (req, res, userId) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const url = new URL(req.url, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit')) || 20;

        const result = await pool.query(`
          SELECT id, agent_type, difficulty, duration_seconds, score,
                 status, started_at, ended_at
          FROM voice_sessions
          WHERE user_id = $1
          ORDER BY started_at DESC
          LIMIT $2
        `, [userId, limit]);

        res.end(JSON.stringify({
          success: true,
          sessions: result.rows
        }));
      } catch (error) {
        console.error('[Voice] Error getting history:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to get voice history' }));
      }
    },

    /**
     * GET /api/voice/stats
     * Get user's voice statistics
     */
    getStats: async (req, res, userId) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const result = await pool.query(`
          SELECT * FROM user_voice_stats WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
          return res.end(JSON.stringify({
            success: true,
            stats: {
              expertSessions: 0,
              roleplaySessions: 0,
              totalMinutes: 0,
              avgScore: null,
              skillLevels: {}
            }
          }));
        }

        const stats = result.rows[0];
        res.end(JSON.stringify({
          success: true,
          stats: {
            expertSessions: stats.expert_sessions,
            roleplaySessions: stats.roleplay_sessions,
            expertMinutes: parseFloat(stats.expert_total_minutes) || 0,
            roleplayMinutes: parseFloat(stats.roleplay_total_minutes) || 0,
            avgScore: stats.avg_score ? parseFloat(stats.avg_score) : null,
            bestScore: stats.best_score,
            currentStreak: stats.current_streak,
            longestStreak: stats.longest_streak,
            skillLevels: stats.skill_levels || {},
            achievements: stats.achievements || []
          }
        }));
      } catch (error) {
        console.error('[Voice] Error getting stats:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to get voice stats' }));
      }
    },

    /**
     * GET /api/voice/scenarios
     * Get roleplay scenarios
     */
    getScenarios: async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const url = new URL(req.url, 'http://localhost');
        const category = url.searchParams.get('category');
        const difficulty = url.searchParams.get('difficulty');

        let query = `
          SELECT id, name, description, category, difficulty_base,
                 prospect_persona, situation
          FROM roleplay_scenarios
          WHERE is_active = true
        `;
        const params = [];

        if (category) {
          params.push(category);
          query += ` AND category = $${params.length}`;
        }

        if (difficulty) {
          params.push(difficulty);
          query += ` AND difficulty_base = $${params.length}`;
        }

        query += ` ORDER BY usage_count DESC, name`;

        const result = await pool.query(query, params);

        res.end(JSON.stringify({
          success: true,
          scenarios: result.rows
        }));
      } catch (error) {
        console.error('[Voice] Error getting scenarios:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to get scenarios' }));
      }
    },

    /**
     * POST /api/voice/tts
     * Text-to-speech (standalone)
     */
    textToSpeech: async (req, res) => {
      Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

      try {
        const body = await parseBody(req);
        const { text } = body;

        if (!text) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Text required' }));
        }

        const voiceService = getVoiceService();
        const webStream = await voiceService.textToSpeech(text);

        res.setHeader('Content-Type', 'audio/mpeg');

        // Convert Web ReadableStream to Node.js stream
        const { Readable } = require('stream');
        if (typeof Readable.fromWeb === 'function') {
          // Node.js 18+ native conversion
          const nodeStream = Readable.fromWeb(webStream);
          nodeStream.pipe(res);
        } else {
          // Fallback: manual streaming for older Node.js
          const reader = webStream.getReader();
          async function pump() {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(Buffer.from(value));
            await pump();
          }
          await pump();
        }
      } catch (error) {
        console.error('[Voice] Error with TTS:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'TTS failed' }));
      }
    }
  };
}

/**
 * Helper: Update user voice stats
 */
async function updateUserVoiceStats(pool, userId, sessionResult) {
  try {
    const isRoleplay = sessionResult.agentType === 'sales_roleplay';
    const minutes = sessionResult.durationSeconds / 60;

    // Check if user stats exist
    const existing = await pool.query(
      'SELECT id FROM user_voice_stats WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length === 0) {
      // Create new stats record
      await pool.query(`
        INSERT INTO user_voice_stats (
          user_id,
          expert_sessions, expert_total_minutes,
          roleplay_sessions, roleplay_total_minutes,
          avg_score, best_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        isRoleplay ? 0 : 1,
        isRoleplay ? 0 : minutes,
        isRoleplay ? 1 : 0,
        isRoleplay ? minutes : 0,
        sessionResult.score || null,
        sessionResult.score || null
      ]);
    } else {
      // Update existing stats
      if (isRoleplay) {
        await pool.query(`
          UPDATE user_voice_stats
          SET roleplay_sessions = roleplay_sessions + 1,
              roleplay_total_minutes = roleplay_total_minutes + $1,
              avg_score = COALESCE((avg_score * roleplay_sessions + $2) / (roleplay_sessions + 1), $2),
              best_score = GREATEST(COALESCE(best_score, 0), $2),
              updated_at = NOW()
          WHERE user_id = $3
        `, [minutes, sessionResult.score || 0, userId]);
      } else {
        await pool.query(`
          UPDATE user_voice_stats
          SET expert_sessions = expert_sessions + 1,
              expert_total_minutes = expert_total_minutes + $1,
              updated_at = NOW()
          WHERE user_id = $2
        `, [minutes, userId]);
      }
    }
  } catch (error) {
    console.error('[Voice] Error updating user stats:', error);
  }
}

module.exports = { registerVoiceRoutes };
