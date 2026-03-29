/**
 * Onboarding Structured Output Service - OpenRouter Version
 * Uses OpenRouter's native structured outputs feature for client-onboarding agent
 * Guarantees JSON format with core memories data
 */

const https = require('https');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Core Memories JSON Schema for OpenRouter
 * Matches core_memories table structure exactly
 */
const CORE_MEMORIES_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "core_memories",
    strict: true,
    schema: {
      type: "object",
      properties: {
        // Section 1: Business Identity
        full_name: {
          type: "string",
          description: "User's full name"
        },
        company_name: {
          type: "string",
          description: "Company or business name"
        },
        business_outcome: {
          type: "string",
          description: "Primary business outcome or value proposition"
        },

        // Section 2: Client Profile
        target_clients: {
          type: "string",
          description: "Description of ideal target clients"
        },
        client_problems: {
          type: "array",
          items: { type: "string" },
          description: "Top 3 problems clients face (max 3)",
          maxItems: 3
        },
        client_results: {
          type: "string",
          description: "Tangible outcomes clients achieve"
        },

        // Section 3: Methodology
        core_method: {
          type: "string",
          description: "Core methodology or approach"
        },
        frameworks: {
          type: "array",
          items: { type: "string" },
          description: "Key frameworks or processes used"
        },

        // Section 4: Service Details
        service_description: {
          type: "string",
          description: "Description of services offered"
        },
        pricing_model: {
          type: "string",
          description: "Pricing model (e.g., hourly, project-based, retainer)"
        },
        delivery_timeline: {
          type: "string",
          description: "Typical delivery timeline"
        },

        // Section 5: Current State
        revenue_range: {
          type: "string",
          description: "Current revenue range (e.g., $10k-$30k/month)"
        },
        growth_goals: {
          type: "string",
          description: "Business growth goals"
        },
        biggest_challenges: {
          type: "array",
          items: { type: "string" },
          description: "Biggest business challenges"
        }
      },
      required: [
        "full_name",
        "business_outcome",
        "target_clients",
        "client_problems",
        "client_results",
        "core_method"
      ],
      additionalProperties: false
    }
  }
};

/**
 * Analyzes onboarding conversation and extracts core memories using OpenRouter's structured outputs
 * @param {string} conversationSummary - Summary of onboarding conversation
 * @param {Array} conversationHistory - Full conversation messages
 * @returns {Promise<Object>} Core memories data
 */
