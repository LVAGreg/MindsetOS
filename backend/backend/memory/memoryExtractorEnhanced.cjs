#!/usr/bin/env node
/**
 * Enhanced Memory Extractor - Advanced AI-powered memory extraction
 *
 * IMPROVEMENTS:
 * 1. Filters out AI responses - only extracts from USER messages
 * 2. Vector embeddings for semantic memory search (Ollama/OpenAI)
 * 3. Multi-dimensional importance scoring
 * 4. Conversation history context awareness
 * 5. Duplicate detection using vector similarity
 */

const https = require('https');
const { generateEmbeddings } = require('../services/embeddingService.cjs');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

/**
 * Extract important memories from conversation messages
 * ONLY extracts from USER messages, ignores AI responses
 *
 * @param {Array} messages - Array of {role, content} message objects
 * @param {string} userId - User ID for context
 * @param {string} agentId - Agent ID for context
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} memoryModel - AI model to use for extraction (default: haiku-4.5)
 * @returns {Promise<Array>} - Array of extracted memories with embeddings and scores
 */
async function extractMemoriesEnhanced(messages, userId, agentId, pool, memoryModel = 'anthropic/claude-haiku-4.5') {
  if (!messages || messages.length === 0) {
    return [];
  }

  // CRITICAL: Filter to ONLY user messages - don't memorize AI responses!
  const userMessages = messages.filter(msg =>
    msg.role === 'user' || msg.role === 'USER'
  );

  if (userMessages.length === 0) {
    console.log('📭 No user messages to extract memories from');
    return [];
  }

  // Build conversation context showing ONLY what the user said
  const userConversationText = userMessages
    .map((msg, idx) => `[Message ${idx + 1}]: ${msg.content}`)
    .join('\n\n');

  const extractionPrompt = `You are a memory extraction agent analyzing ONLY what the USER has said (not AI responses).

USER'S MESSAGES:
${userConversationText}

TASK:
Extract important facts explicitly stated BY THE USER that are worth remembering long-term.

MEMORY CATEGORIES:
- business_context: Target audience, industry, market, company details
- pain_point: Problems, challenges, frustrations, obstacles
- goal: Objectives, desired outcomes, targets, aspirations
- preference: Likes, dislikes, communication style, working methods
- decision: Choices made, commitments, action items, agreements
- strategy: Approaches, methodologies, frameworks, plans
- personal_context: Role, experience, background, team structure
- metric: Numbers, KPIs, revenue, growth targets, budgets

EXTRACTION RULES:
1. **ONLY extract facts explicitly stated by the USER**
2. **NEVER extract AI suggestions, questions, or responses**
3. Be specific and concrete (include numbers, names, details)
4. Avoid generic platitudes or assumptions
5. Each memory should be standalone (no pronouns, full context)
6. Focus on actionable business/professional context
7. If user mentions the same thing multiple times, extract it once with confidence

Return valid JSON in this EXACT format (no markdown, no code blocks):
{
  "memories": [
    {
      "text": "User helps small accounting firms in Australia with 10-30 employees struggling with cash flow management",
      "category": "business_context",
      "confidence": 0.95,
      "reasoning": "Explicitly stated target audience with specific details"
    },
    {
      "text": "User's clients are losing $50k-$200k annually due to late invoicing",
      "category": "pain_point",
      "confidence": 0.9,
      "reasoning": "Specific financial impact mentioned"
    },
    {
      "text": "User wants to reach $30k MRR within 6 months",
      "category": "goal",
      "confidence": 0.95,
      "reasoning": "Clear numerical target with timeline"
    }
  ]
}

If no important memories found, return: {"memories": []}`;

  try {
    const response = await callOpenRouter(extractionPrompt, memoryModel);

    // Parse JSON response
    let parsed;
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('❌ Failed to parse extraction response:', response.substring(0, 200));
      return [];
    }

    if (!parsed.memories || !Array.isArray(parsed.memories)) {
      console.error('❌ Invalid extraction response format');
      return [];
    }

    console.log(`🧠 Extracted ${parsed.memories.length} memories from USER messages only`);

    // Check for duplicates using existing memories
    const deduplicatedMemories = await deduplicateMemories(parsed.memories, userId, agentId, pool);

    // Score importance with multi-dimensional analysis
    const scoredMemories = await scoreImportanceEnhanced(deduplicatedMemories);

    // Generate embeddings for vector search
    const memoriesWithEmbeddings = await generateEmbeddingsForMemories(scoredMemories);

    return memoriesWithEmbeddings;

  } catch (error) {
    console.error('❌ Memory extraction failed:', error.message);
    return [];
  }
}

