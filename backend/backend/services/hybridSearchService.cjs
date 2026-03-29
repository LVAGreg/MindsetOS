#!/usr/bin/env node
/**
 * Hybrid Search Service - BM25 + Vector Search
 *
 * Implements hybrid retrieval combining:
 * - BM25 (keyword-based) scoring for exact term matching
 * - Vector cosine similarity for semantic matching
 * - Configurable score combination with re-ranking
 *
 * Inspired by OpenWebUI's approach to improve retrieval accuracy
 */

const { generateEmbedding } = require('./embeddingService.cjs');

/**
 * BM25 Configuration
 * k1: term frequency saturation parameter (1.2-2.0 typical)
 * b: length normalization parameter (0.75 typical)
 */
const BM25_CONFIG = {
  k1: 1.5,
  b: 0.75
};

/**
 * Calculate BM25 score for a document
 *
 * BM25 formula:
 * score = Σ(IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl)))
 *
 * where:
 * - qi: query term i
 * - f(qi, D): frequency of qi in document D
 * - |D|: length of document D
 * - avgdl: average document length in collection
 * - IDF(qi): inverse document frequency of qi
 *
 * @param {string} query - Search query
 * @param {string} document - Document text
 * @param {number} avgDocLength - Average document length in collection
 * @param {number} totalDocs - Total number of documents
 * @param {Object} termDocFreq - Map of term -> number of docs containing term
 * @returns {number} BM25 score
 */
function calculateBM25(query, document, avgDocLength, totalDocs, termDocFreq) {
  const { k1, b } = BM25_CONFIG;

  // Tokenize and normalize query and document
  const queryTerms = tokenize(query);
  const docTerms = tokenize(document);
  const docLength = docTerms.length;

  // Calculate term frequencies in document
  const termFreq = {};
  docTerms.forEach(term => {
    termFreq[term] = (termFreq[term] || 0) + 1;
  });

  // Calculate BM25 score
  let score = 0;
  queryTerms.forEach(term => {
    const tf = termFreq[term] || 0; // term frequency in document
    const df = termDocFreq[term] || 1; // document frequency (default to 1 to avoid division by zero)

    // IDF calculation: ln((N - df + 0.5) / (df + 0.5) + 1)
    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);

    // BM25 term score
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

    score += idf * (numerator / denominator);
  });

  return score;
}

/**
 * Simple tokenization (lowercase, split on non-alphanumeric)
 * @param {string} text - Text to tokenize
 * @returns {Array<string>} Array of tokens
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2); // Filter out very short tokens
}

/**
 * Calculate collection statistics for BM25
 * @param {Array} documents - Array of document objects with 'content' field
 * @returns {Object} Collection statistics
 */
function calculateCollectionStats(documents) {
  let totalLength = 0;
  const termDocFreq = {}; // term -> number of docs containing term

  documents.forEach(doc => {
    const tokens = tokenize(doc.content);
    totalLength += tokens.length;

    // Track which terms appear in this document (deduplicate)
    const uniqueTerms = new Set(tokens);
    uniqueTerms.forEach(term => {
      termDocFreq[term] = (termDocFreq[term] || 0) + 1;
    });
  });

  const avgDocLength = documents.length > 0 ? totalLength / documents.length : 0;

  return {
    avgDocLength,
    totalDocs: documents.length,
    termDocFreq
  };
}

/**
 * Normalize scores to 0-1 range
 * @param {Array<Object>} results - Array of results with scores
 * @param {string} scoreField - Field name containing score
 * @returns {Array<Object>} Results with normalized scores
 */
function normalizeScores(results, scoreField) {
  if (results.length === 0) return results;

  const scores = results.map(r => r[scoreField]);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  if (range === 0) {
    // All scores are the same
    return results.map(r => ({
      ...r,
      [scoreField]: 1.0
    }));
  }

  return results.map(r => ({
    ...r,
    [scoreField]: (r[scoreField] - minScore) / range
  }));
}

/**
 * Perform hybrid search combining BM25 and vector similarity
 *
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Ranked results
 */
