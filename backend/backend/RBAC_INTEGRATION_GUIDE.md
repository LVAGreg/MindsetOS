# RBAC Integration Guide for real-backend.cjs

This guide explains how to integrate the RBAC middleware and routes into the existing `real-backend.cjs` file.

## Files Created

1. **`/backend/rbac-middleware.cjs`** - Core RBAC functionality
2. **`/backend/rbac-routes.cjs`** - RBAC API endpoint handlers
3. **`/backend/RBAC_INTEGRATION_GUIDE.md`** - This file

## Integration Steps

### Step 1: Add Requires at Top of real-backend.cjs

Add these lines after the existing `require` statements (around line 17):

```javascript
const rbacMiddleware = require('./backend/rbac-middleware.cjs');
const rbacRoutes = require('./backend/rbac-routes.cjs');
```

### Step 2: Initialize RBAC Middleware

After the pool initialization (around line 29), add:

```javascript
// Initialize RBAC middleware
const rbac = {
  getUserRole: (userId) => rbacMiddleware.getUserRole(pool, userId),
  hasRoleLevel: (userId, level) => rbacMiddleware.hasRoleLevel(pool, userId, level),
  requireRole: (userId, minRole) => rbacMiddleware.requireRole(pool, userId, minRole),
  requireExactRole: (userId, role) => rbacMiddleware.requireExactRole(pool, userId, role),
  canAccessResource: (userId, resourceType, resourceId) =>
    rbacMiddleware.canAccessResource(pool, userId, resourceType, resourceId),
  checkPermission: (userId, action, resource, req) =>
    rbacMiddleware.checkPermission(pool, userId, action, resource, req),
  logPermissionCheck: (userId, action, resource, granted, reason, ipAddress, userAgent, method, path) =>
    rbacMiddleware.logPermissionCheck(pool, userId, action, resource, granted, reason, ipAddress, userAgent, method, path),
  startTakeover: (powerUserId, targetUserId, notes, ipAddress, userAgent) =>
    rbacMiddleware.startTakeover(pool, powerUserId, targetUserId, notes, ipAddress, userAgent),
  endTakeover: (takeoverId) => rbacMiddleware.endTakeover(pool, takeoverId),
  getActiveTakeover: (powerUserId) => rbacMiddleware.getActiveTakeover(pool, powerUserId),
  isUserTakenOver: (userId) => rbacMiddleware.isUserTakenOver(pool, userId)
};
```

### Step 3: Add Helper Function to Get User ID from Request

Add this helper function after the `parseBody` function (around line 198):

```javascript
// Helper to extract user ID from authorization header or session
async function getUserIdFromRequest(req) {
  // Option 1: From Authorization header (JWT or session token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Check if it's a session token
    if (sessions.has(token)) {
      return sessions.get(token).userId;
    }
  }

  // Option 2: From Cookie (if using cookie-based auth)
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenMatch = cookies.match(/session=([^;]+)/);
    if (tokenMatch && sessions.has(tokenMatch[1])) {
      return sessions.get(tokenMatch[1]).userId;
    }
  }

  return null;
}
```

### Step 4: Add RBAC Routes to Request Handler

Add these routes inside the main request handler, after the health check endpoint (around line 627). Insert them in the appropriate sections:

#### Admin Routes Section (add after line 800)

```javascript
    // ===================
    // ADMIN RBAC ROUTES
    // ===================

    // GET /api/admin/users - List all users with roles
    if (path === '/api/admin/users' && method === 'GET') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      await rbacRoutes.handleAdminGetUsers(pool, rbac, userId, req, res);
      return;
    }

    // PUT /api/admin/users/:id/role - Change user role
    if (path.match(/^\/api\/admin\/users\/[^\/]+\/role$/) && method === 'PUT') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const targetUserId = path.split('/')[4];
      const body = await parseBody(req);

      await rbacRoutes.handleAdminUpdateUserRole(pool, rbac, userId, targetUserId, body.role, req, res);
      return;
    }

    // PUT /api/admin/users/:id/activate - Toggle user active status
    if (path.match(/^\/api\/admin\/users\/[^\/]+\/activate$/) && method === 'PUT') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const targetUserId = path.split('/')[4];
      const body = await parseBody(req);

      await rbacRoutes.handleAdminToggleUserActive(pool, rbac, userId, targetUserId, body.isActive, req, res);
      return;
    }

    // GET /api/admin/permission-log - View permission audit log
    if (path === '/api/admin/permission-log' && method === 'GET') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const queryParams = parsedUrl.query || {};

      await rbacRoutes.handleAdminGetPermissionLog(pool, rbac, userId, queryParams, req, res);
      return;
    }
```

