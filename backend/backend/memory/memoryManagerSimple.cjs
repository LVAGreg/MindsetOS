#!/usr/bin/env node
/**
 * Simple Memory Manager - NO EMBEDDINGS REQUIRED
 * Uses PostgreSQL full-text search and category matching instead of vectors
 */

const db = require('../services/db.cjs');
const { extractMemories, scoreImportance } = require('./memoryExtractor.cjs');
const memoryLogger = require('./memoryLogger.cjs');
const https = require('https');

const OPENROUTER_API_KEY = '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';

/**
 * Process conversation and extract/store memories (NO EMBEDDINGS)
 */
async function processConversation(userId, conversationId, agentId) {
  try {
    console.log(`🧠 [MEMORY] Processing conversation ${conversationId.substring(0, 8)}...`);

    // 1. Get recent messages
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

    // 4. Store each memory (NO CONSOLIDATION - simpler approach)
    for (const memory of scored) {
      await storeMemorySimple(userId, agentId, memory, conversationId);
    }

    console.log(`✅ [MEMORY] Processed ${scored.length} memories`);

  } catch (error) {
    console.error(`❌ [MEMORY] Processing failed:`, error.message);
  }
}

/**
 * Store memory without embeddings - uses PostgreSQL text search
 */
async function storeMemorySimple(userId, agentId, memory, sourceConversationId) {
  try {
    // Check if similar memory exists using text similarity
    const existing = await db.pool.query(
      `SELECT id, content, importance_score
       FROM memories
       WHERE user_id = $1
       AND memory_type = $2
       AND content ILIKE $3
       LIMIT 1`,
      [userId, memory.category, `%${memory.text.substring(0, 50)}%`]
    );

    if (existing.rows.length > 0) {
      // Update existing memory
      const existingMemory = existing.rows[0];
      const newImportance = Math.min(1.0, existingMemory.importance_score + 0.1);

      await db.pool.query(
        `UPDATE memories
         SET content = $1, importance_score = $2, last_accessed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [memory.text, newImportance, existingMemory.id]
      );

      // Log to history
      await db.pool.query(
        `INSERT INTO memory_history (memory_id, user_id, action, old_content, new_content, old_importance, new_importance, reason)
         VALUES ($1, $2, 'updated', $3, $4, $5, $6, 'reinforced_from_conversation')`,
        [existingMemory.id, userId, existingMemory.content, memory.text, existingMemory.importance_score, newImportance]
      );

      console.log(`✅ [MEMORY] Updated existing memory`);
    } else {
      // Insert new memory (WITHOUT embedding - set to NULL)
      const insertResult = await db.pool.query(
        `INSERT INTO memories (user_id, agent_id, memory_type, content, importance_score, metadata, source_conversation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          userId,
          agentId,
          memory.category,
          memory.text,
          memory.importance_score,
          JSON.stringify({ confidence: memory.confidence, reasoning: memory.reasoning }),
          sourceConversationId
        ]
      );

      const newMemoryId = insertResult.rows[0].id;

      // Log to history
      await db.pool.query(
        `INSERT INTO memory_history (memory_id, user_id, action, new_content, new_importance, reason)
         VALUES ($1, $2, 'created', $3, $4, 'extracted_from_conversation')`,
        [newMemoryId, userId, memory.text, memory.importance_score]
      );

      console.log(`✅ [MEMORY] Saved new memory (${memory.category}, score: ${memory.importance_score.toFixed(2)})`);
    }

  } catch (error) {
    console.error(`❌ [MEMORY] Store failed:`, error.message);
  }
}

/**
 * Build context by retrieving relevant memories (NO EMBEDDINGS)
 * Uses category matching + importance scoring + keywords
 */
async function buildContext(userId, currentMessage, agentId) {
  try {
    // Get all memories for user, ordered by importance
    const result = await db.pool.query(
      `SELECT id, content, memory_type, importance_score, created_at
       FROM memories
       WHERE user_id = $1
       ORDER BY importance_score DESC, last_accessed_at DESC
       LIMIT 10`,
      [userId]
    );

    const memories = result.rows;

    if (memories.length === 0) {
      return { memories: [], summary: null };
    }

    // Simple keyword matching for relevance
    const keywords = currentMessage.toLowerCase().split(' ').filter(w => w.length > 3);
    const scoredMemories = memories.map(m => {
      let relevanceScore = m.importance_score;

      // Boost score if keywords match
      for (const keyword of keywords) {
        if (m.content.toLowerCase().includes(keyword)) {
          relevanceScore += 0.2;
        }
      }

      return { ...m, relevance_score: Math.min(1.0, relevanceScore) };
    });

    // Sort by relevance and take top 5
    const relevant = scoredMemories
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    // Update last_accessed_at
    for (const memory of relevant) {
      await db.pool.query(
        'UPDATE memories SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [memory.id]
      );
    }

    // Generate summary
    const summary = await summarizeContext(relevant);

    console.log(`🎯 [MEMORY] Retrieved ${relevant.length} relevant memories (keyword matching)`);

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
 * Generate summary of memories
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
