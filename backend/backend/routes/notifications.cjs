/**
 * Notifications Routes Module
 * Handles notification bell, research jobs, and admin broadcasts
 * Part of ECOS Notification Engine
 */

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
 * Register notification-related routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerNotificationRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * GET /api/notifications
     * Get all notifications for current user with optional filters
     */
    async getNotifications(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        const unreadOnly = url.searchParams.get('unread') === 'true';

        let query = `
          SELECT id, type, title, message, data, is_read, priority, source,
                 created_at, read_at, expires_at, broadcast_id
          FROM notifications
          WHERE user_id = $1
            AND (expires_at IS NULL OR expires_at > NOW())
        `;

        if (unreadOnly) {
          query += ` AND is_read = false`;
        }

        query += ` ORDER BY created_at DESC LIMIT $2`;

        const result = await pool.query(query, [userId, limit]);

        // Get unread count
        const countResult = await pool.query(
          `SELECT COUNT(*)::INTEGER as count FROM notifications
           WHERE user_id = $1 AND is_read = false
           AND (expires_at IS NULL OR expires_at > NOW())`,
          [userId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          notifications: result.rows,
          unreadCount: countResult.rows[0].count
        }));
      } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch notifications' }));
      }
    },

    /**
     * GET /api/notifications/count
     * Get unread notification count for the bell badge
     */
    async getNotificationCount(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT get_unread_notification_count($1) as count`,
          [userId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          count: result.rows[0].count
        }));
      } catch (error) {
        console.error('❌ Error fetching notification count:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch notification count' }));
      }
    },

    /**
     * POST /api/notifications/:id/read
     * Mark a notification as read
     */
    async markAsRead(req, res, notificationId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `UPDATE notifications
           SET is_read = true, read_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING id, is_read, read_at`,
          [notificationId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Notification not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          notification: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to mark notification as read' }));
      }
    },

    /**
     * POST /api/notifications/read-all
     * Mark all notifications as read
     */
    async markAllAsRead(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `UPDATE notifications
           SET is_read = true, read_at = NOW()
           WHERE user_id = $1 AND is_read = false
           RETURNING id`,
          [userId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          markedCount: result.rowCount
        }));
      } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to mark notifications as read' }));
      }
    },

    /**
     * DELETE /api/notifications/:id
     * Delete a notification
     */
    async deleteNotification(req, res, notificationId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `DELETE FROM notifications
           WHERE id = $1 AND user_id = $2
           RETURNING id`,
          [notificationId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Notification not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          deleted: result.rows[0].id
        }));
      } catch (error) {
        console.error('❌ Error deleting notification:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete notification' }));
      }
    },

    // ========================================
    // RESEARCH JOBS API
    // ========================================

    /**
     * GET /api/research
     * Get all research jobs for current user
     */
    async getResearchJobs(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const status = url.searchParams.get('status'); // pending, processing, completed, failed
        const limit = parseInt(url.searchParams.get('limit')) || 20;

        let query = `
          SELECT id, conversation_id, agent_id, status, model, query,
                 progress, progress_message, searches_count,
                 tokens_used, cost_usd, error_message,
                 created_at, started_at, completed_at
          FROM research_jobs
          WHERE user_id = $1
        `;
        const params = [userId];

        if (status) {
          query += ` AND status = $2`;
          params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        // Get counts by status
        const countsResult = await pool.query(
          `SELECT status, COUNT(*)::INTEGER as count
           FROM research_jobs
           WHERE user_id = $1
           GROUP BY status`,
          [userId]
        );

        const statusCounts = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        };
        countsResult.rows.forEach(row => {
          statusCounts[row.status] = row.count;
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          jobs: result.rows,
          counts: statusCounts
        }));
      } catch (error) {
        console.error('❌ Error fetching research jobs:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch research jobs' }));
      }
    },

    /**
     * GET /api/research/:id
     * Get a specific research job with full result
     */
    async getResearchJob(req, res, jobId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT * FROM research_jobs
           WHERE id = $1 AND user_id = $2`,
          [jobId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Research job not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          job: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error fetching research job:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch research job' }));
      }
    },

    // ========================================
    // SAVED RESEARCH API
    // ========================================

    /**
     * GET /api/user-research
     * Get saved research reports for current user
     */
    async getUserResearch(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const category = url.searchParams.get('category');
        const pinnedOnly = url.searchParams.get('pinned') === 'true';
        const limit = parseInt(url.searchParams.get('limit')) || 20;

        let query = `
          SELECT id, title, query, summary, citations_count, tags, category,
                 models_used, is_pinned, is_archived, view_count,
                 tokens_used, cost_usd, created_at, updated_at
          FROM user_research
          WHERE user_id = $1 AND is_archived = false
        `;
        const params = [userId];

        if (category) {
          query += ` AND category = $${params.length + 1}`;
          params.push(category);
        }

        if (pinnedOnly) {
          query += ` AND is_pinned = true`;
        }

        query += ` ORDER BY is_pinned DESC, created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          research: result.rows
        }));
      } catch (error) {
        console.error('❌ Error fetching user research:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch user research' }));
      }
    },

    /**
     * GET /api/user-research/:id
     * Get a specific saved research with full report and citations
     */
    async getUserResearchById(req, res, researchId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        // Get research and increment view count
        const result = await pool.query(
          `UPDATE user_research
           SET view_count = view_count + 1, last_viewed_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [researchId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Research not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          research: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error fetching user research:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch user research' }));
      }
    },

    /**
     * PATCH /api/user-research/:id
     * Update research metadata (pin, archive, tags, category)
     */
    async updateUserResearch(req, res, researchId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { is_pinned, is_archived, tags, category } = body;

        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (is_pinned !== undefined) {
          updates.push(`is_pinned = $${paramIndex++}`);
          params.push(is_pinned);
        }
        if (is_archived !== undefined) {
          updates.push(`is_archived = $${paramIndex++}`);
          params.push(is_archived);
        }
        if (tags !== undefined) {
          updates.push(`tags = $${paramIndex++}`);
          params.push(tags);
        }
        if (category !== undefined) {
          updates.push(`category = $${paramIndex++}`);
          params.push(category);
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No updates provided' }));
          return;
        }

        updates.push(`updated_at = NOW()`);
        params.push(researchId, userId);

        const result = await pool.query(
          `UPDATE user_research
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
           RETURNING id, is_pinned, is_archived, tags, category, updated_at`,
          params
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Research not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          research: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error updating user research:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update user research' }));
      }
    },

    /**
     * DELETE /api/user-research/:id
     * Delete saved research
     */
    async deleteUserResearch(req, res, researchId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `DELETE FROM user_research
           WHERE id = $1 AND user_id = $2
           RETURNING id`,
          [researchId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Research not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          deleted: result.rows[0].id
        }));
      } catch (error) {
        console.error('❌ Error deleting user research:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete user research' }));
      }
    },

    // ========================================
    // ADMIN BROADCAST API
    // ========================================

    /**
     * GET /api/admin/broadcasts
     * Get all broadcasts (admin only)
     */
    async getAdminBroadcasts(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      // Check if user is admin
      if (authResult.user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      try {
        const parsedUrl = require('url').parse(req.url, true);
        const page = Math.max(1, parseInt(parsedUrl.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(parsedUrl.query.limit) || 25));
        const days = parseInt(parsedUrl.query.days);
        const offset = (page - 1) * limit;

        let whereClause = '';
        if (days && days > 0) {
          whereClause = `WHERE ab.created_at > NOW() - INTERVAL '${parseInt(days)} days'`;
        }

        const countResult = await pool.query(
          `SELECT COUNT(*)::INTEGER as total FROM admin_broadcasts ab ${whereClause}`
        );
        const totalCount = countResult.rows[0].total;

        const result = await pool.query(
          `SELECT ab.*, u.email as admin_email
           FROM admin_broadcasts ab
           JOIN users u ON ab.admin_user_id = u.id
           ${whereClause}
           ORDER BY ab.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          broadcasts: result.rows,
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }));
      } catch (error) {
        console.error('❌ Error fetching broadcasts:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch broadcasts' }));
      }
    },

    /**
     * POST /api/admin/broadcasts
     * Create a new broadcast (admin only)
     */
    async createBroadcast(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      if (authResult.user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      try {
        const body = await parseBody(req);
        const { title, message, priority, target_type, target_roles, target_user_ids, scheduled_for, expires_at, data } = body;

        if (!title || !message || !target_type) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Title, message, and target_type are required' }));
          return;
        }

        const result = await pool.query(
          `INSERT INTO admin_broadcasts
           (admin_user_id, title, message, priority, target_type, target_roles, target_user_ids, scheduled_for, expires_at, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            authResult.user.id,
            title,
            message,
            priority || 'normal',
            target_type,
            target_roles || [],
            target_user_ids || [],
            scheduled_for,
            expires_at,
            data ? JSON.stringify(data) : '{}'
          ]
        );

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          broadcast: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error creating broadcast:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create broadcast' }));
      }
    },

    /**
     * POST /api/admin/broadcasts/:id/send
     * Send a broadcast to target users (admin only)
     */
    async sendBroadcast(req, res, broadcastId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      if (authResult.user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      try {
        // Get broadcast details
        const broadcastResult = await pool.query(
          `SELECT * FROM admin_broadcasts WHERE id = $1`,
          [broadcastId]
        );

        if (broadcastResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Broadcast not found' }));
          return;
        }

        const broadcast = broadcastResult.rows[0];

        if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Broadcast already sent or cancelled' }));
          return;
        }

        // Build target query based on target_type
        let targetQuery;
        let targetParams = [];

        if (broadcast.target_type === 'all') {
          targetQuery = `SELECT id FROM users WHERE is_active = true`;
        } else if (broadcast.target_type === 'role') {
          targetQuery = `SELECT id FROM users WHERE is_active = true AND role = ANY($1)`;
          targetParams = [broadcast.target_roles];
        } else if (broadcast.target_type === 'users') {
          targetQuery = `SELECT id FROM users WHERE id = ANY($1) AND is_active = true`;
          targetParams = [broadcast.target_user_ids];
        }

        const targetUsers = await pool.query(targetQuery, targetParams);

        // Create notifications for each target user
        let createdCount = 0;
        const broadcastData = broadcast.data || '{}';
        for (const user of targetUsers.rows) {
          await pool.query(
            `INSERT INTO notifications
             (user_id, type, title, message, data, priority, source, broadcast_id, expires_at)
             VALUES ($1, 'admin_broadcast', $2, $3, $4, $5, 'admin', $6, $7)`,
            [user.id, broadcast.title, broadcast.message, broadcastData, broadcast.priority, broadcastId, broadcast.expires_at]
          );
          createdCount++;
        }

        // Update broadcast status
        await pool.query(
          `UPDATE admin_broadcasts
           SET status = 'sent', sent_at = NOW(), recipients_count = $1
           WHERE id = $2`,
          [createdCount, broadcastId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          recipientsCount: createdCount
        }));
      } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to send broadcast' }));
      }
    }
  };
}

module.exports = { registerNotificationRoutes };
