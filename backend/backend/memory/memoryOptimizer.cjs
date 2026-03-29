#!/usr/bin/env node
/**
 * AI-Powered Memory Optimizer
 * Uses Claude Sonnet 4.5 to intelligently merge, consolidate, and enhance memories
 */

const db = require('../services/db.cjs');
const https = require('https');

const OPENROUTER_API_KEY = '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';

/**
 * AI-powered memory optimization
 * Finds similar memories and uses Claude to intelligently merge them
 */
async function optimizeMemoriesWithAI(userId) {
  console.log(`🧠 [OPTIMIZER] Starting AI-powered memory optimization for user ${userId.substring(0, 8)}...`);

  try {
    // 1. Find all memories grouped by category
    const memories = await db.pool.query(
      `SELECT id, content, memory_type, importance_score, metadata, created_at
       FROM memories
       WHERE user_id = $1 AND status = 'active'
       ORDER BY memory_type, importance_score DESC`,
      [userId]
    );

    if (memories.rows.length === 0) {
      console.log(`⚠️  [OPTIMIZER] No memories to optimize`);
      return { merged: 0, enhanced: 0, archived: 0 };
    }

    console.log(`📊 [OPTIMIZER] Found ${memories.rows.length} memories to analyze`);

    // 2. Group memories by category
    const groups = {};
    memories.rows.forEach(mem => {
      if (!groups[mem.memory_type]) {
        groups[mem.memory_type] = [];
      }
      groups[mem.memory_type].push(mem);
    });

    let totalMerged = 0;
    let totalEnhanced = 0;
    let totalArchived = 0;

    // 3. Process each category
    for (const [category, categoryMemories] of Object.entries(groups)) {
      console.log(`🔍 [OPTIMIZER] Processing ${category}: ${categoryMemories.length} memories`);

      if (categoryMemories.length < 2) {
        console.log(`⏭️  [OPTIMIZER] Skipping ${category} - only 1 memory`);
        continue;
      }

      // 4. Use AI to analyze and consolidate memories in this category
      const result = await consolidateCategoryMemories(userId, category, categoryMemories);

      totalMerged += result.merged;
      totalEnhanced += result.enhanced;
      totalArchived += result.archived;
    }

    // 5. Archive very low importance memories (< 0.2)
    const veryLowImportance = await db.pool.query(
      `SELECT id, content, importance_score FROM memories
       WHERE user_id = $1 AND importance_score < 0.2 AND status = 'active'`,
      [userId]
    );

    for (const mem of veryLowImportance.rows) {
      await db.pool.query(
        `INSERT INTO memory_history (memory_id, user_id, action, old_content, old_importance, reason)
         VALUES ($1, $2, 'archived', $3, $4, 'very_low_importance')`,
        [mem.id, userId, mem.content, mem.importance_score]
      );

      await db.pool.query(
        `UPDATE memories SET status = 'archived', archived_at = NOW(), archived_reason = 'very_low_importance'
         WHERE id = $1`,
        [mem.id]
      );
      totalArchived++;
    }

    console.log(`✅ [OPTIMIZER] Complete: ${totalMerged} merged, ${totalEnhanced} enhanced, ${totalArchived} archived`);

    return {
      merged: totalMerged,
      enhanced: totalEnhanced,
      archived: totalArchived
    };

  } catch (error) {
    console.error('❌ [OPTIMIZER] Error:', error);
    throw error;
  }
}

/**
 * Consolidate memories in a specific category using AI
 */
