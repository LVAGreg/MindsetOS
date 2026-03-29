#!/usr/bin/env node
/**
 * PostgreSQL + pgvector Database Module
 * Handles all database operations for ECOS memory system
 */

const { Pool } = require('pg');

// Database configuration
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: 'localhost',
      port: 5433,
      database: 'ecos_db',
      user: 'ecos',
      password: 'ecos_dev_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

// User operations
async function createUser(email, firstName, lastName) {
  const query = `
    INSERT INTO users (email, first_name, last_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name
    RETURNING *
  `;
  const result = await pool.query(query, [email, firstName || 'Guest', lastName || 'User']);
  return result.rows[0];
}

async function getUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

// Conversation operations (using conversations table)
async function createConversation(userId, agentId, title = null) {
  const query = `
    INSERT INTO conversations (
      user_id,
      agent_id,
      title
    )
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await pool.query(query, [
    userId,
    agentId,
    title || 'New Conversation'
  ]);
  return result.rows[0];
}

async function saveMessage(conversationId, role, content, tokensUsed = 0, parentMessageId = null, branchIndex = 0, siblingCount = 0) {
  // Insert into messages table with tree structure fields
  const messageQuery = `
    INSERT INTO messages (
      conversation_id,
      role,
      content,
      tokens_used,
      parent_message_id,
      branch_index,
      sibling_count,
      is_edited,
      edited_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, false, NULL)
    RETURNING *
  `;
  const messageResult = await pool.query(messageQuery, [
    conversationId,
    role,
    content,
    tokensUsed,
    parentMessageId,
    branchIndex,
    siblingCount
  ]);

  // Update conversation updated_at timestamp
  await pool.query(
    'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
    [conversationId]
  );

  return messageResult.rows[0];
}

async function getConversationMessages(conversationId, limit = 50) {
  const query = `
    SELECT id, role, content, tokens_used, created_at,
           parent_message_id, branch_index, sibling_count,
           is_edited, edited_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    LIMIT $2
  `;
  const result = await pool.query(query, [conversationId, limit]);
  return result.rows;
}

/**
 * Build a conversation tree structure from flat message list
 * Returns ConversationHistory object with tree structure
 */
function buildConversationTree(messages) {
  if (!messages || messages.length === 0) {
    return { currentId: null, messages: {} };
  }

  // Convert flat list to tree structure
  const messageTree = {};
  let lastMessageId = null;

  for (const msg of messages) {
    messageTree[msg.id] = {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      parentId: msg.parent_message_id || null,
      childrenIds: [],
      branchIndex: msg.branch_index || 0,
      siblingCount: msg.sibling_count || 0,
      isEdited: msg.is_edited || false,
      editedAt: msg.edited_at || null,
      agentId: msg.agent_id || undefined,
    };
    lastMessageId = msg.id;
  }

  // Build childrenIds arrays by scanning for children
  for (const msg of messages) {
    if (msg.parent_message_id && messageTree[msg.parent_message_id]) {
      messageTree[msg.parent_message_id].childrenIds.push(msg.id);
    }
  }

  // Find the current leaf node (last message in the main branch)
  // For now, use the last message chronologically
  const currentId = lastMessageId;

  return {
    currentId,
    messages: messageTree
  };
}

async function getUserConversations(userId, limit = 50) {
  console.log(`🔍 getUserConversations called with userId: ${userId}, limit: ${limit}`);

  const query = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
    FROM conversations c
    WHERE c.user_id = $1
    ORDER BY c.updated_at DESC
    LIMIT $2
  `;

  console.log(`📋 Executing query for user conversations`);
  const result = await pool.query(query, [userId, limit]);

  console.log(`✅ Query returned ${result.rows.length} conversations`);
  if (result.rows.length > 0) {
    console.log(`📄 First conversation:`, {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      agent_id: result.rows[0].agent_id,
      message_count: result.rows[0].message_count
    });
  }

  return result.rows;
}

