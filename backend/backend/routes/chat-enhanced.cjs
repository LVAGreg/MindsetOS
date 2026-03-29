/**
 * ECOS Chat Routes Module - Enhanced with JSON Memory Extraction
 *
 * Extracted from real-backend.cjs
 * Enhanced: 2025-11-12
 *
 * This module handles all AI chat-related routes for the ECOS system:
 * - POST /api/letta/chat - Non-streaming chat endpoint
 * - POST /api/letta/chat/stream - Streaming chat endpoint with Server-Sent Events (SSE)
 *
 * NEW FEATURES:
 * - Automatic JSON extraction from <STRUCTURED_DATA> blocks
 * - Memory updates from agent responses
 * - Core memories (onboarding data) automatic updates
 * - User insights storage
 *
 * Key Features:
 * - OpenRouter/Gemini AI integration with streaming support
 * - Memory context loading and injection for personalized responses
 * - Document attachment support for context-aware conversations
 * - Widget formatting for enhanced UI components
 * - Conversation and message persistence to PostgreSQL
 * - Automatic memory extraction from conversations
 * - Token counting and API usage logging
 * - Model selection and override capabilities
 *
 * Dependencies:
 * - getUserFromToken: Authentication helper
 * - parseBody: Request body parser
 * - pool: PostgreSQL connection pool
 * - fs: File system operations for document loading
 * - callOpenRouter: Non-streaming AI API wrapper
 * - streamOpenRouter: Streaming AI API wrapper
 * - estimateTokens: Token counting utility
 * - logAPIUsage: API usage tracking
 * - formatResponseWithWidgets: Widget formatting layer
 * - extractMemories: Memory extraction from conversations
 * - generateToken: Unique ID generator
 * - AGENT_CACHE: Agent configuration cache
 * - processMemoryExtraction: NEW - JSON extraction service
 * - removeStructuredDataTags: NEW - Clean response text
 */

const fs = require('fs');
const { searchRelevantChunks, formatContextForLLM } = require('../services/ragService.cjs');
const { processMemoryExtraction } = require('../services/memoryExtractionService.cjs');
const { removeStructuredDataTags } = require('../utils/jsonExtractor.cjs');

/**
 * Register all chat-related routes
 * @param {object} req - HTTP request object
 * @param {object} res - HTTP response object
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path
 * @param {object} corsHeaders - CORS headers object
 * @param {object} dependencies - Required dependencies
 * @returns {boolean} - True if route was handled, false otherwise
 */
