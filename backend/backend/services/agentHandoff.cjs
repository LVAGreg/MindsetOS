/**
 * Agent Handoff Orchestration Service
 *
 * Manages transitions between V7 agents with state passing
 * Tracks handoff analytics and journey progress
 */

const db = require('./db.cjs');
const agentState = require('./agentState.cjs');

/**
 * Agent workflow map - defines logical next agents for handoffs
 */
const AGENT_WORKFLOW_MAP = {
  'money-model-maker-v7': [
    {
      id: 'fast-fix-finder-v7',
      name: 'Fast Fix Finder',
      description: 'Turn your Money Model into a quick-win entry offer',
      recommended: true
    },
    {
      id: 'offer-promo-printer-v7',
      name: 'Offer Promo Printer',
      description: 'Create a promotional invitation',
      recommended: false
    }
  ],
  'fast-fix-finder-v7': [
    {
      id: 'offer-promo-printer-v7',
      name: 'Offer Promo Printer',
      description: 'Turn your Fast Fix into a compelling invitation',
      recommended: true
    }
  ],
  'offer-promo-printer-v7': [
    {
      id: 'promo-planner-v7',
      name: 'Promo Planner',
      description: 'Build a 10-day campaign to promote your offer',
      recommended: true
    }
  ],
  'promo-planner-v7': [
    {
      id: 'qualification-call-builder-v7',
      name: 'Qualification Call Builder',
      description: 'Create a sales script to convert prospects',
      recommended: true
    }
  ],
  'qualification-call-builder-v7': [
    {
      id: 'linkedin-events-builder-v7',
      name: 'LinkedIn Events Builder',
      description: 'Plan a compelling LinkedIn event',
      recommended: false
    }
  ],
  'linkedin-events-builder-v7': [
    {
      id: 'promo-planner-v7',
      name: 'Promo Planner',
      description: 'Promote your event with a 10-day campaign',
      recommended: true
    }
  ]
};

/**
 * Record agent handoff in database
 * @param {string} userId - UUID of user
 * @param {string} fromAgentId - Source agent
 * @param {string} toAgentId - Destination agent
 * @param {object} statePassed - State data handed off
 * @param {string} handoffMethod - How handoff was triggered
 * @returns {Promise<object>} Handoff record
 */
async function recordHandoff(userId, fromAgentId, toAgentId, statePassed, handoffMethod = 'widget_click') {
  try {
    const fromVersion = fromAgentId.includes('-v7') ? 'v7' : 'v6';
    const toVersion = toAgentId.includes('-v7') ? 'v7' : 'v6';

    // Get state IDs if available
    const fromState = await agentState.loadAgentState(userId, fromAgentId);
    const toState = await agentState.loadAgentState(userId, toAgentId);

    const query = `
      INSERT INTO agent_handoffs (
        user_id,
        from_agent_id,
        from_agent_version,
        to_agent_id,
        to_agent_version,
        state_passed,
        handoff_method,
        from_state_id,
        to_state_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      userId,
      fromAgentId,
      fromVersion,
      toAgentId,
      toVersion,
      JSON.stringify(statePassed),
      handoffMethod,
      fromState?.id || null,
      toState?.id || null
    ];

    const result = await db.pool.query(query, values);

    console.log(`✅ [HANDOFF] ${fromAgentId} → ${toAgentId} (user: ${userId.substring(0, 8)})`);

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [HANDOFF] Record error:`, error.message);
    throw error;
  }
}

/**
 * Get next agent options for handoff widget
 * @param {string} currentAgentId - Current agent
 * @returns {array} Array of next agent options
 */
function getNextAgentOptions(currentAgentId) {
  return AGENT_WORKFLOW_MAP[currentAgentId] || [];
}

/**
 * Get recommended next agent
 * @param {string} currentAgentId - Current agent
 * @returns {object|null} Recommended next agent or null
 */
function getRecommendedNextAgent(currentAgentId) {
  const options = getNextAgentOptions(currentAgentId);
  return options.find(opt => opt.recommended) || options[0] || null;
}

/**
 * Create handoff widget data for agent response
 * @param {string} currentAgentId - Current agent
 * @param {object} completedData - Completed state data
 * @param {string} instruction - Custom instruction text
 * @returns {object} Widget data for handoff_widget
 */
