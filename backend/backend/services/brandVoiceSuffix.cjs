/**
 * Brand Voice Suffix Service
 *
 * Generates dynamic system prompt suffixes based on user's brand voice profile.
 * This allows agents to adopt the user's specific writing style and tone.
 *
 * References: ENHANCED_ONBOARDING_AND_BRAND_VOICE_SPEC.md Phase 3, Section 3.3-3.4
 */

/**
 * Generate brand voice suffix from user's brand voice profile
 *
 * @param {Object} brandVoiceProfile - User's brand voice profile from database
 * @returns {string} - Formatted suffix to append to agent system prompt
 */
function generateBrandVoiceSuffix(brandVoiceProfile) {
  if (!brandVoiceProfile) {
    return '';
  }

  const {
    tone = 'professional',
    formality_level = 'semi-formal',
    sentence_structure = 'varied',
    vocabulary_complexity = 'moderate',
    uses_contractions = true,
    uses_emojis = false,
    uses_metaphors = false,
    paragraph_length = 'medium',
    voice_summary = '',
    example_phrases = [],
    avoid_phrases = []
  } = brandVoiceProfile;

  // Build the suffix template
  const suffix = `
---
BRAND VOICE APPLICATION:

The user has a specific brand voice. Apply these characteristics to ALL your outputs:

**Tone & Style:**
- Tone: ${tone}
- Formality: ${formality_level}
- Sentence Structure: ${sentence_structure}
- Vocabulary: ${vocabulary_complexity}

**Writing Guidelines:**
- Contractions: ${uses_contractions ? 'Use naturally (you\'re, we\'ll, that\'s)' : 'Avoid - use full forms'}
- Emojis: ${uses_emojis ? 'Use sparingly for emphasis' : 'Do not use'}
- Metaphors: ${uses_metaphors ? 'Use when helpful to clarify concepts' : 'Avoid - be literal'}
- Paragraph Length: ${paragraph_length} paragraphs

${voice_summary ? `**Voice Summary:**
${voice_summary}
` : ''}
${example_phrases && example_phrases.length > 0 ? `**Example Phrases to Incorporate:**
${example_phrases.map(phrase => `- "${phrase}"`).join('\n')}
` : ''}
${avoid_phrases && avoid_phrases.length > 0 ? `**Phrases to AVOID:**
${avoid_phrases.map(phrase => `- "${phrase}"`).join('\n')}
` : ''}
**IMPORTANT:**
- Write in THIS voice, not a generic AI voice
- Match the user's natural speaking and writing style
- Be authentic to their brand personality
- Maintain consistency across all responses
---
`;

  return suffix;
}

/**
 * Load user's brand voice profile from database
 *
 * @param {string} userId - User ID
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise<Object|null>} - Brand voice profile or null if not found
 */
async function loadBrandVoiceProfile(userId, pool, clientProfileId = null) {
  try {
    const result = await pool.query(`
      SELECT
        tone,
        formality_level,
        sentence_structure,
        vocabulary_complexity,
        uses_contractions,
        uses_emojis,
        uses_metaphors,
        paragraph_length,
        voice_summary,
        example_phrases,
        avoid_phrases,
        analyzed_documents,
        last_analysis_at
      FROM brand_voice_profiles
      WHERE user_id = $1
        AND ${clientProfileId ? 'client_profile_id = $2' : 'client_profile_id IS NULL'}
    `, clientProfileId ? [userId, clientProfileId] : [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error loading brand voice profile:', error);
    return null;
  }
}

/**
 * Check if agent should have brand voice applied
 *
 * Content-generating agents should have brand voice enabled by default.
 * Agents that primarily provide analysis or technical guidance may opt out.
 *
 * @param {string} agentId - Agent ID
 * @param {Object} agentConfig - Agent configuration from database
 * @returns {boolean} - Whether to apply brand voice
 */
function shouldApplyBrandVoice(agentId, agentConfig) {
  // Check if explicitly disabled in agent config
  if (agentConfig?.metadata?.disable_brand_voice === true) {
    return false;
  }

  // Check if explicitly enabled in agent config
  if (agentConfig?.metadata?.enable_brand_voice === true) {
    return true;
  }

  // Default: Enable ONLY for content-generating agents
  // NOT for strategy/analysis agents (Money Model Maker, Fast Fix Finder, etc.)
  const contentGeneratingAgents = [
    'offer-promo-printer',       // Creates promotional invitations
    'promo-planner',             // Creates campaign messages (social/DM/email)
    'linkedin-events-builder',   // Creates event content
    'qualification-call-builder' // Creates sales scripts (structured content output)
  ];

  return contentGeneratingAgents.includes(agentId);
}

/**
 * Build complete system prompt with brand voice suffix if applicable
 *
 * @param {string} basePrompt - Base agent system prompt
 * @param {string} agentId - Agent ID
 * @param {Object} agentConfig - Agent configuration from database
 * @param {string} userId - User ID
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise<string>} - Complete system prompt with optional brand voice suffix
 */
async function buildSystemPromptWithBrandVoice(basePrompt, agentId, agentConfig, userId, pool, clientProfileId = null) {
  // Check if brand voice should be applied
  if (!shouldApplyBrandVoice(agentId, agentConfig)) {
    return basePrompt;
  }

  // Load user's brand voice profile (scoped by client if set)
  const brandVoiceProfile = await loadBrandVoiceProfile(userId, pool, clientProfileId);
  if (!brandVoiceProfile) {
    // No brand voice profile found, return base prompt
    return basePrompt;
  }

  // Generate and append brand voice suffix
  const brandVoiceSuffix = generateBrandVoiceSuffix(brandVoiceProfile);
  return basePrompt + '\n\n' + brandVoiceSuffix;
}

module.exports = {
  generateBrandVoiceSuffix,
  loadBrandVoiceProfile,
  shouldApplyBrandVoice,
  buildSystemPromptWithBrandVoice
};
