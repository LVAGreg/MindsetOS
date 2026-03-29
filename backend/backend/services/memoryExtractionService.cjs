/**
 * Memory Extraction Service
 *
 * Handles automatic extraction of structured data from agent responses
 * Updates user profiles and core memories based on JSON extraction
 *
 * Created: 2025-11-12
 * Phase 2: Memory System Enhancement
 */

const { processResponse } = require('../utils/jsonExtractor.cjs');

/**
 * Process agent response for structured data and update memories
 *
 * @param {string} responseText - Full AI response text
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {string} conversationId - Conversation ID
 * @param {object} pool - PostgreSQL connection pool
 * @returns {Promise<object>} - Processing result
 */
async function processMemoryExtraction(responseText, userId, agentId, conversationId, pool) {
  console.log('🧠 [MEMORY EXTRACTION] Processing response for structured data...');

  const result = processResponse(responseText);

  if (!result.hasStructuredData) {
    console.log('ℹ️ [MEMORY EXTRACTION] No structured data found in response');
    return { success: false, reason: 'no_structured_data' };
  }

  if (!result.isValid) {
    console.log('⚠️ [MEMORY EXTRACTION] Invalid structured data format');
    return { success: false, reason: 'invalid_format' };
  }

  console.log('✅ [MEMORY EXTRACTION] Valid structured data found');

  try {
    // Process onboarding data if present
    if (result.onboardingData) {
      await updateCoreMemories(userId, result.onboardingData, pool);
      console.log('✅ [MEMORY EXTRACTION] Core memories updated from onboarding data');
    }

    // Process memory updates if present
    if (result.memoryUpdates) {
      await applyMemoryUpdates(userId, agentId, conversationId, result.memoryUpdates, pool);
      console.log('✅ [MEMORY EXTRACTION] Memory updates applied');
    }

    // Process user insights if present
    if (result.userInsights) {
      await storeUserInsights(userId, agentId, conversationId, result.userInsights, pool);
      console.log('✅ [MEMORY EXTRACTION] User insights stored');
    }

    return {
      success: true,
      processed: {
        onboardingData: !!result.onboardingData,
        memoryUpdates: !!result.memoryUpdates,
        userInsights: !!result.userInsights
      }
    };

  } catch (error) {
    console.error('❌ [MEMORY EXTRACTION] Failed to process structured data:', error.message);
    return { success: false, reason: 'processing_error', error: error.message };
  }
}

/**
 * Update core memories table with onboarding data
 *
 * @param {string} userId - User ID
 * @param {object} onboardingData - Extracted onboarding data
 * @param {object} pool - PostgreSQL connection pool
 */
async function updateCoreMemories(userId, onboardingData, pool) {
  const fields = {
    full_name: onboardingData.full_name,
    company_name: onboardingData.company_name,
    business_outcome: onboardingData.business_outcome,
    target_clients: onboardingData.target_clients,
    client_problems: onboardingData.client_problems,
    client_results: onboardingData.client_results,
    core_method: onboardingData.core_method,
    frameworks: onboardingData.frameworks,
    service_description: onboardingData.service_description,
    pricing_model: onboardingData.pricing_model,
    delivery_timeline: onboardingData.delivery_timeline,
    revenue_range: onboardingData.revenue_range,
    growth_goals: onboardingData.growth_goals,
    biggest_challenges: onboardingData.biggest_challenges
  };

  // Filter out null/undefined values
  const definedFields = Object.entries(fields).filter(([_, value]) => value !== null && value !== undefined);

  if (definedFields.length === 0) {
    console.log('ℹ️ [CORE MEMORIES] No fields to update');
    return;
  }

  // Build dynamic SQL for UPSERT
  const columns = definedFields.map(([key]) => key);
  const values = definedFields.map(([_, value]) => value);
  const placeholders = definedFields.map((_, i) => `$${i + 2}`);

  const updateClauses = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

  const query = `
    INSERT INTO core_memories (user_id, ${columns.join(', ')}, updated_at)
    VALUES ($1, ${placeholders.join(', ')}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET ${updateClauses}, updated_at = NOW()
  `;

  await pool.query(query, [userId, ...values]);
  console.log(`✅ [CORE MEMORIES] Updated ${columns.length} fields for user ${userId}`);
}

