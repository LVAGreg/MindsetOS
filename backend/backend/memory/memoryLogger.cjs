#!/usr/bin/env node
/**
 * Memory Logger - Track memory agent activity for dashboard
 * Stores recent activity in memory for live dashboard display
 */

// In-memory storage for recent logs (last 50 entries per user)
const userLogs = new Map();
const MAX_LOGS_PER_USER = 50;

/**
 * Log memory agent activity
 * @param {string} userId - User ID
 * @param {string} action - 'extract' | 'store' | 'retrieve' | 'consolidate'
 * @param {string} agentId - Agent ID
 * @param {string} details - Human-readable description
 * @param {number} count - Optional count (e.g., number of memories extracted)
 */
function logActivity(userId, action, agentId, details, count = null) {
  if (!userLogs.has(userId)) {
    userLogs.set(userId, []);
  }

  const logs = userLogs.get(userId);

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    agent_id: agentId,
    details,
    count
  };

  logs.unshift(logEntry); // Add to beginning

  // Keep only last MAX_LOGS_PER_USER
  if (logs.length > MAX_LOGS_PER_USER) {
    logs.pop();
  }

  console.log(`📋 [LOG] ${action}: ${details}${count ? ` (${count})` : ''}`);
}

/**
 * Get recent logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Max number of logs to return
 * @returns {Array} - Array of log entries
 */
function getLogs(userId, limit = 20) {
  if (!userLogs.has(userId)) {
    return [];
  }

  const logs = userLogs.get(userId);
  return logs.slice(0, limit);
}

/**
 * Clear logs for a user
 * @param {string} userId - User ID
 */
function clearLogs(userId) {
  userLogs.delete(userId);
}

module.exports = {
  logActivity,
  getLogs,
  clearLogs
};
