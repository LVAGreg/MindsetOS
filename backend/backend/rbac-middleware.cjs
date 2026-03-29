/**
 * RBAC Middleware for ECOS
 *
 * Role-Based Access Control system with three tiers:
 * - User (level 1): Basic access to own data
 * - Power User (level 2): Can view and take over user sessions (coaching)
 * - Admin (level 3): Full system access, can manage users and agents
 */

const { Pool } = require('pg');

// Role hierarchy
const ROLE_LEVELS = {
  user: 1,
  power_user: 2,
  admin: 3
};

/**
 * Get user's role and level from database
 */
async function getUserRole(pool, userId) {
  try {
    const result = await pool.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { role: null, level: 0 };
    }

    const role = result.rows[0].role || 'user';
    return {
      role,
      level: ROLE_LEVELS[role] || 0
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    return { role: null, level: 0 };
  }
}

/**
 * Check if user has required role level
 */
async function hasRoleLevel(pool, userId, requiredLevel) {
  const userRole = await getUserRole(pool, userId);
  return userRole.level >= requiredLevel;
}

/**
 * Middleware: Require minimum role level
 * Returns true if authorized, false otherwise
 */
async function requireRole(pool, userId, minRole) {
  const requiredLevel = ROLE_LEVELS[minRole];
  if (!requiredLevel) {
    console.error(`Invalid role: ${minRole}`);
    return false;
  }

  return await hasRoleLevel(pool, userId, requiredLevel);
}

/**
 * Middleware: Require specific role
 */
async function requireExactRole(pool, userId, role) {
  const userRole = await getUserRole(pool, userId);
  return userRole.role === role;
}

/**
 * Check if user can access resource (owns it or has sufficient role)
 */
