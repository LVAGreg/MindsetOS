/**
 * Brand Voice Structured Output Service
 * Uses Anthropic's native structured outputs beta feature for guaranteed JSON format
 * Beta: "structured-outputs-2025-11-13"
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY, // Fallback for now
});

/**
 * Brand Voice Profile Schema
 * Matches database brand_voice_profiles table structure
 */
const BRAND_VOICE_SCHEMA = {
  type: "json_schema",
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
};

/**
 * Analyzes writing samples and extracts brand voice profile using structured outputs
 * @param {string} writingSamples - The writing content to analyze
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} Brand voice profile data
 */
async function analyzeBrandVoice(writingSamples, conversationHistory = []) {
  try {
    console.log('🎨 [STRUCTURED] Using Anthropic native structured outputs for brand voice analysis');

    // Build messages array
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: `Analyze this writing sample and extract the brand voice profile:\n\n${writingSamples}`
      }
    ];

    const response = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      betas: ["structured-outputs-2025-11-13"],
      messages: messages,
      output_format: BRAND_VOICE_SCHEMA
    });

    // Extract the JSON from response
    const brandVoiceData = JSON.parse(response.content[0].text);

    console.log('✅ [STRUCTURED] Successfully extracted brand voice profile:', brandVoiceData);

    return {
      success: true,
      data: brandVoiceData,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    };

  } catch (error) {
    console.error('❌ [STRUCTURED] Error analyzing brand voice:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
  analyzeBrandVoice,
  saveBrandVoiceProfile,
  BRAND_VOICE_SCHEMA
};
