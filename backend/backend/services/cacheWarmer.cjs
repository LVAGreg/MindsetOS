/**
 * Cache Warmer Service
 * Pre-loads embeddings for common queries on startup
 */

const { Pool } = require('pg');
const { warmCache } = require('./embeddingService.cjs');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Load most frequent memories from database
 */
async function loadFrequentMemories(limit = 100) {
  const client = await pool.connect();

  try {
    // Get most frequently accessed memories (based on last_accessed timestamp)
    const query = `
      SELECT
        content,
        embedding,
        model
      FROM agent_memories
      WHERE embedding IS NOT NULL
        AND content IS NOT NULL
      ORDER BY last_accessed DESC NULLS LAST, created_at DESC
      LIMIT $1
    `;

    const result = await client.query(query, [limit]);

    return result.rows.map(row => ({
      text: row.content,
      embedding: typeof row.embedding === 'string'
        ? JSON.parse(row.embedding.replace(/^\[|\]$/g, '').split(','))
        : row.embedding,
      model: row.model || 'default'
    }));
  } catch (error) {
    console.error('Error loading frequent memories:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Load common agent prompts and system messages
 */
async function loadCommonPrompts() {
  const client = await pool.connect();

  try {
    const query = `
      SELECT DISTINCT
        system_prompt as content,
        'agent-prompt' as type
      FROM agents
      WHERE system_prompt IS NOT NULL

      UNION

      SELECT DISTINCT
        content,
        'memory' as type
      FROM agent_memories
      WHERE embedding IS NOT NULL
        AND content IS NOT NULL
      ORDER BY type
      LIMIT 50
    `;

    const result = await client.query(query);

    return result.rows.map(row => ({
      text: row.content,
      type: row.type
    }));
  } catch (error) {
    console.error('Error loading common prompts:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Warm cache on startup
 */
async function warmCacheOnStartup() {
  console.log('🔥 Starting cache warming process...');

  try {
    // Load frequent memories with embeddings
    const memories = await loadFrequentMemories(100);

    if (memories.length > 0) {
      await warmCache(memories);
      console.log(`✅ Cache warmed with ${memories.length} frequent memories`);
    }

    // Pre-generate embeddings for common prompts
    // (These will be cached when first requested)

    return {
      success: true,
      memoriesLoaded: memories.length
    };
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Periodic cache refresh (run daily)
 */
async function refreshCache() {
  console.log('🔄 Refreshing cache with latest frequent memories...');
  return warmCacheOnStartup();
}

module.exports = {
  warmCacheOnStartup,
  refreshCache,
  loadFrequentMemories,
  loadCommonPrompts
};
