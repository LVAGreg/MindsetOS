/**
 * Agent State Management Service
 *
 * Handles saving and loading agent state for V7 multi-agent handoffs
 * Enables seamless state persistence between agents
 */

const db = require('./db.cjs');

/**
 * Save agent state to database
 * @param {string} userId - UUID of user
 * @param {string} agentId - Agent identifier (e.g., 'money-model-maker-v7')
 * @param {object} stateData - Agent-specific state data
 * @param {string} conversationId - Optional conversation UUID
 * @param {boolean} isComplete - Whether agent workflow is complete
 * @returns {Promise<object>} Saved state record
 */
async function saveAgentState(userId, agentId, stateData, conversationId = null, isComplete = false) {
  try {
    const agentVersion = agentId.includes('-v7') ? 'v7' : 'v6';

    const query = `
      INSERT INTO agent_state (
        user_id,
        conversation_id,
        agent_id,
        agent_version,
        state_data,
        is_complete,
        completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, agent_id, agent_version)
      DO UPDATE SET
        state_data = EXCLUDED.state_data,
        conversation_id = EXCLUDED.conversation_id,
        is_complete = EXCLUDED.is_complete,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userId,
      conversationId,
      agentId,
      agentVersion,
      JSON.stringify(stateData),
      isComplete,
      isComplete ? new Date() : null
    ];

    const result = await db.pool.query(query, values);

    console.log(`✅ [AGENT STATE] Saved state for ${agentId} (user: ${userId.substring(0, 8)})`);

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [AGENT STATE] Save error:`, error.message);
    throw error;
  }
}

/**
 * Load agent state from database
 * @param {string} userId - UUID of user
 * @param {string} agentId - Agent identifier
 * @returns {Promise<object|null>} Agent state or null if not found
 */
async function loadAgentState(userId, agentId) {
  try {
    const agentVersion = agentId.includes('-v7') ? 'v7' : 'v6';

    const query = `
      SELECT *
      FROM agent_state
      WHERE user_id = $1 AND agent_id = $2 AND agent_version = $3
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const result = await db.pool.query(query, [userId, agentId, agentVersion]);

    if (result.rows.length === 0) {
      console.log(`ℹ️  [AGENT STATE] No state found for ${agentId} (user: ${userId.substring(0, 8)})`);
      return null;
    }

    console.log(`✅ [AGENT STATE] Loaded state for ${agentId} (user: ${userId.substring(0, 8)})`);

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [AGENT STATE] Load error:`, error.message);
    return null;
  }
}

/**
 * Load all completed agent states for a user (their agent history)
 * @param {string} userId - UUID of user
 * @returns {Promise<array>} Array of completed agent states
 */
async function getUserAgentHistory(userId) {
  try {
    const query = `
      SELECT agent_id, agent_version, state_data, completed_at, updated_at
      FROM agent_state
      WHERE user_id = $1 AND is_complete = true
      ORDER BY completed_at DESC
    `;

    const result = await db.pool.query(query, [userId]);

    console.log(`✅ [AGENT STATE] Loaded ${result.rows.length} completed agents for user ${userId.substring(0, 8)}`);

    return result.rows;
  } catch (error) {
    console.error(`❌ [AGENT STATE] History load error:`, error.message);
    return [];
  }
}

/**
 * Load specific agent state data by agent ID (for handoffs)
 * @param {string} userId - UUID of user
 * @param {string} agentId - Agent to load state from
 * @returns {Promise<object|null>} State data object or null
 */
async function getAgentStateData(userId, agentId) {
  const state = await loadAgentState(userId, agentId);
  return state ? state.state_data : null;
}

/**
 * Check if user has completed a specific agent
 * @param {string} userId - UUID of user
 * @param {string} agentId - Agent identifier
 * @returns {Promise<boolean>} True if completed
 */
async function hasCompletedAgent(userId, agentId) {
  try {
    const agentVersion = agentId.includes('-v7') ? 'v7' : 'v6';

    const query = `
      SELECT is_complete
      FROM agent_state
      WHERE user_id = $1 AND agent_id = $2 AND agent_version = $3 AND is_complete = true
      LIMIT 1
    `;

    const result = await db.pool.query(query, [userId, agentId, agentVersion]);

    return result.rows.length > 0;
  } catch (error) {
    console.error(`❌ [AGENT STATE] Completion check error:`, error.message);
    return false;
  }
}

/**
 * Get all incomplete agent states for a user (for resume functionality)
 * @param {string} userId - UUID of user
 * @returns {Promise<array>} Array of incomplete agent states
 */
async function getIncompleteAgents(userId) {
  try {
    const query = `
      SELECT agent_id, agent_version, state_data, updated_at
      FROM agent_state
      WHERE user_id = $1 AND is_complete = false
      ORDER BY updated_at DESC
    `;

    const result = await db.pool.query(query, [userId]);

    console.log(`✅ [AGENT STATE] Found ${result.rows.length} incomplete agents for user ${userId.substring(0, 8)}`);

    return result.rows;
  } catch (error) {
    console.error(`❌ [AGENT STATE] Incomplete agents load error:`, error.message);
    return [];
  }
}

/**
 * Delete agent state (for reset/restart functionality)
 * @param {string} userId - UUID of user
 * @param {string} agentId - Agent identifier
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteAgentState(userId, agentId) {
  try {
    const agentVersion = agentId.includes('-v7') ? 'v7' : 'v6';

    const query = `
      DELETE FROM agent_state
      WHERE user_id = $1 AND agent_id = $2 AND agent_version = $3
      RETURNING id
    `;

    const result = await db.pool.query(query, [userId, agentId, agentVersion]);

    if (result.rows.length > 0) {
      console.log(`✅ [AGENT STATE] Deleted state for ${agentId} (user: ${userId.substring(0, 8)})`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [AGENT STATE] Delete error:`, error.message);
    return false;
  }
}

/**
 * Build context prompt for agent from previous agent states
 * Used to inject state into agent prompts automatically
 * @param {string} userId - UUID of user
 * @param {array} previousAgentIds - Array of agent IDs to load state from
 * @returns {Promise<string>} Formatted context prompt
 */
async function buildAgentContextPrompt(userId, previousAgentIds) {
  try {
    const states = [];

    for (const agentId of previousAgentIds) {
      const state = await loadAgentState(userId, agentId);
      if (state && state.is_complete) {
        states.push({
          agent: agentId,
          data: state.state_data
        });
      }
    }

    if (states.length === 0) {
      return '';
    }

    let contextPrompt = '\n\n[LOADED STATE FROM PREVIOUS AGENTS]\n\n';

    for (const state of states) {
      contextPrompt += `**From ${state.agent}:**\n`;
      contextPrompt += '```json\n';
      contextPrompt += JSON.stringify(state.data, null, 2);
      contextPrompt += '\n```\n\n';
    }

    contextPrompt += '[Use this information to personalize your questions and avoid asking for details the user has already provided.]\n\n';

    return contextPrompt;
  } catch (error) {
    console.error(`❌ [AGENT STATE] Context build error:`, error.message);
    return '';
  }
}

module.exports = {
  saveAgentState,
  loadAgentState,
  getUserAgentHistory,
  getAgentStateData,
  hasCompletedAgent,
  getIncompleteAgents,
  deleteAgentState,
  buildAgentContextPrompt
};