function registerChatRoutes(req, res, method, path, corsHeaders, dependencies) {
  const {
    getUserFromToken,
    parseBody,
    pool,
    callOpenRouter,
    streamOpenRouter,
    estimateTokens,
    logAPIUsage,
    formatResponseWithWidgets,
    extractMemories,
    generateToken,
    AGENT_CACHE
  } = dependencies;

  // Chat with agent (Real AI!) - Non-streaming
  if (path === '/api/letta/chat' && method === 'POST') {
    (async () => {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const body = await parseBody(req);
      const { agentId, message } = body;

      console.log(`🤖 Agent: ${agentId} | User: ${user.email} | Message: "${message}"`);

      try {
        // Call OpenRouter with agent-specific prompt
        const aiResponse = await callOpenRouter([
          { role: 'user', content: message }
        ], agentId);

        console.log(`✅ AI Response: ${aiResponse.substring(0, 100)}...`);

        // ✨ NEW: Process response for structured data extraction
        const cleanedResponse = removeStructuredDataTags(aiResponse);

        // ✨ NEW: Extract and process structured data in background
        processMemoryExtraction(aiResponse, user.id, agentId, body.conversationId, pool)
          .catch(err => console.error('❌ Memory extraction error:', err));

        const response = {
          id: generateToken(),
          conversationId: agentId + '_' + user.id,
          role: 'assistant',
          content: cleanedResponse, // Return cleaned response without JSON tags
          timestamp: new Date().toISOString(),
          agent: agentId,
          provider: 'OpenRouter GPT-4o'
        };

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('❌ OpenRouter Error:', error.message);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'AI service error',
          message: error.message
        }));
      }
    })();
    return true;
  }

  // Chat stream (SSE) - Streaming with Server-Sent Events
  if (path === '/api/letta/chat/stream' && method === 'POST') {
    (async () => {
      const requestStart = Date.now();
      console.log('🔵 Stream endpoint hit');

      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        console.log('❌ No user found');
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const authTime = Date.now() - requestStart;
      console.log(`✅ User authenticated: ${user.email} (${authTime}ms)`);

      let body;
      try {
        body = await parseBody(req);
        console.log('📦 Body parsed:', JSON.stringify(body).substring(0, 100));
      } catch (e) {
        console.error('❌ Failed to parse body:', e);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      const { agentId, message, messages, memoryEnabled, modelOverride, documentIds } = body;

      console.log(`🤖 [STREAM] Agent: ${agentId} | User: ${user.email} | Message: "${message}"`);
      console.log(`📝 Conversation history: ${messages ? messages.length : 0} previous messages`);
      console.log(`🧠 Memory enabled: ${memoryEnabled !== false}`);
      if (modelOverride) console.log(`🔄 Model override: ${modelOverride}`);
      if (documentIds && documentIds.length > 0) console.log(`📎 Documents attached: ${documentIds.length}`);

      try {
        // Load relevant memories for this user and agent (only if memoryEnabled)
        let memoryContext = '';

        if (memoryEnabled !== false) {
          const memoryStart = Date.now();
          console.log(`🧠 [MEMORY] Loading memories for user ${user.id}...`);

          try {
            // Load ALL user memories regardless of which agent created them
            // This enables cross-agent memory sharing for better context
            const memoriesResult = await pool.query(`
            SELECT memory_type, content, importance_score, created_at, agent_id
            FROM memories
            WHERE user_id = $1
              AND status = 'active'
            ORDER BY importance_score DESC, created_at DESC
            LIMIT 15
          `, [user.id]);

          if (memoriesResult.rows.length > 0) {
            console.log(`📊 [MEMORY] Found ${memoriesResult.rows.length} relevant memories`);

            // Format memories by type
            const memoryTypes = {
              goals: [],
              pain_points: [],
              business_context: [],
              strategies: [],
              preferences: [],
              decisions: []
            };

            memoriesResult.rows.forEach(mem => {
              if (memoryTypes[mem.memory_type]) {
                memoryTypes[mem.memory_type].push(mem.content);
              }
            });

            // Build memory context string
            const contextParts = [];
            if (memoryTypes.business_context.length > 0) {
              contextParts.push(`BUSINESS CONTEXT:\n${memoryTypes.business_context.join('\n')}`);
            }
            if (memoryTypes.goals.length > 0) {
              contextParts.push(`GOALS:\n${memoryTypes.goals.join('\n')}`);
            }
            if (memoryTypes.pain_points.length > 0) {
              contextParts.push(`PAIN POINTS:\n${memoryTypes.pain_points.join('\n')}`);
            }
            if (memoryTypes.strategies.length > 0) {
              contextParts.push(`STRATEGIES:\n${memoryTypes.strategies.join('\n')}`);
            }
            if (memoryTypes.preferences.length > 0) {
              contextParts.push(`PREFERENCES:\n${memoryTypes.preferences.join('\n')}`);
            }
            if (memoryTypes.decisions.length > 0) {
              contextParts.push(`DECISIONS:\n${memoryTypes.decisions.join('\n')}`);
            }

            if (contextParts.length > 0) {
              memoryContext = `\n\n---REMEMBERED CONTEXT---\n${contextParts.join('\n\n')}\n---END REMEMBERED CONTEXT---\n\nUse this remembered information to personalize your response and reference relevant context from previous conversations.`;
              const memoryTime = Date.now() - memoryStart;
              console.log(`✅ [MEMORY] Memory context built (${memoryContext.length} chars) in ${memoryTime}ms`);
            }
          } else {
            const memoryTime = Date.now() - memoryStart;
            console.log(`ℹ️ [MEMORY] No memories found for this user yet (${memoryTime}ms)`);
          }
          } catch (memError) {
            const memoryTime = Date.now() - memoryStart;
            console.error(`⚠️ [MEMORY] Failed to load memories in ${memoryTime}ms:`, memError.message);
            // Continue without memories rather than failing the request
          }
        } else {
          console.log(`ℹ️ [MEMORY] Memory disabled for this conversation`);
        }

        // Search knowledge base using RAG (if enabled for agent)
        let ragContext = '';
        try {
          console.log(`🔍 [RAG] Searching knowledge base for agent ${agentId}...`);
          const ragStart = Date.now();

          const relevantChunks = await searchRelevantChunks(message, agentId, {}, pool);

          const ragTime = Date.now() - ragStart;
          console.log(`⏱️  [RAG] Search completed in ${ragTime}ms`);

          if (relevantChunks && relevantChunks.length > 0) {
            ragContext = formatContextForLLM(relevantChunks);
            console.log(`✅ [RAG] Found ${relevantChunks.length} relevant chunks from knowledge base`);
            relevantChunks.forEach((chunk, i) => {
              console.log(`   📄 [${i + 1}] "${chunk.title}" (similarity: ${chunk.similarity})`);
            });
          } else {
            console.log(`ℹ️  [RAG] No relevant knowledge base content found`);
          }
        } catch (ragError) {
          console.error('⚠️  [RAG] Knowledge base search failed:', ragError.message);
          // Continue without RAG rather than failing the request
        }

        // Load attached documents if present
        let documentContext = '';
        if (documentIds && documentIds.length > 0) {
          const docsStart = Date.now();
          console.log(`📎 [DOCUMENTS] Loading ${documentIds.length} attached documents...`);
          try {
            const docsResult = await pool.query(`
              SELECT id, filename, original_filename, file_path, mime_type
              FROM documents
              WHERE id = ANY($1) AND user_id = $2
            `, [documentIds, user.id]);

            if (docsResult.rows.length > 0) {
              console.log(`📄 [DOCUMENTS] Found ${docsResult.rows.length} documents`);

              const documentContents = [];
              for (const doc of docsResult.rows) {
                try {
                  const content = fs.readFileSync(doc.file_path, 'utf-8');
                  documentContents.push(`--- Document: ${doc.original_filename} ---\n${content}\n--- End Document ---`);
                  console.log(`✅ [DOCUMENTS] Loaded ${doc.original_filename} (${content.length} chars)`);
                } catch (readError) {
                  console.error(`❌ [DOCUMENTS] Failed to read ${doc.original_filename}:`, readError.message);
                }
              }

              if (documentContents.length > 0) {
                documentContext = `\n\n---ATTACHED DOCUMENTS---\n${documentContents.join('\n\n')}\n---END ATTACHED DOCUMENTS---\n\nThe user has attached the above documents. Reference them in your response.`;
                const docsTime = Date.now() - docsStart;
                console.log(`✅ [DOCUMENTS] Document context built (${documentContext.length} chars) in ${docsTime}ms`);
              }
            } else {
              const docsTime = Date.now() - docsStart;
              console.log(`⚠️ [DOCUMENTS] No documents found with provided IDs (${docsTime}ms)`);
            }
          } catch (docError) {
            const docsTime = Date.now() - docsStart;
            console.error(`❌ [DOCUMENTS] Failed to load documents in ${docsTime}ms:`, docError.message);
          }
        }

        console.log(`📡 Calling OpenRouter streaming API...`);

        // Build conversation context from message history
        const conversationMessages = messages && messages.length > 0
          ? messages.map(msg => ({ role: msg.role, content: msg.content }))
          : [];

        // Add memory, RAG, and document context to messages
        const contextToAdd = [memoryContext, ragContext, documentContext].filter(Boolean).join('\n\n');

        if (contextToAdd && conversationMessages.length === 0) {
          // No history yet - add context to current message
          conversationMessages.push({
            role: 'user',
            content: message + contextToAdd
          });
        } else if (contextToAdd && conversationMessages.length > 0) {
          // Has history - inject context as system message before user message
          conversationMessages.push({
            role: 'system',
            content: contextToAdd
          });
          conversationMessages.push({ role: 'user', content: message });
        } else {
          // No context - just add current message
          conversationMessages.push({ role: 'user', content: message });
        }

        // Send SSE headers
        const sseHeaders = {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        };

        res.writeHead(200, sseHeaders);

        // Stream the response WITHOUT closing (so widget formatter can add content)
        const aiResponse = await streamOpenRouter(conversationMessages, agentId, res, { closeStream: false, modelOverride });

        console.log(`✅ [STREAM] Streaming complete - Response length: ${aiResponse.length} chars`);

        // Log main conversation API usage (estimate tokens since streaming doesn't provide usage)
        const inputText = conversationMessages.map(m => m.content).join('\n');
        const estimatedInputTokens = estimateTokens(inputText);
        const estimatedOutputTokens = estimateTokens(aiResponse);
        const model = modelOverride || AGENT_CACHE[agentId]?.model_preference || 'openai/gpt-4o';

        // Note: conversationId may not exist yet at this point for new conversations
        // We'll pass it after it's created
        logAPIUsage(
          user.id,
          agentId,
          model,
          'conversation',
          estimatedInputTokens,
          estimatedOutputTokens,
          0, // latency not tracked for streaming
          null // conversationId will be set after creation
        ).catch(err => console.error('❌ Log conversation usage error:', err));

        // ✨ NEW: Process response for structured data extraction BEFORE widget formatting
        const cleanedResponse = removeStructuredDataTags(aiResponse);
        console.log(`🧹 [EXTRACTION] Cleaned response length: ${cleanedResponse.length} chars`);

        // Apply widget formatting if enabled (secondary AI layer)
        const widgetFormattingEnabled = body.widgetFormattingEnabled !== false; // Default to true
        let finalResponse = cleanedResponse; // Use cleaned response instead of raw aiResponse

        if (widgetFormattingEnabled) {
          // Pass widget model override (user can select different model for widget formatting)
          const widgetModelOverride = body.widgetModelOverride || null;
          const formattingResult = await formatResponseWithWidgets(
            cleanedResponse, // Use cleaned response
            widgetFormattingEnabled,
            agentId,
            widgetModelOverride,
            user.id,
            body.conversationId
          );
          finalResponse = formattingResult.text;

          // If formatting was successfully applied, send the formatted response to frontend
          if (formattingResult.wasFormatted) {
            console.log('📝 [WIDGET] Sending formatted response to frontend');
            res.write(`data: ${JSON.stringify({
              type: 'format_update',
              content: formattingResult.text,
              timestamp: new Date().toISOString()
            })}\n\n`);
          }
        }

        // Save messages to PostgreSQL BEFORE closing stream (so we can send conversation ID)
        let conversationId = body.conversationId;

        try {
          // Generate or use existing conversation ID (must be UUID)
          // If no conversationId provided or it's not a valid UUID, create new conversation
          if (!conversationId || !conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const newConv = await pool.query(`
              INSERT INTO conversations (id, user_id, agent_id, title, created_at, updated_at)
              VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
              RETURNING id
            `, [user.id, agentId, `Conversation with ${agentId}`]);
            conversationId = newConv.rows[0].id;
            console.log(`🆕 Created new conversation: ${conversationId}`);
          } else {
            // Update existing conversation
            await pool.query(`
              INSERT INTO conversations (id, user_id, agent_id, title, created_at, updated_at)
              VALUES ($1, $2, $3, $4, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            `, [conversationId, user.id, agentId, `Conversation with ${agentId}`]);
          }

          // Insert user message
          await pool.query(`
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [conversationId, 'user', message]);

          // Insert AI response
          await pool.query(`
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [conversationId, 'assistant', finalResponse]);

          console.log(`📊 [STORAGE] Saved messages to PostgreSQL for conversation ${conversationId} - AI response: ${finalResponse.length} chars`);

          // Send conversation ID to frontend so it can update its state
          res.write(`data: ${JSON.stringify({
            type: 'conversation_id',
            conversationId: conversationId
          })}\n\n`);

          // ✨ NEW: Extract structured data from ORIGINAL response (before cleaning)
          processMemoryExtraction(aiResponse, user.id, agentId, conversationId, pool)
            .catch(err => console.error('❌ Memory extraction error:', err));

          // ALWAYS extract memories (regardless of toggle) - toggle only controls context injection
          // This builds user's memory database even when toggle is OFF
          // Get all messages from this conversation for memory extraction
          pool.query(`
            SELECT role, content
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `, [conversationId])
            .then(result => {
              if (result.rows.length >= 2) { // Only extract if there's actual conversation
                // Pass memory model override from body
                const memoryModelOverride = body.memoryModelOverride || null;
                return extractMemories(conversationId, user.id, agentId, result.rows, memoryModelOverride);
              }
            })
            .catch(err => console.error('❌ Background memory extraction error:', err));
        } catch (dbError) {
          console.error('❌ Database save error:', dbError.message);
          console.error('Full error:', dbError);
        }

        // Now send [DONE] and close the stream
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (error) {
        console.error('❌ [STREAM] OpenRouter Error:', error.message);
        console.error('Full error:', error);
        if (!res.headersSent) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: error.message }));
        }
      }
    })();
    return true;
  }

  // Route not handled by this module
  return false;
}

module.exports = { registerChatRoutes };
