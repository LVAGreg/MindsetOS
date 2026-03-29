/**
 * Conversations Routes Module
 *
 * Handles conversation and message management:
 * - GET /api/conversations - List all user conversations with messages
 * - GET /api/conversations/:id/messages - Get messages for a conversation
 * - PATCH /api/conversations/:id - Update conversation (rename, archive, model override)
 * - DELETE /api/conversations/:id - Delete conversation and its messages
 */

const { getUserFromToken } = require('../middleware/auth.cjs');
const { parseBody } = require('../utils/parseBody.cjs');
const { pool } = require('../config/database.cjs');

/**
 * Register conversation routes
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {Object} corsHeaders - CORS headers
 * @returns {boolean} - True if route was handled, false otherwise
 */
async function registerConversationRoutes(req, res, method, path, corsHeaders) {
  // GET /api/conversations - List all user conversations with messages
  if (path === '/api/conversations' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      // Check if includeArchived query parameter is present
      const url = new URL(req.url, `http://${req.headers.host}`);
      const includeArchived = url.searchParams.get('includeArchived') === 'true';

      // Check if fork columns exist
      const columnsCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'messages'
          AND column_name IN ('parent_message_id', 'branch_index', 'sibling_count', 'is_edited', 'edited_at')
      `);
      const forkColumnsExist = columnsCheck.rows.length === 5;

      const result = await pool.query(`
        SELECT
          c.id,
          c.agent_id as "agentId",
          c.title,
          c.is_archived as "isArchived",
          c.model_override as "modelOverride",
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          COALESCE(
            json_agg(
              json_build_object(
                'id', m.id,
                'role', m.role,
                'content', m.content,
                'timestamp', m.created_at
                ${forkColumnsExist ? `,'parentMessageId', m.parent_message_id, 'branchIndex', m.branch_index, 'siblingCount', m.sibling_count, 'isEdited', m.is_edited, 'editedAt', m.edited_at` : ''}
              ) ORDER BY m.created_at ASC
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) as messages
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id = $1 ${!includeArchived ? 'AND c.is_archived = false' : ''}
        GROUP BY c.id, c.agent_id, c.title, c.is_archived, c.model_override, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
      `, [user.id]);

      // Convert date strings to ISO format for frontend
      const conversations = result.rows.map(conv => ({
        ...conv,
        createdAt: new Date(conv.createdAt).toISOString(),
        updatedAt: new Date(conv.updatedAt).toISOString(),
        messages: conv.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp).toISOString()
        }))
      }));

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ conversations }));
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch conversations' }));
    }
    return true;
  }

  // GET /api/conversations/:id/messages - Get conversation messages
  if (path.match(/^\/api\/conversations\/[^\/]+\/messages$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const conversationId = path.split('/')[3];

      // If this is a temp ID, return empty array (conversation not yet created)
      if (conversationId.startsWith('temp_')) {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify([]));
        return true;
      }

      // Check if fork columns exist
      const columnsCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'messages'
          AND column_name IN ('parent_message_id', 'branch_index', 'sibling_count', 'is_edited', 'edited_at')
      `);
      const forkColumnsExist = columnsCheck.rows.length === 5;

      const result = await pool.query(`
        SELECT
          id,
          conversation_id,
          role,
          content,
          ${forkColumnsExist ? 'parent_message_id as "parentMessageId", branch_index as "branchIndex", sibling_count as "siblingCount", is_edited as "isEdited", edited_at as "editedAt",' : ''}
          created_at as timestamp
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [conversationId]);

      // Convert timestamps to ISO format for frontend
      const messages = result.rows.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp).toISOString(),
        ...(msg.editedAt && { editedAt: new Date(msg.editedAt).toISOString() })
      }));

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(messages));
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch messages' }));
    }
    return true;
  }

  // PATCH /api/conversations/:id - Update conversation (rename, archive, model override)
  if (path.match(/^\/api\/conversations\/[^\/]+$/) && method === 'PATCH') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const conversationId = path.split('/')[3];
      const body = await parseBody(req);

      // Verify conversation belongs to user
      const checkResult = await pool.query(`
        SELECT id FROM conversations WHERE id = $1 AND user_id = $2
      `, [conversationId, user.id]);

      if (checkResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Conversation not found' }));
        return true;
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (body.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(body.title);
      }

      if (body.isArchived !== undefined) {
        updates.push(`is_archived = $${paramCount++}`);
        values.push(body.isArchived);
      }

      if (body.modelOverride !== undefined) {
        updates.push(`model_override = $${paramCount++}`);
        values.push(body.modelOverride);
      }

      if (updates.length === 0) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'No valid update fields provided' }));
        return true;
      }

      values.push(conversationId);
      values.push(user.id);

      const updateQuery = `
        UPDATE conversations
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount++} AND user_id = $${paramCount}
        RETURNING id, agent_id as "agentId", title, is_archived as "isArchived",
                  created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update conversation' }));
        return true;
      }

      const conversation = {
        ...result.rows[0],
        createdAt: new Date(result.rows[0].createdAt).toISOString(),
        updatedAt: new Date(result.rows[0].updatedAt).toISOString()
      };

      console.log(`📝 Conversation updated: ${conversationId} by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ conversation }));
    } catch (error) {
      console.error('❌ Error updating conversation:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update conversation' }));
    }
    return true;
  }

  // DELETE /api/conversations/:id - Delete conversation
  if (path.match(/^\/api\/conversations\/[^\/]+$/) && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const conversationId = path.split('/')[3];

      // Verify conversation belongs to user before deleting
      const checkResult = await pool.query(`
        SELECT id FROM conversations WHERE id = $1 AND user_id = $2
      `, [conversationId, user.id]);

      if (checkResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Conversation not found' }));
        return true;
      }

      // Delete messages first (due to foreign key constraint)
      await pool.query(`
        DELETE FROM messages WHERE conversation_id = $1
      `, [conversationId]);

      // Delete conversation
      await pool.query(`
        DELETE FROM conversations WHERE id = $1
      `, [conversationId]);

      console.log(`🗑️ Deleted conversation ${conversationId} for user ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: 'Conversation deleted' }));
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete conversation' }));
    }
    return true;
  }

  // Route not handled by this module
  return false;
}

module.exports = { registerConversationRoutes };
