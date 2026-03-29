-- Migration: 024_fix_all_embedding_dimensions
-- Purpose: Ensure ALL tables with embedding columns use 1536 dimensions for OpenAI text-embedding-3-small
-- Date: 2025-11-12
-- Reason: Fix "expected 768 dimensions, not 1536" errors in memory extraction

BEGIN;

-- =============================================================================
-- STEP 1: Fix memories table (if not already updated)
-- =============================================================================

DO $$
DECLARE
    col_exists boolean;
    dims integer;
BEGIN
    -- Check if embedding column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'embedding'
    ) INTO col_exists;

    IF col_exists THEN
        -- Get current dimension
        SELECT atttypmod INTO dims
        FROM pg_attribute
        WHERE attrelid = 'memories'::regclass
        AND attname = 'embedding';

        IF dims != 1536 THEN
            RAISE NOTICE '🔄 Updating memories.embedding from % to 1536 dimensions', dims;

            -- Drop and recreate with correct dimensions
            ALTER TABLE memories DROP COLUMN embedding;
            ALTER TABLE memories ADD COLUMN embedding vector(1536);

            -- Recreate index
            DROP INDEX IF EXISTS idx_memories_embedding;
            CREATE INDEX idx_memories_embedding ON memories
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);

            RAISE NOTICE '✅ memories.embedding updated to 1536 dimensions';
        ELSE
            RAISE NOTICE '✅ memories.embedding already 1536 dimensions';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  memories.embedding column does not exist';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Fix memory_messages table (if exists)
-- =============================================================================

DO $$
DECLARE
    table_exists boolean;
    col_exists boolean;
    dims integer;
BEGIN
    -- Check if memory_messages table exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'memory_messages'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if embedding column exists
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'memory_messages' AND column_name = 'embedding'
        ) INTO col_exists;

        IF col_exists THEN
            -- Get current dimension
            SELECT atttypmod INTO dims
            FROM pg_attribute
            WHERE attrelid = 'memory_messages'::regclass
            AND attname = 'embedding';

            IF dims != 1536 THEN
                RAISE NOTICE '🔄 Updating memory_messages.embedding from % to 1536 dimensions', dims;

                -- Drop and recreate with correct dimensions
                ALTER TABLE memory_messages DROP COLUMN embedding;
                ALTER TABLE memory_messages ADD COLUMN embedding vector(1536);

                -- Recreate index
                DROP INDEX IF EXISTS idx_memory_messages_embedding;
                CREATE INDEX idx_memory_messages_embedding ON memory_messages
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);

                RAISE NOTICE '✅ memory_messages.embedding updated to 1536 dimensions';
            ELSE
                RAISE NOTICE '✅ memory_messages.embedding already 1536 dimensions';
            END IF;
        ELSE
            RAISE NOTICE '⚠️  memory_messages.embedding column does not exist';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  memory_messages table does not exist (skipping)';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Fix document_chunks table (for knowledge base)
-- =============================================================================

DO $$
DECLARE
    col_exists boolean;
    dims integer;
BEGIN
    -- Check if embedding column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    ) INTO col_exists;

    IF col_exists THEN
        -- Get current dimension
        SELECT atttypmod INTO dims
        FROM pg_attribute
        WHERE attrelid = 'document_chunks'::regclass
        AND attname = 'embedding';

        IF dims != 1536 THEN
            RAISE NOTICE '🔄 Updating document_chunks.embedding from % to 1536 dimensions', dims;

            -- Drop and recreate with correct dimensions
            ALTER TABLE document_chunks DROP COLUMN embedding;
            ALTER TABLE document_chunks ADD COLUMN embedding vector(1536);

            -- Recreate index
            DROP INDEX IF EXISTS idx_document_chunks_embedding;
            CREATE INDEX idx_document_chunks_embedding ON document_chunks
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);

            RAISE NOTICE '✅ document_chunks.embedding updated to 1536 dimensions';
        ELSE
            RAISE NOTICE '✅ document_chunks.embedding already 1536 dimensions';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  document_chunks.embedding column does not exist';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Fix any other tables with embedding columns
-- =============================================================================

DO $$
DECLARE
    tbl record;
    dims integer;
BEGIN
    RAISE NOTICE '🔍 Scanning for additional tables with embedding columns...';

    FOR tbl IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE column_name = 'embedding'
        AND table_name NOT IN ('memories', 'memory_messages', 'document_chunks')
    LOOP
        -- Get current dimension
        EXECUTE format('
            SELECT atttypmod
            FROM pg_attribute
            WHERE attrelid = %L::regclass
            AND attname = ''embedding''
        ', tbl.table_name) INTO dims;

        IF dims != 1536 THEN
            RAISE NOTICE '🔄 Found %: updating from % to 1536 dimensions', tbl.table_name, dims;

            -- Drop and recreate with correct dimensions
            EXECUTE format('ALTER TABLE %I DROP COLUMN embedding', tbl.table_name);
            EXECUTE format('ALTER TABLE %I ADD COLUMN embedding vector(1536)', tbl.table_name);

            -- Create index
            EXECUTE format('
                CREATE INDEX idx_%I_embedding ON %I
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            ', tbl.table_name, tbl.table_name);

            RAISE NOTICE '✅ %: embedding updated to 1536 dimensions', tbl.table_name;
        ELSE
            RAISE NOTICE '✅ %: embedding already 1536 dimensions', tbl.table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 5: Verification
-- =============================================================================

DO $$
DECLARE
    mismatch_count integer;
    tbl record;
BEGIN
    RAISE NOTICE '📊 Final verification of all embedding dimensions...';

    SELECT COUNT(*) INTO mismatch_count
    FROM information_schema.columns c
    JOIN pg_attribute a ON a.attname = c.column_name
    JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = c.table_name
    WHERE c.column_name = 'embedding'
    AND a.atttypmod != 1536;

    IF mismatch_count > 0 THEN
        RAISE WARNING '⚠️  Found % tables with incorrect embedding dimensions', mismatch_count;

        FOR tbl IN
            SELECT DISTINCT c.table_name, a.atttypmod as dims
            FROM information_schema.columns c
            JOIN pg_attribute a ON a.attname = c.column_name
            JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = c.table_name
            WHERE c.column_name = 'embedding'
            AND a.atttypmod != 1536
        LOOP
            RAISE WARNING '  - %.embedding has % dimensions (expected 1536)', tbl.table_name, tbl.dims;
        END LOOP;

        RAISE EXCEPTION '❌ Embedding dimension mismatch detected';
    ELSE
        RAISE NOTICE '✅ All embedding columns verified at 1536 dimensions';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Summary
-- =============================================================================

-- This migration ensures:
-- ✅ All embedding columns across all tables use 1536 dimensions
-- ✅ OpenAI text-embedding-3-small compatibility (EMBEDDING_DIMENSIONS=1536)
-- ✅ Vector similarity indexes created for all embedding columns
-- ✅ Comprehensive verification of all changes

-- Note: Existing embeddings will be cleared and need regeneration
-- This is expected behavior to ensure dimensional consistency

-- Environment variable requirements:
-- EMBEDDING_DIMENSIONS=1536
-- EMBEDDING_MODEL=text-embedding-3-small
-- EMBEDDING_PROVIDER=openai