async function consolidateCategoryMemories(userId, category, memories) {
  let merged = 0;
  let enhanced = 0;
  let archived = 0;

  // Build prompt for Claude to analyze memories
  const memoryList = memories.map((m, idx) =>
    `Memory ${idx + 1} (ID: ${m.id}, Importance: ${m.importance_score}):\n${m.content}`
  ).join('\n\n');

  const prompt = `You are a memory consolidation expert. Analyze these ${category} memories and identify opportunities to merge, enhance, or consolidate them.

MEMORIES:
${memoryList}

TASK:
1. Identify groups of memories that contain overlapping or complementary information
2. For each group, create a single enhanced memory that combines the best information from all members
3. Identify any memories that should be archived (redundant, outdated, or superseded)

OUTPUT FORMAT (JSON):
{
  "consolidations": [
    {
      "action": "merge",
      "source_memory_ids": ["id1", "id2"],
      "enhanced_content": "The merged, enhanced content combining both memories",
      "new_importance": 0.85,
      "reason": "Combined pricing and service details into comprehensive description"
    }
  ],
  "archives": [
    {
      "memory_id": "id3",
      "reason": "Superseded by merged memory above"
    }
  ]
}

GUIDELINES:
- Only merge memories that are truly related (same topic/context)
- Enhanced content should be clear, specific, and comprehensive
- Preserve all important details when merging
- Increase importance score if merged memory is more valuable
- Don't be overly aggressive - only merge when it genuinely improves quality

Return ONLY the JSON object, no other text.`;

  try {
    const aiResponse = await callClaude(prompt);
    const consolidationPlan = JSON.parse(aiResponse);

    console.log(`🤖 [AI] Consolidation plan: ${consolidationPlan.consolidations?.length || 0} merges, ${consolidationPlan.archives?.length || 0} archives`);

    // Execute consolidations
    if (consolidationPlan.consolidations) {
      for (const consolidation of consolidationPlan.consolidations) {
        try {
          // Create enhanced memory
          const primaryId = consolidation.source_memory_ids[0];
          const newImportance = consolidation.new_importance || 0.8;

          // Update primary memory with enhanced content
          await db.pool.query(
            `UPDATE memories
             SET content = $1, importance_score = $2, updated_at = NOW()
             WHERE id = $3`,
            [consolidation.enhanced_content, newImportance, primaryId]
          );

          // Log enhancement
          await db.pool.query(
            `INSERT INTO memory_history (memory_id, user_id, action, old_content, new_content, reason)
             VALUES ($1, $2, 'enhanced', $3, $4, $5)`,
            [
              primaryId,
              userId,
              memories.find(m => m.id === primaryId)?.content || '',
              consolidation.enhanced_content,
              `AI merge: ${consolidation.reason}`
            ]
          );

          enhanced++;

          // Delete other source memories
          for (let i = 1; i < consolidation.source_memory_ids.length; i++) {
            const sourceId = consolidation.source_memory_ids[i];

            await db.pool.query(
              `INSERT INTO memory_history (memory_id, user_id, action, old_content, new_content, reason)
               VALUES ($1, $2, 'merged', $3, $4, $5)`,
              [
                sourceId,
                userId,
                memories.find(m => m.id === sourceId)?.content || '',
                consolidation.enhanced_content,
                `Merged into ${primaryId}: ${consolidation.reason}`
              ]
            );

            await db.pool.query('DELETE FROM memories WHERE id = $1', [sourceId]);
            merged++;
          }

          console.log(`✨ [OPTIMIZER] Enhanced memory ${primaryId.substring(0, 8)} by merging ${consolidation.source_memory_ids.length} memories`);

        } catch (err) {
          console.error(`❌ [OPTIMIZER] Failed to process consolidation:`, err);
        }
      }
    }

    // Execute archives
    if (consolidationPlan.archives) {
      for (const archive of consolidationPlan.archives) {
        try {
          await db.pool.query(
            `INSERT INTO memory_history (memory_id, user_id, action, old_content, reason)
             VALUES ($1, $2, 'archived', $3, $4)`,
            [
              archive.memory_id,
              userId,
              memories.find(m => m.id === archive.memory_id)?.content || '',
              `AI decision: ${archive.reason}`
            ]
          );

          await db.pool.query(
            `UPDATE memories SET status = 'archived', archived_at = NOW(), archived_reason = $1 WHERE id = $2`,
            [archive.reason, archive.memory_id]
          );

          archived++;
          console.log(`🗄️  [OPTIMIZER] Archived memory ${archive.memory_id.substring(0, 8)}: ${archive.reason}`);

        } catch (err) {
          console.error(`❌ [OPTIMIZER] Failed to archive:`, err);
        }
      }
    }

  } catch (error) {
    console.error(`❌ [OPTIMIZER] AI consolidation failed for ${category}:`, error);
    // Continue with other categories even if this one fails
  }

  return { merged, enhanced, archived };
}

/**
 * Call Claude Sonnet 4.5 via OpenRouter
 */
async function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.3
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://ecos-production.com',
        'X-Title': 'ECOS Memory Optimizer',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('Invalid AI response format'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

module.exports = { optimizeMemoriesWithAI };
