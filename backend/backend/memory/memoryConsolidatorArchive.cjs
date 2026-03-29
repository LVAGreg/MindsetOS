#!/usr/bin/env node
/**
 * Memory Consolidator with Archive System
 * Archives instead of deletes - keeps complete history
 * Allows reactivation and importance boosting
 */

const db = require('../services/db.cjs');
const https = require('https');

const OPENROUTER_API_KEY = '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';

/**
 * Log memory action to history
 */
async function logHistory(memoryId, userId, action, oldContent, newContent, oldImportance, newImportance, reason) {
  try {
    await db.pool.query(
      `INSERT INTO memory_history (memory_id, user_id, action, old_content, new_content, old_importance, new_importance, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [memoryId, userId, action, oldContent, newContent, oldImportance, newImportance, reason]
    );
  } catch (error) {
    console.error('❌ [HISTORY] Failed to log:', error.message);
  }
}

/**
 * Find and merge duplicate/similar memories (ARCHIVE instead of DELETE)
 */
async function consolidateMemories(userId, projectId = null) {
  try {
    console.log(`🧹 [CONSOLIDATE] Starting memory consolidation for user ${userId.substring(0, 8)}...`);

    // Get all ACTIVE memories (exclude archived)
    let query = 'SELECT * FROM memories WHERE user_id = $1 AND status = $2';
    const params = [userId, 'active'];

    if (projectId) {
      query += ' AND project_id = $3';
      params.push(projectId);
    }

    query += ' ORDER BY memory_type, importance_score DESC';

    const result = await db.pool.query(query, params);
    const memories = result.rows;

    if (memories.length < 2) {
      console.log(`ℹ️  [CONSOLIDATE] Not enough memories to consolidate (${memories.length})`);
      return { merged: 0, archived: 0 };
    }

    // Group by category
    const grouped = {};
    for (const memory of memories) {
      if (!grouped[memory.memory_type]) {
        grouped[memory.memory_type] = [];
      }
      grouped[memory.memory_type].push(memory);
    }

    let totalMerged = 0;
    let totalArchived = 0;

    // Process each category
    for (const [category, categoryMemories] of Object.entries(grouped)) {
      if (categoryMemories.length < 2) continue;

      console.log(`🔍 [CONSOLIDATE] Checking ${categoryMemories.length} memories in category: ${category}`);

      const duplicateSets = await findDuplicates(categoryMemories);

      for (const duplicates of duplicateSets) {
        if (duplicates.length > 1) {
          const result = await mergeMemoriesWithArchive(duplicates, userId, projectId);
          if (result) {
            totalMerged++;
            totalArchived += duplicates.length - 1;
          }
        }
      }
    }

    console.log(`✅ [CONSOLIDATE] Complete: ${totalMerged} sets merged, ${totalArchived} memories archived`);

    return { merged: totalMerged, archived: totalArchived };

  } catch (error) {
    console.error('❌ [CONSOLIDATE] Failed:', error.message);
    return { merged: 0, archived: 0 };
  }
}

/**
 * Find duplicate memory sets using text similarity
 */
async function findDuplicates(memories) {
  if (memories.length < 2) return [];

  const duplicateSets = [];
  const checked = new Set();

  for (let i = 0; i < memories.length; i++) {
    if (checked.has(i)) continue;

    const duplicateSet = [memories[i]];
    checked.add(i);

    for (let j = i + 1; j < memories.length; j++) {
      if (checked.has(j)) continue;

      const similarity = calculateTextSimilarity(
        memories[i].content.toLowerCase(),
        memories[j].content.toLowerCase()
      );

      if (similarity > 0.7) {
        duplicateSet.push(memories[j]);
        checked.add(j);
      }
    }

    if (duplicateSet.length > 1) {
      duplicateSets.push(duplicateSet);
    }
  }

  return duplicateSets;
}

/**
 * Calculate text similarity using word overlap
 */
function calculateTextSimilarity(text1, text2) {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Merge duplicate memories and ARCHIVE (not delete) the duplicates
 */
async function mergeMemoriesWithArchive(duplicates, userId, projectId) {
  try {
    console.log(`🔄 [MERGE] Merging ${duplicates.length} duplicate memories...`);

    // Use AI to create merged version
    const mergedContent = await aiMerge(duplicates);

    if (!mergedContent) {
      console.log(`⚠️  [MERGE] AI merge failed, skipping`);
      return false;
    }

    // Calculate new importance (max of all duplicates + bonus)
    const maxImportance = Math.max(...duplicates.map(d => d.importance_score));
    const newImportance = Math.min(1.0, maxImportance + 0.05);

    // Update primary memory (highest importance)
    const primaryMemory = duplicates.sort((a, b) => b.importance_score - a.importance_score)[0];

    // Log history for primary memory
    await logHistory(
      primaryMemory.id,
      userId,
      'merged',
      primaryMemory.content,
      mergedContent,
      primaryMemory.importance_score,
      newImportance,
      `Merged ${duplicates.length} duplicate memories`
    );

    await db.pool.query(
      `UPDATE memories
       SET content = $1,
           importance_score = $2,
           updated_at = CURRENT_TIMESTAMP,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{consolidated}', 'true')
       WHERE id = $3`,
      [mergedContent, newImportance, primaryMemory.id]
    );

    // ARCHIVE (not delete) the other duplicates
    const toArchive = duplicates.filter(d => d.id !== primaryMemory.id);

    for (const dup of toArchive) {
      // Log archive action
      await logHistory(
        dup.id,
        userId,
        'archived',
        dup.content,
        null,
        dup.importance_score,
        null,
        `Duplicate - merged into ${primaryMemory.id.substring(0, 8)}`
      );
    }

    const duplicateIds = toArchive.map(d => d.id);

    if (duplicateIds.length > 0) {
      await db.pool.query(
        `UPDATE memories
         SET status = 'archived',
             archived_at = CURRENT_TIMESTAMP,
             archived_reason = 'duplicate'
         WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    console.log(`✅ [MERGE] Merged ${duplicates.length} memories (${duplicateIds.length} archived)`);
    return true;

  } catch (error) {
    console.error('❌ [MERGE] Failed:', error.message);
    return false;
  }
}

/**
 * Reactivate an archived memory (user request or importance boost)
 */
async function reactivateMemory(memoryId, userId, reason = 'user_request') {
  try {
    const result = await db.pool.query(
      `SELECT * FROM memories WHERE id = $1 AND user_id = $2 AND status = 'archived'`,
      [memoryId, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Memory not found or not archived' };
    }

    const memory = result.rows[0];

    // Log reactivation
    await logHistory(
      memoryId,
      userId,
      'reactivated',
      null,
      memory.content,
      memory.importance_score,
      memory.importance_score,
      reason
    );

    // Reactivate
    await db.pool.query(
      `UPDATE memories
       SET status = 'active',
           archived_at = NULL,
           archived_reason = NULL,
           last_accessed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [memoryId]
    );

    console.log(`♻️  [REACTIVATE] Restored memory: ${memory.content.substring(0, 50)}...`);

    return { success: true, memory: result.rows[0] };

  } catch (error) {
    console.error('❌ [REACTIVATE] Failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Boost importance of a memory
 */
async function boostImportance(memoryId, userId, boostAmount = 0.1) {
  try {
    const result = await db.pool.query(
      `SELECT * FROM memories WHERE id = $1 AND user_id = $2`,
      [memoryId, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Memory not found' };
    }

    const memory = result.rows[0];
    const newImportance = Math.min(1.0, memory.importance_score + boostAmount);

    // Log boost
    await logHistory(
      memoryId,
      userId,
      'boosted',
      memory.content,
      memory.content,
      memory.importance_score,
      newImportance,
      `Importance boosted by ${boostAmount}`
    );

    await db.pool.query(
      `UPDATE memories
       SET importance_score = $1,
           last_accessed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newImportance, memoryId]
    );

    console.log(`⬆️  [BOOST] Increased importance: ${memory.importance_score} → ${newImportance}`);

    return { success: true, oldScore: memory.importance_score, newScore: newImportance };

  } catch (error) {
    console.error('❌ [BOOST] Failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Archive low-importance stale memories (NOT delete)
 */
async function archiveStaleMemories(userId, projectId = null, daysInactive = 90) {
  try {
    let query = `
      UPDATE memories
      SET status = 'archived',
          archived_at = CURRENT_TIMESTAMP,
          archived_reason = 'stale'
      WHERE user_id = $1
      AND status = 'active'
      AND importance_score < 0.4
      AND last_accessed_at < NOW() - INTERVAL '${daysInactive} days'
      AND pinned IS NOT TRUE
    `;
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' RETURNING id, content, importance_score';

    const result = await db.pool.query(query, params);

    // Log each archived memory
    for (const mem of result.rows) {
      await logHistory(
        mem.id,
        userId,
        'archived',
        mem.content,
        null,
        mem.importance_score,
        null,
        `Stale - inactive for ${daysInactive}+ days`
      );
    }

    console.log(`📦 [ARCHIVE] Archived ${result.rows.length} stale memories`);
    return result.rows.length;

  } catch (error) {
    console.error('❌ [ARCHIVE] Failed:', error.message);
    return 0;
  }
}

/**
 * Decay importance of old memories over time
 */
async function decayMemoryImportance(userId, projectId = null) {
  try {
    let query = `
      UPDATE memories
      SET importance_score = GREATEST(0.3, importance_score - 0.05),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      AND status = 'active'
      AND pinned IS NOT TRUE
      AND last_accessed_at < NOW() - INTERVAL '30 days'
      AND importance_score > 0.3
    `;
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' RETURNING id, content, importance_score';

    const result = await db.pool.query(query, params);

    // Log decay actions
    for (const mem of result.rows) {
      await logHistory(
        mem.id,
        userId,
        'decayed',
        mem.content,
        mem.content,
        mem.importance_score + 0.05,
        mem.importance_score,
        'Automatic decay - 30+ days inactive'
      );
    }

    if (result.rows.length > 0) {
      console.log(`⏳ [DECAY] Reduced importance for ${result.rows.length} old memories`);
    }

    return result.rows.length;

  } catch (error) {
    console.error('❌ [DECAY] Failed:', error.message);
    return 0;
  }
}

/**
 * Get memory history for a user or specific memory
 */
async function getHistory(userId, memoryId = null, limit = 50) {
  try {
    let query = `
      SELECT mh.*, m.content as current_content, m.status
      FROM memory_history mh
      LEFT JOIN memories m ON mh.memory_id = m.id
      WHERE mh.user_id = $1
    `;
    const params = [userId];

    if (memoryId) {
      query += ' AND mh.memory_id = $2';
      params.push(memoryId);
    }

    query += ` ORDER BY mh.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.pool.query(query, params);
    return result.rows;

  } catch (error) {
    console.error('❌ [HISTORY] Failed:', error.message);
    return [];
  }
}

/**
 * Run full memory maintenance with archiving
 */
async function runMaintenance(userId, projectId = null) {
  console.log(`🛠️  [MAINTENANCE] Starting memory maintenance with archiving...`);

  const results = {
    consolidated: await consolidateMemories(userId, projectId),
    decayed: await decayMemoryImportance(userId, projectId),
    archived: await archiveStaleMemories(userId, projectId, 90)
  };

  console.log(`✅ [MAINTENANCE] Complete:`, results);
  return results;
}

/**
 * Use AI to intelligently merge duplicate memories
 */
async function aiMerge(duplicates) {
  const memoryTexts = duplicates.map((d, i) => `${i + 1}. ${d.content}`).join('\n');

  const mergePrompt = `Merge these duplicate memories into ONE concise, comprehensive statement.

DUPLICATE MEMORIES:
${memoryTexts}

RULES:
1. Combine all unique information
2. Remove redundancy
3. Keep most specific details
4. Use clear, standalone language (no pronouns)
5. Return ONLY merged text (no formatting, no preamble)

Your merged memory:`;

  try {
    const merged = await callOpenRouter(mergePrompt);
    return merged.trim();
  } catch (error) {
    console.error('❌ AI merge failed:', error.message);
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
      'X-Title': 'ECOS Memory Consolidator',
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
  consolidateMemories,
  archiveStaleMemories,
  decayMemoryImportance,
  reactivateMemory,
  boostImportance,
  getHistory,
  runMaintenance
};
