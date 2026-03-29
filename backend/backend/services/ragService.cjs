/**
 * RAG Service - Updated to search document_chunks table
 * Works with document_chunks table with embeddings from uploaded PDFs
 */

const { generateEmbedding } = require('./embeddingService.cjs');

/**
 * Search for relevant knowledge base entries using vector similarity
 * @param {string} query - User's question/message
 * @param {string} agentId - Agent ID to filter documents
 * @param {object} options - Search configuration
 * @param {object} pool - PostgreSQL connection pool
 */
async function searchRelevantChunks(query, agentId, options = {}, pool) {
  const {
    maxChunks = 3,
    similarityThreshold = 0.7,
    includeMetadata = true,
    debugMode = false,
    precomputedEmbedding = null, // Pass precomputed embedding to avoid redundant API calls
  } = options;

  // Import debug function from main backend
  const debugLog = (category, message, data) => {
    if (!debugMode) return;
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [DEBUG ${timestamp}] [${category}]`);
    console.log(`   ${message}`);
    if (data) {
      console.log('   DATA:', JSON.stringify(data, null, 2));
    }
  };

  try {
    debugLog('RAG_SEARCH', 'Starting vector search', {
      query: query.substring(0, 100) + '...',
      agentId,
      options
    });

    // Check if RAG is enabled for this agent
    const settingsResult = await pool.query(
      'SELECT enabled, top_k, min_similarity FROM agent_rag_settings WHERE agent_id = $1',
      [agentId]
    );

    const settings = settingsResult.rows[0];
    if (!settings || !settings.enabled) {
      console.log(`ℹ️ [RAG] RAG is disabled for agent ${agentId}`);
      debugLog('RAG_SEARCH', 'RAG disabled for agent', { agentId, settings });
      return [];
    }

    const effectiveMaxChunks = settings.top_k || maxChunks;
    const effectiveThreshold = settings.min_similarity || similarityThreshold;

    // Quick check: skip embedding generation if agent has no KB entries
    const isSuperAgent = agentId === 'ecos-super-agent';
    const kbCountQuery = isSuperAgent
      ? 'SELECT COUNT(*) as count FROM knowledge_base WHERE embedding IS NOT NULL'
      : 'SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id = $1 AND embedding IS NOT NULL';
    const kbCountResult = isSuperAgent
      ? await pool.query(kbCountQuery)
      : await pool.query(kbCountQuery, [agentId]);
    const kbCount = parseInt(kbCountResult.rows[0]?.count || 0);
    if (kbCount === 0) {
      console.log(`⚡ [RAG] Skipping search — agent ${agentId} has 0 KB entries (saved embedding call)`);
      return [];
    }

    console.log(`🔍 [RAG] Searching for agent ${agentId} with top_k=${effectiveMaxChunks}, threshold=${effectiveThreshold}, kb_entries=${kbCount}`);

    // Use precomputed embedding if provided, otherwise generate
    let queryEmbedding = precomputedEmbedding;
    if (!queryEmbedding) {
      debugLog('RAG_SEARCH', 'Generating query embedding', { queryLength: query.length });
      queryEmbedding = await generateEmbedding(query);
    } else {
      console.log('⚡ [RAG] Using precomputed embedding (saved ~1-2s)');
    }
    if (!queryEmbedding) {
      console.warn('⚠️  No embedding generated - RAG disabled');
      debugLog('RAG_SEARCH', 'Failed to generate embedding');
      return [];
    }
    debugLog('RAG_SEARCH', 'Query embedding available', {
      dimensions: queryEmbedding.length,
      sample: queryEmbedding.slice(0, 5)
    });

    // Vector similarity search using pgvector
    const vectorString = '[' + queryEmbedding.join(',') + ']';

    // Search knowledge_base table
    // For Super Agent, search across ALL agent knowledge bases (isSuperAgent declared above)

    const searchQuery = isSuperAgent
      ? `
        SELECT
          kb.id,
          kb.title,
          kb.content,
          kb.category,
          kb.tags,
          kb.agent_id as source_agent,
          0 as chunk_index,
          1 - (kb.embedding <=> $1::vector) as similarity
        FROM knowledge_base kb
        WHERE kb.embedding IS NOT NULL
          AND 1 - (kb.embedding <=> $1::vector) >= $2
        ORDER BY similarity DESC
        LIMIT $3
      `
      : `
        SELECT
          kb.id,
          kb.title,
          kb.content,
          kb.category,
          kb.tags,
          kb.agent_id as source_agent,
          0 as chunk_index,
          1 - (kb.embedding <=> $1::vector) as similarity
        FROM knowledge_base kb
        WHERE kb.embedding IS NOT NULL
          AND kb.agent_id = $2
          AND 1 - (kb.embedding <=> $1::vector) >= $3
        ORDER BY similarity DESC
        LIMIT $4
      `;

    debugLog('RAG_SEARCH', 'Executing vector search query', {
      agentId,
      isSuperAgent,
      threshold: effectiveThreshold,
      limit: effectiveMaxChunks,
      vectorStringLength: vectorString.length
    });

    const result = isSuperAgent
      ? await pool.query(searchQuery, [
          vectorString,
          effectiveThreshold,
          effectiveMaxChunks
        ])
      : await pool.query(searchQuery, [
          vectorString,
          agentId,
          effectiveThreshold,
          effectiveMaxChunks
        ]);

    console.log(`✅ [RAG] Found ${result.rows.length} relevant items from knowledge_base for agent ${agentId}`);

    // DEBUG: If no results, show what the top candidates would have been (for threshold tuning)
    if (result.rows.length === 0 && debugMode) {
      const debugQuery = isSuperAgent
        ? `
          SELECT
            kb.title,
            kb.category,
            1 - (kb.embedding <=> $1::vector) as similarity
          FROM knowledge_base kb
          WHERE kb.embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT 5
        `
        : `
          SELECT
            kb.title,
            kb.category,
            1 - (kb.embedding <=> $1::vector) as similarity
          FROM knowledge_base kb
          WHERE kb.embedding IS NOT NULL AND kb.agent_id = $2
          ORDER BY similarity DESC
          LIMIT 5
        `;

      const debugParams = isSuperAgent ? [vectorString] : [vectorString, agentId];
      const debugResult = await pool.query(debugQuery, debugParams);

      if (debugResult.rows.length > 0) {
        console.log(`🔍 [RAG DEBUG] Top 5 candidates that were BELOW threshold (${effectiveThreshold}):`);
        debugResult.rows.forEach((row, i) => {
          const sim = parseFloat(row.similarity).toFixed(4);
          const status = row.similarity >= effectiveThreshold ? '✅' : '❌';
          console.log(`   ${i + 1}. ${status} "${row.title}" [${row.category}] - similarity: ${sim}`);
        });
        console.log(`   💡 Consider lowering threshold from ${effectiveThreshold} to ${Math.max(0.3, parseFloat(debugResult.rows[0].similarity) - 0.05).toFixed(2)} to retrieve these`);
      }
    }

    // If no results from agent-specific knowledge, try user-wide knowledge as fallback
    if (result.rows.length === 0) {
      debugLog('RAG_SEARCH', 'No agent-specific knowledge found, checking user-wide knowledge');

      const userQuery = `
        SELECT
          kb.id,
          kb.title,
          kb.content,
          kb.category,
          kb.tags,
          0 as chunk_index,
          1 - (kb.embedding <=> $1::vector) as similarity
        FROM knowledge_base kb
        WHERE kb.embedding IS NOT NULL
          AND kb.agent_id IS NULL
          AND kb.user_id = (SELECT user_id FROM agents WHERE id = $2 LIMIT 1)
          AND 1 - (kb.embedding <=> $1::vector) >= $3
        ORDER BY similarity DESC
        LIMIT $4
      `;

      const userResult = await pool.query(userQuery, [
        vectorString,
        agentId,
        effectiveThreshold,
        effectiveMaxChunks
      ]);

      if (userResult.rows.length > 0) {
        console.log(`✅ [RAG] Found ${userResult.rows.length} relevant items from user-wide knowledge_base`);
        result.rows = userResult.rows;
      }
    }

    if (result.rows.length > 0) {
      console.log(`📄 [RAG] Top result: "${result.rows[0].title}" (chunk ${result.rows[0].chunk_index}) - similarity: ${result.rows[0].similarity}`);

      debugLog('RAG_SEARCH', 'Vector search results', {
        source: 'knowledge_base',
        totalResults: result.rows.length,
        results: result.rows.map(r => ({
          title: r.title,
          chunkIndex: r.chunk_index,
          similarity: parseFloat(r.similarity).toFixed(4),
          contentPreview: r.content.substring(0, 200) + '...',
          category: r.category,
          tags: r.tags
        }))
      });
    } else {
      debugLog('RAG_SEARCH', 'No results found matching criteria', {
        agentId,
        threshold: effectiveThreshold,
        searchedTables: ['knowledge_base']
      });
    }

    const formattedResults = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content.substring(0, 1000), // Limit content length
      category: row.category,
      chunkIndex: row.chunk_index,
      similarity: parseFloat(row.similarity).toFixed(4),
      ...(includeMetadata && { tags: row.tags })
    }));

    debugLog('RAG_SEARCH', 'Returning formatted results', {
      count: formattedResults.length
    });

    return formattedResults;

  } catch (error) {
    console.error('❌ [RAG] Search failed:', error);
    return [];
  }
}

/**
 * Format retrieved knowledge for LLM context injection
 */
function formatContextForLLM(chunks) {
  if (!chunks || chunks.length === 0) {
    return '';
  }

  const contextParts = chunks.map((chunk, index) => {
    // Clean up the title for better readability
    const cleanTitle = chunk.title
      .replace(/\.pdf$/, '')
      .replace(/\.md$/, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');

    return `📖 **[${cleanTitle}]** (Relevance: ${(chunk.similarity * 100).toFixed(1)}%)
${chunk.content}
`;
  });

  return `
## 📚 IMPORTANT: Retrieved Knowledge Base Context

**YOU HAVE ACCESS TO THE FOLLOWING KNOWLEDGE FROM YOUR TRAINING MATERIALS:**

${contextParts.join('\n---\n\n')}

---

**INSTRUCTIONS FOR USING THIS KNOWLEDGE:**
1. ✅ PRIORITIZE this retrieved content when answering questions about offers, money models, frameworks, or strategies
2. ✅ REFERENCE specific principles, examples, or frameworks from the above knowledge when applicable
3. ✅ USE the terminology and concepts from these materials to maintain consistency
4. ✅ DRAW FROM the examples and case studies provided in your knowledge base
5. ⚠️ If the user's question directly relates to topics in the retrieved knowledge, USE IT as your primary source

This knowledge represents your core training and expertise - rely on it confidently.
`;
}

/**
 * Get agent RAG configuration
 */
async function getAgentRagSettings(agentId, pool) {
  const result = await pool.query(
    'SELECT * FROM agent_rag_settings WHERE agent_id = $1',
    [agentId]
  );
  return result.rows[0] || null;
}

/**
 * Update agent RAG configuration
 */
async function updateAgentRagSettings(agentId, settings, userId, pool) {
  const {
    enabled,
    maxChunks,
    similarityThreshold,
    chunkSize,
    chunkOverlap,
  } = settings;

  await pool.query(
    `INSERT INTO agent_rag_settings
     (agent_id, enabled, top_k, min_similarity, chunk_size, chunk_overlap, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (agent_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       top_k = EXCLUDED.top_k,
       min_similarity = EXCLUDED.min_similarity,
       chunk_size = EXCLUDED.chunk_size,
       chunk_overlap = EXCLUDED.chunk_overlap,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [agentId, enabled, maxChunks, similarityThreshold, chunkSize, chunkOverlap, userId]
  );
}

module.exports = {
  searchRelevantChunks,
  formatContextForLLM,
  getAgentRagSettings,
  updateAgentRagSettings,
};
