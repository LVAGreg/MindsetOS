#!/usr/bin/env node
/**
 * Semantic Memory Retrieval System
 *
 * Implements Letta + Mem0 hybrid approach with BM25 enhancement:
 * - Hybrid BM25 + Vector search (configurable via HYBRID_SEARCH_ENABLED)
 * - Vector similarity search using pgvector
 * - Hierarchical memory tiers (core/active/working/archived)
 * - Hybrid scoring: vector similarity (70%) + importance (20%) + recency (10%)
 * - BM25 keyword matching for exact term retrieval
 * - Recency decay and access-based boosting
 * - Ollama/OpenAI embeddings via embeddingService
 */

const { generateEmbedding } = require('../services/embeddingService.cjs');
const { hybridSearch, bm25OnlySearch } = require('../services/hybridSearchService.cjs');

/**
 * Retrieve semantically relevant memories for conversation context
 *
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {string} conversationContext - Current conversation text to match against
 * @param {Object} options - Retrieval options
 * @returns {Promise<Array>} - Ranked memories
 */
async function retrieveSemanticMemories(pool, userId, conversationContext, options = {}) {
  const {
    maxMemories = 15,
    includeTiers = ['core', 'active', 'working'],
    vectorWeight = 0.7,
    importanceWeight = 0.2,
    recencyWeight = 0.1,
    useHybridSearch = process.env.HYBRID_SEARCH_ENABLED === 'true',
    precomputedEmbedding = null, // Pass precomputed embedding to avoid redundant API calls
    clientProfileId = null // Scope memories to a specific client profile
  } = options;

  try {
    // Check if hybrid search is enabled
    if (useHybridSearch) {
      console.log('🔀 [MEMORY] Using hybrid BM25 + Vector search');

      try {
        const hybridResults = await hybridSearch(pool, userId, conversationContext, {
          maxResults: maxMemories,
          includeTiers,
          bm25Weight: parseFloat(process.env.BM25_WEIGHT || '0.3'),
          vectorWeight: parseFloat(process.env.VECTOR_WEIGHT || '0.7'),
          rerankThreshold: parseFloat(process.env.RERANK_THRESHOLD || '0.5'),
          clientProfileId
        });

        if (hybridResults && hybridResults.length > 0) {
          console.log(`✅ [HYBRID] Retrieved ${hybridResults.length} memories using hybrid search`);
          return hybridResults;
        }

        // If hybrid search returns nothing, fall back to traditional search
        console.log('ℹ️  [HYBRID] No results from hybrid search, falling back to vector search');
      } catch (hybridError) {
        console.error('⚠️  [HYBRID] Hybrid search failed, falling back to vector search:', hybridError.message);
        // Continue to vector search fallback
      }
    }

    // Step 1: Use precomputed embedding if provided, otherwise generate
    let contextEmbedding = precomputedEmbedding;
    if (!contextEmbedding) {
      contextEmbedding = await generateContextEmbedding(conversationContext);
    } else {
      console.log('⚡ [MEMORY] Using precomputed embedding (saved ~1-2s)');
    }

    if (!contextEmbedding) {
      console.log('⚠️  No embedding generated, falling back to importance-only retrieval');
      return await fallbackRetrievalByImportance(pool, userId, includeTiers, maxMemories, clientProfileId);
    }

    // Step 2: Query memories using vector similarity with hybrid scoring
    const query = `
      WITH memory_scores AS (
        SELECT
          id,
          memory_type,
          content,
          importance_score,
          memory_tier,
          created_at,
          last_accessed_at,
          pinned,
          agent_id,
          -- Vector similarity (cosine distance, 0 = identical, 2 = opposite)
          1 - (embedding <=> $2::vector) AS vector_similarity,

          -- Recency factor (1.0 for today, decays to 0.5 over 365 days)
          GREATEST(0.5, 1.0 - (EXTRACT(EPOCH FROM (NOW() - created_at)) / (365 * 24 * 60 * 60)) * 0.5) AS recency_factor,

          -- Base importance
          COALESCE(importance_score, 0.5) AS base_importance

        FROM memories
        WHERE user_id = $1
          AND status = 'active'
          AND memory_tier = ANY($3::varchar[])
          AND embedding IS NOT NULL
          AND ${clientProfileId ? 'client_profile_id = $8' : 'client_profile_id IS NULL'}
      )
      SELECT
        id,
        memory_type,
        content,
        memory_tier,
        created_at,
        pinned,
        agent_id,
        vector_similarity,
        base_importance,
        recency_factor,
        -- Hybrid score calculation
        (
          (vector_similarity * $4) +
          (base_importance * $5) +
          (recency_factor * $6)
        ) AS final_score,
        -- Explanation for debugging
        CONCAT(
          'vec:', ROUND(vector_similarity::numeric, 3), ' ',
          'imp:', ROUND(base_importance::numeric, 3), ' ',
          'rec:', ROUND(recency_factor::numeric, 3)
        ) AS score_breakdown
      FROM memory_scores
      WHERE vector_similarity > 0.3  -- Minimum relevance threshold
      ORDER BY
        pinned DESC,           -- Pinned memories always on top
        final_score DESC,      -- Then by hybrid score
        created_at DESC        -- Tie-breaker: most recent
      LIMIT $7
    `;

    const queryParams = [
      userId,
      JSON.stringify(contextEmbedding),
      includeTiers,
      vectorWeight,
      importanceWeight,
      recencyWeight,
      maxMemories
    ];
    if (clientProfileId) queryParams.push(clientProfileId);
    const result = await pool.query(query, queryParams);

    if (result.rows.length > 0) {
      console.log(`🎯 [SEMANTIC] Retrieved ${result.rows.length} memories using vector search`);
      console.log(`📊 [SEMANTIC] Score range: ${result.rows[0].final_score.toFixed(3)} to ${result.rows[result.rows.length-1].final_score.toFixed(3)}`);

      // Update last_accessed_at for retrieved memories (async, don't wait)
      const memoryIds = result.rows.map(r => r.id);
      pool.query(`
        UPDATE memories
        SET last_accessed_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [memoryIds]).catch(err => console.error('⚠️  Failed to update access time:', err.message));
    } else {
      console.log('ℹ️  [SEMANTIC] No memories found with vector similarity > 0.3, trying fallback');
      return await fallbackRetrievalByImportance(pool, userId, includeTiers, maxMemories, clientProfileId);
    }

    return result.rows;

  } catch (error) {
    console.error('❌ [SEMANTIC] Vector search failed:', error.message);
    return await fallbackRetrievalByImportance(pool, userId, includeTiers, maxMemories, clientProfileId);
  }
}

/**
 * Generate embedding for conversation context using Ollama/OpenAI
 */
async function generateContextEmbedding(text) {
  try {
    // Truncate text to ~8000 tokens
    const truncatedText = text.substring(0, 30000);

    console.log('🔢 Generating context embedding...');
    const embedding = await generateEmbedding(truncatedText);

    if (!embedding) {
      console.log('⚠️  No embedding generated, falling back to importance-only retrieval');
      return null;
    }

    console.log('✅ Context embedding generated successfully');
    return embedding;
  } catch (error) {
    console.error('❌ Embedding generation error:', error.message);
    return null;
  }
}

/**
 * Fallback retrieval by importance (when vector search unavailable)
 */
async function fallbackRetrievalByImportance(pool, userId, includeTiers, maxMemories, clientProfileId = null) {
  console.log('📋 [FALLBACK] Using importance-based retrieval');

  const result = await pool.query(`
    SELECT
      id,
      memory_type,
      content,
      importance_score,
      memory_tier,
      created_at,
      pinned,
      agent_id
    FROM memories
    WHERE user_id = $1
      AND status = 'active'
      AND memory_tier = ANY($2::varchar[])
      AND ${clientProfileId ? 'client_profile_id = $4' : 'client_profile_id IS NULL'}
    ORDER BY
      pinned DESC,
      importance_score DESC,
      created_at DESC
    LIMIT $3
  `, clientProfileId ? [userId, includeTiers, maxMemories, clientProfileId] : [userId, includeTiers, maxMemories]);

  console.log(`📊 [FALLBACK] Retrieved ${result.rows.length} memories by importance`);
  return result.rows;
}

/**
 * Promote memory to higher tier
 */
async function promoteMemory(pool, memoryId, newTier) {
  const validTiers = ['core', 'active', 'working'];
  if (!validTiers.includes(newTier)) {
    throw new Error(`Invalid tier: ${newTier}. Must be one of: ${validTiers.join(', ')}`);
  }

  const result = await pool.query(`
    UPDATE memories
    SET memory_tier = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, memory_type, content, memory_tier
  `, [newTier, memoryId]);

  if (result.rows.length === 0) {
    throw new Error('Memory not found');
  }

  console.log(`✨ [TIER] Promoted memory ${memoryId} to ${newTier}`);
  return result.rows[0];
}

/**
 * Demote memory to lower tier or archive
 */
async function demoteMemory(pool, memoryId, newTier) {
  const validTiers = ['working', 'archived'];
  if (!validTiers.includes(newTier)) {
    throw new Error(`Invalid tier: ${newTier}. Must be one of: ${validTiers.join(', ')}`);
  }

  const updates = {
    memory_tier: newTier,
    updated_at: 'NOW()'
  };

  if (newTier === 'archived') {
    updates.status = 'archived';
    updates.archived_at = 'NOW()';
    updates.archived_reason = 'manual_demotion';
  }

  const result = await pool.query(`
    UPDATE memories
    SET memory_tier = $1,
        updated_at = NOW(),
        status = CASE WHEN $1 = 'archived' THEN 'archived' ELSE status END,
        archived_at = CASE WHEN $1 = 'archived' THEN NOW() ELSE archived_at END,
        archived_reason = CASE WHEN $1 = 'archived' THEN 'manual_demotion' ELSE archived_reason END
    WHERE id = $2
    RETURNING id, memory_type, content, memory_tier, status
  `, [newTier, memoryId]);

  if (result.rows.length === 0) {
    throw new Error('Memory not found');
  }

  console.log(`📉 [TIER] Demoted memory ${memoryId} to ${newTier}`);
  return result.rows[0];
}

/**
 * Get core memories for user (always injected into context)
 */
async function getCoreMemories(pool, userId, clientProfileId = null) {
  // Only load TRUE core identity memories (max 20) — not the entire memory bank
  // Core = high-importance business_context facts (name, company, target clients, etc.)
  // Everything else lives in 'active' tier and is retrieved via semantic search
  const MAX_CORE_MEMORIES = 20;

  const result = await pool.query(`
    SELECT
      id,
      memory_type,
      content,
      importance_score,
      created_at,
      pinned
    FROM memories
    WHERE user_id = $1
      AND memory_tier = 'core'
      AND status = 'active'
      AND ${clientProfileId ? 'client_profile_id = $3' : 'client_profile_id IS NULL'}
    ORDER BY pinned DESC, importance_score DESC, created_at DESC
    LIMIT $2
  `, clientProfileId ? [userId, MAX_CORE_MEMORIES, clientProfileId] : [userId, MAX_CORE_MEMORIES]);

  if (result.rows.length >= MAX_CORE_MEMORIES) {
    console.log(`⚠️ [CORE_MEMORY] User ${userId} has ${MAX_CORE_MEMORIES}+ core memories, capped at ${MAX_CORE_MEMORIES}. Consider migrating lower-importance ones to 'active' tier.`);
  }

  return result.rows;
}

module.exports = {
  retrieveSemanticMemories,
  promoteMemory,
  demoteMemory,
  getCoreMemories,
  generateContextEmbedding
};
