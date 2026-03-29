#!/usr/bin/env node
/**
 * Memory Router Service
 *
 * Intelligent routing system for memory queries that separates:
 * - Core memories: Persistent user profile, preferences, long-term facts
 * - Conversational memories: Ephemeral, context-specific, extracted from recent conversations
 *
 * Key Features:
 * - Routes queries to appropriate memory sources (core_memories table vs memories table)
 * - Combines results with weighted prioritization
 * - Implements memory lifecycle management
 * - Provides memory consolidation and cleanup
 */

const db = require('./db.cjs');

/**
 * Memory type definitions
 */
const MEMORY_TYPES = {
  CORE: 'core',                     // Persistent user profile data
  CONVERSATIONAL: 'conversational', // Recent conversation context
  EPISODIC: 'episodic',            // Session-specific memories
  SEMANTIC: 'semantic'              // General knowledge memories
};

/**
 * Memory weight configuration for prioritization
 */
const MEMORY_WEIGHTS = {
  core: 1.0,           // Core memories always get highest priority
  conversational: 0.7, // Recent conversational context
  episodic: 0.5,      // Session-specific context
  semantic: 0.6       // General knowledge
};

/**
 * Recency windows for different memory types (in days)
 */
const RECENCY_WINDOWS = {
  conversational: 30,  // Only load conversational memories from last 30 days
  episodic: 7,        // Episodic memories from last 7 days
  semantic: 90        // Semantic memories from last 90 days
};

/**
 * Load all relevant memories for a user with intelligent routing
 *
 * @param {string} userId - User UUID
 * @param {Object} options - Loading options
 * @param {boolean} options.includeCore - Include core memories (default: true)
 * @param {boolean} options.includeConversational - Include conversational memories (default: true)
 * @param {number} options.conversationalLimit - Max conversational memories (default: 20)
 * @param {number} options.coreLimit - Max core memories (default: 50)
 * @param {string} options.agentId - Filter by specific agent
 * @returns {Object} Combined memory results with metadata
 */
async function loadMemoriesForUser(userId, options = {}) {
  const {
    includeCore = true,
    includeConversational = true,
    conversationalLimit = 20,
    coreLimit = 50,
    agentId = null
  } = options;

  const results = {
    core: [],
    conversational: [],
    combined: [],
    metadata: {
      coreCount: 0,
      conversationalCount: 0,
      totalWeight: 0,
      loadedAt: new Date().toISOString()
    }
  };

  try {
    // Load core memories from core_memories table
    if (includeCore) {
      results.core = await loadCoreMemories(userId, coreLimit);
      results.metadata.coreCount = results.core.length;
    }

    // Load conversational memories from memories table
    if (includeConversational) {
      results.conversational = await loadConversationalMemories(
        userId,
        conversationalLimit,
        agentId
      );
      results.metadata.conversationalCount = results.conversational.length;
    }

    // Combine and weight memories
    results.combined = combineAndWeightMemories(results.core, results.conversational);
    results.metadata.totalWeight = results.combined.reduce((sum, m) => sum + m.weight, 0);

    console.log(`🧠 [MEMORY ROUTER] Loaded ${results.metadata.coreCount} core + ${results.metadata.conversationalCount} conversational memories for user`);

    return results;

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to load memories:`, error.message);
    return results;
  }
}

/**
 * Load core memories from core_memories table
 * These are persistent user profile and business information
 */
async function loadCoreMemories(userId, limit = 50) {
  try {
    const result = await db.pool.query(
      `SELECT
        id,
        user_id,
        full_name,
        company_name,
        business_outcome,
        target_clients,
        client_problems,
        client_results,
        core_method,
        frameworks,
        service_description,
        pricing_model,
        delivery_timeline,
        revenue_range,
        growth_goals,
        biggest_challenges,
        created_at,
        updated_at
      FROM core_memories
      WHERE user_id = $1
      LIMIT $2`,
      [userId, limit]
    );

    // Transform core_memories structure into memory format
    return result.rows.map(row => {
      const memories = [];

      // Business identity
      if (row.business_outcome) {
        memories.push({
          content: `Business outcome: ${row.business_outcome}`,
          type: MEMORY_TYPES.CORE,
          importance: 1.0,
          source: 'core_memories',
          metadata: { category: 'business_identity' }
        });
      }

      // Target clients
      if (row.target_clients) {
        memories.push({
          content: `Target clients: ${row.target_clients}`,
          type: MEMORY_TYPES.CORE,
          importance: 1.0,
          source: 'core_memories',
          metadata: { category: 'client_profile' }
        });
      }

      // Client problems
      if (row.client_problems && row.client_problems.length > 0) {
        memories.push({
          content: `Client problems: ${row.client_problems.join(', ')}`,
          type: MEMORY_TYPES.CORE,
          importance: 1.0,
          source: 'core_memories',
          metadata: { category: 'client_profile' }
        });
      }

      // Core methodology
      if (row.core_method) {
        memories.push({
          content: `Core method: ${row.core_method}`,
          type: MEMORY_TYPES.CORE,
          importance: 1.0,
          source: 'core_memories',
          metadata: { category: 'methodology' }
        });
      }

      // Frameworks
      if (row.frameworks && row.frameworks.length > 0) {
        memories.push({
          content: `Frameworks: ${row.frameworks.join(', ')}`,
          type: MEMORY_TYPES.CORE,
          importance: 1.0,
          source: 'core_memories',
          metadata: { category: 'methodology' }
        });
      }

      return memories;
    }).flat();

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to load core memories:`, error.message);
    return [];
  }
}

