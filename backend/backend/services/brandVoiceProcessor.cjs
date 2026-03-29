/**
 * Brand Voice Processor Service
 *
 * Automatically extracts and saves brand voice profiles from AI agent responses
 * Similar to core memory processor but specifically for brand voice data
 *
 * Created: 2025-11-15
 */

const { extractBrandVoiceData, processResponse } = require('../utils/jsonExtractor.cjs');

/**
 * Process brand voice profile updates from AI response
 * Extracts BRAND_VOICE_PROFILE structured data and saves to database
 *
 * @param {object} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID that generated the response
 * @param {string} conversationId - Conversation ID
 * @param {string} responseText - Full AI response text
 * @returns {Promise<object>} - Result with success status and saved data
 */
async function processBrandVoiceUpdates(pool, userId, agentId, conversationId, responseText) {
  try {
    // Extract and process structured data from response
    const processed = processResponse(responseText);

    // Check if brand voice data exists
    if (!processed.brandVoiceData) {
      return { success: false, reason: 'No brand voice data found in response' };
    }

    const brandVoiceData = processed.brandVoiceData;
    console.log('🎨 [BRAND_VOICE] Extracted brand voice data from AI response:', brandVoiceData);

    // Map the simple format to database schema
    const dbData = {
      tone: brandVoiceData.tone,
      formality_level: brandVoiceData.formality,
      sentence_structure: brandVoiceData.sentence_structure || null,
      vocabulary_complexity: brandVoiceData.vocabulary || null,
      paragraph_length: brandVoiceData.paragraph_length || null,
      uses_contractions: brandVoiceData.uses_contractions !== undefined ? brandVoiceData.uses_contractions : null,
      uses_emojis: brandVoiceData.uses_emojis !== undefined ? brandVoiceData.uses_emojis : null,
      uses_metaphors: brandVoiceData.uses_metaphors !== undefined ? brandVoiceData.uses_metaphors : null,
      voice_summary: brandVoiceData.voice_summary,
      example_phrases: brandVoiceData.example_phrases || [],
      avoid_phrases: brandVoiceData.avoid_phrases || [],
      analyzed_documents: 1, // Increment on each analysis
      is_enabled: true // Auto-enable when populated by agent
    };

    // Check if profile already exists
    const existingProfile = await pool.query(
      'SELECT id, analyzed_documents FROM brand_voice_profiles WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      const profileId = existingProfile.rows[0].id;
      const currentCount = existingProfile.rows[0].analyzed_documents || 0;

      result = await pool.query(`
        UPDATE brand_voice_profiles
        SET
          tone = $1,
          formality_level = $2,
          sentence_structure = $3,
          vocabulary_complexity = $4,
          paragraph_length = $5,
          uses_contractions = $6,
          uses_emojis = $7,
          uses_metaphors = $8,
          voice_summary = $9,
          example_phrases = $10,
          avoid_phrases = $11,
          analyzed_documents = $12,
          is_enabled = $13,
          last_analysis_at = NOW(),
          updated_at = NOW()
        WHERE id = $14
        RETURNING *
      `, [
        dbData.tone,
        dbData.formality_level,
        dbData.sentence_structure,
        dbData.vocabulary_complexity,
        dbData.paragraph_length,
        dbData.uses_contractions,
        dbData.uses_emojis,
        dbData.uses_metaphors,
        dbData.voice_summary,
        dbData.example_phrases,
        dbData.avoid_phrases,
        currentCount + 1,
        dbData.is_enabled,
        profileId
      ]);

      console.log(`✅ [BRAND_VOICE] Updated existing profile for user ${userId}`);
    } else {
      // Insert new profile
      result = await pool.query(`
        INSERT INTO brand_voice_profiles (
          user_id,
          tone,
          formality_level,
          sentence_structure,
          vocabulary_complexity,
          paragraph_length,
          uses_contractions,
          uses_emojis,
          uses_metaphors,
          voice_summary,
          example_phrases,
          avoid_phrases,
          analyzed_documents,
          is_enabled,
          last_analysis_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
        RETURNING *
      `, [
        userId,
        dbData.tone,
        dbData.formality_level,
        dbData.sentence_structure,
        dbData.vocabulary_complexity,
        dbData.paragraph_length,
        dbData.uses_contractions,
        dbData.uses_emojis,
        dbData.uses_metaphors,
        dbData.voice_summary,
        dbData.example_phrases,
        dbData.avoid_phrases,
        dbData.analyzed_documents,
        dbData.is_enabled
      ]);

      console.log(`✅ [BRAND_VOICE] Created new profile for user ${userId}`);
    }

    return {
      success: true,
      action: existingProfile.rows.length > 0 ? 'updated' : 'created',
      profile: result.rows[0],
      brandVoiceData: brandVoiceData
    };

  } catch (error) {
    console.error('❌ [BRAND_VOICE] Error processing brand voice updates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processBrandVoiceUpdates
};