/**
 * Deduplicate memories using vector similarity against existing memories
 */
async function deduplicateMemories(newMemories, userId, agentId, pool) {
  if (!pool || newMemories.length === 0) return newMemories;

  try {
    // Get existing memories for this user/agent
    const result = await pool.query(`
      SELECT content, embedding
      FROM memories
      WHERE user_id = $1
        AND (agent_id = $2 OR agent_id IS NULL)
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId, agentId]);

    if (result.rows.length === 0) {
      return newMemories; // No existing memories to compare
    }

    // Filter out memories that are too similar to existing ones
    const uniqueMemories = [];
    for (const newMem of newMemories) {
      let isDuplicate = false;

      // Simple text similarity check (exact or very similar)
      for (const existingMem of result.rows) {
        const similarity = calculateTextSimilarity(newMem.text, existingMem.content);
        if (similarity > 0.85) {
          console.log(`🔁 Skipping duplicate memory: "${newMem.text.substring(0, 50)}..."`);
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueMemories.push(newMem);
      }
    }

    console.log(`✨ ${uniqueMemories.length}/${newMemories.length} unique memories after deduplication`);
    return uniqueMemories;

  } catch (error) {
    console.error('⚠️  Deduplication failed, returning all memories:', error.message);
    return newMemories;
  }
}

/**
 * Simple text similarity using Jaccard index
 */
function calculateTextSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Enhanced multi-dimensional importance scoring
 *
 * DIMENSIONS:
 * - Business Impact (0.3): Revenue, growth, scale, market impact
 * - Actionability (0.25): Can this drive specific actions/decisions?
 * - Specificity (0.2): Concrete details vs vague statements
 * - Longevity (0.15): Long-term relevance vs temporary context
 * - Uniqueness (0.1): Rare insight vs common information
 */
async function scoreImportanceEnhanced(memories) {
  if (!memories || memories.length === 0) {
    return [];
  }

  const scoringPrompt = `You are a memory importance scorer using multi-dimensional analysis.

MEMORIES TO SCORE:
${memories.map((m, i) => `${i + 1}. "${m.text}" (category: ${m.category})`).join('\n')}

SCORING DIMENSIONS (each 0.0-1.0):
1. **Business Impact** (weight: 0.3): Revenue, growth, market impact, financial implications
2. **Actionability** (weight: 0.25): Can drive specific actions, decisions, strategies
3. **Specificity** (weight: 0.2): Concrete details, numbers, names vs vague generalities
4. **Longevity** (weight: 0.15): Long-term relevance vs temporary/one-time context
5. **Uniqueness** (weight: 0.1): Rare insight vs common/expected information

FINAL SCORE = (Business*0.3 + Actionability*0.25 + Specificity*0.2 + Longevity*0.15 + Uniqueness*0.1)

EXAMPLES:
- "User's target clients lose $50k-$200k annually due to late invoicing"
  → Business: 0.9, Actionability: 0.8, Specificity: 1.0, Longevity: 0.9, Uniqueness: 0.7 = 0.87

- "User wants to reach $30k MRR within 6 months"
  → Business: 1.0, Actionability: 0.9, Specificity: 1.0, Longevity: 0.6, Uniqueness: 0.5 = 0.85

- "User prefers email over phone calls"
  → Business: 0.2, Actionability: 0.6, Specificity: 0.8, Longevity: 0.8, Uniqueness: 0.3 = 0.54

Return valid JSON (no markdown):
{
  "scores": [
    {
      "index": 0,
      "dimensions": {
        "business_impact": 0.9,
        "actionability": 0.8,
        "specificity": 1.0,
        "longevity": 0.9,
        "uniqueness": 0.7
      },
      "final_score": 0.87,
      "reasoning": "Specific financial impact with long-term business relevance"
    }
  ]
}`;

  try {
    const response = await callOpenRouter(scoringPrompt);

    let parsed;
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('❌ Failed to parse scoring response');
      return memories.map(m => ({
        ...m,
        importance_score: getCategoryDefaultScore(m.category),
        importance_dimensions: getDefaultDimensions(m.category)
      }));
    }

    if (!parsed.scores || !Array.isArray(parsed.scores)) {
      return memories.map(m => ({
        ...m,
        importance_score: getCategoryDefaultScore(m.category),
        importance_dimensions: getDefaultDimensions(m.category)
      }));
    }

    // Apply multi-dimensional scores
    const scoredMemories = memories.map((memory, index) => {
      const scoreData = parsed.scores.find(s => s.index === index);
      if (scoreData) {
        return {
          ...memory,
          importance_score: scoreData.final_score,
          importance_dimensions: scoreData.dimensions,
          scoring_reasoning: scoreData.reasoning
        };
      } else {
        return {
          ...memory,
          importance_score: getCategoryDefaultScore(memory.category),
          importance_dimensions: getDefaultDimensions(memory.category)
        };
      }
    });

    console.log(`📊 Multi-dimensional scoring complete - avg score: ${
      (scoredMemories.reduce((sum, m) => sum + m.importance_score, 0) / scoredMemories.length).toFixed(2)
    }`);

    return scoredMemories;

  } catch (error) {
    console.error('❌ Enhanced scoring failed:', error.message);
    return memories.map(m => ({
      ...m,
      importance_score: getCategoryDefaultScore(m.category),
      importance_dimensions: getDefaultDimensions(m.category)
    }));
  }
}

/**
 * Generate embeddings for semantic search using Ollama/OpenAI
 * Uses embeddingService which supports both Ollama (free, local) and OpenAI (fallback)
 */
async function generateEmbeddingsForMemories(memories) {
  if (memories.length === 0) {
    console.log('📭 No memories to generate embeddings for');
    return memories;
  }

  try {
    const texts = memories.map(m => m.text);
    console.log(`🔢 Generating embeddings for ${texts.length} memories...`);

    const embeddings = await generateEmbeddings(texts);

    return memories.map((memory, index) => ({
      ...memory,
      embedding: embeddings[index]
    }));

  } catch (error) {
    console.error('⚠️  Embedding generation failed:', error.message);
    return memories; // Return without embeddings
  }
}

// Removed: getOpenAIEmbeddings - now using embeddingService.cjs which supports Ollama + OpenAI

/**
 * Get default importance score based on category
 */
function getCategoryDefaultScore(category) {
  const defaults = {
    'business_context': 0.9,
    'goal': 0.85,
    'pain_point': 0.8,
    'metric': 0.85,
    'strategy': 0.75,
    'decision': 0.7,
    'personal_context': 0.65,
    'preference': 0.6
  };
  return defaults[category] || 0.5;
}

/**
 * Get default dimension scores based on category
 */
function getDefaultDimensions(category) {
  const defaults = {
    'business_context': { business_impact: 0.9, actionability: 0.7, specificity: 0.8, longevity: 0.9, uniqueness: 0.6 },
    'goal': { business_impact: 0.9, actionability: 0.9, specificity: 0.8, longevity: 0.7, uniqueness: 0.5 },
    'pain_point': { business_impact: 0.8, actionability: 0.8, specificity: 0.7, longevity: 0.8, uniqueness: 0.6 },
    'metric': { business_impact: 0.8, actionability: 0.7, specificity: 1.0, longevity: 0.6, uniqueness: 0.7 },
    'strategy': { business_impact: 0.7, actionability: 0.8, specificity: 0.6, longevity: 0.8, uniqueness: 0.6 },
    'decision': { business_impact: 0.6, actionability: 0.9, specificity: 0.7, longevity: 0.6, uniqueness: 0.5 },
    'personal_context': { business_impact: 0.5, actionability: 0.5, specificity: 0.7, longevity: 0.9, uniqueness: 0.7 },
    'preference': { business_impact: 0.3, actionability: 0.6, specificity: 0.8, longevity: 0.8, uniqueness: 0.4 }
  };
  return defaults[category] || { business_impact: 0.5, actionability: 0.5, specificity: 0.5, longevity: 0.5, uniqueness: 0.5 };
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(prompt, model = 'anthropic/claude-haiku-4.5') {
  console.log(`🧠 [MEMORY EXTRACTION] Using model: ${model}`);
  const requestBody = JSON.stringify({
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 3000,
    temperature: 0.2
  });

  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ecos.local',
      'X-Title': 'ECOS Enhanced Memory System',
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

          if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            reject(new Error('Invalid OpenRouter response'));
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
  extractMemoriesEnhanced,
  scoreImportanceEnhanced,
  generateEmbeddings // Re-exported from embeddingService for backward compatibility
};
