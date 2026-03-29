/**
 * Document Extraction Service
 *
 * Handles large document uploads by extracting structured data
 * instead of sending full docs to expensive models.
 *
 * Cost savings: ~$1.28 → ~$0.02 per large doc
 */

const EXTRACTION_MODEL = 'anthropic/claude-haiku-4.5';  // Cheap & fast
const LARGE_DOC_THRESHOLD = 5000;  // Characters (~1.2K tokens)
const MAX_RAW_STORAGE = 50000;     // Max chars to store raw

/**
 * Detect if a message looks like a large document paste
 */
function isLargeDocument(text) {
  if (!text || typeof text !== 'string') return false;

  // Check character length
  if (text.length < LARGE_DOC_THRESHOLD) return false;

  // Document indicators
  const docIndicators = [
    text.split('\n').length > 20,                    // Many lines
    /^(Executive Summary|Table of Contents|Chapter|Section)/im.test(text),
    text.includes('\n\n\n'),                         // Multiple paragraph breaks
    /\d+\.\s+[A-Z]/.test(text),                      // Numbered sections
    /^[-•●]\s/m.test(text),                          // Bullet points
    text.length > 10000,                             // Very long
  ];

  const indicatorCount = docIndicators.filter(Boolean).length;
  return indicatorCount >= 2;
}

/**
 * Estimate token count (rough)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Extract structured business profile from document
 */