async function canAccessResource(pool, userId, resourceType, resourceId) {
  const userRole = await getUserRole(pool, userId);

  // Admins can access everything
  if (userRole.level >= ROLE_LEVELS.admin) {
    return true;
  }

  // Check resource ownership
  try {
    let query;

    switch (resourceType) {
      case 'conversation':
        query = 'SELECT user_id FROM conversations WHERE id = $1';
        break;
      case 'memory':
        query = 'SELECT user_id FROM memories WHERE id = $1';
        break;
      case 'user':
        // Power users can access users they're coaching
        if (userRole.level >= ROLE_LEVELS.power_user) {
          return true;
        }
        return userId === resourceId;
      default:
        return false;
    }

    const result = await pool.query(query, [resourceId]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].user_id === userId;
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

/**
 * Log permission check to audit trail
 */
async function logPermissionCheck(pool, userId, action, resource, granted, reason = null, ipAddress = null, userAgent = null, requestMethod = null, requestPath = null) {
  try {
    await pool.query(
      `INSERT INTO permission_log
       (user_id, action, resource, granted, reason, ip_address, user_agent, request_method, request_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, action, resource, granted, reason, ipAddress, userAgent, requestMethod, requestPath]
    );
  } catch (error) {
    console.error('Error logging permission check:', error);
  }
}

/**
 * Check and log permission
 */
async function checkPermission(pool, userId, action, resource, req = null) {
  const userRole = await getUserRole(pool, userId);
  let granted = false;
  let reason = '';

  // Define permission matrix
  const permissions = {
    // Admin permissions
    'manage_users': ROLE_LEVELS.admin,
    'manage_agents': ROLE_LEVELS.admin,
    'view_all_conversations': ROLE_LEVELS.admin,
    'manage_system_settings': ROLE_LEVELS.admin,

    // Power user permissions
    'view_user_sessions': ROLE_LEVELS.power_user,
    'takeover_session': ROLE_LEVELS.power_user,
    'view_assigned_users': ROLE_LEVELS.power_user,

    // User permissions (everyone)
    'view_own_conversations': ROLE_LEVELS.user,
    'create_conversation': ROLE_LEVELS.user,
    'manage_own_profile': ROLE_LEVELS.user,
    'upload_documents': ROLE_LEVELS.user
  };

  const requiredLevel = permissions[action];

  if (!requiredLevel) {
    granted = false;
    reason = `Unknown action: ${action}`;
  } else if (userRole.level >= requiredLevel) {
    granted = true;
    reason = `User has required role: ${userRole.role} (level ${userRole.level})`;
  } else {
    granted = false;
    reason = `Insufficient permissions: ${userRole.role} (level ${userRole.level}) < required level ${requiredLevel}`;
  }

  // Log the permission check
  const ipAddress = req ? req.socket.remoteAddress : null;
  const userAgent = req ? req.headers['user-agent'] : null;
  const requestMethod = req ? req.method : null;
  const requestPath = req ? req.url : null;

  await logPermissionCheck(
    pool,
    userId,
    action,
    resource,
    granted,
    reason,
    ipAddress,
    userAgent,
    requestMethod,
    requestPath
  );

  return granted;
}

/**
 * Session Takeover Functions
 */

/**
 * Start a session takeover
 */
async function startTakeover(pool, powerUserId, targetUserId, notes = null, ipAddress = null, userAgent = null) {
  try {
    // Verify power user has correct role
    const powerUserRole = await getUserRole(pool, powerUserId);
    if (powerUserRole.level < ROLE_LEVELS.power_user) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Check if power user already has an active takeover
    const existingTakeover = await pool.query(
      `SELECT id FROM session_takeovers
       WHERE power_user_id = $1 AND is_active = true`,
      [powerUserId]
    );

    if (existingTakeover.rows.length > 0) {
      return { success: false, error: 'Already have an active takeover session' };
    }

    // Start new takeover
    const result = await pool.query(
      `INSERT INTO session_takeovers
       (power_user_id, target_user_id, notes, ip_address, user_agent, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, started_at`,
      [powerUserId, targetUserId, notes, ipAddress, userAgent]
    );

    await logPermissionCheck(
      pool,
      powerUserId,
      'start_takeover',
      `user:${targetUserId}`,
      true,
      'Session takeover started',
      ipAddress,
      userAgent
    );

    return {
      success: true,
      takeoverId: result.rows[0].id,
      startedAt: result.rows[0].started_at
    };
  } catch (error) {
    console.error('Error starting takeover:', error);
    return { success: false, error: error.message };
  }
}

/**
 * End a session takeover
 */
async function endTakeover(pool, takeoverId) {
  try {
    const result = await pool.query(
      `UPDATE session_takeovers
       SET ended_at = NOW(), is_active = false
       WHERE id = $1
       RETURNING power_user_id, target_user_id`,
      [takeoverId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Takeover session not found' };
    }

    await logPermissionCheck(
      pool,
      result.rows[0].power_user_id,
      'end_takeover',
      `user:${result.rows[0].target_user_id}`,
      true,
      'Session takeover ended'
    );

    return { success: true };
  } catch (error) {
    console.error('Error ending takeover:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get active takeover for power user
 */
async function getActiveTakeover(pool, powerUserId) {
  try {
    const result = await pool.query(
      `SELECT
        st.id,
        st.target_user_id,
        st.started_at,
        st.notes,
        u.email as target_user_email,
        u.first_name as target_user_first_name,
        u.last_name as target_user_last_name
       FROM session_takeovers st
       JOIN users u ON st.target_user_id = u.id
       WHERE st.power_user_id = $1 AND st.is_active = true`,
      [powerUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting active takeover:', error);
    return null;
  }
}

/**
 * Check if user is currently being taken over
 */
async function isUserTakenOver(pool, userId) {
  try {
    const result = await pool.query(
      `SELECT
        st.id,
        st.power_user_id,
        u.email as power_user_email,
        u.first_name as power_user_first_name,
        u.last_name as power_user_last_name
       FROM session_takeovers st
       JOIN users u ON st.power_user_id = u.id
       WHERE st.target_user_id = $1 AND st.is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { isTakenOver: false };
    }

    return {
      isTakenOver: true,
      takeover: result.rows[0]
    };
  } catch (error) {
    console.error('Error checking if user is taken over:', error);
    return { isTakenOver: false };
  }
}

/**
 * Express-style middleware wrapper
 * Usage: app.use(rbacMiddleware(pool))
 */
function createRBACMiddleware(pool) {
  return async (req, res, next) => {
    // Attach RBAC functions to request
    req.rbac = {
      getUserRole: (userId) => getUserRole(pool, userId),
      hasRoleLevel: (userId, level) => hasRoleLevel(pool, userId, level),
      requireRole: (userId, minRole) => requireRole(pool, userId, minRole),
      requireExactRole: (userId, role) => requireExactRole(pool, userId, role),
      canAccessResource: (userId, resourceType, resourceId) =>
        canAccessResource(pool, userId, resourceType, resourceId),
      checkPermission: (userId, action, resource) =>
        checkPermission(pool, userId, action, resource, req),
      logPermissionCheck: (userId, action, resource, granted, reason) =>
        logPermissionCheck(pool, userId, action, resource, granted, reason,
          req.socket.remoteAddress, req.headers['user-agent'], req.method, req.url),

      // Takeover functions
      startTakeover: (powerUserId, targetUserId, notes) =>
        startTakeover(pool, powerUserId, targetUserId, notes,
          req.socket.remoteAddress, req.headers['user-agent']),
      endTakeover: (takeoverId) => endTakeover(pool, takeoverId),
      getActiveTakeover: (powerUserId) => getActiveTakeover(pool, powerUserId),
      isUserTakenOver: (userId) => isUserTakenOver(pool, userId)
    };

    if (next) next();
  };
}

module.exports = {
  ROLE_LEVELS,
  getUserRole,
  hasRoleLevel,
  requireRole,
  requireExactRole,
  canAccessResource,
  logPermissionCheck,
  checkPermission,
  startTakeover,
  endTakeover,
  getActiveTakeover,
  isUserTakenOver,
  createRBACMiddleware
};
