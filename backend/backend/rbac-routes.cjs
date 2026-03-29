/**
 * RBAC API Routes for ECOS
 *
 * New endpoints for role-based access control:
 * - User management (admin only)
 * - Session takeover (power users)
 * - Profile management (all users)
 */

/**
 * ADMIN ENDPOINTS
 */

/**
 * GET /api/admin/users
 * List all users with their roles
 * Admin only
 */
async function handleAdminGetUsers(pool, rbac, userId, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'manage_users', 'users');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Admin role required.'
      }));
      return;
    }

    // Get all users with role information
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.last_login,
        u.created_at,
        u.company,
        u.title,
        r.name as role_name,
        r.level as role_level
      FROM users u
      LEFT JOIN roles r ON u.role = r.id
      ORDER BY u.created_at DESC
    `);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      users: result.rows,
      total: result.rows.length
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get users' }));
  }
}

/**
 * PUT /api/admin/users/:id/role
 * Change user's role
 * Admin only
 */
async function handleAdminUpdateUserRole(pool, rbac, userId, targetUserId, newRole, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'manage_users', 'users');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Admin role required.'
      }));
      return;
    }

    // Validate role
    const validRoles = ['user', 'power_user', 'admin'];
    if (!validRoles.includes(newRole)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      }));
      return;
    }

    // Update user role
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role`,
      [newRole, targetUserId]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    // Log the action
    await rbac.logPermissionCheck(
      userId,
      'change_user_role',
      `user:${targetUserId}`,
      true,
      `Changed role to ${newRole}`
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      user: result.rows[0]
    }));
  } catch (error) {
    console.error('Error updating user role:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to update user role' }));
  }
}

/**
 * PUT /api/admin/users/:id/activate
 * Activate or deactivate user
 * Admin only
 */
async function handleAdminToggleUserActive(pool, rbac, userId, targetUserId, isActive, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'manage_users', 'users');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Admin role required.'
      }));
      return;
    }

    // Update user active status
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active`,
      [isActive, targetUserId]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    // Log the action
    await rbac.logPermissionCheck(
      userId,
      'toggle_user_active',
      `user:${targetUserId}`,
      true,
      `Set active status to ${isActive}`
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      user: result.rows[0]
    }));
  } catch (error) {
    console.error('Error toggling user active status:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to toggle user active status' }));
  }
}

/**
 * GET /api/admin/permission-log
 * View permission audit log
 * Admin only
 */
async function handleAdminGetPermissionLog(pool, rbac, userId, queryParams, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'manage_system_settings', 'permission_log');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Admin role required.'
      }));
      return;
    }

    // Build query with optional filters
    let query = `
      SELECT
        pl.id,
        pl.user_id,
        u.email as user_email,
        u.role as user_role,
        pl.action,
        pl.resource,
        pl.granted,
        pl.reason,
        pl.created_at,
        pl.ip_address
      FROM permission_log pl
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by user
    if (queryParams.userId) {
      query += ` AND pl.user_id = $${paramIndex}`;
      params.push(queryParams.userId);
      paramIndex++;
    }

    // Filter by action
    if (queryParams.action) {
      query += ` AND pl.action = $${paramIndex}`;
      params.push(queryParams.action);
      paramIndex++;
    }

    // Filter by granted status
    if (queryParams.granted !== undefined) {
      query += ` AND pl.granted = $${paramIndex}`;
      params.push(queryParams.granted === 'true');
      paramIndex++;
    }

    query += ` ORDER BY pl.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      logs: result.rows,
      total: result.rows.length
    }));
  } catch (error) {
    console.error('Error getting permission log:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get permission log' }));
  }
}

/**
 * POWER USER ENDPOINTS
 */

/**
 * GET /api/power-user/users
 * List users assigned to this power user
 * Power user only
 */
async function handlePowerUserGetUsers(pool, rbac, userId, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'view_assigned_users', 'users');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Power user role required.'
      }));
      return;
    }

    // For now, return all active users (can be enhanced with assignment logic later)
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.last_login,
        u.company,
        (SELECT COUNT(*) FROM conversations WHERE user_id = u.id) as conversation_count
      FROM users u
      WHERE u.role = 'user' AND u.is_active = true
      ORDER BY u.last_login DESC NULLS LAST
    `);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      users: result.rows,
      total: result.rows.length
    }));
  } catch (error) {
    console.error('Error getting users for power user:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get users' }));
  }
}