function createHandoffWidget(currentAgentId, completedData, instruction = null) {
  const nextAgents = getNextAgentOptions(currentAgentId);

  return {
    type: 'handoff_widget',
    data: {
      currentAgent: currentAgentId,
      nextAgents: nextAgents,
      completedData: completedData,
      instruction: instruction || 'Your work with this agent is complete! What would you like to do next?',
      saveOption: {
        enabled: true,
        text: 'Save and finish later'
      }
    }
  };
}

/**
 * Get user's current agent journey
 * @param {string} userId - UUID of user
 * @returns {Promise<object|null>} Current journey or null
 */
async function getCurrentJourney(userId) {
  try {
    const query = `
      SELECT *
      FROM agent_journey
      WHERE user_id = $1 AND is_complete = false
      ORDER BY last_activity_at DESC
      LIMIT 1
    `;

    const result = await db.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error(`❌ [JOURNEY] Get current error:`, error.message);
    return null;
  }
}

/**
 * Get user's complete journey history
 * @param {string} userId - UUID of user
 * @returns {Promise<array>} Array of journeys
 */
async function getUserJourneys(userId) {
  try {
    const query = `
      SELECT *
      FROM agent_journey
      WHERE user_id = $1
      ORDER BY started_at DESC
    `;

    const result = await db.pool.query(query, [userId]);

    return result.rows;
  } catch (error) {
    console.error(`❌ [JOURNEY] Get history error:`, error.message);
    return [];
  }
}

/**
 * Mark journey as complete
 * @param {string} journeyId - UUID of journey
 * @returns {Promise<boolean>} True if updated
 */
async function completeJourney(journeyId) {
  try {
    const query = `
      UPDATE agent_journey
      SET
        is_complete = true,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.pool.query(query, [journeyId]);

    if (result.rows.length > 0) {
      console.log(`✅ [JOURNEY] Completed journey ${journeyId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ [JOURNEY] Complete error:`, error.message);
    return false;
  }
}

/**
 * Get handoff analytics (which transitions are most common)
 * @returns {Promise<array>} Array of handoff statistics
 */
async function getHandoffAnalytics() {
  try {
    const query = `
      SELECT
        from_agent_id,
        to_agent_id,
        COUNT(*) as handoff_count,
        AVG(EXTRACT(EPOCH FROM (handoff_at - created_at))) as avg_time_between
      FROM agent_handoffs
      GROUP BY from_agent_id, to_agent_id
      ORDER BY handoff_count DESC
      LIMIT 20
    `;

    const result = await db.pool.query(query);

    return result.rows;
  } catch (error) {
    console.error(`❌ [ANALYTICS] Handoff analytics error:`, error.message);
    return [];
  }
}

/**
 * Build complete handoff context for next agent
 * Loads all previous agent states and formats for next agent prompt
 * @param {string} userId - UUID of user
 * @param {string} toAgentId - Next agent ID
 * @returns {Promise<object>} Handoff context with loaded states
 */
async function buildHandoffContext(userId, toAgentId) {
  try {
    // Define which previous agents each V7 agent needs
    const dependencyMap = {
      'fast-fix-finder-v7': ['money-model-maker-v7'],
      'offer-promo-printer-v7': ['money-model-maker-v7', 'fast-fix-finder-v7'], // Can use either
      'promo-planner-v7': ['offer-promo-printer-v7'],
      'qualification-call-builder-v7': ['money-model-maker-v7', 'offer-promo-printer-v7'],
      'linkedin-events-builder-v7': ['money-model-maker-v7']
    };

    const requiredAgents = dependencyMap[toAgentId] || [];

    const loadedStates = {};
    let hasRequiredState = false;

    for (const agentId of requiredAgents) {
      const state = await agentState.loadAgentState(userId, agentId);
      if (state && state.is_complete) {
        loadedStates[agentId] = state.state_data;
        hasRequiredState = true;
      }
    }

    return {
      toAgent: toAgentId,
      loadedStates: loadedStates,
      hasRequiredState: hasRequiredState,
      contextPrompt: hasRequiredState ? await agentState.buildAgentContextPrompt(userId, requiredAgents) : ''
    };
  } catch (error) {
    console.error(`❌ [HANDOFF] Build context error:`, error.message);
    return {
      toAgent: toAgentId,
      loadedStates: {},
      hasRequiredState: false,
      contextPrompt: ''
    };
  }
}

module.exports = {
  AGENT_WORKFLOW_MAP,
  recordHandoff,
  getNextAgentOptions,
  getRecommendedNextAgent,
  createHandoffWidget,
  getCurrentJourney,
  getUserJourneys,
  completeJourney,
  getHandoffAnalytics,
  buildHandoffContext
};
