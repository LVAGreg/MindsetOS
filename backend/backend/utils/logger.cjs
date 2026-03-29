/**
 * Logging utilities
 */

function logAPIUsage(userId, agentId, model, operation, inputTokens, outputTokens, latency, conversationId) {
  const { pool } = require('./database.cjs');

  return pool.query(`
    INSERT INTO api_usage_logs (user_id, agent_id, model, operation, input_tokens, output_tokens, latency_ms, conversation_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [userId, agentId, model, operation, inputTokens, outputTokens, latency, conversationId]);
}

function estimateTokens(text) {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

module.exports = {
  logAPIUsage,
  estimateTokens
};
