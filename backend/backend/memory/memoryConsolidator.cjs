#!/usr/bin/env node
/**
 * Memory Consolidator - Deduplicates and organizes memories
 * Runs periodically to merge similar memories and clean up redundancy
 */

const db = require('../services/db.cjs');
const https = require('https');

const OPENROUTER_API_KEY = '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';

/**
 * Find and merge duplicate/similar memories for a user
 */
async function consolidateMemories(userId, projectId = null) {
  try {
    console.log(`🧹 [CONSOLIDATE] Starting memory consolidation for user ${userId.substring(0, 8)}...`);

    // Get all memories grouped by category
    let query = 'SELECT * FROM memories WHERE user_id = $1';
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' ORDER BY memory_type, importance_score DESC';

    const result = await db.pool.query(query, params);
    const memories = result.rows;

    if (memories.length < 2) {
      console.log(`ℹ️  [CONSOLIDATE] Not enough memories to consolidate (${memories.length})`);
      return { merged: 0, deleted: 0 };
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
    let totalDeleted = 0;

    // Process each category
    for (const [category, categoryMemories] of Object.entries(grouped)) {
      if (categoryMemories.length < 2) continue;

      console.log(`🔍 [CONSOLIDATE] Checking ${categoryMemories.length} memories in category: ${category}`);

      const duplicateSets = await findDuplicates(categoryMemories);

      for (const duplicates of duplicateSets) {
        if (duplicates.length > 1) {
          const merged = await mergeMemories(duplicates, userId, projectId);
          if (merged) {
            totalMerged++;
            totalDeleted += duplicates.length - 1;
          }
        }
      }
    }

    console.log(`✅ [CONSOLIDATE] Complete: ${totalMerged} sets merged, ${totalDeleted} duplicates removed`);

    return { merged: totalMerged, deleted: totalDeleted };

  } catch (error) {
    console.error('❌ [CONSOLIDATE] Failed:', error.message);
    return { merged: 0, deleted: 0 };
  }
}

/**
 * Find duplicate memory sets using AI similarity detection
 */
async function findDuplicates(memories) {
  if (memories.length < 2) return [];

  const duplicateSets = [];

  // Simple text similarity first (fast)
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

      // If >70% similar, consider as duplicate
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
 * Merge duplicate memories into one consolidated memory
 */
async function mergeMemories(duplicates, userId, projectId) {
  try {
    console.log(`🔄 [MERGE] Merging ${duplicates.length} duplicate memories...`);

    // Use AI to create merged version
    const mergedContent = await aiMerge(duplicates);

    if (!mergedContent) {
      console.log(`⚠️  [MERGE] AI merge failed, skipping`);
      return false;
    }

    // Calculate new importance (max of all duplicates + bonus for consolidation)
    const maxImportance = Math.max(...duplicates.map(d => d.importance_score));
    const newImportance = Math.min(1.0, maxImportance + 0.05);

    // Keep the oldest created_at date
    const oldestDate = duplicates.reduce((oldest, d) =>
      new Date(d.created_at) < new Date(oldest.created_at) ? d : oldest
    ).created_at;

    // Update the first memory (highest importance)
    const primaryMemory = duplicates.sort((a, b) => b.importance_score - a.importance_score)[0];

    await db.pool.query(
      `UPDATE memories
       SET content = $1,
           importance_score = $2,
           updated_at = CURRENT_TIMESTAMP,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{consolidated}', 'true')
       WHERE id = $3`,
      [mergedContent, newImportance, primaryMemory.id]
    );

    // Delete the other duplicates
    const duplicateIds = duplicates.filter(d => d.id !== primaryMemory.id).map(d => d.id);

    if (duplicateIds.length > 0) {
      await db.pool.query(
        `DELETE FROM memories WHERE id = ANY($1)`,
        [duplicateIds]
      );
    }

    console.log(`✅ [MERGE] Merged ${duplicates.length} memories into one`);
    return true;

  } catch (error) {
    console.error('❌ [MERGE] Failed:', error.message);
    return false;
  }
}

/**
 * Use AI to intelligently merge duplicate memories
 */
async function aiMerge(duplicates) {
  const memoryTexts = duplicates.map((d, i) => `${i + 1}. ${d.content}`).join('\n');

  const mergePrompt = `You are a memory consolidation agent. Merge these duplicate memories into ONE concise, comprehensive statement.

DUPLICATE MEMORIES:
${memoryTexts}

RULES:
1. Combine all unique information from duplicates
2. Remove redundancy and repetition
3. Keep the most specific details
4. Use clear, standalone language (no pronouns)
5. Return ONLY the merged memory text (no formatting, no preamble)

Example:
Input:
1. User helps A/E/C firms with 10-30 employees
2. User targets Architecture, Engineering & Construction firms in Australia
3. User works with firm owners/principals at A/E/C companies

Output:
User helps firm owners/principals at Architecture, Engineering & Construction (A/E/C) firms in Australia with 10-30 employees

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
 * Clean up low-importance memories that haven't been accessed recently
 */
async function cleanupStaleMemories(userId, projectId = null, daysInactive = 90) {
  try {
    let query = `
      DELETE FROM memories
      WHERE user_id = $1
      AND importance_score < 0.4
      AND last_accessed_at < NOW() - INTERVAL '${daysInactive} days'
      AND pinned IS NOT TRUE
    `;
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' RETURNING id';

    const result = await db.pool.query(query, params);

    console.log(`🗑️  [CLEANUP] Removed ${result.rows.length} stale memories`);
    return result.rows.length;

  } catch (error) {
    console.error('❌ [CLEANUP] Failed:', error.message);
    return 0;
  }
}

/**
 * Decay importance of old memories over time (except pinned)
 */
async function decayMemoryImportance(userId, projectId = null) {
  try {
    // Decay by 0.05 for memories older than 30 days
    let query = `
      UPDATE memories
      SET importance_score = GREATEST(0.3, importance_score - 0.05),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      AND pinned IS NOT TRUE
      AND last_accessed_at < NOW() - INTERVAL '30 days'
      AND importance_score > 0.3
    `;
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' RETURNING id';

    const result = await db.pool.query(query, params);

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
 * Run full memory maintenance
 */
async function runMaintenance(userId, projectId = null) {
  console.log(`🛠️  [MAINTENANCE] Starting memory maintenance...`);

  const results = {
    consolidated: await consolidateMemories(userId, projectId),
    decayed: await decayMemoryImportance(userId, projectId),
    cleaned: await cleanupStaleMemories(userId, projectId, 90)
  };

  console.log(`✅ [MAINTENANCE] Complete:`, results);
  return results;
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
  cleanupStaleMemories,
  decayMemoryImportance,
  runMaintenance
};
