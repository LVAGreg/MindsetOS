#!/usr/bin/env node
/**
 * Embedding Dimension Manager
 * Automatically detects and migrates vector dimensions to prevent dimension mismatch errors
 *
 * Inspired by OpenWebUI's automatic dimension detection and migration system
 */

const { Pool } = require('pg');

/**
 * Embedding model dimension mapping
 * Maps model names to their vector dimensions
 */
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

/**
 * Get dimension for a specific model
 * @param {string} modelName - Name of the embedding model
 * @returns {number} Dimension of the model's embeddings
 */
function getDimensionForModel(modelName) {
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
 * Get all tables with vector columns from database
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<Array>} Array of {table_name, column_name, dimensions}
 */
async function getVectorColumns(pool) {
  const query = `
    SELECT
      t.table_name,
      c.column_name,
      c.udt_name,
      c.data_type,
      c.character_maximum_length,
      -- Extract dimension from type definition
      CASE
        WHEN c.udt_name = 'vector' THEN
          -- Parse dimension from something like 'vector(1536)'
          substring(format_type(a.atttypid, a.atttypmod) from '\\((\\d+)\\)')::integer
        ELSE NULL
      END as dimensions
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON t.table_name = c.table_name
      AND t.table_schema = c.table_schema
    JOIN pg_attribute a
      ON a.attname = c.column_name
      AND a.attrelid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
    WHERE t.table_schema = 'public'
      AND c.udt_name = 'vector'
    ORDER BY t.table_name, c.column_name;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error detecting vector columns:', error.message);
    return [];
  }
}

/**
 * Detect current embedding provider and model from environment
 * @returns {Object} {provider, model, dimension}
 */
function detectEmbeddingConfig() {
  const provider = process.env.EMBEDDING_PROVIDER || 'ollama';
  const ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  const openaiModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

  const model = provider === 'ollama' ? ollamaModel : openaiModel;
  const dimension = getDimensionForModel(model);

  return {
    provider,
    model,
    dimension
  };
}

/**
 * Generate migration SQL for a vector column dimension change
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the vector column
 * @param {number} newDimension - Target dimension
 * @returns {string} SQL migration script
 */
function generateMigrationSQL(tableName, columnName, newDimension) {
  const indexName = `idx_${tableName}_${columnName}`;

  return `
-- Migration: Update ${tableName}.${columnName} to ${newDimension} dimensions
-- Generated: ${new Date().toISOString()}

BEGIN;

-- Step 1: Drop existing index (if exists)
DROP INDEX IF EXISTS ${indexName};

-- Step 2: Drop the existing embedding column
ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};

-- Step 3: Add embedding column with new dimensions
ALTER TABLE ${tableName} ADD COLUMN ${columnName} vector(${newDimension});