function extractCoreMemoriesStructured(conversationSummary, conversationHistory = []) {
  return new Promise((resolve, reject) => {
    console.log('🎨 [OPENROUTER-STRUCTURED] Using OpenRouter native structured outputs for onboarding extraction');

    // Build messages array
    const messages = [
      {
        role: "system",
        content: `You are an onboarding data extraction specialist. Analyze the conversation and extract core business information into a structured format.

Extract the following information:

**Business Identity:**
- full_name: User's full name
- company_name: Company or business name
- business_outcome: Primary business outcome or value proposition

**Client Profile:**
- target_clients: Description of ideal target clients
- client_problems: Top 3 problems clients face (array, max 3 items)
- client_results: Tangible outcomes clients achieve

**Methodology:**
- core_method: Core methodology or approach
- frameworks: Key frameworks or processes used (array)

**Service Details:**
- service_description: Description of services offered
- pricing_model: Pricing model (hourly, project-based, retainer, etc.)
- delivery_timeline: Typical delivery timeline

**Current State:**
- revenue_range: Current revenue range (e.g., "$10k-$30k/month")
- growth_goals: Business growth goals
- biggest_challenges: Biggest business challenges (array)

Provide accurate information based on the conversation. If a field wasn't discussed, use null or an empty array as appropriate.`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: `Extract core business information from this onboarding conversation:\n\n${conversationSummary}`
      }
    ];

    // Request body with structured outputs
    const requestBody = JSON.stringify({
      model: "anthropic/claude-sonnet-4.6",
      messages: messages,
      max_tokens: 3000,
      temperature: 0.3,  // Lower temperature for accurate extraction
      response_format: CORE_MEMORIES_SCHEMA  // 🎯 This enforces JSON schema!
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://expertconsultingos.com',
        'X-Title': 'ECOS Client Onboarding'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            console.error('❌ [OPENROUTER-STRUCTURED] API error:', response.error);
            reject(new Error(response.error.message || 'OpenRouter API error'));
            return;
          }

          // Extract the JSON from response
          const content = response.choices[0].message.content;
          const coreMemoriesData = JSON.parse(content);

          console.log('✅ [OPENROUTER-STRUCTURED] Successfully extracted core memories:', coreMemoriesData);

          resolve({
            success: true,
            data: coreMemoriesData,
            usage: response.usage || {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          });

        } catch (error) {
          console.error('❌ [OPENROUTER-STRUCTURED] Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ [OPENROUTER-STRUCTURED] Request error:', error);
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Saves core memories to database
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {Object} coreMemoriesData - Extracted core memories data
 * @returns {Promise<Object>} Database operation result
 */
async function saveCoreMemories(pool, userId, coreMemoriesData) {
  try {
    // Convert arrays to PostgreSQL arrays
    const toPostgresArray = (value) => {
      if (!value) return null;
      if (Array.isArray(value)) return value;
      return null;
    };

    const dbData = {
      full_name: coreMemoriesData.full_name,
      company_name: coreMemoriesData.company_name || null,
      business_outcome: coreMemoriesData.business_outcome,
      target_clients: coreMemoriesData.target_clients,
      client_problems: toPostgresArray(coreMemoriesData.client_problems),
      client_results: coreMemoriesData.client_results,
      core_method: coreMemoriesData.core_method,
      frameworks: toPostgresArray(coreMemoriesData.frameworks),
      service_description: coreMemoriesData.service_description || null,
      pricing_model: coreMemoriesData.pricing_model || null,
      delivery_timeline: coreMemoriesData.delivery_timeline || null,
      revenue_range: coreMemoriesData.revenue_range || null,
      growth_goals: coreMemoriesData.growth_goals || null,
      biggest_challenges: toPostgresArray(coreMemoriesData.biggest_challenges)
    };

    // Check if core memories exist
    const existingMemories = await pool.query(
      'SELECT id FROM core_memories WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existingMemories.rows.length > 0) {
      // UPDATE existing
      result = await pool.query(`
        UPDATE core_memories
        SET full_name = $1, company_name = $2, business_outcome = $3,
            target_clients = $4, client_problems = $5, client_results = $6,
            core_method = $7, frameworks = $8,
            service_description = $9, pricing_model = $10, delivery_timeline = $11,
            revenue_range = $12, growth_goals = $13, biggest_challenges = $14,
            updated_at = NOW()
        WHERE user_id = $15
        RETURNING *
      `, [
        dbData.full_name, dbData.company_name, dbData.business_outcome,
        dbData.target_clients, dbData.client_problems, dbData.client_results,
        dbData.core_method, dbData.frameworks,
        dbData.service_description, dbData.pricing_model, dbData.delivery_timeline,
        dbData.revenue_range, dbData.growth_goals, dbData.biggest_challenges,
        userId
      ]);

      console.log('✅ [DB] Updated existing core memories');
    } else {
      // INSERT new
      result = await pool.query(`
        INSERT INTO core_memories (
          user_id, full_name, company_name, business_outcome,
          target_clients, client_problems, client_results,
          core_method, frameworks,
          service_description, pricing_model, delivery_timeline,
          revenue_range, growth_goals, biggest_challenges,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *
      `, [
        userId, dbData.full_name, dbData.company_name, dbData.business_outcome,
        dbData.target_clients, dbData.client_problems, dbData.client_results,
        dbData.core_method, dbData.frameworks,
        dbData.service_description, dbData.pricing_model, dbData.delivery_timeline,
        dbData.revenue_range, dbData.growth_goals, dbData.biggest_challenges
      ]);

      console.log('✅ [DB] Created new core memories');
    }

    // Also mark onboarding as complete
    await pool.query(`
      INSERT INTO user_onboarding_status (user_id, onboarding_completed, onboarding_completed_at, onboarding_started_at, current_step, total_steps)
      VALUES ($1, true, NOW(), NOW(), 11, 11)
      ON CONFLICT (user_id) DO UPDATE SET
        onboarding_completed = true,
        onboarding_completed_at = NOW(),
        current_step = 11,
        updated_at = NOW()
    `, [userId]);

    console.log('✅ [DB] Marked onboarding as complete');

    return {
      success: true,
      action: existingMemories.rows.length > 0 ? 'updated' : 'created',
      coreMemories: result.rows[0]
    };

  } catch (error) {
    console.error('❌ [DB] Error saving core memories:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  extractCoreMemoriesStructured,
  saveCoreMemories,
  CORE_MEMORIES_SCHEMA
};