#### Power User Routes Section (add after admin routes)

```javascript
    // =========================
    // POWER USER RBAC ROUTES
    // =========================

    // GET /api/power-user/users - List assigned users
    if (path === '/api/power-user/users' && method === 'GET') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      await rbacRoutes.handlePowerUserGetUsers(pool, rbac, userId, req, res);
      return;
    }

    // POST /api/power-user/takeover/:targetUserId - Start takeover
    if (path.match(/^\/api\/power-user\/takeover\/[^\/]+$/) && method === 'POST' && !path.endsWith('/end')) {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const targetUserId = path.split('/')[4];
      const body = await parseBody(req);

      await rbacRoutes.handlePowerUserStartTakeover(pool, rbac, userId, targetUserId, body.notes, req, res);
      return;
    }

    // POST /api/power-user/takeover/:takeoverId/end - End takeover
    if (path.match(/^\/api\/power-user\/takeover\/[^\/]+\/end$/) && method === 'POST') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const takeoverId = path.split('/')[4];

      await rbacRoutes.handlePowerUserEndTakeover(pool, rbac, userId, takeoverId, req, res);
      return;
    }

    // GET /api/power-user/takeover/active - Get active takeover
    if (path === '/api/power-user/takeover/active' && method === 'GET') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      await rbacRoutes.handlePowerUserGetActiveTakeover(pool, rbac, userId, req, res);
      return;
    }
```

#### User Profile Routes Section (add after power user routes)

```javascript
    // ===================
    // USER PROFILE ROUTES
    // ===================

    // GET /api/user/profile - Get current user profile
    if (path === '/api/user/profile' && method === 'GET') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      await rbacRoutes.handleUserGetProfile(pool, rbac, userId, req, res);
      return;
    }

    // PUT /api/user/profile - Update current user profile
    if (path === '/api/user/profile' && method === 'PUT') {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const body = await parseBody(req);

      await rbacRoutes.handleUserUpdateProfile(pool, rbac, userId, body, req, res);
      return;
    }
```

### Step 5: Protect Existing Admin Routes

Add permission checks to existing admin routes. For example, update the `/api/admin/agents` endpoint:

```javascript
// Before (around line 1397)
if (path === '/api/admin/agents' && method === 'GET') {
  // ... existing code

// After
if (path === '/api/admin/agents' && method === 'GET') {
  const userId = await getUserIdFromRequest(req);
  if (userId) {
    const hasPermission = await rbac.checkPermission(userId, 'manage_agents', 'agents');
    if (!hasPermission) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Insufficient permissions' }));
      return;
    }
  }

  // ... existing code
```

Apply similar checks to:
- `/api/admin/agents/:id` (PUT) - manage_agents
- `/api/admin/agents/reload` (POST) - manage_agents
- `/api/admin/ai-models/*` (GET/POST/PUT) - manage_system_settings
- `/api/admin/stats` (GET) - view_all_conversations

### Step 6: Add Resource Ownership Checks

For user-specific resources, add ownership checks:

```javascript
// Example for conversation access
if (path.match(/^\/api\/conversations\/[^\/]+\/messages$/) && method === 'GET') {
  const userId = await getUserIdFromRequest(req);
  const conversationId = path.split('/')[3];

  if (userId) {
    const canAccess = await rbac.canAccessResource(userId, 'conversation', conversationId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
  }

  // ... existing code
}
```

## Testing the Integration

### 1. Test Database Migrations

Before testing RBAC, ensure migrations are complete:

```bash
node database/migrate.js
```

### 2. Create Test Users with Different Roles

