#!/usr/bin/env node
/**
 * Memory Extractor - AI-powered extraction of important facts from conversations
 * Uses OpenRouter GPT-4o to intelligently identify memorable information
 */

const https = require('https');

const OPENROUTER_API_KEY = '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';

/**
 * Extract important memories from conversation messages
 * @param {Array} messages - Array of {role, content} message objects
 * @param {string} userId - User ID for context
 * @param {string} agentId - Agent ID for context
 * @returns {Promise<Array>} - Array of extracted memories with categories and scores
 */
async function extractMemories(messages, userId, agentId) {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Build conversation context
  const conversationText = messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  const extractionPrompt = `You are a memory extraction agent. Analyze this conversation and extract important facts worth remembering long-term.

CONVERSATION:
${conversationText}

TASK:
Extract memories that are:
- Business context (target audience, industry, market, company details)
- Pain points (problems, challenges, frustrations)
- Goals (objectives, desired outcomes, targets)
- Preferences (likes, dislikes, communication style)
- Decisions (choices made, commitments, action items)
- Strategies (approaches, methodologies, frameworks)

RULES:
1. Only extract facts explicitly stated by the user
2. Be specific and concrete
3. Avoid generic platitudes
4. Each memory should be standalone (no pronouns)
5. Focus on business/professional context

Return valid JSON in this EXACT format (no markdown, no code blocks):
{
  "memories": [
    {
      "text": "User helps small accounting firms in Australia with 10-30 employees",
      "category": "business_context",
      "confidence": 0.95,
      "reasoning": "Explicitly stated target audience"
    }
  ]
}

If no important memories, return: {"memories": []}`;

  try {
    const response = await callOpenRouter(extractionPrompt);

    // Parse JSON response
    let parsed;
    try {
      // Remove markdown code blocks if present
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

    console.log(`🧠 Extracted ${parsed.memories.length} memories from conversation`);
    return parsed.memories;

  } catch (error) {
    console.error('❌ Memory extraction failed:', error.message);
    return [];
  }
}

/**
 * Score importance of extracted memories
 * @param {Array} memories - Array of memory objects
 * @returns {Promise<Array>} - Memories with importance_score added (0.0-1.0)
 */
async function scoreImportance(memories) {
  if (!memories || memories.length === 0) {
    return [];
  }

  const scoringPrompt = `You are a memory importance scorer. Rate each memory's long-term value.

MEMORIES TO SCORE:
${memories.map((m, i) => `${i + 1}. "${m.text}" (category: ${m.category})`).join('\n')}

SCORING CRITERIA (0.0-1.0):
- 0.9-1.0: Critical business context (target audience, core offering, key metrics)
- 0.7-0.8: Important preferences or strategic decisions
- 0.5-0.6: Useful context or secondary information
- 0.3-0.4: Minor details or temporary context
- 0.0-0.2: Trivial or redundant information

Return valid JSON in this EXACT format (no markdown):
{
  "scores": [
    {"index": 0, "score": 0.95, "reasoning": "Core business context"},
    {"index": 1, "score": 0.7, "reasoning": "Important preference"}
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
      // Fallback: assign default scores based on category
      return memories.map(m => ({
        ...m,
        importance_score: getCategoryDefaultScore(m.category)
      }));
    }

    if (!parsed.scores || !Array.isArray(parsed.scores)) {
      // Fallback to category-based scoring
      return memories.map(m => ({
        ...m,
        importance_score: getCategoryDefaultScore(m.category)
      }));
    }

    // Apply scores
    const scoredMemories = memories.map((memory, index) => {
      const scoreData = parsed.scores.find(s => s.index === index);
      return {
        ...memory,
        importance_score: scoreData ? scoreData.score : getCategoryDefaultScore(memory.category)
      };
    });

    console.log(`📊 Scored ${scoredMemories.length} memories`);
    return scoredMemories;

  } catch (error) {
    console.error('❌ Importance scoring failed:', error.message);
    // Fallback to category-based scores
    return memories.map(m => ({
      ...m,
      importance_score: getCategoryDefaultScore(m.category)
    }));
  }
}

/**
 * Get default importance score based on category
 */
function getCategoryDefaultScore(category) {
  const defaults = {
    'business_context': 0.9,
    'goal': 0.85,
    'pain_point': 0.8,
    'strategy': 0.75,
    'decision': 0.7,
    'preference': 0.6
  };
  return defaults[category] || 0.5;
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(prompt) {
  const requestBody = JSON.stringify({
    model: 'openai/gpt-4o-mini', // GPT-4o-mini for fast, cost-effective memory extraction
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 3000,
    temperature: 0.2 // Lower temperature for more consistent extraction
  });

  const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ecos.local',
      'X-Title': 'ECOS Memory System',
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
  extractMemories,
  scoreImportance
};
