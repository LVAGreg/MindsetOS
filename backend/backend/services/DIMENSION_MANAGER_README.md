# Embedding Dimension Manager

Automatic embedding dimension detection and migration system for ECOS, inspired by OpenWebUI's dimension management.

## Overview

The Dimension Manager prevents dimension mismatch errors by automatically detecting and migrating vector columns to match your configured embedding model's dimensions.

## Features

- **Automatic Detection**: Scans all vector columns in database
- **Model Mapping**: Maps 15+ embedding models to their dimensions
- **Auto-Migration**: Optionally migrates dimensions on server start
- **Safe Defaults**: Defaults to 1536 dimensions (OpenAI standard)
- **Validation**: Validates all vector columns match expected dimensions
- **Migration SQL Generation**: Creates manual migration scripts

## Supported Models

### OpenAI Models
- `text-embedding-3-small`: 1536 dimensions
- `text-embedding-3-large`: 3072 dimensions
- `text-embedding-ada-002`: 1536 dimensions

### Ollama Models
- `nomic-embed-text`: 768 dimensions
- `mxbai-embed-large`: 1024 dimensions
- `snowflake-arctic-embed`: 1024 dimensions
- `all-minilm`: 384 dimensions
- `bge-large`: 1024 dimensions
- `bge-base`: 768 dimensions
- `bge-small`: 384 dimensions

### Sentence Transformers
- `all-MiniLM-L6-v2`: 384 dimensions
- `all-mpnet-base-v2`: 768 dimensions
- `paraphrase-multilingual`: 768 dimensions

### Cohere Models
- `embed-english-v3.0`: 1024 dimensions
- `embed-multilingual-v3.0`: 1024 dimensions

## Environment Variables

```bash
# Embedding provider configuration
EMBEDDING_PROVIDER=ollama              # 'ollama' or 'openai'
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_MODEL=text-embedding-3-small

# Dimension management (optional)
DIMENSION_AUTO_MIGRATE=true            # Auto-migrate on mismatch (default: false)
DIMENSION_BLOCK_ON_MISMATCH=false      # Block server start if mismatch (default: false)
```

## Configuration Modes

### Mode 1: Auto-Migrate (Recommended for Development)
```bash
DIMENSION_AUTO_MIGRATE=true
DIMENSION_BLOCK_ON_MISMATCH=false
```
- Automatically migrates dimensions on startup
- Server starts even if migration fails
- **Warning**: Clears existing embeddings (will be regenerated)

### Mode 2: Block on Mismatch (Production Safety)
```bash
DIMENSION_AUTO_MIGRATE=false
DIMENSION_BLOCK_ON_MISMATCH=true
```
- Detects mismatches but doesn't auto-migrate
- Blocks server start until manually fixed
- Provides migration SQL for manual execution

### Mode 3: Warning Only (Default)
```bash
DIMENSION_AUTO_MIGRATE=false
DIMENSION_BLOCK_ON_MISMATCH=false
```
- Detects mismatches and warns
- Server starts anyway
- Provides migration SQL for later execution

## Startup Behavior

When the server starts, the Dimension Manager:

1. **Detects Configuration**: Reads `EMBEDDING_PROVIDER` and model from environment
2. **Maps Dimension**: Looks up expected dimension for the model
3. **Scans Database**: Finds all vector columns and their current dimensions
4. **Validates**: Compares current dimensions to expected dimension
5. **Takes Action**: Based on configuration mode (auto-migrate, block, or warn)

## Output Examples

### All Dimensions Match
```
═══════════════════════════════════════════════════════
🔍 EMBEDDING DIMENSION CHECK
═══════════════════════════════════════════════════════

📊 Embedding Configuration:
   Provider: ollama
   Model: nomic-embed-text
   Expected Dimension: 768

🔎 Scanning database for vector columns...

📋 Found 3 vector column(s):
   ✅ memories.embedding: 768 dimensions
   ✅ document_chunks.embedding: 768 dimensions
   ✅ knowledge_base.embedding: 768 dimensions

✅ All vector columns match expected dimension (768)
═══════════════════════════════════════════════════════
```

