/**
 * Brand Voice Profile Extractor
 * Analyzes text content and extracts structured brand voice characteristics
 * Used by Brand Voice Analyzer agent to create voice profiles
 */

/**
 * Extract brand voice profile from text content
 * In production, this would call the brand-voice-analyzer agent
 * For now, provides basic pattern detection
 *
 * @param {string} content - Combined document content
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Brand voice profile
 */
async function extractBrandVoiceProfile(content, pool) {
  // Basic analysis (in production, this would be done by the AI agent)

  // Analyze contractions
  const contractionPattern = /\b(you're|we're|I'm|they're|it's|that's|here's|what's|let's|don't|can't|won't|isn't|aren't)\b/gi;
  const contractionMatches = content.match(contractionPattern) || [];
  const usesContractions = contractionMatches.length > 5;

  // Analyze emojis
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  const emojiMatches = content.match(emojiPattern) || [];
  const usesEmojis = emojiMatches.length > 0;

  // Analyze sentence length (basic)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;

  let sentenceStructure = 'varied';
  if (avgSentenceLength < 15) {
    sentenceStructure = 'short and punchy';
  } else if (avgSentenceLength > 25) {
    sentenceStructure = 'complex and detailed';
  }

  // Analyze paragraph structure
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const avgSentencesPerParagraph = paragraphs.reduce((sum, p) => {
    const pSentences = p.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sum + pSentences.length;
  }, 0) / Math.max(paragraphs.length, 1);

  let paragraphLength = 'medium';
  if (avgSentencesPerParagraph < 3) {
    paragraphLength = 'short';
  } else if (avgSentencesPerParagraph > 5) {
    paragraphLength = 'long';
  }

  // Detect common phrases (simple version)
  const commonWords = ['here\'s', 'let me', 'you need', 'the thing is', 'bottom line'];
  const examplePhrases = commonWords.filter(phrase => {
    const regex = new RegExp(phrase, 'gi');
    return content.match(regex);
  });

  // Detect metaphors (basic detection)
  const metaphorIndicators = ['like', 'as if', 'metaphorically', 'imagine', 'think of it as'];
  const usesMetaphors = metaphorIndicators.some(indicator => {
    const regex = new RegExp(indicator, 'gi');
    return content.match(regex);
  });

  // Analyze formality
  const formalIndicators = ['therefore', 'furthermore', 'however', 'moreover', 'consequently'];
  const informalIndicators = ['yeah', 'gonna', 'wanna', 'stuff', 'things'];

  const formalCount = formalIndicators.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return sum + (content.match(regex) || []).length;
  }, 0);

  const informalCount = informalIndicators.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return sum + (content.match(regex) || []).length;
  }, 0);

  let formalityLevel = 'semi-formal';
  if (formalCount > informalCount * 2) {
    formalityLevel = 'formal';
  } else if (informalCount > formalCount * 2) {
    formalityLevel = 'informal';
  }

  // Determine vocabulary complexity (basic)
  const complexWords = ['subsequently', 'nevertheless', 'optimize', 'facilitate', 'implement'];
  const complexWordCount = complexWords.reduce((sum, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return sum + (content.match(regex) || []).length;
  }, 0);

  let vocabularyComplexity = 'moderate';
  if (complexWordCount > 10) {
    vocabularyComplexity = 'advanced';
  } else if (complexWordCount < 3) {
    vocabularyComplexity = 'simple';
  }

  // Generate voice summary
  const voiceSummary = `This voice uses ${usesContractions ? 'natural contractions' : 'formal language'} and ${sentenceStructure} sentences. The tone is ${formalityLevel} with ${vocabularyComplexity} vocabulary. ${usesMetaphors ? 'Strategic use of metaphors makes concepts concrete.' : 'Direct explanations without heavy use of metaphors.'} Paragraphs are ${paragraphLength}, creating ${paragraphLength === 'short' ? 'scannable, digestible content' : 'in-depth explanations'}.`;

  // Build profile
  return {
    tone: `${formalityLevel} expert with ${usesContractions ? 'approachable' : 'professional'} communication style`,
    formality_level: formalityLevel,
    sentence_structure: sentenceStructure,
    vocabulary_complexity: vocabularyComplexity,
    uses_contractions: usesContractions,
    uses_emojis: usesEmojis,
    uses_metaphors: usesMetaphors,
    paragraph_length: paragraphLength,
    voice_summary: voiceSummary,
    example_phrases: examplePhrases.length > 0 ? examplePhrases : ['Let me show you', 'Here\'s what matters', 'The key is'],
    avoid_phrases: ['At the end of the day', 'Think outside the box', 'Leverage synergies']
  };
}

/**
 * Parse brand voice profile from agent response
 * Extracts JSON from <BRAND_VOICE_PROFILE> tags
 *
 * @param {string} response - Agent response text
 * @returns {Object|null} Parsed profile or null if not found
 */
function parseBrandVoiceProfile(response) {
  const match = response.match(/<BRAND_VOICE_PROFILE>([\s\S]*?)<\/BRAND_VOICE_PROFILE>/);
  if (!match) return null;

  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    console.error('❌ Error parsing brand voice profile JSON:', error);
    return null;
  }
}

module.exports = {
  extractBrandVoiceProfile,
  parseBrandVoiceProfile
};
