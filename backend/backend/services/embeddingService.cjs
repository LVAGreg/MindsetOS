/**
 * Embedding Service
 * Generates vector embeddings using Ollama (free, local) or OpenAI (fallback)
 * with intelligent LRU caching for performance optimization
 *
 * Ollama + nomic-embed-text outperforms OpenAI ada-002 on MTEB benchmarks
 * and is completely free with no rate limits.
 */

const { embeddingCache } = require('./embeddingCache.cjs');

// Configuration from environment
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'ollama'; // 'ollama' or 'openai'
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY; // Use OpenRouter if no direct OpenAI key
const OPENAI_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'; // Use text-embedding-3-small (faster, cheaper than ada-002)
const USE_OPENROUTER = !process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY; // Use OpenRouter if we don't have direct OpenAI key

/**
 * Generate embedding using Ollama (local, free)
 */
async function generateEmbeddingOllama(text) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text.substring(0, 8000), // Ollama uses 'prompt' instead of 'input'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Ollama embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embedding using OpenAI (paid, fallback)
 * Can use direct OpenAI or OpenRouter
 */
async function generateEmbeddingOpenAI(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY or OPENROUTER_API_KEY not set');
  }

  try {
    // Use OpenRouter if no direct OpenAI key is set
    const apiUrl = USE_OPENROUTER
      ? 'https://openrouter.ai/api/v1/embeddings'
      : 'https://api.openai.com/v1/embeddings';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...(USE_OPENROUTER && {
          'HTTP-Referer': 'https://expertconsultingos.com',
          'X-Title': 'ECOS Platform'
        })
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: text.substring(0, 8000),
      })
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMsg = error.error ? error.error.message : response.statusText;
      throw new Error(`${USE_OPENROUTER ? 'OpenRouter' : 'OpenAI'} API error: ${errorMsg}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('OpenAI/OpenRouter embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embedding for a single text chunk
 * Automatically uses configured provider with intelligent fallback and caching
 */
async function generateEmbedding(text) {
  // Normalize text for cache consistency
  const normalizedText = text.trim();
  const model = EMBEDDING_PROVIDER === 'ollama' ? OLLAMA_MODEL : OPENAI_MODEL;

  // Check cache first
  const cachedEmbedding = await embeddingCache.get(normalizedText, model);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  let embedding = null;

  // Try primary provider
  if (EMBEDDING_PROVIDER === 'ollama') {
    try {
      embedding = await generateEmbeddingOllama(normalizedText);
    } catch (ollamaError) {
      console.warn('⚠️  Ollama embedding failed, trying OpenAI fallback...');

      // Fallback to OpenAI if available
      if (OPENAI_API_KEY) {
        try {
          embedding = await generateEmbeddingOpenAI(normalizedText);
        } catch (openaiError) {
          console.error('❌ Both Ollama and OpenAI embedding failed');
          return null;
        }
      } else {
        console.error('❌ Ollama failed and no OpenAI API key available');
        return null;
      }
    }
  } else if (EMBEDDING_PROVIDER === 'openai') {
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set but openai provider selected');
      return null;
    }

    try {
      embedding = await generateEmbeddingOpenAI(normalizedText);
    } catch (error) {
      console.error('❌ OpenAI embedding failed');
      return null;
    }
  } else {
    console.error(`❌ Unknown embedding provider: ${EMBEDDING_PROVIDER}`);
    return null;
  }

  // Store in cache if successful
  if (embedding) {
    await embeddingCache.set(normalizedText, embedding, model);
  }

  return embedding;
}

/**
 * Generate embeddings for multiple text chunks (batch processing)
 */
async function generateEmbeddings(texts, options = {}) {
  const {
    batchSize = 10,
    delayMs = 100
  } = options;

  const embeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);

    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error('Invalid vectors for similarity calculation');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Convert JavaScript array to PostgreSQL vector format
 */
function vectorToString(vector) {
  return '[' + vector.join(',') + ']';
}

/**
 * Convert PostgreSQL vector string to JavaScript array
 */
function stringToVector(vectorString) {
  return vectorString
    .replace(/^[|]$/g, '')
    .split(',')
    .map(Number);
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return embeddingCache.getStats();
}

/**
 * Get detailed cache analytics
 */
function getCacheAnalytics() {
  return embeddingCache.getAnalytics();
}

/**
 * Clear embedding cache
 */
function clearCache() {
  embeddingCache.clear();
}

/**
 * Warm cache with frequent memories
 */
async function warmCache(entries) {
  return embeddingCache.warm(entries);
}

/**
 * Get dimension for a specific embedding model
 * @param {string} modelName - Name of the embedding model
 * @returns {number} Dimension of the model's embeddings
 */
function getDimensionForModel(modelName) {
  const MODEL_DIMENSIONS = {
    // OpenAI models
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,

    // Ollama models
    'nomic-embed-text': 768,
    'mxbai-embed-large': 1024,
    'snowflake-arctic-embed': 1024,
    'all-minilm': 384,
    'bge-large': 1024,
    'bge-base': 768,
    'bge-small': 384,

    // Sentence Transformers
    'all-MiniLM-L6-v2': 384,
    'all-mpnet-base-v2': 768,
    'paraphrase-multilingual': 768,

    // Cohere models
    'embed-english-v3.0': 1024,
    'embed-multilingual-v3.0': 1024,
  };

  if (!modelName) {
    console.warn('⚠️  No model name provided, defaulting to 1536 dimensions');
    return 1536;
  }

  const dimension = MODEL_DIMENSIONS[modelName];
  if (!dimension) {
    console.warn(`⚠️  Unknown model "${modelName}", defaulting to 1536 dimensions`);
    return 1536;
  }

  return dimension;
}

/**
 * Get current embedding model dimension based on environment config
 * @returns {number} Current model's embedding dimension
 */
function getCurrentDimension() {
  const model = EMBEDDING_PROVIDER === 'ollama' ? OLLAMA_MODEL : OPENAI_MODEL;
  return getDimensionForModel(model);
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  vectorToString,
  stringToVector,
  getCacheStats,
  getCacheAnalytics,
  clearCache,
  warmCache,
  embeddingCache,
  getDimensionForModel,
  getCurrentDimension,
};