### Dimension Mismatch with Auto-Migration
```
═══════════════════════════════════════════════════════
🔍 EMBEDDING DIMENSION CHECK
═══════════════════════════════════════════════════════

📊 Embedding Configuration:
   Provider: openai
   Model: text-embedding-3-small
   Expected Dimension: 1536

🔎 Scanning database for vector columns...

📋 Found 3 vector column(s):
   ❌ memories.embedding: 768 dimensions
   ❌ document_chunks.embedding: 768 dimensions
   ✅ knowledge_base.embedding: 1536 dimensions

⚠️  DIMENSION MISMATCH DETECTED
   Expected: 1536 dimensions
   Mismatches: 2/3 columns
   ❌ memories.embedding: 768 (should be 1536)
   ❌ document_chunks.embedding: 768 (should be 1536)

🔄 AUTO-MIGRATION ENABLED
   Migrating all vector columns to 1536 dimensions...

🔧 Migrating memories.embedding: 768 → 1536
✅ memories.embedding: Migration successful
🔧 Migrating document_chunks.embedding: 768 → 1536
✅ document_chunks.embedding: Migration successful

📊 Migration Results:
   ✅ Success: 2
   ⏭️  Skipped: 1
   ❌ Errors: 0

✅ All migrations completed successfully
═══════════════════════════════════════════════════════
```

### Dimension Mismatch with Manual Migration
```
⚠️  DIMENSION MISMATCH DETECTED
   Expected: 1536 dimensions
   Mismatches: 2/3 columns

⚠️  AUTO-MIGRATION DISABLED
   Set DIMENSION_AUTO_MIGRATE=true to enable automatic migration

📝 Manual Migration SQL:

-- memories.embedding

-- Migration: Update memories.embedding to 1536 dimensions
-- Generated: 2025-11-18T10:30:00.000Z

BEGIN;

-- Step 1: Drop existing index (if exists)
DROP INDEX IF EXISTS idx_memories_embedding;

-- Step 2: Drop the existing embedding column
ALTER TABLE memories DROP COLUMN IF EXISTS embedding;

-- Step 3: Add embedding column with new dimensions
ALTER TABLE memories ADD COLUMN embedding vector(1536);

-- Step 4: Recreate vector similarity index
CREATE INDEX idx_memories_embedding ON memories
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;

-- Summary:
-- ✅ memories.embedding updated to 1536 dimensions
-- ✅ Vector similarity index recreated
-- ⚠️  All existing embeddings cleared (will be regenerated)
```

## API Reference

### checkAndMigrateDimensions(pool, options)

Main orchestration function called on server startup.

```javascript
const { checkAndMigrateDimensions } = require('./backend/services/dimensionManager.cjs');

await checkAndMigrateDimensions(pool, {
  autoMigrate: true,        // Override DIMENSION_AUTO_MIGRATE env var
  blockOnMismatch: false    // Override DIMENSION_BLOCK_ON_MISMATCH env var
});
```

**Returns**:
- `{ status: 'valid', message, validation }` - All dimensions match
- `{ status: 'migrated', message, validation, migration }` - Auto-migration completed
- `{ status: 'mismatch', message, validation }` - Mismatch detected, no migration
- `{ status: 'no_vectors', message }` - No vector columns found

### getDimensionForModel(modelName)

Get dimension for a specific embedding model.

```javascript
const { getDimensionForModel } = require('./backend/services/dimensionManager.cjs');

const dimension = getDimensionForModel('nomic-embed-text');
// Returns: 768
```

### detectEmbeddingConfig()

Detect current embedding configuration from environment.

```javascript
const { detectEmbeddingConfig } = require('./backend/services/dimensionManager.cjs');

const config = detectEmbeddingConfig();
// Returns: { provider: 'ollama', model: 'nomic-embed-text', dimension: 768 }
```

### getVectorColumns(pool)

Get all vector columns from database with their current dimensions.

```javascript
const { getVectorColumns } = require('./backend/services/dimensionManager.cjs');

const columns = await getVectorColumns(pool);
// Returns: [
//   { table_name: 'memories', column_name: 'embedding', dimensions: 768 },
//   ...
// ]
```

### validateDimensions(pool, expectedDimension)

Validate all vector columns match expected dimension.

```javascript
const { validateDimensions } = require('./backend/services/dimensionManager.cjs');

const validation = await validateDimensions(pool, 1536);
// Returns: {
//   valid: false,
//   expected: 1536,
//   total: 3,
//   matches: 1,
//   mismatches: 2,
//   details: { matching: [...], mismatching: [...] }
// }
```

### performAutoMigration(pool, targetDimension)

Automatically migrate all vector columns to target dimension.

```javascript
const { performAutoMigration } = require('./backend/services/dimensionManager.cjs');

const results = await performAutoMigration(pool, 1536);
// Returns: {
//   success: [{ table_name, column_name, old_dimension, new_dimension }, ...],
//   errors: [{ table_name, column_name, error }, ...],
//   skipped: [{ table_name, column_name, dimensions }, ...]
// }
```

