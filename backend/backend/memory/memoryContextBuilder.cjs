#!/usr/bin/env node
/**
 * Memory Context Builder
 * Scans user memories and builds relevant context for each agent
 */

const db = require('../services/db.cjs');

/**
 * Agent-specific memory priorities
 * Defines what each agent needs to know from user's memory
 */
const AGENT_MEMORY_NEEDS = {
  'money-model-maker': {
    categories: ['business_context', 'goals', 'pain_points', 'preferences'],
    prompt: "What do you want to build your Money Model for?",
    contextTemplate: (memories) => `Here's what you should know about me:\n\n${formatMemories(memories)}\n\nI'd like to work on my Money Model.`
  },

  'fast-fix-finder': {
    categories: ['business_context', 'goals', 'strategies'],
    requiredKeywords: ['promise', 'principles', 'target', 'help'],
    prompt: "Ready to create your IN OFFER?",
    contextTemplate: (memories) => {
      const moneyModel = extractMoneyModel(memories);
      if (moneyModel) {
        return `Here's my Money Model:\n\nPEOPLE: ${moneyModel.people || 'Not defined'}\n\nPROMISE: ${moneyModel.promise || 'Not defined'}\n\nPRINCIPLES:\n${moneyModel.principles || 'Not defined'}\n\nI'm looking to create an IN OFFER based on this.`;
      }
      return `Here's what you should know:\n\n${formatMemories(memories)}\n\nI need to create a fast-selling IN OFFER.`;
    }
  },

  'offer-promo-printer': {
    categories: ['business_context', 'goals', 'strategies'],
    requiredKeywords: ['offer', 'promise', 'help', 'delivers'],
    prompt: "Create your promotional invitation?",
    contextTemplate: (memories) => `Here's my offer context:\n\n${formatMemories(memories)}\n\nI need to create a promotional invitation using the 6 Ps framework.`
  },

  'promo-planner': {
    categories: ['business_context', 'goals', 'strategies', 'preferences'],
    requiredKeywords: ['offer', 'audience', 'target'],
    prompt: "Build your 10-day campaign?",
    contextTemplate: (memories) => `Here's my offer and audience:\n\n${formatMemories(memories)}\n\nI want to create a 10-day promotional campaign.`
  },

  'qualification-call-builder': {
    categories: ['business_context', 'goals', 'pain_points', 'strategies'],
    requiredKeywords: ['offer', 'promise', 'help'],
    prompt: "Create your qualification call script?",
    contextTemplate: (memories) => `Here's my offer and what I deliver:\n\n${formatMemories(memories)}\n\nI need a qualification call script to convert prospects.`
  },

  'linkedin-events-builder-buddy': {
    categories: ['business_context', 'goals', 'strategies'],
    requiredKeywords: ['expertise', 'help', 'audience'],
    prompt: "Create a LinkedIn event topic?",
    contextTemplate: (memories) => `Here's my expertise and audience:\n\n${formatMemories(memories)}\n\nI want to create a compelling LinkedIn event topic.`
  }
};

/**
 * Build context suggestion for an agent
 */
async function buildContextForAgent(userId, agentId) {
  try {
    const agentConfig = AGENT_MEMORY_NEEDS[agentId];

    if (!agentConfig) {
      return null;
    }

    // Get relevant memories
    const memories = await getRelevantMemories(userId, agentConfig);

    if (memories.length === 0) {
      return {
        hasContext: false,
        message: null,
        memoryCount: 0
      };
    }

    // Build context message
    const contextMessage = agentConfig.contextTemplate(memories);

    return {
      hasContext: true,
      message: contextMessage,
      memoryCount: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        category: m.memory_type,
        importance: m.importance_score
      }))
    };

  } catch (error) {
    console.error(`❌ Failed to build context for ${agentId}:`, error.message);
    return null;
  }
}

/**
 * Get relevant memories for agent
 */
async function getRelevantMemories(userId, agentConfig) {
  try {
    // Build category filter
    const categoryPlaceholders = agentConfig.categories.map((_, i) => `$${i + 2}`).join(', ');

    let query = `
      SELECT id, content, memory_type, importance_score, created_at
      FROM memories
      WHERE user_id = $1
      AND memory_type IN (${categoryPlaceholders})
      AND status = 'active'
    `;

    const params = [userId, ...agentConfig.categories];

    // Add keyword filtering if required
    if (agentConfig.requiredKeywords && agentConfig.requiredKeywords.length > 0) {
      const keywordConditions = agentConfig.requiredKeywords
        .map(() => `content ILIKE $${params.length + 1}`)
        .join(' OR ');

      query += ` AND (${keywordConditions})`;
      params.push(...agentConfig.requiredKeywords.map(kw => `%${kw}%`));
    }

    query += `
      ORDER BY importance_score DESC, created_at DESC
      LIMIT 10
    `;

    const result = await db.pool.query(query, params);
    return result.rows;

  } catch (error) {
    console.error('❌ Failed to fetch relevant memories:', error);
    return [];
  }
}

/**
 * Format memories for display
 */
function formatMemories(memories) {
  if (!memories || memories.length === 0) {
    return 'No context available.';
  }

  return memories
    .map(m => `• ${m.content}`)
    .join('\n');
}

/**
 * Extract Money Model structure from memories
 */
function extractMoneyModel(memories) {
  const model = {
    people: null,
    promise: null,
    principles: null
  };

  memories.forEach(m => {
    const content = m.content.toLowerCase();

    // Extract PEOPLE
    if (content.includes('helps') || content.includes('target audience') || content.includes('works with')) {
      if (!model.people) {
        model.people = m.content;
      }
    }

    // Extract PROMISE
    if (content.includes('save') || content.includes('delivers') || content.includes('promise')) {
      if (!model.promise) {
        model.promise = m.content;
      }
    }

    // Extract PRINCIPLES
    if (content.includes('principle') || content.includes('specialized') || content.includes('integration') || content.includes('management')) {
      if (!model.principles) {
        model.principles = m.content;
      } else {
        model.principles += '\n• ' + m.content;
      }
    }
  });

  // Only return if we have at least PEOPLE or PROMISE
  if (model.people || model.promise) {
    return model;
  }

  return null;
}

module.exports = {
  buildContextForAgent,
  AGENT_MEMORY_NEEDS
};
