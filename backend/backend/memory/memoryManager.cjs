#!/usr/bin/env node
/**
 * Memory Manager - Orchestrates memory storage, consolidation, and retrieval
 * Prevents duplicate memories and builds context for agents
 */

const db = require('../services/db.cjs');
const { generateEmbedding, cosineSimilarity } = require('./embeddingService.cjs');
const { extractMemories, scoreImportance } = require('./memoryExtractor.cjs');
const https = require('https');

const OPENROUTER_API_KEY = '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';
const SIMILARITY_THRESHOLD = 0.92; // Consider memories similar above this threshold

/**
 * Process conversation and extract/store memories
 * This runs async after each conversation (fire and forget)
 * @param {string} userId - Database user ID (UUID)
 * @param {string} conversationId - Database conversation ID (UUID)
 * @param {string} agentId - Agent ID
 */
async function processConversation(userId, conversationId, agentId) {
  try {
    console.log(`🧠 [MEMORY] Processing conversation ${conversationId.substring(0, 8)}...`);

    // 1. Get recent messages from this conversation
    const messages = await db.getConversationMessages(conversationId, 10);

    if (messages.length < 2) {
      console.log(`⚠️  [MEMORY] Skipping - too few messages (${messages.length})`);
      return;
    }

    // 2. Extract memories using AI
    const extracted = await extractMemories(messages, userId, agentId);

    if (extracted.length === 0) {
      console.log(`ℹ️  [MEMORY] No memories extracted`);
      return;
    }

    // 3. Score importance
    const scored = await scoreImportance(extracted);

    // 4. Consolidate and store each memory
    for (const memory of scored) {
      await consolidateAndStore(userId, agentId, memory, conversationId);
    }

    console.log(`✅ [MEMORY] Processed ${scored.length} memories`);

  } catch (error) {
    console.error(`❌ [MEMORY] Processing failed:`, error.message);
    // Don't throw - this runs async, errors shouldn't break chat
  }
}

/**
 * Consolidate memory with existing similar memories, then store
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {object} memory - Memory object {text, category, confidence, importance_score}
 * @param {string} sourceConversationId - Source conversation ID
 */
async function consolidateAndStore(userId, agentId, memory, sourceConversationId) {
  try {
    // Generate embedding for new memory
    const embedding = await generateEmbedding(memory.text);

    // Search for similar existing memories
    const similarMemories = await db.searchMemories(userId, embedding, 5);

    // Filter by high similarity threshold
    const duplicates = similarMemories.filter(m => m.similarity >= SIMILARITY_THRESHOLD);

    if (duplicates.length > 0) {
      console.log(`🔄 [MEMORY] Found ${duplicates.length} similar memories - consolidating...`);

      // Merge with most similar memory
      const mostSimilar = duplicates[0];
      const merged = await mergeMemories(mostSimilar.content, memory.text);

      // Update existing memory
      const newImportance = Math.min(1.0, mostSimilar.importance_score + 0.1); // Bump importance
      await db.pool.query(
        `UPDATE memories
         SET content = $1, importance_score = $2, last_accessed_at = CURRENT_TIMESTAMP, embedding = $3
         WHERE id = $4`,
        [merged, newImportance, `[${embedding.join(',')}]`, mostSimilar.id]
      );

      console.log(`✅ [MEMORY] Updated existing memory (similarity: ${mostSimilar.similarity.toFixed(2)})`);

    } else {
      // No duplicates - insert new memory
      await db.saveMemory(
        userId,
        agentId,
        memory.category,
        memory.text,
        memory.importance_score,
        embedding,
        { confidence: memory.confidence, reasoning: memory.reasoning },
        sourceConversationId
      );

      console.log(`✅ [MEMORY] Saved new memory (${memory.category}, score: ${memory.importance_score.toFixed(2)})`);
    }

  } catch (error) {
    console.error(`❌ [MEMORY] Consolidate/store failed:`, error.message);
  }
}

/**
 * Merge two similar memories using AI
 * @param {string} existing - Existing memory text
 * @param {string} newMemory - New memory text
 * @returns {Promise<string>} - Merged memory text
 */
async function mergeMemories(existing, newMemory) {
  const mergePrompt = `Merge these two similar memories into one comprehensive memory. Keep it concise and factual.

EXISTING MEMORY: "${existing}"
NEW MEMORY: "${newMemory}"

Return ONLY the merged memory text (no explanation, no markdown):`;

  try {
    const merged = await callOpenRouter(mergePrompt);
    return merged.trim();
  } catch (error) {
    console.error('❌ Memory merge failed, keeping new:', error.message);
    return newMemory; // Fallback to new memory
  }
}

/**
 * Build context for agent by retrieving relevant memories
 * @param {string} userId - User ID
 * @param {string} currentMessage - User's current message
 * @param {string} agentId - Current agent ID
 * @returns {Promise<object>} - {memories, summary}
 */
async function buildContext(userId, currentMessage, agentId) {
  try {
    // Generate embedding for current message
    const queryEmbedding = await generateEmbedding(currentMessage);

    // Vector search for relevant memories
    const memories = await db.searchMemories(userId, queryEmbedding, 8);

    // Filter by minimum similarity threshold
    const relevant = memories.filter(m => m.similarity >= 0.7);

    if (relevant.length === 0) {
      return { memories: [], summary: null };
    }

    // Update last_accessed_at for retrieved memories
    for (const memory of relevant) {
      await db.pool.query(
        'UPDATE memories SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [memory.id]
      );
    }

    // Generate summary of context
    const summary = await summarizeContext(relevant);

    console.log(`🎯 [MEMORY] Retrieved ${relevant.length} relevant memories`);

    return {
      memories: relevant,
      summary
    };

  } catch (error) {
    console.error(`❌ [MEMORY] Context building failed:`, error.message);
    return { memories: [], summary: null };
  }
}

/**
 * Generate 2-3 sentence summary of memories for context
 */
async function summarizeContext(memories) {
  if (memories.length === 0) return null;

  const memoryTexts = memories.map(m => m.content).join('\n');

  const summaryPrompt = `Summarize these key facts about the user in 2-3 sentences:

${memoryTexts}

Return ONLY the summary (no preamble):`;

  try {
    const summary = await callOpenRouter(summaryPrompt);
    return summary.trim();
  } catch (error) {
    console.error('❌ Summary generation failed:', error.message);
    return null;
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(prompt) {
  const requestBody = JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.3
  });

  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ecos.local',
      'X-Title': 'ECOS Memory System',
      'Content-Length': Buffer.byteLength(requestBody)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode !== 200) {
            reject(new Error(`OpenRouter error: ${response.error?.message || data}`));
            return;
          }

          resolve(response.choices[0].message.content);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

module.exports = {
  processConversation,
  buildContext
};