async function extractBusinessProfile(text, userId, openRouterCall) {
  const extractionPrompt = `You are a data extraction assistant. Extract structured business information from the following document.

Return ONLY valid JSON with this exact structure (use null for missing fields):

{
  "business_name": "string or null",
  "owner_name": "string or null",
  "business_type": "solo|agency|company|null",
  "target_audience": "brief description of who they help",
  "target_roles": ["role1", "role2"],
  "target_industries": ["industry1", "industry2"],
  "target_company_size": "string or null",
  "target_geography": "string or null",
  "problems": [
    {"problem": "main problem", "pain_points": ["point1", "point2"]}
  ],
  "solutions": [
    {"solution": "what they deliver", "outcome": "result"}
  ],
  "transformation": "From X → To Y statement",
  "frameworks": [
    {"name": "framework name", "steps": ["step1", "step2"]}
  ],
  "delivery_model": "how they deliver (coaching, consulting, etc)",
  "engagement_length": "typical duration",
  "pricing_model": "hourly|package|retainer|null",
  "price_range": "string or null",
  "current_revenue": "string or null",
  "revenue_goal": "string or null",
  "case_studies": [
    {"client": "type", "problem": "what", "result": "outcome", "metrics": "numbers"}
  ],
  "testimonials": [],
  "key_metrics": ["metric1", "metric2"],
  "main_challenge": "their primary business challenge",
  "secondary_challenges": []
}

DOCUMENT TO EXTRACT FROM:
---
${text.substring(0, 30000)}
---

Return ONLY the JSON, no explanation.`;

  try {
    const response = await openRouterCall([
      { role: 'user', content: extractionPrompt }
    ], EXTRACTION_MODEL, {
      temperature: 0.1,
      max_tokens: 4000
    });

    // Parse the JSON response
    let extracted;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ [DOC_EXTRACT] Failed to parse extraction response:', parseError.message);
      // Return minimal structure
      extracted = {
        raw_text_summary: text.substring(0, 2000) + '...',
        extraction_failed: true
      };
    }

    return {
      success: true,
      data: extracted,
      inputTokens: estimateTokens(extractionPrompt),
      outputTokens: estimateTokens(JSON.stringify(extracted)),
      model: EXTRACTION_MODEL
    };

  } catch (error) {
    console.error('❌ [DOC_EXTRACT] Extraction failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store extracted profile in database
 */
async function storeBusinessProfile(pool, userId, extracted, rawDocument, source = 'chat_paste') {
  const data = extracted.data || {};

  try {
    const result = await pool.query(`
      INSERT INTO user_business_profiles (
        user_id,
        business_name,
        owner_name,
        business_type,
        target_audience,
        target_roles,
        target_industries,
        target_company_size,
        target_geography,
        problems,
        solutions,
        transformation,
        frameworks,
        delivery_model,
        engagement_length,
        pricing_model,
        price_range,
        current_revenue,
        revenue_goal,
        case_studies,
        testimonials,
        key_metrics,
        main_challenge,
        secondary_challenges,
        raw_document,
        raw_document_tokens,
        extraction_model,
        extraction_cost,
        source,
        confidence_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      ON CONFLICT (user_id) WHERE source != 'chat_paste'
      DO UPDATE SET
        business_name = COALESCE(EXCLUDED.business_name, user_business_profiles.business_name),
        target_audience = COALESCE(EXCLUDED.target_audience, user_business_profiles.target_audience),
        problems = COALESCE(EXCLUDED.problems, user_business_profiles.problems),
        updated_at = NOW()
      RETURNING id
    `, [
      userId,
      data.business_name,
      data.owner_name,
      data.business_type,
      data.target_audience,
      JSON.stringify(data.target_roles || []),
      JSON.stringify(data.target_industries || []),
      data.target_company_size,
      data.target_geography,
      JSON.stringify(data.problems || []),
      JSON.stringify(data.solutions || []),
      data.transformation,
      JSON.stringify(data.frameworks || []),
      data.delivery_model,
      data.engagement_length,
      data.pricing_model,
      data.price_range,
      data.current_revenue,
      data.revenue_goal,
      JSON.stringify(data.case_studies || []),
      JSON.stringify(data.testimonials || []),
      JSON.stringify(data.key_metrics || []),
      data.main_challenge,
      JSON.stringify(data.secondary_challenges || []),
      rawDocument.substring(0, MAX_RAW_STORAGE),
      estimateTokens(rawDocument),
      extracted.model,
      calculateExtractionCost(extracted.inputTokens, extracted.outputTokens),
      source,
      data.extraction_failed ? 0.3 : 0.85
    ]);

    return result.rows[0]?.id;
  } catch (error) {
    console.error('❌ [DOC_EXTRACT] Failed to store profile:', error.message);
    return null;
  }
}

/**
 * Chunk document for RAG search
 */
function chunkDocument(text, chunkSize = 1500, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push({
      text: text.substring(start, end).trim(),
      startIndex: start,
      endIndex: end
    });

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Detect section type based on content
 */
function detectSectionType(text) {
  const lower = text.toLowerCase();

  if (lower.includes('target') || lower.includes('audience') || lower.includes('who i help') || lower.includes('client')) {
    return 'audience';
  }
  if (lower.includes('problem') || lower.includes('challenge') || lower.includes('pain') || lower.includes('struggle')) {
    return 'problems';
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('invest') || lower.includes('fee') || lower.includes('$')) {
    return 'pricing';
  }
  if (lower.includes('case study') || lower.includes('result') || lower.includes('testimonial') || lower.includes('success')) {
    return 'case_study';
  }
  if (lower.includes('framework') || lower.includes('method') || lower.includes('process') || lower.includes('step')) {
    return 'framework';
  }
  if (lower.includes('deliver') || lower.includes('program') || lower.includes('offer') || lower.includes('service')) {
    return 'delivery';
  }

  return 'other';
}

/**
 * Store document chunks with embeddings for RAG
 */
async function storeDocumentChunks(pool, userId, profileId, rawDocument, generateEmbedding) {
  const chunks = chunkDocument(rawDocument);
  console.log(`📄 [DOC_CHUNKS] Splitting document into ${chunks.length} chunks for RAG`);

  let storedCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const sectionType = detectSectionType(chunk.text);

    try {
      // Generate embedding if function provided
      let embedding = null;
      if (generateEmbedding) {
        try {
          embedding = await generateEmbedding(chunk.text);
        } catch (embErr) {
          console.error(`⚠️ [DOC_CHUNKS] Embedding failed for chunk ${i}:`, embErr.message);
        }
      }

      await pool.query(`
        INSERT INTO user_document_chunks (
          user_id, profile_id, chunk_index, chunk_text, chunk_tokens, section_type, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        profileId,
        i,
        chunk.text,
        estimateTokens(chunk.text),
        sectionType,
        embedding ? `[${embedding.join(',')}]` : null
      ]);

      storedCount++;
    } catch (chunkErr) {
      console.error(`❌ [DOC_CHUNKS] Failed to store chunk ${i}:`, chunkErr.message);
    }
  }

  console.log(`✅ [DOC_CHUNKS] Stored ${storedCount}/${chunks.length} chunks`);
  return storedCount;
}

/**
 * Search document chunks by similarity
 */
async function searchDocumentChunks(pool, userId, query, options = {}) {
  const { maxChunks = 3, sectionFilter = null } = options;

  try {
    let sql = `
      SELECT chunk_text, section_type, chunk_index,
             1 - (embedding <=> $2::vector) as similarity
      FROM user_document_chunks
      WHERE user_id = $1
        AND embedding IS NOT NULL
    `;

    const params = [userId, query]; // query should be embedding vector

    if (sectionFilter) {
      sql += ` AND section_type = $3`;
      params.push(sectionFilter);
    }

    sql += ` ORDER BY embedding <=> $2::vector LIMIT $${params.length + 1}`;
    params.push(maxChunks);

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('❌ [DOC_CHUNKS] Search failed:', error.message);
    return [];
  }
}

/**
 * Calculate extraction cost (Haiku pricing)
 */
function calculateExtractionCost(inputTokens, outputTokens) {
  // Haiku: $0.25/1M input, $1.25/1M output
  const inputCost = (inputTokens / 1000000) * 0.25;
  const outputCost = (outputTokens / 1000000) * 1.25;
  return inputCost + outputCost;
}

/**
 * Generate a concise summary for the agent to use
 */
function generateProfileSummary(data) {
  const parts = [];

  if (data.business_name) parts.push(`Business: ${data.business_name}`);
  if (data.owner_name) parts.push(`Owner: ${data.owner_name}`);
  if (data.target_audience) parts.push(`Target: ${data.target_audience}`);

  if (data.problems && data.problems.length > 0) {
    const problemList = data.problems.map(p => p.problem || p).slice(0, 3).join(', ');
    parts.push(`Problems they solve: ${problemList}`);
  }

  if (data.transformation) parts.push(`Transformation: ${data.transformation}`);
  if (data.delivery_model) parts.push(`Delivery: ${data.delivery_model}`);
  if (data.main_challenge) parts.push(`Their challenge: ${data.main_challenge}`);

  if (data.case_studies && data.case_studies.length > 0) {
    const cs = data.case_studies[0];
    if (cs.metrics || cs.result) {
      parts.push(`Key result: ${cs.metrics || cs.result}`);
    }
  }

  return parts.join('\n');
}

/**
 * Main handler: Process large document if detected
 * Returns either processed summary or original message
 */
async function processLargeDocument(message, userId, pool, openRouterCall, generateEmbedding = null) {
  // Check if this looks like a large document
  if (!isLargeDocument(message)) {
    return {
      processed: false,
      message: message
    };
  }

  console.log(`📄 [DOC_EXTRACT] Large document detected (${message.length} chars, ~${estimateTokens(message)} tokens)`);
  console.log(`💰 [DOC_EXTRACT] Without extraction: ~$${(estimateTokens(message) * 0.003 / 1000 * 10).toFixed(2)} per message`);

  // Extract structured data
  const extracted = await extractBusinessProfile(message, userId, openRouterCall);

  if (!extracted.success) {
    console.log('⚠️ [DOC_EXTRACT] Extraction failed, using truncated original');
    return {
      processed: true,
      message: `[User shared a large document. Here's a summary of the first part:]\n\n${message.substring(0, 3000)}...\n\n[Document truncated for efficiency. Ask the user specific questions to learn more.]`,
      extractionFailed: true
    };
  }

  // Store in database
  const profileId = await storeBusinessProfile(pool, userId, extracted, message, 'chat_paste');
  console.log(`✅ [DOC_EXTRACT] Profile stored: ${profileId}`);

  // Store document chunks for RAG querying (async, don't block)
  if (profileId) {
    storeDocumentChunks(pool, userId, profileId, message, generateEmbedding)
      .then(count => console.log(`📄 [DOC_EXTRACT] Stored ${count} searchable chunks with embeddings`))
      .catch(err => console.error('⚠️ [DOC_EXTRACT] Chunk storage failed:', err.message));
  }

  // Generate concise summary for agent
  const summary = generateProfileSummary(extracted.data);

  const extractionCost = calculateExtractionCost(extracted.inputTokens, extracted.outputTokens);
  console.log(`💰 [DOC_EXTRACT] Extraction cost: $${extractionCost.toFixed(4)} (saved ~$${(estimateTokens(message) * 0.003 / 1000 * 5).toFixed(2)})`);

  return {
    processed: true,
    message: `[User shared their business profile document. Here's the extracted information:]\n\n${summary}\n\n[Full details stored in their profile. Ask follow-up questions as needed.]`,
    profileId: profileId,
    extractedData: extracted.data,
    cost: extractionCost,
    tokensSaved: estimateTokens(message) - estimateTokens(summary)
  };
}

/**
 * Get user's stored business profile
 */
async function getUserBusinessProfile(pool, userId) {
  try {
    const result = await pool.query(`
      SELECT * FROM user_business_profiles
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ [DOC_EXTRACT] Failed to get profile:', error.message);
    return null;
  }
}

/**
 * Extract relevant portions of agent system prompt based on user's message
 * Uses Haiku to intelligently select only the instructions needed for this query
 *
 * Cost: ~$0.001 per extraction vs sending full 5K+ token prompts
 */
async function extractRelevantPromptSections(systemPrompt, userMessage, conversationContext, openRouterCall) {
  // If prompt is small enough, just return it all
  if (systemPrompt.length < 3000) {
    return {
      extracted: false,
      prompt: systemPrompt,
      reason: 'prompt_small_enough'
    };
  }

  const extractionPrompt = `You are a prompt extraction assistant. Given an AI agent's full system prompt and a user's message, extract ONLY the sections of the prompt that are relevant to answering this specific user query.

USER'S CURRENT MESSAGE:
---
${userMessage}
---

${conversationContext ? `RECENT CONVERSATION CONTEXT:
---
${conversationContext.slice(-2000)}
---

` : ''}FULL AGENT SYSTEM PROMPT:
---
${systemPrompt.substring(0, 25000)}
---

INSTRUCTIONS:
1. Identify which sections/instructions from the system prompt are relevant to the user's query
2. Extract those sections verbatim (don't paraphrase)
3. Always include: core identity/role, key behavioral rules, any relevant frameworks
4. Skip sections about topics the user isn't asking about
5. If the user is asking about the agent's methodology/approach, include those sections
6. Preserve formatting (bullets, headers, etc.)

Return the extracted relevant sections. If everything is relevant, return the full prompt.
Do NOT add commentary - just return the extracted prompt sections.`;

  try {
    const response = await openRouterCall([
      { role: 'user', content: extractionPrompt }
    ], EXTRACTION_MODEL, {
      temperature: 0.1,
      max_tokens: 6000
    });

    if (response && response.length > 200) {
      const originalTokens = estimateTokens(systemPrompt);
      const extractedTokens = estimateTokens(response);
      const savings = ((originalTokens - extractedTokens) / originalTokens * 100).toFixed(1);

      console.log(`🎯 [PROMPT_EXTRACT] Reduced prompt from ~${originalTokens} to ~${extractedTokens} tokens (${savings}% savings)`);

      return {
        extracted: true,
        prompt: response,
        originalTokens,
        extractedTokens,
        savings: parseFloat(savings)
      };
    } else {
      console.log('⚠️ [PROMPT_EXTRACT] Extraction returned too short, using full prompt');
      return {
        extracted: false,
        prompt: systemPrompt,
        reason: 'extraction_too_short'
      };
    }
  } catch (error) {
    console.error('❌ [PROMPT_EXTRACT] Extraction failed:', error.message);
    return {
      extracted: false,
      prompt: systemPrompt,
      reason: 'extraction_error',
      error: error.message
    };
  }
}

/**
 * Check if prompt extraction should be used based on prompt size and settings
 */
function shouldExtractPrompt(systemPrompt, agentSettings = {}) {
  // Minimum prompt size to consider extraction (saves overhead for small prompts)
  const MIN_PROMPT_SIZE = 3000;

  // Check if extraction is disabled for this agent
  if (agentSettings.disable_prompt_extraction) {
    return false;
  }

  return systemPrompt.length >= MIN_PROMPT_SIZE;
}

module.exports = {
  isLargeDocument,
  estimateTokens,
  extractBusinessProfile,
  storeBusinessProfile,
  processLargeDocument,
  getUserBusinessProfile,
  generateProfileSummary,
  storeDocumentChunks,
  searchDocumentChunks,
  chunkDocument,
  extractRelevantPromptSections,
  shouldExtractPrompt,
  LARGE_DOC_THRESHOLD
};
