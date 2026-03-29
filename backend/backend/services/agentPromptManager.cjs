/**
 * Agent Prompt Management Service
 *
 * Manages database-stored agent prompts with full CRUD operations
 * Enables modular editing of system prompts, voice instructions, and workflows
 */

const db = require('./db.cjs');

/**
 * Get complete agent prompt by agent_id and version
 * Assembles all prompt components into final system prompt
 * @param {string} agentId - Agent identifier
 * @param {string} version - Agent version (default: 'v7')
 * @returns {Promise<object|null>} Complete agent prompt or null
 */
async function getAgentPrompt(agentId, version = 'v7') {
  try {
    const query = `
      SELECT *
      FROM agent_prompts
      WHERE agent_id = $1 AND agent_version = $2 AND is_active = true
      LIMIT 1
    `;

    const result = await db.pool.query(query, [agentId, version]);

    if (result.rows.length === 0) {
      console.log(`⚠️  [AGENT PROMPTS] No active prompt found for ${agentId} v${version}`);
      return null;
    }

    const prompt = result.rows[0];

    // Assemble full prompt from components
    const fullPrompt = assemblePrompt(prompt);

    console.log(`✅ [AGENT PROMPTS] Loaded ${agentId} v${version}`);

    return {
      ...prompt,
      full_prompt: fullPrompt
    };
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Get error:`, error.message);
    return null;
  }
}

/**
 * Assemble full prompt from modular components
 * @param {object} prompt - Agent prompt record
 * @returns {string} Complete assembled prompt
 */
function assemblePrompt(prompt) {
  const components = [];

  // 1. Security instructions (always first)
  if (prompt.security_instructions) {
    components.push(prompt.security_instructions.trim());
  }

  // 2. Voice and tone instructions
  if (prompt.voice_tone_instructions) {
    components.push(prompt.voice_tone_instructions.trim());
  }

  // 3. Main system prompt
  components.push(prompt.system_prompt.trim());

  // 4. Workflow instructions
  if (prompt.workflow_instructions) {
    components.push(prompt.workflow_instructions.trim());
  }

  // 5. Handoff instructions (V7 only)
  if (prompt.handoff_instructions) {
    components.push(prompt.handoff_instructions.trim());
  }

  return components.join('\n\n---\n\n');
}

/**
 * Get all active agent prompts
 * @param {boolean} publishedOnly - Only return published agents
 * @returns {Promise<array>} Array of agent prompts
 */
async function getAllAgentPrompts(publishedOnly = true) {
  try {
    const query = `
      SELECT
        id,
        agent_id,
        agent_version,
        agent_name,
        agent_description,
        dependencies,
        config,
        is_active,
        is_published,
        updated_at
      FROM agent_prompts
      WHERE is_active = true ${publishedOnly ? 'AND is_published = true' : ''}
      ORDER BY agent_name ASC
    `;

    const result = await db.pool.query(query);

    console.log(`✅ [AGENT PROMPTS] Loaded ${result.rows.length} agents`);

    return result.rows;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Get all error:`, error.message);
    return [];
  }
}

/**
 * Create new agent prompt
 * @param {object} promptData - Agent prompt data
 * @param {string} userId - Creator user ID
 * @returns {Promise<object>} Created agent prompt
 */
async function createAgentPrompt(promptData, userId) {
  try {
    const query = `
      INSERT INTO agent_prompts (
        agent_id,
        agent_version,
        agent_name,
        agent_description,
        system_prompt,
        security_instructions,
        voice_tone_instructions,
        workflow_instructions,
        handoff_instructions,
        config,
        dependencies,
        supporting_files,
        example_data,
        is_active,
        is_published,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      RETURNING *
    `;

    const values = [
      promptData.agent_id,
      promptData.agent_version || 'v7',
      promptData.agent_name,
      promptData.agent_description || null,
      promptData.system_prompt,
      promptData.security_instructions || null,
      promptData.voice_tone_instructions || null,
      promptData.workflow_instructions || null,
      promptData.handoff_instructions || null,
      JSON.stringify(promptData.config || {}),
      promptData.dependencies || [],
      JSON.stringify(promptData.supporting_files || []),
      JSON.stringify(promptData.example_data || {}),
      promptData.is_active !== undefined ? promptData.is_active : true,
      promptData.is_published !== undefined ? promptData.is_published : false,
      userId
    ];

    const result = await db.pool.query(query, values);

    console.log(`✅ [AGENT PROMPTS] Created ${promptData.agent_id} v${promptData.agent_version}`);

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Create error:`, error.message);
    throw error;
  }
}

/**
 * Update agent prompt
 * @param {string} agentId - Agent identifier
 * @param {string} version - Agent version
 * @param {object} updates - Fields to update
 * @param {string} userId - User making update
 * @returns {Promise<object>} Updated agent prompt
 */
async function updateAgentPrompt(agentId, version, updates, userId) {
  try {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic update query
    const updateableFields = [
      'agent_name',
      'agent_description',
      'system_prompt',
      'security_instructions',
      'voice_tone_instructions',
      'workflow_instructions',
      'handoff_instructions',
      'config',
      'dependencies',
      'supporting_files',
      'example_data',
      'is_active',
      'is_published',
      'version_notes'
    ];

    for (const field of updateableFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${valueIndex}`);
        values.push(['config', 'supporting_files', 'example_data'].includes(field)
          ? JSON.stringify(updates[field])
          : updates[field]
        );
        valueIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_by
    fields.push(`updated_by = $${valueIndex}`);
    values.push(userId);
    valueIndex++;

    // Add WHERE clause values
    values.push(agentId, version);

    const query = `
      UPDATE agent_prompts
      SET ${fields.join(', ')}
      WHERE agent_id = $${valueIndex++} AND agent_version = $${valueIndex}
      RETURNING *
    `;

    const result = await db.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Agent ${agentId} v${version} not found`);
    }

    console.log(`✅ [AGENT PROMPTS] Updated ${agentId} v${version}`);

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Update error:`, error.message);
    throw error;
  }
}

