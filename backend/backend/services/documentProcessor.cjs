/**
 * Document Processing Service
 * Extracts text from various document formats and chunks for RAG
 */

const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Extract text from different document types
 */
async function extractText(filePath, mimeType) {
  try {
    // Handle text files
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || filePath.endsWith('.txt') || filePath.endsWith('.md')) {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    }

    // Handle PDF files
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    }

    // TODO: Add DOCX extraction (mammoth)

    throw new Error(`Unsupported document type: ${mimeType}`);
  } catch (error) {
    console.error('Text extraction failed:', error);
    throw error;
  }
}

/**
 * Chunk text into smaller segments for embedding
 * Strategy: Split by paragraphs, maintain context overlap
 */
function chunkText(text, options = {}) {
  const {
    chunkSize = 1000,      // Target characters per chunk
    chunkOverlap = 200,    // Characters to overlap between chunks
    minChunkSize = 100,    // Minimum chunk size to keep
  } = options;

  const chunks = [];

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    const paragraphSize = paragraph.length;

    // If adding this paragraph exceeds chunk size
    if (currentSize + paragraphSize > chunkSize && currentSize > minChunkSize) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from previous chunk
      const overlapText = currentChunk.slice(-chunkOverlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentSize = currentChunk.length;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentSize = currentChunk.length;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length >= minChunkSize) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Process document: extract text and create chunks
 */
async function processDocument(filePath, mimeType, options = {}) {
  try {
    // Extract text
    const text = await extractText(filePath, mimeType);

    // Generate metadata
    const metadata = {
      wordCount: text.split(/\s+/).length,
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
    };

    // Create chunks
    const chunks = chunkText(text, options);

    return {
      text,
      chunks,
      metadata: {
        ...metadata,
        chunkCount: chunks.length,
      }
    };
  } catch (error) {
    console.error('Document processing failed:', error);
    throw error;
  }
}

/**
 * Calculate chunk metadata for storage
 */
function generateChunkMetadata(chunk, index, totalChunks) {
  return {
    index,
    totalChunks,
    characterCount: chunk.length,
    wordCount: chunk.split(/\s+/).length,
  };
}

module.exports = {
  extractText,
  chunkText,
  processDocument,
  generateChunkMetadata,
};