// Memory operations (long-term storage)
async function saveMemory(userId, agentId, memoryType, content, importanceScore, embedding, metadata, sourceConversationId) {
  const query = `
    INSERT INTO memories (user_id, agent_id, memory_type, content, importance_score, embedding, metadata, source_conversation_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await pool.query(query, [
    userId, agentId, memoryType, content, importanceScore, 
    embedding ? `[${embedding.join(',')}]` : null, 
    metadata, sourceConversationId
  ]);
  return result.rows[0];
}

// Vector similarity search for memories
async function searchMemories(userId, embedding, limit = 5) {
  const query = `
    SELECT id, user_id, agent_id, memory_type, content, importance_score, 
           1 - (embedding <=> $1::vector) as similarity,
           metadata, created_at
    FROM memories 
    WHERE user_id = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;
  const result = await pool.query(query, [`[${embedding.join(',')}]`, userId, limit]);
  return result.rows;
}

// Knowledge base operations
async function saveKnowledgeDocument(userId, title, content, fileType, category, tags, embedding, metadata) {
  const query = `
    INSERT INTO knowledge_base (user_id, title, content, file_type, category, tags, embedding, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await pool.query(query, [
    userId, title, content, fileType, category, tags || [], 
    embedding ? `[${embedding.join(',')}]` : null, 
    metadata
  ]);
  return result.rows[0];
}

// Search knowledge base with vector similarity
async function searchKnowledge(userId, embedding, limit = 5) {
  const query = `
    SELECT id, title, content, category, tags,
           1 - (embedding <=> $1::vector) as similarity,
           metadata, created_at
    FROM knowledge_base 
    WHERE user_id = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;
  const result = await pool.query(query, [`[${embedding.join(',')}]`, userId, limit]);
  return result.rows;
}

// Usage tracking
async function trackUsage(userId, conversationId, agentId, provider, inputTokens, outputTokens, totalTokens, costUsd, latencyMs) {
  const query = `
    INSERT INTO usage_tracking 
    (user_id, conversation_id, agent_id, provider, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const result = await pool.query(query, [
    userId, conversationId, agentId, provider, inputTokens, outputTokens, totalTokens, costUsd, latencyMs
  ]);
  return result.rows[0];
}

// Get usage stats for a user
async function getUserUsageStats(userId, days = 30) {
  const query = `
    SELECT 
      agent_id,
      COUNT(*) as request_count,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost,
      AVG(latency_ms) as avg_latency
    FROM usage_tracking
    WHERE user_id = $1 
      AND created_at > NOW() - INTERVAL '${days} days'
    GROUP BY agent_id
    ORDER BY total_cost DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// User Profile operations
async function getUserProfile(userId) {
  const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  return result.rows[0];
}

async function createOrUpdateUserProfile(userId, profileData) {
  const {
    full_name,
    company_name,
    business_outcomes,
    why_people_work_with_you,
    target_clients,
    top_3_problems,
    main_results,
    core_method,
    main_offers,
    credentials,
    success_stories,
    business_promise,
    onboarding_completed
  } = profileData;

  const query = `
    INSERT INTO user_profiles (
      user_id, full_name, company_name, business_outcomes, why_people_work_with_you,
      target_clients, top_3_problems, main_results, core_method, main_offers,
      credentials, success_stories, business_promise, onboarding_completed
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      company_name = EXCLUDED.company_name,
      business_outcomes = EXCLUDED.business_outcomes,
      why_people_work_with_you = EXCLUDED.why_people_work_with_you,
      target_clients = EXCLUDED.target_clients,
      top_3_problems = EXCLUDED.top_3_problems,
      main_results = EXCLUDED.main_results,
      core_method = EXCLUDED.core_method,
      main_offers = EXCLUDED.main_offers,
      credentials = EXCLUDED.credentials,
      success_stories = EXCLUDED.success_stories,
      business_promise = EXCLUDED.business_promise,
      onboarding_completed = EXCLUDED.onboarding_completed,
      updated_at = NOW()
    RETURNING *
  `;

  const result = await pool.query(query, [
    userId, full_name, company_name, business_outcomes, why_people_work_with_you,
    target_clients, top_3_problems, main_results, core_method, main_offers,
    credentials, success_stories, business_promise, onboarding_completed
  ]);

  return result.rows[0];
}

module.exports = {
  pool,
  createUser,
  getUserByEmail,
  createConversation,
  saveMessage,
  getConversationMessages,
  buildConversationTree,
  getUserConversations,
  saveMemory,
  searchMemories,
  saveKnowledgeDocument,
  searchKnowledge,
  trackUsage,
  getUserUsageStats,
  getUserProfile,
  createOrUpdateUserProfile
};