/**
 * Load conversational memories from memories table
 * Filtered by recency and importance
 */
async function loadConversationalMemories(userId, limit = 20, agentId = null) {
  try {
    const recencyDays = RECENCY_WINDOWS.conversational;

    const query = `
      SELECT
        id,
        user_id,
        agent_id,
        content,
        memory_type,
        importance_score,
        metadata,
        created_at,
        last_accessed_at
      FROM memories
      WHERE user_id = $1
        AND memory_type IN ($2, $3)
        AND created_at > NOW() - INTERVAL '${recencyDays} days'
        AND (expires_at IS NULL OR expires_at > NOW())
        ${agentId ? 'AND agent_id = $4' : ''}
      ORDER BY
        importance_score DESC NULLS LAST,
        last_accessed_at DESC NULLS LAST,
        created_at DESC
      LIMIT $${agentId ? 5 : 4}
    `;

    const params = agentId
      ? [userId, MEMORY_TYPES.CONVERSATIONAL, MEMORY_TYPES.EPISODIC, agentId, limit]
      : [userId, MEMORY_TYPES.CONVERSATIONAL, MEMORY_TYPES.EPISODIC, limit];

    const result = await db.pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      type: row.memory_type,
      importance: row.importance_score || 0.5,
      source: 'memories',
      agentId: row.agent_id,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at
    }));

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to load conversational memories:`, error.message);
    return [];
  }
}

/**
 * Combine core and conversational memories with weighted prioritization
 */
function combineAndWeightMemories(coreMemories, conversationalMemories) {
  const combined = [];

  // Add core memories with weight 1.0
  for (const memory of coreMemories) {
    combined.push({
      ...memory,
      weight: MEMORY_WEIGHTS.core * (memory.importance || 1.0),
      priority: 'high'
    });
  }

  // Add conversational memories with weight 0.7
  for (const memory of conversationalMemories) {
    const typeWeight = MEMORY_WEIGHTS[memory.type] || 0.5;
    combined.push({
      ...memory,
      weight: typeWeight * (memory.importance || 0.5),
      priority: memory.importance > 0.7 ? 'high' : 'medium'
    });
  }

  // Sort by weight (descending)
  combined.sort((a, b) => b.weight - a.weight);

  return combined;
}

/**
 * Store a new memory with automatic type classification
 */
async function storeMemory(userId, agentId, content, options = {}) {
  const {
    memoryType = MEMORY_TYPES.CONVERSATIONAL,
    importance = 0.5,
    metadata = {},
    sourceConversationId = null,
    expiryDays = null
  } = options;

  try {
    // Determine expiry based on memory type
    let expiresAt = null;
    if (expiryDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
    } else if (memoryType === MEMORY_TYPES.CONVERSATIONAL) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + RECENCY_WINDOWS.conversational);
    } else if (memoryType === MEMORY_TYPES.EPISODIC) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + RECENCY_WINDOWS.episodic);
    }

    const result = await db.pool.query(
      `INSERT INTO memories (
        user_id,
        agent_id,
        content,
        memory_type,
        importance_score,
        metadata,
        source_conversation_id,
        expires_at,
        source_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        userId,
        agentId,
        content,
        memoryType,
        importance,
        JSON.stringify(metadata),
        sourceConversationId,
        expiresAt,
        'conversation'
      ]
    );

    console.log(`✅ [MEMORY ROUTER] Stored ${memoryType} memory (expires: ${expiresAt ? expiresAt.toISOString() : 'never'})`);

    return result.rows[0].id;

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to store memory:`, error.message);
    return null;
  }
}

/**
 * Apply memory lifecycle policies
 * Marks memories for expiry based on type and importance
 */
async function applyLifecyclePolicies() {
  try {
    const result = await db.pool.query('SELECT * FROM apply_memory_lifecycle_policies()');

    console.log('📊 [MEMORY ROUTER] Applied lifecycle policies:');
    for (const row of result.rows) {
      console.log(`  - ${row.memory_type}: ${row.expired_count} marked for expiry, ${row.protected_count} protected`);
    }

    return result.rows;

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to apply lifecycle policies:`, error.message);
    return [];
  }
}