/**
 * POST /api/power-user/takeover/:targetUserId
 * Start session takeover
 * Power user only
 */
async function handlePowerUserStartTakeover(pool, rbac, userId, targetUserId, notes, req, res) {
  try {
    // Check permission
    const hasPermission = await rbac.checkPermission(userId, 'takeover_session', 'sessions');

    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions. Power user role required.'
      }));
      return;
    }

    // Start takeover
    const result = await rbac.startTakeover(userId, targetUserId, notes);

    if (!result.success) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      takeoverId: result.takeoverId,
      startedAt: result.startedAt
    }));
  } catch (error) {
    console.error('Error starting takeover:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to start takeover' }));
  }
}

/**
 * POST /api/power-user/takeover/:takeoverId/end
 * End session takeover
 * Power user only
 */
async function handlePowerUserEndTakeover(pool, rbac, userId, takeoverId, req, res) {
  try {
    // Verify takeover belongs to this power user
    const verify = await pool.query(
      `SELECT power_user_id FROM session_takeovers WHERE id = $1`,
      [takeoverId]
    );

    if (verify.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Takeover session not found' }));
      return;
    }

    if (verify.rows[0].power_user_id !== userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot end another user\'s takeover session' }));
      return;
    }

    // End takeover
    const result = await rbac.endTakeover(takeoverId);

    if (!result.success) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: result.error }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error ending takeover:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to end takeover' }));
  }
}

/**
 * GET /api/power-user/takeover/active
 * Get current active takeover
 * Power user only
 */
async function handlePowerUserGetActiveTakeover(pool, rbac, userId, req, res) {
  try {
    const takeover = await rbac.getActiveTakeover(userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      takeover: takeover || null
    }));
  } catch (error) {
    console.error('Error getting active takeover:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get active takeover' }));
  }
}

/**
 * USER ENDPOINTS
 */

/**
 * GET /api/user/profile
 * Get current user's profile
 */
async function handleUserGetProfile(pool, rbac, userId, req, res) {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.last_login,
        u.profile_image_url,
        u.bio,
        u.company,
        u.title,
        u.phone,
        u.timezone,
        u.created_at,
        r.name as role_name,
        r.level as role_level
      FROM users u
      LEFT JOIN roles r ON u.role = r.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    // Check if user is currently being taken over
    const takeoverStatus = await rbac.isUserTakenOver(userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      user: result.rows[0],
      isTakenOver: takeoverStatus.isTakenOver,
      takeover: takeoverStatus.takeover || null
    }));
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get user profile' }));
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
async function handleUserUpdateProfile(pool, rbac, userId, updates, req, res) {
  try {
    // Allowed fields for users to update
    const allowedFields = [
      'first_name',
      'last_name',
      'profile_image_url',
      'bio',
      'company',
      'title',
      'phone',
      'timezone'
    ];

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid fields to update' }));
      return;
    }

    // Build UPDATE query
    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [userId, ...Object.values(filteredUpdates)];

    const result = await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, email, first_name, last_name, bio, company, title`,
      values
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      user: result.rows[0]
    }));
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to update user profile' }));
  }
}

module.exports = {
  // Admin routes
  handleAdminGetUsers,
  handleAdminUpdateUserRole,
  handleAdminToggleUserActive,
  handleAdminGetPermissionLog,

  // Power user routes
  handlePowerUserGetUsers,
  handlePowerUserStartTakeover,
  handlePowerUserEndTakeover,
  handlePowerUserGetActiveTakeover,

  // User routes
  handleUserGetProfile,
  handleUserUpdateProfile
};