/**
 * Publish agent prompt (make it live)
 * @param {string} agentId - Agent identifier
 * @param {string} version - Agent version
 * @param {string} userId - User publishing
 * @returns {Promise<boolean>} True if published
 */
async function publishAgentPrompt(agentId, version, userId) {
  try {
    const query = `
      UPDATE agent_prompts
      SET
        is_published = true,
        published_at = NOW(),
        updated_by = $3
      WHERE agent_id = $1 AND agent_version = $2
      RETURNING *
    `;

    const result = await db.pool.query(query, [agentId, version, userId]);

    if (result.rows.length > 0) {
      console.log(`✅ [AGENT PROMPTS] Published ${agentId} v${version}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Publish error:`, error.message);
    return false;
  }
}

/**
 * Get agent prompt history (for rollback)
 * @param {string} agentId - Agent identifier
 * @param {string} version - Agent version
 * @returns {Promise<array>} Array of historical versions
 */
async function getAgentPromptHistory(agentId, version) {
  try {
    const query = `
      SELECT aph.*, u.email as changed_by_email
      FROM agent_prompt_history aph
      JOIN agent_prompts ap ON aph.agent_prompt_id = ap.id
      LEFT JOIN users u ON aph.changed_by = u.id
      WHERE ap.agent_id = $1 AND ap.agent_version = $2
      ORDER BY aph.changed_at DESC
    `;

    const result = await db.pool.query(query, [agentId, version]);

    console.log(`✅ [AGENT PROMPTS] Loaded ${result.rows.length} history entries for ${agentId} v${version}`);

    return result.rows;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] History error:`, error.message);
    return [];
  }
}

/**
 * Rollback agent prompt to previous version
 * @param {string} historyId - History entry ID to rollback to
 * @param {string} userId - User performing rollback
 * @returns {Promise<object>} Updated agent prompt
 */
async function rollbackAgentPrompt(historyId, userId) {
  try {
    // Get history entry
    const historyQuery = `
      SELECT aph.*, ap.agent_id, ap.agent_version
      FROM agent_prompt_history aph
      JOIN agent_prompts ap ON aph.agent_prompt_id = ap.id
      WHERE aph.id = $1
    `;

    const historyResult = await db.pool.query(historyQuery, [historyId]);

    if (historyResult.rows.length === 0) {
      throw new Error(`History entry ${historyId} not found`);
    }

    const history = historyResult.rows[0];

    // Restore from history
    const updates = {
      system_prompt: history.system_prompt,
      security_instructions: history.security_instructions,
      voice_tone_instructions: history.voice_tone_instructions,
      workflow_instructions: history.workflow_instructions,
      handoff_instructions: history.handoff_instructions,
      config: history.config,
      version_notes: `Rolled back to version from ${history.changed_at}`
    };

    const updated = await updateAgentPrompt(history.agent_id, history.agent_version, updates, userId);

    console.log(`✅ [AGENT PROMPTS] Rolled back ${history.agent_id} v${history.agent_version} to ${historyId}`);

    return updated;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Rollback error:`, error.message);
    throw error;
  }
}

/**
 * Get agents by category
 * @param {string} categoryName - Category name
 * @returns {Promise<array>} Array of agents in category
 */
async function getAgentsByCategory(categoryName) {
  try {
    const query = `
      SELECT ap.*, ac.category_name
      FROM agent_prompts ap
      JOIN agent_category_mapping acm ON ap.id = acm.agent_prompt_id
      JOIN agent_categories ac ON acm.category_id = ac.id
      WHERE ac.category_name = $1 AND ap.is_active = true AND ap.is_published = true
      ORDER BY acm.display_order, ap.agent_name
    `;

    const result = await db.pool.query(query, [categoryName]);

    console.log(`✅ [AGENT PROMPTS] Loaded ${result.rows.length} agents in category '${categoryName}'`);

    return result.rows;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Get by category error:`, error.message);
    return [];
  }
}

/**
 * Delete agent prompt (soft delete by setting is_active = false)
 * @param {string} agentId - Agent identifier
 * @param {string} version - Agent version
 * @param {string} userId - User deleting
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteAgentPrompt(agentId, version, userId) {
  try {
    const query = `
      UPDATE agent_prompts
      SET
        is_active = false,
        updated_by = $3
      WHERE agent_id = $1 AND agent_version = $2
      RETURNING *
    `;

    const result = await db.pool.query(query, [agentId, version, userId]);

    if (result.rows.length > 0) {
      console.log(`✅ [AGENT PROMPTS] Deleted ${agentId} v${version}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [AGENT PROMPTS] Delete error:`, error.message);
    return false;
  }
}

module.exports = {
  getAgentPrompt,
  getAllAgentPrompts,
  createAgentPrompt,
  updateAgentPrompt,
  publishAgentPrompt,
  getAgentPromptHistory,
  rollbackAgentPrompt,
  getAgentsByCategory,
  deleteAgentPrompt,
  assemblePrompt
};