/**
 * Apply memory updates (add/update operations)
 *
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {string} conversationId - Conversation ID
 * @param {object} memoryUpdates - Memory update operations
 * @param {object} pool - PostgreSQL connection pool
 */
async function applyMemoryUpdates(userId, agentId, conversationId, memoryUpdates, pool) {
  // Add new memories
  if (memoryUpdates.add && Array.isArray(memoryUpdates.add)) {
    for (const memory of memoryUpdates.add) {
      if (!memory.type || !memory.content) {
        continue; // Skip invalid entries
      }

      const memoryType = memory.type;
      const content = memory.content;
      const category = memory.category || 'general';
      const importance = memory.importance_score || 0.7;

      await pool.query(`
        INSERT INTO memories (user_id, agent_id, conversation_id, memory_type, content, importance_score, category, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      `, [userId, agentId, conversationId, memoryType, content, importance, category]);

      console.log(`✅ [MEMORY ADD] Added ${memoryType}: "${content.substring(0, 50)}..."`);
    }
  }

  // Update existing memories (update core_memories fields)
  if (memoryUpdates.update && Array.isArray(memoryUpdates.update)) {
    for (const update of memoryUpdates.update) {
      if (!update.field || !update.value) {
        continue; // Skip invalid entries
      }

      // Only update if field exists in core_memories table
      const validFields = [
        'full_name', 'company_name', 'business_outcome', 'target_clients',
        'client_problems', 'client_results', 'core_method', 'frameworks',
        'service_description', 'pricing_model', 'delivery_timeline',
        'revenue_range', 'growth_goals', 'biggest_challenges'
      ];

      if (validFields.includes(update.field)) {
        const query = `
          UPDATE core_memories
          SET ${update.field} = $1, updated_at = NOW()
          WHERE user_id = $2
        `;
        await pool.query(query, [update.value, userId]);
        console.log(`✅ [MEMORY UPDATE] Updated ${update.field}`);
      }
    }
  }
}

/**
 * Store user insights as individual memory entries
 *
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {string} conversationId - Conversation ID
 * @param {object} insights - User insights object
 * @param {object} pool - PostgreSQL connection pool
 */
async function storeUserInsights(userId, agentId, conversationId, insights, pool) {
  // Store key facts
  if (insights.key_facts && Array.isArray(insights.key_facts)) {
    for (const fact of insights.key_facts) {
      await pool.query(`
        INSERT INTO memories (user_id, agent_id, conversation_id, memory_type, content, importance_score, category, status, created_at)
        VALUES ($1, $2, $3, 'business_context', $4, 0.8, 'insight', 'active', NOW())
      `, [userId, agentId, conversationId, fact]);
    }
  }

  // Store goals
  if (insights.goals && Array.isArray(insights.goals)) {
    for (const goal of insights.goals) {
      await pool.query(`
        INSERT INTO memories (user_id, agent_id, conversation_id, memory_type, content, importance_score, category, status, created_at)
        VALUES ($1, $2, $3, 'goals', $4, 0.9, 'insight', 'active', NOW())
      `, [userId, agentId, conversationId, goal]);
    }
  }

  // Store challenges
  if (insights.challenges && Array.isArray(insights.challenges)) {
    for (const challenge of insights.challenges) {
      await pool.query(`
        INSERT INTO memories (user_id, agent_id, conversation_id, memory_type, content, importance_score, category, status, created_at)
        VALUES ($1, $2, $3, 'pain_points', $4, 0.85, 'insight', 'active', NOW())
      `, [userId, agentId, conversationId, challenge]);
    }
  }

  // Store preferences as JSON
  if (insights.preferences && Object.keys(insights.preferences).length > 0) {
    await pool.query(`
      INSERT INTO memories (user_id, agent_id, conversation_id, memory_type, content, importance_score, category, status, created_at)
      VALUES ($1, $2, $3, 'preferences', $4, 0.7, 'insight', 'active', NOW())
    `, [userId, agentId, conversationId, JSON.stringify(insights.preferences)]);
  }

  console.log('✅ [USER INSIGHTS] Stored insights as memory entries');
}

module.exports = {
  processMemoryExtraction,
  updateCoreMemories,
  applyMemoryUpdates,
  storeUserInsights
};