```sql
-- Create admin user
UPDATE users SET role = 'admin' WHERE email = 'admin@ecos.com';

-- Create power user
UPDATE users SET role = 'power_user' WHERE email = 'coach@ecos.com';

-- Create regular user
UPDATE users SET role = 'user' WHERE email = 'user@ecos.com';
```

### 3. Test Admin Endpoints

```bash
# List all users (admin only)
curl http://localhost:3010/api/admin/users \
  -H "Authorization: Bearer <admin-token>"

# Change user role (admin only)
curl -X PUT http://localhost:3010/api/admin/users/<user-id>/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "power_user"}'

# View permission log (admin only)
curl http://localhost:3010/api/admin/permission-log \
  -H "Authorization: Bearer <admin-token>"
```

### 4. Test Power User Endpoints

```bash
# List assigned users
curl http://localhost:3010/api/power-user/users \
  -H "Authorization: Bearer <power-user-token>"

# Start takeover
curl -X POST http://localhost:3010/api/power-user/takeover/<target-user-id> \
  -H "Authorization: Bearer <power-user-token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Helping with setup"}'

# Get active takeover
curl http://localhost:3010/api/power-user/takeover/active \
  -H "Authorization: Bearer <power-user-token>"

# End takeover
curl -X POST http://localhost:3010/api/power-user/takeover/<takeover-id>/end \
  -H "Authorization: Bearer <power-user-token>"
```

### 5. Test User Profile Endpoints

```bash
# Get own profile
curl http://localhost:3010/api/user/profile \
  -H "Authorization: Bearer <user-token>"

# Update own profile
curl -X PUT http://localhost:3010/api/user/profile \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Expert consultant", "company": "Acme Inc"}'
```

## Permission Matrix

| Action | User | Power User | Admin |
|--------|------|------------|-------|
| View own profile | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| View own conversations | ✅ | ✅ | ✅ |
| Create conversations | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |
| View assigned users | ❌ | ✅ | ✅ |
| Take over user sessions | ❌ | ✅ | ✅ |
| View all conversations | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage agents | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Manage system settings | ❌ | ❌ | ✅ |

## Security Best Practices

1. **Always validate user ID**: Never trust client-provided user IDs
2. **Log all permission checks**: Use `rbac.checkPermission()` which auto-logs
3. **Check resource ownership**: Use `rbac.canAccessResource()` for user-specific data
4. **Validate input**: Always validate and sanitize request bodies
5. **Use HTTPS**: Enable HTTPS for Railway deployment
6. **Rate limiting**: Consider adding rate limiting to admin endpoints
7. **Session expiry**: Implement proper session expiry and rotation

## Troubleshooting

### Permission Denied Errors

Check the permission log:

```sql
SELECT * FROM permission_log
WHERE granted = false
ORDER BY created_at DESC
LIMIT 20;
```

Or use the API:

```bash
curl http://localhost:3010/api/admin/permission-log?granted=false \
  -H "Authorization: Bearer <admin-token>"
```

### User Role Not Updating

Verify role exists:

```sql
SELECT * FROM roles;
```

Check user's current role:

```sql
SELECT id, email, role FROM users WHERE email = 'user@example.com';
```

### Takeover Not Working

Check for active takeovers:

```sql
SELECT
  st.*,
  u1.email as power_user_email,
  u2.email as target_user_email
FROM session_takeovers st
JOIN users u1 ON st.power_user_id = u1.id
JOIN users u2 ON st.target_user_id = u2.id
WHERE st.is_active = true;
```

## Next Steps

1. **Frontend Integration**: Create React components for RBAC UI (see RBAC_FRONTEND_GUIDE.md)
2. **Agent Permission Protection**: Add permission checks to agent chat endpoints
3. **Document Upload**: Implement vector database integration with RBAC
4. **Session Management**: Enhance session handling with proper expiry
5. **Rate Limiting**: Add rate limiting middleware
6. **Monitoring**: Set up monitoring for permission denials and takeover activity

## References

- Database Migrations: `/database/migrations/`
- Railway Deployment Guide: `/RAILWAY_DEPLOYMENT_GUIDE.md`
- Developer Handoff: `/DEVELOPER_HANDOFF.md`
- Frontend RBAC Components: `/RBAC_FRONTEND_GUIDE.md` (to be created)