/**
 * Clean up expired memories
 * Deletes memories that have passed their expiry date
 */
async function cleanupExpiredMemories() {
  try {
    const result = await db.pool.query('SELECT * FROM cleanup_expired_memories()');

    console.log('🗑️  [MEMORY ROUTER] Cleaned up expired memories:');
    let total = 0;
    for (const row of result.rows) {
      console.log(`  - ${row.memory_type}: ${row.deleted_count} deleted`);
      total += parseInt(row.deleted_count);
    }

    return { total, byType: result.rows };

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to cleanup expired memories:`, error.message);
    return { total: 0, byType: [] };
  }
}

/**
 * Get memory statistics for a user
 */
async function getMemoryStats(userId) {
  try {
    const result = await db.pool.query(
      `SELECT
        memory_type,
        COUNT(*) as count,
        AVG(importance_score) as avg_importance,
        COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as expiring_count,
        COUNT(CASE WHEN is_protected THEN 1 END) as protected_count
      FROM memories
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY memory_type`,
      [userId]
    );

    // Also get core memories count
    const coreResult = await db.pool.query(
      'SELECT COUNT(*) as count FROM core_memories WHERE user_id = $1',
      [userId]
    );

    return {
      conversational: result.rows.find(r => r.memory_type === MEMORY_TYPES.CONVERSATIONAL) || { count: 0 },
      episodic: result.rows.find(r => r.memory_type === MEMORY_TYPES.EPISODIC) || { count: 0 },
      semantic: result.rows.find(r => r.memory_type === MEMORY_TYPES.SEMANTIC) || { count: 0 },
      core: { count: parseInt(coreResult.rows[0].count) }
    };

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to get memory stats:`, error.message);
    return { conversational: {}, episodic: {}, semantic: {}, core: {} };
  }
}

/**
 * Protect a memory from auto-deletion
 */
async function protectMemory(memoryId, protect = true) {
  try {
    await db.pool.query(
      'UPDATE memories SET is_protected = $1 WHERE id = $2',
      [protect, memoryId]
    );

    console.log(`${protect ? '🔒' : '🔓'} [MEMORY ROUTER] Memory ${memoryId} ${protect ? 'protected' : 'unprotected'}`);
    return true;

  } catch (error) {
    console.error(`❌ [MEMORY ROUTER] Failed to ${protect ? 'protect' : 'unprotect'} memory:`, error.message);
    return false;
  }
}

/**
 * Format memories for LLM context
 * Converts memory objects into a formatted string for system prompts
 */
function formatMemoriesForContext(memories, options = {}) {
  const { maxTokens = 2000, includePriority = true } = options;

  if (!memories || memories.length === 0) {
    return '';
  }

  let formatted = '## User Memory Context\n\n';
  let tokenCount = 0;
  const approxTokensPerChar = 0.25; // Rough estimate

  // Separate by priority
  const highPriority = memories.filter(m => m.priority === 'high');
  const mediumPriority = memories.filter(m => m.priority === 'medium');

  // Format high priority first
  if (highPriority.length > 0) {
    formatted += '### Core Profile\n';
    for (const memory of highPriority) {
      const line = `- ${memory.content}\n`;
      const estimatedTokens = line.length * approxTokensPerChar;

      if (tokenCount + estimatedTokens > maxTokens) break;

      formatted += line;
      tokenCount += estimatedTokens;
    }
    formatted += '\n';
  }

  // Format medium priority
  if (mediumPriority.length > 0 && tokenCount < maxTokens * 0.8) {
    formatted += '### Recent Context\n';
    for (const memory of mediumPriority) {
      const line = `- ${memory.content}\n`;
      const estimatedTokens = line.length * approxTokensPerChar;

      if (tokenCount + estimatedTokens > maxTokens) break;

      formatted += line;
      tokenCount += estimatedTokens;
    }
  }

  return formatted;
}

module.exports = {
  MEMORY_TYPES,
  MEMORY_WEIGHTS,
  RECENCY_WINDOWS,
  loadMemoriesForUser,
  loadCoreMemories,
  loadConversationalMemories,
  combineAndWeightMemories,
  storeMemory,
  applyLifecyclePolicies,
  cleanupExpiredMemories,
  getMemoryStats,
  protectMemory,
  formatMemoriesForContext
};
