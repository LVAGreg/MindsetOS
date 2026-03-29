/**
 * Authentication middleware
 */
const jwt = require('jsonwebtoken');
const { pool } = require('../utils/database.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'ecos-jwt-secret-change-in-production';

/**
 * Extract and verify user from JWT token
 */
function getUserFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  const user = getUserFromToken(req.headers.authorization);

  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  req.user = user;
  next();
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }
    next();
  });
}

/**
 * Generate JWT tokens
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

module.exports = {
  getUserFromToken,
  requireAuth,
  requireAdmin,
  generateTokens,
  JWT_SECRET
};
