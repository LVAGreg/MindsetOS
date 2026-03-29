/**
 * Document Processing Endpoint
 * Processes uploaded documents: extract text, chunk, generate embeddings
 */

const db = require('../database');
const { processDocument } = require('./documentProcessor.cjs');
const { generateEmbeddings } = require('./embeddingService.cjs');

/**
 * Process a knowledge base document after upload
 */
async function processKnowledgeDocument(knowledgeId) {
  try {
    // Get document info
    const docResult = await db.query(
      `SELECT id, file_path, mime_type, title 
       FROM knowledge_base 
       WHERE id = \`,
      [knowledgeId]
    );

    if (docResult.rows.length === 0) {
      throw new Error(`Document not found: ${knowledgeId}`);
    }

    const doc = docResult.rows[0];
    
    console.log(`📄 Processing document: ${doc.title}`);

    // Update status to processing
    await db.query(
      `UPDATE knowledge_base 
       SET processing_status = 'processing' 
       WHERE id = \`,
      [knowledgeId]
    );

    // Extract text and create chunks
    const { chunks, metadata } = await processDocument(
      doc.file_path,
      doc.mime_type,
      { chunkSize: 1000, chunkOverlap: 200 }
    );

    console.log(`✂️  Created ${chunks.length} chunks`);

    // Generate embeddings for all chunks
    console.log('🔮 Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks, {
      batchSize: 10,
      delayMs: 100
    });

    // Store chunks with embeddings in database
    console.log('💾 Storing chunks in database...');
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      if (!embedding) {
        console.warn(`⚠️  No embedding for chunk ${i}, skipping`);
        continue;
      }

      const vectorString = '[' + embedding.join(',') + ']';
      
      await db.query(
        `INSERT INTO document_chunks 
         (knowledge_id, chunk_index, content, embedding, word_count, character_count, metadata)
         VALUES (\, \, \, \::vector, \, \, \)`,
        [
          knowledgeId,
          i,
          chunk,
          vectorString,
          chunk.split(/\s+/).length,
          chunk.length,
          JSON.stringify({ chunkIndex: i })
        ]
      );
    }

    // Update document with processing results
    await db.query(
      `UPDATE knowledge_base 
       SET 
         processing_status = 'completed',
         chunk_count = \,
         metadata = metadata || \::jsonb
       WHERE id = \`,
      [chunks.length, JSON.stringify(metadata), knowledgeId]
    );

    console.log(`✅ Document processed successfully: ${doc.title}`);

    return {
      success: true,
      knowledgeId,
      chunkCount: chunks.length,
      metadata
    };

  } catch (error) {
    console.error('Document processing failed:', error);

    // Update status to failed
    await db.query(
      `UPDATE knowledge_base 
       SET 
         processing_status = 'failed',
         metadata = metadata || \::jsonb
       WHERE id = \`,
      [JSON.stringify({ error: error.message }), knowledgeId]
    );

    throw error;
  }
}

/**
 * Reprocess existing document (regenerate chunks and embeddings)
 */
async function reprocessDocument(knowledgeId) {
  // Delete existing chunks
  await db.query(
    'DELETE FROM document_chunks WHERE knowledge_id = \',
    [knowledgeId]
  );

  // Process document
  return processKnowledgeDocument(knowledgeId);
}

/**
 * Get processing status for a document
 */
async function getProcessingStatus(knowledgeId) {
  const result = await db.query(
    `SELECT 
       id, 
       title, 
       processing_status, 
       chunk_count,
       created_at,
       updated_at
     FROM knowledge_base 
     WHERE id = \`,
    [knowledgeId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const doc = result.rows[0];

  // Get chunk count from document_chunks table
  const chunkResult = await db.query(
    'SELECT COUNT(*) as count FROM document_chunks WHERE knowledge_id = \',
    [knowledgeId]
  );

  return {
    ...doc,
    actualChunkCount: parseInt(chunkResult.rows[0].count)
  };
}

module.exports = {
  processKnowledgeDocument,
  reprocessDocument,
  getProcessingStatus,
};
