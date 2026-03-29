/**
 * Agent Handoff Service
 * Manages intelligent agent-to-agent transitions using behavior_suffix field
 * Preserves existing suffix content and appends handoff logic without overwriting
 */

/**
 * ECOS Agent Workflow Definitions
 * Sequential workflow: 1→2→3→4→5, Agent 6 is standalone
 */
const AGENT_WORKFLOWS = {
  // Primary Sequential Workflow
  'money-model-maker': {
    nextAgent: 'fast-fix-finder',
    handoffTriggers: [
      'completed money model',
      'finalized 3 principles',
      'ready for offer',
      'people promise principles confirmed'
    ],
    handoffMessage: `

🎯 **Next Step**: Want to turn this into a fast-selling offer?

Talk to **Fast Fix Finder** to create your IN OFFER - a quick-win container that gets clients saying yes faster.

Type "connect fast fix finder" or "create IN offer" to continue.`
  },

  'fast-fix-finder': {
    nextAgent: 'offer-promo-printer',
    handoffTriggers: [
      'in offer complete',
      'fast fix defined',
      'quick win container ready',
      'mini promise created'
    ],
    handoffMessage: `

🎯 **Next Step**: Ready to promote this offer?

Talk to **Offer Promo Printer** to craft your promotional invitation using the 6 Ps Framework.

Type "connect offer promo printer" or "create invitation" to continue.`
  },

  'offer-promo-printer': {
    nextAgent: 'promo-planner',
    handoffTriggers: [
      '6 ps complete',
      'promotional invitation ready',
      'offer invitation finalized',
      'ready to promote'
    ],
    handoffMessage: `

🎯 **Next Step**: Let's get this offer in front of people.

Talk to **Promo Planner** to build your 10-day campaign with 30 messages (social + DM + email).

Type "connect promo planner" or "build campaign" to continue.`
  },

  'promo-planner': {
    nextAgent: 'qualification-call-builder',
    handoffTriggers: [
      'campaign complete',
      '30 messages ready',
      '10 day plan finalized',
      'ready for conversations'
    ],
    handoffMessage: `

🎯 **Next Step**: Time to convert conversations into clients.

Talk to **Qualification Call Builder** to create your sales script using the EXPERT process.

Type "connect qualification call builder" or "build sales script" to continue.`
  },

  'qualification-call-builder': {
    nextAgent: null, // End of primary workflow
    handoffTriggers: [
      'script complete',
      'expert process ready',
      'qualification process finalized'
    ],
    handoffMessage: `

✅ **Workflow Complete!** You now have the full system:

1. ✅ Money Model (foundation)
2. ✅ IN Offer (fast-selling container)
3. ✅ Promotional Invitation (6 Ps)
4. ✅ 10-Day Campaign (30 messages)
5. ✅ Sales Script (EXPERT process)

🚀 Deploy your campaign and start booking calls!

**Pro Tip**: Share your outputs in the EXPERT Arena for feedback: https://www.expertproject.co/c/expert-arena`
  },

  // Standalone Event-Based Workflow
  'linkedin-events-builder': {
    nextAgent: 'promo-planner',
    handoffTriggers: [
      'event topic complete',
      'what what how ready',
      'event defined',
      'ready to promote event'
    ],
    handoffMessage: `

🎯 **Next Step**: Let's fill this event with attendees.

Talk to **Promo Planner** to build your 10-day event promotion campaign.

Type "connect promo planner" or "promote event" to continue.`
  },

  // Brand Voice & Onboarding Agents (Support Workflow)
  'client-onboarding': {
    nextAgent: 'money-model-maker',
    handoffTriggers: [
      'onboarding complete',
      'profile finalized',
      'core memories set',
      'ready to build offer'
    ],
    handoffMessage: `

🎯 **Welcome to ECOS!** Let's build your expert business.

Talk to **Money Model Maker** to create your foundation: PEOPLE → PROMISE → 3 PRINCIPLES.

Type "connect money model maker" or "build money model" to start.`
  },

  'brand-voice-analyzer': {
    nextAgent: null, // Utility agent - no automatic handoff
    handoffTriggers: [],
    handoffMessage: `

✅ **Brand Voice Analysis Complete!**

Your unique voice patterns are now part of your ECOS profile.

Return to any agent to continue building your expert business with your authentic voice.`
  }
};

/**
 * Check if current conversation indicates task completion
 * @param {string} agentId - Current agent ID
 * @param {string} conversationText - Recent conversation content
 * @returns {boolean} - True if handoff triggers detected
 */
function shouldHandoff(agentId, conversationText) {
  const workflow = AGENT_WORKFLOWS[agentId];
  if (!workflow || !workflow.nextAgent) return false;

  const lowerText = conversationText.toLowerCase();
  return workflow.handoffTriggers.some(trigger =>
    lowerText.includes(trigger.toLowerCase())
  );
}

