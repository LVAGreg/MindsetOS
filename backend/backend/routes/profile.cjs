/**
 * Profile Routes Module
 * Handles user profile data including brand voice and core memories
 */

/**
 * Helper function to parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * Register profile-related routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerProfileRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * GET /api/profile/brand-voice
     * Get brand voice profile for current user
     */
    async getBrandVoice(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT
            tone,
            formality_level as "formalityLevel",
            sentence_structure as "sentenceStructure",
            vocabulary_complexity as "vocabularyComplexity",
            uses_contractions as "usesContractions",
            uses_emojis as "usesEmojis",
            uses_metaphors as "usesMetaphors",
            paragraph_length as "paragraphLength",
            voice_summary as "voiceSummary",
            example_phrases as "examplePhrases",
            avoid_phrases as "avoidPhrases",
            analyzed_documents as "analyzedDocuments",
            last_analysis_at as "lastAnalysisAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
           FROM brand_voice_profiles
           WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          // Return empty profile if not found
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify(null));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error('❌ Error fetching brand voice:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch brand voice profile' }));
      }
    },

    /**
     * PUT /api/profile/brand-voice
     * Update brand voice profile for current user
     */
    async updateBrandVoice(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);

        const {
          tone,
          formalityLevel,
          sentenceStructure,
          vocabularyComplexity,
          usesContractions,
          usesEmojis,
          usesMetaphors,
          paragraphLength,
          voiceSummary,
          examplePhrases,
          avoidPhrases
        } = body;

        // Check if profile exists
        const existingProfile = await pool.query(
          'SELECT id FROM brand_voice_profiles WHERE user_id = $1',
          [userId]
        );

        let result;
        if (existingProfile.rows.length > 0) {
          // Update existing
          result = await pool.query(
            `UPDATE brand_voice_profiles
             SET tone = $1,
                 formality_level = $2,
                 sentence_structure = $3,
                 vocabulary_complexity = $4,
                 uses_contractions = $5,
                 uses_emojis = $6,
                 uses_metaphors = $7,
                 paragraph_length = $8,
                 voice_summary = $9,
                 example_phrases = $10,
                 avoid_phrases = $11,
                 updated_at = NOW()
             WHERE user_id = $12
             RETURNING
               tone,
               formality_level as "formalityLevel",
               sentence_structure as "sentenceStructure",
               vocabulary_complexity as "vocabularyComplexity",
               uses_contractions as "usesContractions",
               uses_emojis as "usesEmojis",
               uses_metaphors as "usesMetaphors",
               paragraph_length as "paragraphLength",
               voice_summary as "voiceSummary",
               example_phrases as "examplePhrases",
               avoid_phrases as "avoidPhrases"`,
            [tone, formalityLevel, sentenceStructure, vocabularyComplexity,
             usesContractions, usesEmojis, usesMetaphors, paragraphLength,
             voiceSummary, examplePhrases, avoidPhrases, userId]
          );
        } else {
          // Insert new
          result = await pool.query(
            `INSERT INTO brand_voice_profiles
             (user_id, tone, formality_level, sentence_structure, vocabulary_complexity,
              uses_contractions, uses_emojis, uses_metaphors, paragraph_length,
              voice_summary, example_phrases, avoid_phrases)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING
               tone,
               formality_level as "formalityLevel",
               sentence_structure as "sentenceStructure",
               vocabulary_complexity as "vocabularyComplexity",
               uses_contractions as "usesContractions",
               uses_emojis as "usesEmojis",
               uses_metaphors as "usesMetaphors",
               paragraph_length as "paragraphLength",
               voice_summary as "voiceSummary",
               example_phrases as "examplePhrases",
               avoid_phrases as "avoidPhrases"`,
            [userId, tone, formalityLevel, sentenceStructure, vocabularyComplexity,
             usesContractions, usesEmojis, usesMetaphors, paragraphLength,
             voiceSummary, examplePhrases, avoidPhrases]
          );
        }

        console.log(`✅ Updated brand voice profile for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          brandVoice: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error updating brand voice:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update brand voice profile' }));
      }
    },

    /**
     * GET /api/profile/complete
     * Get complete user profile (core memories + brand voice + onboarding status)
     */
    async getCompleteProfile(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        // Get core memories
        const coreMemoriesResult = await pool.query(
          `SELECT full_name as "fullName", company_name as "companyName",
                  business_outcome as "businessOutcome", target_clients as "targetClients",
                  client_problems as "clientProblems", client_results as "clientResults",
                  core_method as "coreMethod", frameworks,
                  service_description as "serviceDescription", pricing_model as "pricingModel",
                  delivery_timeline as "deliveryTimeline", revenue_range as "revenueRange",
                  growth_goals as "growthGoals", biggest_challenges as "biggestChallenges",
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM core_memories
           WHERE user_id = $1`,
          [userId]
        );

        // Get brand voice
        const brandVoiceResult = await pool.query(
          `SELECT
            tone,
            formality_level as "formalityLevel",
            sentence_structure as "sentenceStructure",
            vocabulary_complexity as "vocabularyComplexity",
            uses_contractions as "usesContractions",
            uses_emojis as "usesEmojis",
            uses_metaphors as "usesMetaphors",
            paragraph_length as "paragraphLength",
            voice_summary as "voiceSummary",
            example_phrases as "examplePhrases",
            avoid_phrases as "avoidPhrases",
            analyzed_documents as "analyzedDocuments",
            last_analysis_at as "lastAnalysisAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
           FROM brand_voice_profiles
           WHERE user_id = $1`,
          [userId]
        );

        // Get onboarding status
        const onboardingStatusResult = await pool.query(
          `SELECT onboarding_completed as "onboardingCompleted",
                  onboarding_started_at as "onboardingStartedAt",
                  onboarding_completed_at as "onboardingCompletedAt",
                  current_step as "currentStep",
                  total_steps as "totalSteps"
           FROM user_onboarding_status
           WHERE user_id = $1`,
          [userId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          coreMemories: coreMemoriesResult.rows[0] || null,
          brandVoice: brandVoiceResult.rows[0] || null,
          onboardingStatus: onboardingStatusResult.rows[0] || null
        }));
      } catch (error) {
        console.error('❌ Error fetching complete profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch complete profile' }));
      }
    }
  };
}

module.exports = { registerProfileRoutes };