async function hybridSearch(pool, userId, query, options = {}) {
  const {
    maxResults = 15,
    includeTiers = ['core', 'active', 'working'],
    bm25Weight = parseFloat(process.env.BM25_WEIGHT || '0.3'),
    vectorWeight = parseFloat(process.env.VECTOR_WEIGHT || '0.7'),
    rerankThreshold = parseFloat(process.env.RERANK_THRESHOLD || '0.5'),
    minVectorSimilarity = 0.3,
    clientProfileId = null
  } = options;

  console.log(`🔍 [HYBRID] Starting hybrid search with BM25=${bm25Weight}, Vector=${vectorWeight}`);

  try {
    // Step 1: Fetch all candidate memories (scoped by client profile)
    const candidateParams = clientProfileId ? [userId, includeTiers, clientProfileId] : [userId, includeTiers];
    const candidatesResult = await pool.query(`
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
        embedding
      FROM memories
      WHERE user_id = $1
        AND status = 'active'
        AND memory_tier = ANY($2::varchar[])
        AND ${clientProfileId ? 'client_profile_id = $3' : 'client_profile_id IS NULL'}
    `, candidateParams);

    const candidates = candidatesResult.rows;

    if (candidates.length === 0) {
      console.log('ℹ️  [HYBRID] No memories found for user');
      return [];
    }

    console.log(`📊 [HYBRID] Processing ${candidates.length} candidate memories`);

    // Step 2: Calculate BM25 scores
    const stats = calculateCollectionStats(candidates);
    const bm25Results = candidates.map(doc => ({
      ...doc,
      bm25_score: calculateBM25(query, doc.content, stats.avgDocLength, stats.totalDocs, stats.termDocFreq)
    }));

    // Normalize BM25 scores to 0-1 range
    const normalizedBM25 = normalizeScores(bm25Results, 'bm25_score');

    console.log(`✅ [HYBRID] BM25 scores calculated (range: ${Math.min(...normalizedBM25.map(r => r.bm25_score)).toFixed(3)} - ${Math.max(...normalizedBM25.map(r => r.bm25_score)).toFixed(3)})`);

    // Step 3: Calculate vector similarity scores
    let vectorResults = [];
    let queryEmbedding = null;

    // Only use vector search if embeddings are available
    const hasEmbeddings = candidates.some(c => c.embedding);

    if (hasEmbeddings) {
      try {
        queryEmbedding = await generateEmbedding(query);

        if (queryEmbedding) {
          vectorResults = candidates
            .filter(doc => doc.embedding)
            .map(doc => {
              const vectorSim = calculateCosineSimilarity(queryEmbedding, doc.embedding);
              return {
                ...doc,
                vector_score: vectorSim
              };
            });

          // Normalize vector scores
          vectorResults = normalizeScores(vectorResults, 'vector_score');

          console.log(`✅ [HYBRID] Vector scores calculated for ${vectorResults.length} memories (range: ${Math.min(...vectorResults.map(r => r.vector_score)).toFixed(3)} - ${Math.max(...vectorResults.map(r => r.vector_score)).toFixed(3)})`);
        }
      } catch (error) {
        console.warn('⚠️  [HYBRID] Vector embedding failed, using BM25 only:', error.message);
      }
    }

    // Step 4: Combine scores
    const hybridResults = normalizedBM25.map(bm25Doc => {
      // Find matching vector result
      const vectorDoc = vectorResults.find(v => v.id === bm25Doc.id);

      // Calculate hybrid score
      let hybridScore;
      if (vectorDoc) {
        // Both BM25 and vector available
        hybridScore = (bm25Doc.bm25_score * bm25Weight) + (vectorDoc.vector_score * vectorWeight);
      } else {
        // BM25 only (normalize weight to 1.0)
        hybridScore = bm25Doc.bm25_score;
      }

      return {
        id: bm25Doc.id,
        memory_type: bm25Doc.memory_type,
        content: bm25Doc.content,
        memory_tier: bm25Doc.memory_tier,
        created_at: bm25Doc.created_at,
        pinned: bm25Doc.pinned,
        agent_id: bm25Doc.agent_id,
        importance_score: bm25Doc.importance_score,
        bm25_score: bm25Doc.bm25_score,
        vector_score: vectorDoc ? vectorDoc.vector_score : 0,
        hybrid_score: hybridScore,
        score_breakdown: `bm25:${bm25Doc.bm25_score.toFixed(3)} vec:${vectorDoc ? vectorDoc.vector_score.toFixed(3) : 'N/A'} hybrid:${hybridScore.toFixed(3)}`
      };
    });

    // Step 5: Apply re-ranking threshold and sort
    const rankedResults = hybridResults
      .filter(result => result.hybrid_score >= rerankThreshold || result.pinned)
      .sort((a, b) => {
        // Pinned memories always on top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Then by hybrid score
        if (b.hybrid_score !== a.hybrid_score) {
          return b.hybrid_score - a.hybrid_score;
        }

        // Tie-breaker: most recent
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(0, maxResults);

    console.log(`🎯 [HYBRID] Retrieved ${rankedResults.length} memories (threshold: ${rerankThreshold})`);

    if (rankedResults.length > 0) {
      console.log(`📊 [HYBRID] Score range: ${rankedResults[0].hybrid_score.toFixed(3)} to ${rankedResults[rankedResults.length-1].hybrid_score.toFixed(3)}`);

      // Update last_accessed_at for retrieved memories (async, don't wait)
      const memoryIds = rankedResults.map(r => r.id);
      pool.query(`
        UPDATE memories
        SET last_accessed_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [memoryIds]).catch(err => console.error('⚠️  Failed to update access time:', err.message));
    }

    return rankedResults;

  } catch (error) {
    console.error('❌ [HYBRID] Hybrid search failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector (can be stringified array from DB)
 * @returns {number} Cosine similarity (0-1)
 */
function calculateCosineSimilarity(vecA, vecB) {
  // Handle stringified arrays from database
  const a = Array.isArray(vecA) ? vecA : JSON.parse(vecA);
  const b = Array.isArray(vecB) ? vecB : JSON.parse(vecB);

  if (a.length !== b.length) {
    console.warn('⚠️  Vector dimension mismatch');
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Return similarity in 0-1 range (cosine distance converted to similarity)
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Fallback to pure BM25 search (when vector search unavailable)
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} BM25-ranked results
 */
async function bm25OnlySearch(pool, userId, query, options = {}) {
  const {
    maxResults = 15,
    includeTiers = ['core', 'active', 'working'],
    rerankThreshold = 0.3,
    clientProfileId = null
  } = options;

  console.log('🔍 [BM25] Using BM25-only search (vector search disabled)');

  try {
    const bm25Params = clientProfileId ? [userId, includeTiers, clientProfileId] : [userId, includeTiers];
    const candidatesResult = await pool.query(`
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
        AND ${clientProfileId ? 'client_profile_id = $3' : 'client_profile_id IS NULL'}
    `, bm25Params);

    const candidates = candidatesResult.rows;

    if (candidates.length === 0) {
      return [];
    }

    // Calculate BM25 scores
    const stats = calculateCollectionStats(candidates);
    const bm25Results = candidates.map(doc => ({
      ...doc,
      bm25_score: calculateBM25(query, doc.content, stats.avgDocLength, stats.totalDocs, stats.termDocFreq)
    }));

    // Normalize and filter
    const normalizedResults = normalizeScores(bm25Results, 'bm25_score');
    const rankedResults = normalizedResults
      .filter(result => result.bm25_score >= rerankThreshold || result.pinned)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.bm25_score - a.bm25_score;
      })
      .slice(0, maxResults);

    console.log(`✅ [BM25] Retrieved ${rankedResults.length} memories`);

    return rankedResults;

  } catch (error) {
    console.error('❌ [BM25] BM25 search failed:', error.message);
    throw error;
  }
}

module.exports = {
  hybridSearch,
  bm25OnlySearch,
  calculateBM25,
  calculateCosineSimilarity,
  tokenize
};
