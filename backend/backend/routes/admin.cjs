/**
 * Admin Routes Module
 *
 * Handles administrative functionality:
 * - GET /api/admin/agents - List all agents
 * - POST /api/admin/agents - Create new agent
 * - GET /api/admin/agents/:id - Get single agent
 * - PUT /api/admin/agents/:id - Update agent
 * - POST /api/admin/agents/reload - Reload agents from database
 * - POST /api/admin/execute - Execute predefined admin operations (requires ADMIN_SECRET)
 * - GET /api/letta/agents - Get agents for chat interface
 * - GET /api/v7/agents - Get agents in v7 format
 */

const { parseBody } = require('../utils/parseBody.cjs');
const { pool } = require('../config/database.cjs');

// Admin secret for secure operations (set in .env)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';

/**
 * Register admin routes
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {Object} corsHeaders - CORS headers
 * @param {Object} dependencies - External dependencies (loadAgentsFromDatabase, AGENT_CACHE)
 * @returns {boolean} - True if route was handled, false otherwise
 */
async function registerAdminRoutes(req, res, method, path, corsHeaders, dependencies = {}) {
  const { loadAgentsFromDatabase, AGENT_CACHE } = dependencies;

  // GET /api/admin/agents - List all agents
  if (path === '/api/admin/agents' && method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT id, name, tier, category, description, system_prompt,
               model_preference, max_tokens, temperature, is_active,
               chat_model, memory_model, widget_model,
               accent_color, color, sort_order,
               created_at, updated_at
        FROM agents
        ORDER BY sort_order ASC NULLS LAST, category, name
      `);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ agents: result.rows }));
    } catch (error) {
      console.error('❌ Error fetching agents:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch agents' }));
    }
    return true;
  }

  // POST /api/admin/agents - Create new agent
  if (path === '/api/admin/agents' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { id, name, tier, category, description, system_prompt, model_preference, max_tokens, temperature, is_active } = body;

      // Validate required fields
      if (!id || !name || !category || !description || !system_prompt) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Missing required fields: id, name, category, description, system_prompt' }));
        return true;
      }

      // Check if agent ID already exists
      const existingAgent = await pool.query('SELECT id FROM agents WHERE id = $1', [id]);
      if (existingAgent.rows.length > 0) {
        res.writeHead(409, corsHeaders);
        res.end(JSON.stringify({ error: 'Agent with this ID already exists' }));
        return true;
      }

      const result = await pool.query(`
        INSERT INTO agents (
          id, name, tier, category, description, system_prompt,
          model_preference, max_tokens, temperature, is_active,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, name, tier, category, description, system_prompt,
                  model_preference, max_tokens, temperature, is_active,
                  created_at, updated_at
      `, [
        id,
        name,
        tier || 1,
        category,
        description,
        system_prompt,
        model_preference || 'google/gemini-2.0-flash-exp:free',
        max_tokens || 2000,
        temperature || '0.7',
        is_active !== undefined ? is_active : true
      ]);

      console.log(`✅ Created new agent: ${id}`);

      // Reload agents from database to include the new one
      if (loadAgentsFromDatabase) {
        await loadAgentsFromDatabase();
      }

      res.writeHead(201, corsHeaders);
      res.end(JSON.stringify({ success: true, agent: result.rows[0] }));
    } catch (error) {
      console.error('❌ Error creating agent:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to create agent' }));
    }
    return true;
  }

  // GET /api/admin/agents/:id - Get single agent
  if (path.match(/^\/api\/admin\/agents\/[^\/]+$/) && method === 'GET') {
    try {
      const agentId = path.split('/')[4];
      const result = await pool.query(`
        SELECT id, name, tier, category, description, system_prompt,
               model_preference, max_tokens, temperature, is_active,
               created_at, updated_at
        FROM agents
        WHERE id = $1
      `, [agentId]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Agent not found' }));
        return true;
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ agent: result.rows[0] }));
    } catch (error) {
      console.error('❌ Error fetching agent:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch agent' }));
    }
    return true;
  }

  // PUT /api/admin/agents/:id - Update agent
  if (path.match(/^\/api\/admin\/agents\/[^\/]+$/) && method === 'PUT') {
    try {
      const agentId = path.split('/')[4];
      const body = await parseBody(req);
      const { name, tier, category, description, system_prompt, model_preference, max_tokens, temperature, is_active } = body;

      const result = await pool.query(`
        UPDATE agents
        SET name = COALESCE($1, name),
            tier = COALESCE($2, tier),
            category = COALESCE($3, category),
            description = COALESCE($4, description),
            system_prompt = COALESCE($5, system_prompt),
            model_preference = COALESCE($6, model_preference),
            max_tokens = COALESCE($7, max_tokens),
            temperature = COALESCE($8, temperature),
            is_active = COALESCE($9, is_active),
            updated_at = NOW()
        WHERE id = $10
        RETURNING id, name, tier, category, description, system_prompt, model_preference, max_tokens, temperature, is_active
      `, [name, tier, category, description, system_prompt, model_preference, max_tokens, temperature, is_active, agentId]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Agent not found' }));
        return true;
      }

      console.log(`✅ Updated agent: ${agentId}`);

      // Reload agents from database to pick up changes
      if (loadAgentsFromDatabase) {
        await loadAgentsFromDatabase();
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, agent: result.rows[0] }));
    } catch (error) {
      console.error('❌ Error updating agent:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update agent' }));
    }
    return true;
  }

  // POST /api/admin/agents/reload - Reload agents from database
  if (path === '/api/admin/agents/reload' && method === 'POST') {
    try {
      if (loadAgentsFromDatabase) {
        await loadAgentsFromDatabase();
      }

      const agentCount = AGENT_CACHE ? Object.keys(AGENT_CACHE).length : 0;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: `Reloaded ${agentCount} agents`,
        count: agentCount
      }));
    } catch (error) {
      console.error('❌ Error reloading agents:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to reload agents' }));
    }
    return true;
  }

  // GET /api/letta/agents - Get agents for chat interface
  if (path === '/api/letta/agents' && method === 'GET') {
    const agents = [
      { id: 'general', name: 'Rana Agent', description: 'General Agent proficient in all Agent\'s knowledge as well as custom vector KB', status: 'active', icon: '🎓' },
      { id: 'client-onboarding', name: 'Client Onboarding', description: 'Build your complete business profile - 11 questions, 5 sections', status: 'active', icon: '👋' },
      { id: 'money-model-maker', name: 'Money Model Maker', description: 'Create your foundational value proposition', status: 'active', icon: '💰' },
      { id: 'fast-fix-finder', name: 'Fast Fix Finder', description: 'Design your quick-win entry offer', status: 'active', icon: '⚡' },
      { id: 'offer-promo-printer', name: 'Offer Promo Printer', description: 'Generate promotional invitations', status: 'active', icon: '📢' },
      { id: 'promo-planner', name: 'Promo Planner', description: 'Build 10-day campaigns', status: 'active', icon: '📅' },
      { id: 'qualification-call-builder', name: 'Qualification Call Builder', description: 'Create sales scripts', status: 'active', icon: '📞' },
      { id: 'linkedin-events-builder', name: 'LinkedIn Events Builder Buddy', description: 'Plan compelling events', status: 'active', icon: '🎯' }
    ];

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(agents));
    return true;
  }

  // GET /api/v7/agents - Get agents in v7 format
  if (path === '/api/v7/agents' && method === 'GET') {
    const agents = [
      {
        id: '1',
        agent_id: 'general',
        agent_name: 'Rana Agent',
        agent_description: 'General Agent proficient in all Agent\'s knowledge as well as custom vector KB',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        agent_id: 'client-onboarding',
        agent_name: 'Client Onboarding',
        agent_description: 'Build your complete business profile - 11 questions, 5 sections',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        agent_id: 'money-model-maker',
        agent_name: 'Money Model Maker',
        agent_description: 'Create your foundational value proposition',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        agent_id: 'fast-fix-finder',
        agent_name: 'Fast Fix Finder',
        agent_description: 'Design your quick-win entry offer',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        agent_id: 'offer-promo-printer',
        agent_name: 'Offer Promo Printer',
        agent_description: 'Generate promotional invitations',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '6',
        agent_id: 'promo-planner',
        agent_name: 'Promo Planner',
        agent_description: 'Build 10-day campaigns',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '7',
        agent_id: 'qualification-call-builder',
        agent_name: 'Qualification Call Builder',
        agent_description: 'Create sales scripts',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: '8',
        agent_id: 'linkedin-events-builder',
        agent_name: 'LinkedIn Events Builder Buddy',
        agent_description: 'Plan compelling events',
        agent_version: 'v1',
        is_published: true,
        is_active: true,
        updated_at: new Date().toISOString()
      }
    ];

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(agents));
    return true;
  }

  // POST /api/admin/execute - Execute predefined admin operations
  if (path === '/api/admin/execute' && method === 'POST') {
    try {
      // Check authorization
      const authHeader = req.headers['x-admin-secret'] || req.headers['authorization'];
      if (authHeader !== ADMIN_SECRET && authHeader !== `Bearer ${ADMIN_SECRET}`) {
        console.log('❌ Unauthorized admin execute attempt');
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized - Invalid or missing ADMIN_SECRET' }));
        return true;
      }

      const body = await parseBody(req);
      const { operation, params = {} } = body;

      console.log(`🔧 [ADMIN] Executing operation: ${operation}`, params);

      let result;

      switch (operation) {
        case 'check-memories': {
          // Check core_memories for a specific user or all users
          const userId = params.userId;
          const query = userId
            ? `SELECT user_id, full_name, company_name, LEFT(business_outcome, 100) as outcome,
                      LEFT(target_clients, 100) as clients, created_at
               FROM core_memories WHERE user_id = $1`
            : `SELECT user_id, full_name, company_name, LEFT(business_outcome, 100) as outcome,
                      LEFT(target_clients, 100) as clients, created_at
               FROM core_memories ORDER BY created_at DESC LIMIT 10`;

          const queryParams = userId ? [userId] : [];
          const queryResult = await pool.query(query, queryParams);
          result = { success: true, memories: queryResult.rows, count: queryResult.rows.length };
          break;
        }

        case 'check-conversations': {
          // Check recent conversations for a user or agent
          const userId = params.userId;
          const agentId = params.agentId;

          let query = `SELECT c.id, c.user_id, c.agent_id, c.title,
                              COUNT(m.id) as message_count, c.created_at, c.updated_at
                       FROM conversations c
                       LEFT JOIN messages m ON c.id = m.conversation_id`;
          const queryParams = [];
          const conditions = [];

          if (userId) {
            conditions.push(`c.user_id = $${queryParams.length + 1}`);
            queryParams.push(userId);
          }
          if (agentId) {
            conditions.push(`c.agent_id = $${queryParams.length + 1}`);
            queryParams.push(agentId);
          }

          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }

          query += ` GROUP BY c.id, c.user_id, c.agent_id, c.title, c.created_at, c.updated_at
                     ORDER BY c.updated_at DESC LIMIT 20`;

          const queryResult = await pool.query(query, queryParams);
          result = { success: true, conversations: queryResult.rows, count: queryResult.rows.length };
          break;
        }

        case 'check-messages': {
          // Get messages from a specific conversation
          const conversationId = params.conversationId;
          if (!conversationId) {
            result = { success: false, error: 'conversationId required' };
            break;
          }

          const queryResult = await pool.query(`
            SELECT m.id, m.role, LEFT(m.content, 200) as content_preview,
                   m.created_at, m.parent_message_id
            FROM messages m
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
          `, [conversationId]);

          result = { success: true, messages: queryResult.rows, count: queryResult.rows.length };
          break;
        }

        case 'get-agent': {
          // Get agent details by ID
          const agentId = params.agentId;
          if (!agentId) {
            result = { success: false, error: 'agentId required' };
            break;
          }

          const queryResult = await pool.query(`
            SELECT id, name, tier, category, description,
                   LEFT(system_prompt, 200) as prompt_preview,
                   model_preference, max_tokens, temperature, is_active,
                   created_at, updated_at
            FROM agents WHERE id = $1
          `, [agentId]);

          if (queryResult.rows.length === 0) {
            result = { success: false, error: 'Agent not found' };
          } else {
            result = { success: true, agent: queryResult.rows[0] };
          }
          break;
        }

        case 'list-agents': {
          // List all agents
          const queryResult = await pool.query(`
            SELECT id, name, tier, category, is_active,
                   model_preference, temperature, max_tokens
            FROM agents
            ORDER BY tier, category, name
          `);

          result = { success: true, agents: queryResult.rows, count: queryResult.rows.length };
          break;
        }

        case 'reload-agents': {
          // Reload agents from database into cache
          if (loadAgentsFromDatabase) {
            await loadAgentsFromDatabase();
            const agentCount = AGENT_CACHE ? Object.keys(AGENT_CACHE).length : 0;
            result = { success: true, message: `Reloaded ${agentCount} agents`, count: agentCount };
          } else {
            result = { success: false, error: 'Agent reload function not available' };
          }
          break;
        }

        case 'run-sql': {
          // Execute safe SQL query (only SELECT queries allowed for security)
          const sql = params.sql;
          if (!sql) {
            result = { success: false, error: 'sql parameter required' };
            break;
          }

          // Security check: only allow SELECT queries
          const trimmedSql = sql.trim().toUpperCase();
          if (!trimmedSql.startsWith('SELECT')) {
            result = { success: false, error: 'Only SELECT queries allowed via this endpoint' };
            break;
          }

          const queryResult = await pool.query(sql);
          result = { success: true, rows: queryResult.rows, count: queryResult.rowCount };
          break;
        }

        case 'run-migration': {
          // Execute database migration (ALTER TABLE, CREATE INDEX, etc.)
          // WARNING: Use with caution - this can modify database schema
          const sql = params.sql;
          if (!sql) {
            result = { success: false, error: 'sql parameter required' };
            break;
          }

          // Security check: only allow DDL and transaction control statements
          // Strip SQL comments for validation (-- style single line comments)
          const sqlWithoutComments = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();

          const trimmedSql = sqlWithoutComments.toUpperCase();
          const allowedStatements = [
            'ALTER TABLE', 'ALTER ',
            'CREATE TABLE', 'CREATE INDEX', 'CREATE ',
            'DROP INDEX', 'DROP ',
            'COMMENT ON',
            'BEGIN', 'COMMIT', 'ROLLBACK',
            'DO $$', 'DO $', // Allow PL/pgSQL blocks
            'UPDATE ', 'INSERT ', // Allow data modifications in migrations
            'RAISE ' // Allow RAISE NOTICE in DO blocks
          ];
          const isAllowed = allowedStatements.some(stmt =>
            trimmedSql.startsWith(stmt) ||
            trimmedSql.includes('DO $$') || // Check anywhere for DO blocks
            trimmedSql.includes('DO $')
          );

          if (!isAllowed) {
            result = {
              success: false,
              error: 'Only ALTER, UPDATE, INSERT, CREATE, COMMENT statements allowed',
              hint: 'Use run-sql for SELECT queries'
            };
            break;
          }

          try {
            const queryResult = await pool.query(sql);
            result = {
              success: true,
              message: 'Migration executed successfully',
              rowCount: queryResult.rowCount,
              command: queryResult.command
            };
            console.log(`✅ [MIGRATION] Executed: ${sql.substring(0, 100)}...`);
          } catch (migrationError) {
            result = {
              success: false,
              error: 'Migration failed',
              details: migrationError.message
            };
            console.error(`❌ [MIGRATION] Failed:`, migrationError);
          }
          break;
        }

        case 'get-logs': {
          // Get recent backend logs (last N lines from console output)
          // Note: This requires logs to be captured. In production, use Railway logs.
          const fs = require('fs');
          const path = require('path');
          const lines = params.lines || 100;
          const filter = params.filter; // Optional regex filter

          // Check if log file exists
          const logFile = process.env.LOG_FILE || '/app/backend.log';

          if (fs.existsSync(logFile)) {
            const logContent = fs.readFileSync(logFile, 'utf8');
            let logLines = logContent.split('\n').slice(-lines);

            if (filter) {
              const regex = new RegExp(filter, 'i');
              logLines = logLines.filter(line => regex.test(line));
            }

            result = {
              success: true,
              logs: logLines.join('\n'),
              lineCount: logLines.length,
              filtered: !!filter
            };
          } else {
            result = {
              success: false,
              error: 'Log file not found. Use Railway dashboard for logs in production.',
              suggestion: 'For production logs, use: railway logs --service backend'
            };
          }
          break;
        }

        case 'health-check': {
          // System health check
          const uptime = process.uptime();
          const memoryUsage = process.memoryUsage();

          result = {
            success: true,
            status: 'healthy',
            uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
            uptimeSeconds: uptime,
            memory: {
              rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
              heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
              heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
            },
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
          };
          break;
        }

        default:
          result = {
            success: false,
            error: `Unknown operation: ${operation}`,
            availableOperations: [
              'check-memories',
              'check-conversations',
              'check-messages',
              'get-agent',
              'list-agents',
              'reload-agents',
              'run-sql',
              'run-migration',
              'get-logs',
              'health-check'
            ]
          };
      }

      console.log(`✅ [ADMIN] Operation ${operation} completed:`, result);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('❌ [ADMIN] Error executing operation:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to execute operation',
        details: error.message
      }));
    }
    return true;
  }

  // Route not handled by this module
  return false;
}

module.exports = { registerAdminRoutes };