### generateMigrationSQL(tableName, columnName, newDimension)

Generate migration SQL for manual execution.

```javascript
const { generateMigrationSQL } = require('./backend/services/dimensionManager.cjs');

const sql = generateMigrationSQL('memories', 'embedding', 1536);
// Returns complete SQL migration script as string
```

## Integration with embeddingService.cjs

The `embeddingService.cjs` now exports dimension info functions:

```javascript
const { getDimensionForModel, getCurrentDimension } = require('./backend/services/embeddingService.cjs');

// Get dimension for specific model
const dimension = getDimensionForModel('text-embedding-3-small');
// Returns: 1536

// Get current model's dimension
const currentDim = getCurrentDimension();
// Returns dimension based on EMBEDDING_PROVIDER and model env vars
```

## Common Use Cases

### Use Case 1: Switching from Ollama to OpenAI

**Before**:
```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text  # 768 dimensions
```

**After**:
```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small   # 1536 dimensions
DIMENSION_AUTO_MIGRATE=true              # Auto-migrate on startup
```

**Result**: All vector columns automatically migrated from 768 to 1536 dimensions.

### Use Case 2: Production Deployment with Safety

**Production .env**:
```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
DIMENSION_AUTO_MIGRATE=false             # Don't auto-migrate in production
DIMENSION_BLOCK_ON_MISMATCH=true         # Block if mismatch detected
```

**Result**: Server won't start if dimension mismatch detected. Must manually apply migration SQL.

### Use Case 3: Development with Auto-Healing

**Development .env**:
```bash
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
DIMENSION_AUTO_MIGRATE=true              # Auto-fix mismatches
DIMENSION_BLOCK_ON_MISMATCH=false        # Don't block server start
```

**Result**: Server automatically fixes dimension mismatches on startup, allowing rapid iteration.

## Migration Safety

When auto-migration runs:

1. **Drops Index**: Removes existing vector similarity index
2. **Drops Column**: Removes existing embedding column (⚠️ data loss)
3. **Creates Column**: Adds new column with target dimension
4. **Recreates Index**: Rebuilds vector similarity index
5. **Transaction**: All within BEGIN/COMMIT for atomicity

**Important**:
- Existing embeddings are cleared during migration
- Embeddings will be regenerated on next access
- Use backfill scripts if immediate regeneration needed

## Troubleshooting

### "Unknown model" Warning

If you see:
```
⚠️  Unknown model "custom-model", defaulting to 1536 dimensions
```

**Solution**: Add your model to `MODEL_DIMENSIONS` in `dimensionManager.cjs`:
```javascript
const MODEL_DIMENSIONS = {
  // ... existing models
  'custom-model': 512,  // Your custom model dimension
};
```

### Migration Fails

If migration fails:
```
❌ memories.embedding: Migration failed: permission denied
```

**Solution**:
1. Check database user permissions
2. Apply migration SQL manually as superuser
3. Or grant ALTER TABLE permission to ECOS database user

### Server Won't Start

If server is blocked:
```
🚫 BLOCKING SERVER START (DIMENSION_BLOCK_ON_MISMATCH=true)
```

**Solution**:
1. Copy the provided migration SQL
2. Execute in your database client (e.g., psql, PGWeb)
3. Restart server

## Performance Impact

- **Detection**: ~10ms (scans information_schema)
- **Validation**: ~5ms (compares dimensions)
- **Migration**: ~100-500ms per table (depends on index size)
- **Total Startup Overhead**: <50ms when dimensions match

## Best Practices

1. **Development**: Use `DIMENSION_AUTO_MIGRATE=true` for quick iteration
2. **Staging**: Test migrations with `DIMENSION_BLOCK_ON_MISMATCH=true`
3. **Production**: Disable auto-migrate, enable blocking, apply migrations manually
4. **Model Changes**: Update environment variables, restart server, verify migration
5. **Backfills**: After migration, run embedding backfill scripts to regenerate vectors

## References

- Inspired by: [OpenWebUI Embedding Dimension Detection](https://github.com/open-webui/open-webui)
- pgvector: [Vector Similarity Search](https://github.com/pgvector/pgvector)
- OpenAI Embeddings: [API Reference](https://platform.openai.com/docs/guides/embeddings)
- Ollama Embeddings: [Model Library](https://ollama.ai/library)
