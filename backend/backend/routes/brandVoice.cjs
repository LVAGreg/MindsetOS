/**
 * Brand Voice Routes Module
 * Handles brand voice document upload, analysis, and profile management
 * Phase 3 of Enhanced Onboarding & Brand Voice System
 *
 * API Endpoints:
 * - POST /api/brand-voice/upload - Upload document for analysis
 * - POST /api/brand-voice/analyze - Trigger brand voice analysis
 * - GET /api/brand-voice/profile - Get brand voice profile
 * - PUT /api/brand-voice/profile - Update brand voice profile
 * - GET /api/brand-voice/documents - List uploaded documents
 * - DELETE /api/brand-voice/documents/:id - Delete document
 */

const { extractBrandVoiceProfile } = require('../memory/brandVoiceExtractor.cjs');
const { analyzeBrandVoiceOpenRouter, saveBrandVoiceProfile } = require('../services/brandVoiceOpenRouterStructured.cjs');

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
 * Count words in text
 */
function countWords(text) {
  return text.trim().split(/\s+/).length;
}

/**
 * Register brand voice routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerBrandVoiceRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * POST /api/brand-voice/upload
     * Upload document for brand voice analysis
     * Body: { documentType: string, content: string }
     */
    async uploadDocument(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { documentType, content } = body;

        // Validation
        if (!documentType || !content) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Missing required fields: documentType and content'
          }));
          return;
        }

        // Valid document types
        const validTypes = ['website_copy', 'email', 'transcript', 'social_media'];
        if (!validTypes.includes(documentType)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: `Invalid documentType. Must be one of: ${validTypes.join(', ')}`
          }));
          return;
        }

        const wordCount = countWords(content);

        // Minimum word count requirement
        if (wordCount < 100) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Document too short. Minimum 100 words required for analysis.'
          }));
          return;
        }

        // Insert document
        const result = await pool.query(
          `INSERT INTO brand_voice_documents
           (user_id, document_type, content, word_count, analyzed)
           VALUES ($1, $2, $3, $4, false)
           RETURNING id, user_id, document_type, word_count, analyzed, created_at`,
          [userId, documentType, content, wordCount]
        );

        console.log(`✅ Document uploaded for user ${userId}: ${documentType} (${wordCount} words)`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          document: result.rows[0],
          message: 'Document uploaded successfully'
        }));
      } catch (error) {
        console.error('❌ Error uploading document:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to upload document' }));
      }
    },

    /**
     * POST /api/brand-voice/analyze
     * Trigger brand voice analysis using uploaded documents
     * Body: { forceReanalyze?: boolean }
     */
    async analyzeVoice(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { forceReanalyze = false } = body;

        // Check if profile already exists
        const existingProfile = await pool.query(
          'SELECT id, analyzed_documents FROM brand_voice_profiles WHERE user_id = $1',
          [userId]
        );

        if (existingProfile.rows.length > 0 && !forceReanalyze) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            message: 'Brand voice profile already exists. Use forceReanalyze=true to regenerate.',
            profileExists: true
          }));
          return;
        }

        // Get all unanalyzed documents for this user
        const documents = await pool.query(
          `SELECT id, document_type, content, word_count
           FROM brand_voice_documents
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );

        if (documents.rows.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'No documents found. Upload at least one document before analyzing.'
          }));
          return;
        }

        // Calculate total word count
        const totalWords = documents.rows.reduce((sum, doc) => sum + doc.word_count, 0);

        if (totalWords < 500) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Insufficient content. Need at least 500 total words across all documents for accurate analysis.',
            currentWords: totalWords,
            requiredWords: 500
          }));
          return;
        }

        // Combine all document content
        const combinedContent = documents.rows
          .map(doc => `[${doc.document_type.toUpperCase()}]\n${doc.content}`)
          .join('\n\n---\n\n');

        // Extract brand voice profile using AI (placeholder for now)
        // In real implementation, this would call the brand-voice-analyzer agent
        const profile = await extractBrandVoiceProfile(combinedContent, pool);

        // Upsert brand voice profile
        await pool.query(
          `INSERT INTO brand_voice_profiles
           (user_id, tone, formality_level, sentence_structure, vocabulary_complexity,
            uses_contractions, uses_emojis, uses_metaphors, paragraph_length,
            voice_summary, example_phrases, avoid_phrases, analyzed_documents, last_analysis_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
            tone = EXCLUDED.tone,
            formality_level = EXCLUDED.formality_level,
            sentence_structure = EXCLUDED.sentence_structure,
            vocabulary_complexity = EXCLUDED.vocabulary_complexity,
            uses_contractions = EXCLUDED.uses_contractions,
            uses_emojis = EXCLUDED.uses_emojis,
            uses_metaphors = EXCLUDED.uses_metaphors,
            paragraph_length = EXCLUDED.paragraph_length,
            voice_summary = EXCLUDED.voice_summary,
            example_phrases = EXCLUDED.example_phrases,
            avoid_phrases = EXCLUDED.avoid_phrases,
            analyzed_documents = EXCLUDED.analyzed_documents,
            last_analysis_at = NOW(),
            updated_at = NOW()`,
          [
            userId,
            profile.tone,
            profile.formality_level,
            profile.sentence_structure,
            profile.vocabulary_complexity,
            profile.uses_contractions,
            profile.uses_emojis,
            profile.uses_metaphors,
            profile.paragraph_length,
            profile.voice_summary,
            profile.example_phrases,
            profile.avoid_phrases,
            documents.rows.length
          ]
        );

        // Mark documents as analyzed
        await pool.query(
          `UPDATE brand_voice_documents
           SET analyzed = true, analysis_result = $2
           WHERE user_id = $1`,
          [userId, JSON.stringify(profile)]
        );

        console.log(`✅ Brand voice analyzed for user ${userId}: ${documents.rows.length} documents, ${totalWords} words`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          profile,
          documentsAnalyzed: documents.rows.length,
          totalWords,
          message: 'Brand voice profile created successfully'
        }));
      } catch (error) {
        console.error('❌ Error analyzing brand voice:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to analyze brand voice' }));
      }
    },

    /**
     * POST /api/brand-voice/analyze-structured
     * Analyze brand voice using Anthropic's native structured outputs
     * Uses beta feature "structured-outputs-2025-11-13" for guaranteed JSON format
     * Body: { content: string, conversationHistory?: Array }
     */
    async analyzeVoiceStructured(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { content, conversationHistory = [] } = body;

        // Validation
        if (!content || content.trim().length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Missing required field: content'
          }));
          return;
        }

        const wordCount = countWords(content);
        if (wordCount < 100) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Content too short. Minimum 100 words required for accurate analysis.',
            currentWords: wordCount,
            requiredWords: 100
          }));
          return;
        }

        console.log(`🎨 [STRUCTURED] Analyzing brand voice for user ${userId} (${wordCount} words)`);

        // Analyze using OpenRouter's structured outputs
        const analysisResult = await analyzeBrandVoiceOpenRouter(content, conversationHistory);

        if (!analysisResult.success) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({
            error: 'Failed to analyze brand voice',
            details: analysisResult.error
          }));
          return;
        }

        // Save to database
        const saveResult = await saveBrandVoiceProfile(pool, userId, analysisResult.data);

        if (!saveResult.success) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({
            error: 'Failed to save brand voice profile',
            details: saveResult.error
          }));
          return;
        }

        console.log(`✅ [STRUCTURED] Brand voice ${saveResult.action} for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          action: saveResult.action,
          profile: saveResult.profile,
          analysis: analysisResult.data,
          usage: analysisResult.usage,
          message: `Brand voice profile ${saveResult.action} successfully using structured outputs`
        }));

      } catch (error) {
        console.error('❌ [STRUCTURED] Error in analyzeVoiceStructured:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Failed to analyze brand voice',
          details: error.message
        }));
      }
    },

    /**
     * GET /api/brand-voice/profile
     * Get brand voice profile for current user
     */
    async getProfile(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT id, user_id, is_enabled, tone, formality_level, sentence_structure,
                  vocabulary_complexity, uses_contractions, uses_emojis,
                  uses_metaphors, paragraph_length, voice_summary,
                  example_phrases, avoid_phrases, analyzed_documents,
                  last_analysis_at, created_at, updated_at
           FROM brand_voice_profiles
           WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          // Return default empty profile instead of 404
          const defaultProfile = {
            user_id: userId,
            is_enabled: false,
            tone: '',
            formality_level: '',
            sentence_structure: '',
            vocabulary_complexity: '',
            uses_contractions: false,
            uses_emojis: false,
            uses_metaphors: false,
            paragraph_length: '',
            voice_summary: '',
            example_phrases: [],
            avoid_phrases: [],
            analyzed_documents: 0,
            last_analysis_at: null,
            created_at: null,
            updated_at: null
          };

          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            profile: defaultProfile,
            isDefault: true
          }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          profile: result.rows[0],
          isDefault: false
        }));
      } catch (error) {
        console.error('❌ Error fetching brand voice profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch brand voice profile' }));
      }
    },

    /**
     * PUT /api/brand-voice/profile
     * Update brand voice profile manually
     */
    async updateProfile(req, res) {
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
          is_enabled,
          isEnabled,
          tone,
          formality_level,
          formalityLevel,
          sentence_structure,
          sentenceStructure,
          vocabulary_complexity,
          vocabularyComplexity,
          uses_contractions,
          usesContractions,
          uses_emojis,
          usesEmojis,
          uses_metaphors,
          usesMetaphors,
          paragraph_length,
          paragraphLength,
          voice_summary,
          voiceSummary,
          example_phrases,
          examplePhrases,
          avoid_phrases,
          avoidPhrases
        } = body;

        // Handle both snake_case and camelCase
        const enabled = is_enabled !== undefined ? is_enabled : (isEnabled !== undefined ? isEnabled : true);
        const formalityLvl = formality_level || formalityLevel || 'balanced';
        const sentenceStruct = sentence_structure || sentenceStructure || 'varied';
        const vocabComplex = vocabulary_complexity || vocabularyComplexity || 'clear';
        const useContractions = uses_contractions !== undefined ? uses_contractions : (usesContractions !== undefined ? usesContractions : true);
        const useEmojis = uses_emojis !== undefined ? uses_emojis : (usesEmojis !== undefined ? usesEmojis : false);
        const useMetaphors = uses_metaphors !== undefined ? uses_metaphors : (usesMetaphors !== undefined ? usesMetaphors : false);
        const paraLength = paragraph_length || paragraphLength || 'short';
        const voiceSumm = voice_summary || voiceSummary || '';
        const examplePhr = example_phrases || examplePhrases || [];
        const avoidPhr = avoid_phrases || avoidPhrases || [];

        // UPSERT: Insert or update brand voice profile
        const query = `
          INSERT INTO brand_voice_profiles (
            user_id,
            is_enabled,
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
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            is_enabled = EXCLUDED.is_enabled,
            tone = EXCLUDED.tone,
            formality_level = EXCLUDED.formality_level,
            sentence_structure = EXCLUDED.sentence_structure,
            vocabulary_complexity = EXCLUDED.vocabulary_complexity,
            uses_contractions = EXCLUDED.uses_contractions,
            uses_emojis = EXCLUDED.uses_emojis,
            uses_metaphors = EXCLUDED.uses_metaphors,
            paragraph_length = EXCLUDED.paragraph_length,
            voice_summary = EXCLUDED.voice_summary,
            example_phrases = EXCLUDED.example_phrases,
            avoid_phrases = EXCLUDED.avoid_phrases,
            updated_at = NOW()
          RETURNING *
        `;

        const result = await pool.query(query, [
          userId,
          enabled,
          tone || 'professional',
          formalityLvl,
          sentenceStruct,
          vocabComplex,
          useContractions,
          useEmojis,
          useMetaphors,
          paraLength,
          voiceSumm,
          examplePhr,
          avoidPhr
        ]);

        const action = result.rows[0].created_at === result.rows[0].updated_at ? 'created' : 'updated';
        console.log(`✅ Brand voice profile ${action} for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          profile: result.rows[0],
          action,
          message: `Brand voice profile ${action} successfully`
        }));
      } catch (error) {
        console.error('❌ Error saving brand voice profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to save brand voice profile', details: error.message }));
      }
    },

    /**
     * GET /api/brand-voice/documents
     * List all uploaded documents for current user
     */
    async listDocuments(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT id, document_type, word_count, analyzed, created_at
           FROM brand_voice_documents
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          documents: result.rows,
          totalDocuments: result.rows.length,
          totalWords: result.rows.reduce((sum, doc) => sum + doc.word_count, 0)
        }));
      } catch (error) {
        console.error('❌ Error listing documents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to list documents' }));
      }
    },

    /**
     * DELETE /api/brand-voice/documents/:id
     * Delete uploaded document
     */
    async deleteDocument(req, res, documentId) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        // Verify document belongs to user before deleting
        const result = await pool.query(
          'DELETE FROM brand_voice_documents WHERE id = $1 AND user_id = $2 RETURNING id',
          [documentId, userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Document not found or unauthorized' }));
          return;
        }

        console.log(`✅ Document ${documentId} deleted for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Document deleted successfully'
        }));
      } catch (error) {
        console.error('❌ Error deleting document:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete document' }));
      }
    }
  };
}

module.exports = { registerBrandVoiceRoutes };