/**
 * Generate handoff suffix for agent
 * Preserves existing suffix content, appends handoff logic
 * @param {string} agentId - Agent identifier
 * @param {string} existingSuffix - Current behavior_suffix content
 * @returns {string} - Updated suffix with handoff logic
 */
function generateHandoffSuffix(agentId, existingSuffix = '') {
  const workflow = AGENT_WORKFLOWS[agentId];
  if (!workflow) return existingSuffix;

  // Check if handoff logic already exists
  const hasHandoffLogic = existingSuffix.includes('🎯 **Next Step**') ||
                          existingSuffix.includes('HANDOFF_LOGIC');

  if (hasHandoffLogic) {
    console.log(`⚠️ Handoff logic already exists for ${agentId}, preserving existing suffix`);
    return existingSuffix;
  }

  // Build handoff suffix that preserves existing content
  const handoffSuffix = `

---

## HANDOFF_LOGIC

**Completion Detection**: When user indicates completion with phrases like:
${workflow.handoffTriggers.map(t => `- "${t}"`).join('\n')}

**Automatic Handoff**: Append this message to your response:
${workflow.handoffMessage}

**Important**: Only suggest handoff ONCE per conversation when completion is clear. Don't force it if user wants to refine current work.`;

  // Append handoff logic to existing suffix
  return existingSuffix.trim() + handoffSuffix;
}

/**
 * Apply handoff suffix to agent (safe merge)
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} agentId - Agent identifier
 * @returns {Promise<Object>} - Updated agent record
 */
async function applyHandoffSuffix(pool, agentId) {
  try {
    // Get current agent record
    const { rows } = await pool.query(
      'SELECT id, name, behavior_suffix FROM agents WHERE id = $1',
      [agentId]
    );

    if (rows.length === 0) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const agent = rows[0];
    const existingSuffix = agent.behavior_suffix || '';

    // Generate merged suffix
    const updatedSuffix = generateHandoffSuffix(agentId, existingSuffix);

    // Only update if suffix changed
    if (updatedSuffix === existingSuffix) {
      console.log(`✅ ${agent.name}: Handoff logic already present, no update needed`);
      return { success: true, updated: false, agent };
    }

    // Update agent with new suffix
    const updateResult = await pool.query(
      'UPDATE agents SET behavior_suffix = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [updatedSuffix, agentId]
    );

    console.log(`✅ ${agent.name}: Applied handoff suffix (preserved existing content)`);
    return { success: true, updated: true, agent: updateResult.rows[0] };

  } catch (error) {
    console.error(`❌ Error applying handoff suffix to ${agentId}:`, error);
    throw error;
  }
}

/**
 * Apply handoff suffixes to all ECOS agents
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise<Object>} - Summary of updates
 */
async function applyHandoffToAllAgents(pool) {
  const agentIds = Object.keys(AGENT_WORKFLOWS);
  const results = {
    total: agentIds.length,
    updated: 0,
    skipped: 0,
    errors: []
  };

  console.log(`\n🔄 Applying handoff suffixes to ${results.total} agents...\n`);

  for (const agentId of agentIds) {
    try {
      const result = await applyHandoffSuffix(pool, agentId);
      if (result.updated) {
        results.updated++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.errors.push({ agentId, error: error.message });
    }
  }

  console.log(`\n✅ Handoff suffix application complete:`);
  console.log(`   - Updated: ${results.updated}`);
  console.log(`   - Skipped (already present): ${results.skipped}`);
  console.log(`   - Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.forEach(e => console.log(`   - ${e.agentId}: ${e.error}`));
  }

  return results;
}

/**
 * Get next agent in workflow
 * @param {string} currentAgentId - Current agent ID
 * @returns {string|null} - Next agent ID or null if end of workflow
 */
function getNextAgent(currentAgentId) {
  const workflow = AGENT_WORKFLOWS[currentAgentId];
  return workflow ? workflow.nextAgent : null;
}

/**
 * Get full workflow path for agent
 * @param {string} startAgentId - Starting agent ID
 * @returns {Array<string>} - Array of agent IDs in workflow order
 */
function getWorkflowPath(startAgentId) {
  const path = [startAgentId];
  let currentAgent = startAgentId;

  while (true) {
    const nextAgent = getNextAgent(currentAgent);
    if (!nextAgent || path.includes(nextAgent)) break; // Prevent circular references
    path.push(nextAgent);
    currentAgent = nextAgent;
  }

  return path;
}

module.exports = {
  AGENT_WORKFLOWS,
  shouldHandoff,
  generateHandoffSuffix,
  applyHandoffSuffix,
  applyHandoffToAllAgents,
  getNextAgent,
  getWorkflowPath
};
