/**
 * JSON Extractor Utility
 *
 * Extracts and parses structured JSON data from agent responses
 * Handles <STRUCTURED_DATA> blocks for memory extraction
 *
 * Created: 2025-11-12
 * Phase 2.1: Memory System Enhancement
 */

/**
 * Extract structured JSON data from agent response
 * Looks for <STRUCTURED_DATA>...</STRUCTURED_DATA> tags
 *
 * @param {string} responseText - Full AI response text
 * @returns {object|null} - Parsed JSON object or null if not found/invalid
 */
function extractStructuredData(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return null;
  }

  try {
    // Match <STRUCTURED_DATA> tags (case-insensitive, multiline)
    const regex = /<STRUCTURED_DATA>([\s\S]*?)<\/STRUCTURED_DATA>/i;
    const match = responseText.match(regex);

    if (!match || !match[1]) {
      // No structured data found - this is normal for many responses
      return null;
    }

    const jsonString = match[1].trim();

    // Parse the JSON
    const parsedData = JSON.parse(jsonString);

    console.log('✅ Successfully extracted structured data from response');
    return parsedData;

  } catch (error) {
    console.error('❌ Failed to extract structured data:', error.message);
    return null;
  }
}

/**
 * Remove structured data tags from response to clean user-facing text
 *
 * @param {string} responseText - Full AI response text
 * @returns {string} - Cleaned response without structured data tags
 */
function removeStructuredDataTags(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return responseText;
  }

  // Remove <STRUCTURED_DATA>...</STRUCTURED_DATA> blocks
  const regex = /<STRUCTURED_DATA>[\s\S]*?<\/STRUCTURED_DATA>/gi;
  return responseText.replace(regex, '').trim();
}

/**
 * Validate structured data format
 * Ensures required fields are present
 *
 * @param {object} data - Parsed structured data object
 * @returns {boolean} - True if valid, false otherwise
 */
function validateStructuredData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for at least one of the expected top-level keys
  const validKeys = ['user_insights', 'memory_updates', 'onboarding_data', 'brand_voice_analysis', 'BRAND_VOICE_PROFILE'];
  const hasValidKey = validKeys.some(key => key in data);

  return hasValidKey;
}

/**
 * Extract onboarding data from structured data
 *
 * @param {object} structuredData - Parsed structured data
 * @returns {object|null} - Onboarding data object or null
 */
function extractOnboardingData(structuredData) {
  if (!structuredData || !structuredData.onboarding_data) {
    return null;
  }

  return structuredData.onboarding_data;
}

/**
 * Extract memory updates from structured data
 *
 * @param {object} structuredData - Parsed structured data
 * @returns {object|null} - Memory updates object or null
 */
function extractMemoryUpdates(structuredData) {
  if (!structuredData || !structuredData.memory_updates) {
    return null;
  }

  return structuredData.memory_updates;
}

/**
 * Extract user insights from structured data
 *
 * @param {object} structuredData - Parsed structured data
 * @returns {object|null} - User insights object or null
 */
function extractUserInsights(structuredData) {
  if (!structuredData || !structuredData.user_insights) {
    return null;
  }

  return structuredData.user_insights;
}

/**
 * Extract brand voice profile from structured data
 *
 * @param {object} structuredData - Parsed structured data
 * @returns {object|null} - Brand voice profile object or null
 */
function extractBrandVoiceData(structuredData) {
  if (!structuredData || !structuredData.BRAND_VOICE_PROFILE) {
    return null;
  }

  return structuredData.BRAND_VOICE_PROFILE;
}

/**
 * Process structured data and return categorized results
 *
 * @param {string} responseText - Full AI response text
 * @returns {object} - Object with cleanedResponse, structuredData, and categorized extracts
 */
function processResponse(responseText) {
  const structuredData = extractStructuredData(responseText);
  const cleanedResponse = removeStructuredDataTags(responseText);

  return {
    cleanedResponse,
    structuredData,
    hasStructuredData: structuredData !== null,
    isValid: structuredData ? validateStructuredData(structuredData) : false,
    onboardingData: structuredData ? extractOnboardingData(structuredData) : null,
    memoryUpdates: structuredData ? extractMemoryUpdates(structuredData) : null,
    userInsights: structuredData ? extractUserInsights(structuredData) : null,
    brandVoiceData: structuredData ? extractBrandVoiceData(structuredData) : null
  };
}

module.exports = {
  extractStructuredData,
  removeStructuredDataTags,
  validateStructuredData,
  extractOnboardingData,
  extractMemoryUpdates,
  extractUserInsights,
  extractBrandVoiceData,
  processResponse
};