-- Step 4: Recreate vector similarity index
CREATE INDEX ${indexName} ON ${tableName}
USING ivfflat (${columnName} vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- Summary:
-- ✅ ${tableName}.${columnName} updated to ${newDimension} dimensions
-- ✅ Vector similarity index recreated
-- ⚠️  All existing embeddings cleared (will be regenerated)
`.trim();
}

/**
 * Perform automatic dimension migration for all vector columns
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {number} targetDimension - Target dimension to migrate to
 * @returns {Promise<Object>} Migration results
 */
async function performAutoMigration(pool, targetDimension) {
  console.log(`\n🔄 Starting automatic dimension migration to ${targetDimension}...`);

  const vectorColumns = await getVectorColumns(pool);
  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  for (const col of vectorColumns) {
    const { table_name, column_name, dimensions } = col;

    // Skip if already correct dimension
    if (dimensions === targetDimension) {
      console.log(`✅ ${table_name}.${column_name}: Already ${targetDimension} dimensions`);
      results.skipped.push({ table_name, column_name, dimensions });
      continue;
    }

    // Generate and execute migration
    console.log(`🔧 Migrating ${table_name}.${column_name}: ${dimensions} → ${targetDimension}`);
    const migrationSQL = generateMigrationSQL(table_name, column_name, targetDimension);

    try {
      await pool.query(migrationSQL);
      console.log(`✅ ${table_name}.${column_name}: Migration successful`);
      results.success.push({
        table_name,
        column_name,
        old_dimension: dimensions,
        new_dimension: targetDimension
      });
    } catch (error) {
      console.error(`❌ ${table_name}.${column_name}: Migration failed:`, error.message);
      results.errors.push({
        table_name,
        column_name,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Validate all vector columns match expected dimension
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {number} expectedDimension - Expected dimension
 * @returns {Promise<Object>} Validation results
 */
async function validateDimensions(pool, expectedDimension) {
  const vectorColumns = await getVectorColumns(pool);

  const mismatches = vectorColumns.filter(col => col.dimensions !== expectedDimension);
  const matches = vectorColumns.filter(col => col.dimensions === expectedDimension);

  return {
    valid: mismatches.length === 0,
    expected: expectedDimension,
    total: vectorColumns.length,
    matches: matches.length,
    mismatches: mismatches.length,
    details: {
      matching: matches.map(c => ({ table: c.table_name, column: c.column_name, dimension: c.dimensions })),
      mismatching: mismatches.map(c => ({ table: c.table_name, column: c.column_name, dimension: c.dimensions }))
    }
  };
}

/**
 * Main dimension check and migration orchestrator
 * Called on server startup to ensure dimension consistency
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Check results
 */
async function checkAndMigrateDimensions(pool, options = {}) {
  const {
    autoMigrate = process.env.DIMENSION_AUTO_MIGRATE === 'true',
    blockOnMismatch = process.env.DIMENSION_BLOCK_ON_MISMATCH === 'true'
  } = options;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 EMBEDDING DIMENSION CHECK');
  console.log('═══════════════════════════════════════════════════════');

  // Step 1: Detect current embedding configuration
  const config = detectEmbeddingConfig();
  console.log(`\n📊 Embedding Configuration:`);
  console.log(`   Provider: ${config.provider}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Expected Dimension: ${config.dimension}`);

  // Step 2: Get all vector columns from database
  console.log(`\n🔎 Scanning database for vector columns...`);
  const vectorColumns = await getVectorColumns(pool);

  if (vectorColumns.length === 0) {
    console.log('⚠️  No vector columns found in database');
    return { status: 'no_vectors', message: 'No vector columns found' };
  }

  console.log(`\n📋 Found ${vectorColumns.length} vector column(s):`);
  vectorColumns.forEach(col => {
    const status = col.dimensions === config.dimension ? '✅' : '❌';
    console.log(`   ${status} ${col.table_name}.${col.column_name}: ${col.dimensions} dimensions`);
  });

  // Step 3: Validate dimensions
  const validation = await validateDimensions(pool, config.dimension);

  if (validation.valid) {
    console.log(`\n✅ All vector columns match expected dimension (${config.dimension})`);
    console.log('═══════════════════════════════════════════════════════\n');
    return {
      status: 'valid',
      message: 'All dimensions match',
      validation
    };
  }

  // Step 4: Handle dimension mismatches
  console.log(`\n⚠️  DIMENSION MISMATCH DETECTED`);
  console.log(`   Expected: ${config.dimension} dimensions`);
  console.log(`   Mismatches: ${validation.mismatches}/${validation.total} columns`);

  validation.details.mismatching.forEach(col => {
    console.log(`   ❌ ${col.table}.${col.column}: ${col.dimension} (should be ${config.dimension})`);
  });

  if (autoMigrate) {
    console.log(`\n🔄 AUTO-MIGRATION ENABLED`);
    console.log(`   Migrating all vector columns to ${config.dimension} dimensions...`);

    const migrationResults = await performAutoMigration(pool, config.dimension);

    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Success: ${migrationResults.success.length}`);
    console.log(`   ⏭️  Skipped: ${migrationResults.skipped.length}`);
    console.log(`   ❌ Errors: ${migrationResults.errors.length}`);

    if (migrationResults.errors.length > 0) {
      console.error(`\n❌ Migration completed with errors:`);
      migrationResults.errors.forEach(err => {
        console.error(`   ${err.table_name}.${err.column_name}: ${err.error}`);
      });

      if (blockOnMismatch) {
        console.error(`\n🚫 BLOCKING SERVER START (DIMENSION_BLOCK_ON_MISMATCH=true)`);
        console.log('═══════════════════════════════════════════════════════\n');
        throw new Error('Dimension migration failed - server start blocked');
      }
    } else {
      console.log(`\n✅ All migrations completed successfully`);
    }

    console.log('═══════════════════════════════════════════════════════\n');
    return {
      status: 'migrated',
      message: 'Dimensions migrated successfully',
      validation,
      migration: migrationResults
    };

  } else {
    console.warn(`\n⚠️  AUTO-MIGRATION DISABLED`);
    console.warn(`   Set DIMENSION_AUTO_MIGRATE=true to enable automatic migration`);

    // Generate manual migration SQL
    console.log(`\n📝 Manual Migration SQL:`);
    validation.details.mismatching.forEach(col => {
      const sql = generateMigrationSQL(col.table, col.column, config.dimension);
      console.log(`\n-- ${col.table}.${col.column}`);
      console.log(sql);
    });

    if (blockOnMismatch) {
      console.error(`\n🚫 BLOCKING SERVER START (DIMENSION_BLOCK_ON_MISMATCH=true)`);
      console.error(`   Fix dimension mismatches or set DIMENSION_AUTO_MIGRATE=true`);
      console.log('═══════════════════════════════════════════════════════\n');
      throw new Error('Dimension mismatch detected - server start blocked');
    }

    console.log('═══════════════════════════════════════════════════════\n');
    return {
      status: 'mismatch',
      message: 'Dimension mismatch detected - migration required',
      validation
    };
  }
}

/**
 * Export dimension info for current model
 * Used by embeddingService to verify compatibility
 */
function getCurrentModelDimension() {
  const config = detectEmbeddingConfig();
  return {
    provider: config.provider,
    model: config.model,
    dimension: config.dimension
  };
}

module.exports = {
  getDimensionForModel,
  getVectorColumns,
  detectEmbeddingConfig,
  generateMigrationSQL,
  performAutoMigration,
  validateDimensions,
  checkAndMigrateDimensions,
  getCurrentModelDimension,
  MODEL_DIMENSIONS
};
