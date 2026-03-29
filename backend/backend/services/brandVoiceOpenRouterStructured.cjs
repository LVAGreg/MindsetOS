/**
 * Brand Voice Structured Output Service - OpenRouter Version
 * Uses OpenRouter's native structured outputs feature
 * NO NEED for separate Anthropic SDK or API key!
 */

const https = require('https');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Brand Voice Profile JSON Schema for OpenRouter
 */
const BRAND_VOICE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "brand_voice_profile",
    strict: true,
    schema: {
      type: "object",
      properties: {
        tone: {
          type: "string",
          enum: ["casual", "warm", "professional", "friendly", "authoritative", "direct"],
          description: "Primary tone of the writing"
        },
        formality: {
          type: "string",
          enum: ["formal", "semi-formal", "informal"],
          description: "Level of formality in communication"
        },
        uses_contractions: {
          type: "boolean",
          description: "Whether contractions are used (you're vs you are)"
        },
        voice_summary: {
          type: "string",
          description: "1-2 sentence description of writing style"
        },
        sentence_structure: {
          type: "string",
          enum: ["short", "varied", "complex"],
          description: "Sentence length and complexity patterns"
        },
        vocabulary: {
          type: "string",
          enum: ["simple", "moderate", "advanced"],
          description: "Vocabulary complexity level"
        },
        paragraph_length: {
          type: "string",
          enum: ["short", "medium", "long"],
          description: "Typical paragraph length"
        },
        uses_emojis: {
          type: "boolean",
          description: "Whether emojis are used in writing"
        },
        uses_metaphors: {
          type: "boolean",
          description: "Whether metaphors and analogies are common"
        },
        example_phrases: {
          type: "array",
          items: { type: "string" },
          description: "Characteristic phrases from the writing samples"
        },
        avoid_phrases: {
          type: "array",
          items: { type: "string" },
          description: "Phrases or patterns to avoid (opposite of user's style)"
        }
      },
      required: ["tone", "formality", "uses_contractions", "voice_summary"],
      additionalProperties: false
    }
  }
};

/**
 * Analyzes brand voice using OpenRouter's structured outputs
 * @param {string} writingSamples - Writing content to analyze
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} Brand voice profile data
 */
function analyzeBrandVoiceOpenRouter(writingSamples, conversationHistory = []) {
  return new Promise((resolve, reject) => {
    console.log('🎨 [OPENROUTER-STRUCTURED] Using OpenRouter native structured outputs for brand voice analysis');

    // Build messages array
    const messages = [
      {
        role: "system",
        content: `You are a brand voice analyzer. Analyze the writing samples provided and extract a comprehensive brand voice profile.

Focus on:
- Overall tone (casual, warm, professional, friendly, authoritative, or direct)
- Formality level (formal, semi-formal, or informal)
- Use of contractions
- Sentence structure patterns
- Vocabulary complexity
- Paragraph length preferences
- Use of emojis and metaphors
- Characteristic phrases that define their voice
- Phrases they should avoid (opposite of their style)

Provide a clear, accurate analysis based on the actual writing samples provided.`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: `Analyze this writing sample and extract the brand voice profile:\n\n${writingSamples}`
      }
    ];

    // Request body with structured outputs
    const requestBody = JSON.stringify({
      model: "anthropic/claude-sonnet-4.6",
      messages: messages,
      max_tokens: 2000,
      temperature: 0.3,  // Lower temperature for consistent analysis
      response_format: BRAND_VOICE_SCHEMA  // 🎯 This enforces JSON schema!
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://expertconsultingos.com',
        'X-Title': 'ECOS Brand Voice Analyzer'
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
          const brandVoiceData = JSON.parse(content);

          console.log('✅ [OPENROUTER-STRUCTURED] Successfully extracted brand voice profile:', brandVoiceData);

          resolve({
            success: true,
            data: brandVoiceData,
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
 * Saves brand voice profile to database
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {Object} brandVoiceData - Extracted brand voice data
 * @returns {Promise<Object>} Database operation result
 */
async function saveBrandVoiceProfile(pool, userId, brandVoiceData) {
  try {
    // Map to database schema
    const dbData = {
      tone: brandVoiceData.tone,
      formality_level: brandVoiceData.formality,
      sentence_structure: brandVoiceData.sentence_structure || null,
      vocabulary_complexity: brandVoiceData.vocabulary || null,
      paragraph_length: brandVoiceData.paragraph_length || null,
      uses_contractions: brandVoiceData.uses_contractions,
      uses_emojis: brandVoiceData.uses_emojis || null,
      uses_metaphors: brandVoiceData.uses_metaphors || null,
      voice_summary: brandVoiceData.voice_summary,
      example_phrases: brandVoiceData.example_phrases || [],
      avoid_phrases: brandVoiceData.avoid_phrases || [],
      analyzed_documents: 1,
      is_enabled: true
    };

    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id, analyzed_documents FROM brand_voice_profiles WHERE user_id = $1',
      [userId]
    );

    let result;
    if (existingProfile.rows.length > 0) {
      // UPDATE existing
      const profileId = existingProfile.rows[0].id;
      const currentCount = existingProfile.rows[0].analyzed_documents || 0;

      result = await pool.query(`
        UPDATE brand_voice_profiles
        SET tone = $1, formality_level = $2, sentence_structure = $3,
            vocabulary_complexity = $4, paragraph_length = $5,
            uses_contractions = $6, uses_emojis = $7, uses_metaphors = $8,
            voice_summary = $9, example_phrases = $10, avoid_phrases = $11,
            analyzed_documents = $12, is_enabled = $13,
            last_analysis_at = NOW(), updated_at = NOW()
        WHERE id = $14
        RETURNING *
      `, [
        dbData.tone, dbData.formality_level, dbData.sentence_structure,
        dbData.vocabulary_complexity, dbData.paragraph_length,
        dbData.uses_contractions, dbData.uses_emojis, dbData.uses_metaphors,
        dbData.voice_summary, dbData.example_phrases, dbData.avoid_phrases,
        currentCount + 1, dbData.is_enabled, profileId
      ]);

      console.log('✅ [DB] Updated existing brand voice profile');
    } else {
      // INSERT new
      result = await pool.query(`
        INSERT INTO brand_voice_profiles (
          user_id, tone, formality_level, sentence_structure,
          vocabulary_complexity, paragraph_length, uses_contractions,
          uses_emojis, uses_metaphors, voice_summary, example_phrases,
          avoid_phrases, analyzed_documents, is_enabled,
          last_analysis_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
        RETURNING *
      `, [
        userId, dbData.tone, dbData.formality_level, dbData.sentence_structure,
        dbData.vocabulary_complexity, dbData.paragraph_length,
        dbData.uses_contractions, dbData.uses_emojis, dbData.uses_metaphors,
        dbData.voice_summary, dbData.example_phrases, dbData.avoid_phrases,
        dbData.analyzed_documents, dbData.is_enabled
      ]);

      console.log('✅ [DB] Created new brand voice profile');
    }

    return {
      success: true,
      action: existingProfile.rows.length > 0 ? 'updated' : 'created',
      profile: result.rows[0]
    };

  } catch (error) {
    console.error('❌ [DB] Error saving brand voice profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeBrandVoiceOpenRouter,
  saveBrandVoiceProfile,
  BRAND_VOICE_SCHEMA
};
