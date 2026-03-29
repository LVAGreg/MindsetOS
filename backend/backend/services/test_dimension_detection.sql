-- Test SQL: Verify Dimension Detection
-- This script shows how to manually check vector column dimensions
-- Can be run in PGWeb or any PostgreSQL client

-- Query 1: List all vector columns with their dimensions
SELECT
  t.table_name,
  c.column_name,
  c.udt_name,
  -- Extract dimension from type definition
  CASE
    WHEN c.udt_name = 'vector' THEN
      substring(format_type(a.atttypid, a.atttypmod) from '\((\d+)\)')::integer
    ELSE NULL
  END as dimensions,
  format_type(a.atttypid, a.atttypmod) as full_type
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

-- Expected output example:
-- table_name       | column_name | udt_name | dimensions | full_type
-- -----------------+-------------+----------+------------+----------------
-- memories         | embedding   | vector   | 1536       | vector(1536)
-- document_chunks  | embedding   | vector   | 1536       | vector(1536)
-- knowledge_base   | embedding   | vector   | 1536       | vector(1536)

-- Query 2: Check for dimension mismatches (if you know expected dimension)
-- Replace '1536' with your expected dimension
DO $$
DECLARE
  expected_dim INTEGER := 1536;  -- Change this to your expected dimension
  rec RECORD;
  mismatch_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT
      t.table_name,
      c.column_name,
      substring(format_type(a.atttypid, a.atttypmod) from '\((\d+)\)')::integer as dimensions
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    JOIN pg_attribute a
      ON a.attname = c.column_name
      AND a.attrelid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
    WHERE t.table_schema = 'public' AND c.udt_name = 'vector'
  LOOP
    IF rec.dimensions = expected_dim THEN
      RAISE NOTICE '✅ %.%: % dimensions (matches)', rec.table_name, rec.column_name, rec.dimensions;
    ELSE
      RAISE NOTICE '❌ %.%: % dimensions (expected %)', rec.table_name, rec.column_name, rec.dimensions, expected_dim;
      mismatch_count := mismatch_count + 1;
    END IF;
  END LOOP;

  IF mismatch_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All vector columns match expected dimension (%)!', expected_dim;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Found % dimension mismatch(es)', mismatch_count;
  END IF;
END $$;

-- Query 3: Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Expected output:
-- extname | extowner | extnamespace | extrelocatable | extversion
-- --------+----------+--------------+----------------+------------
-- vector  | 10       | 2200         | f              | 0.5.1

-- Query 4: List all vector similarity indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexdef LIKE '%vector%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected output example:
-- schemaname | tablename       | indexname                  | indexdef
-- -----------+-----------------+----------------------------+---------------------------
-- public     | memories        | idx_memories_embedding     | CREATE INDEX ... USING ivfflat ...
-- public     | document_chunks | idx_document_chunks_emb... | CREATE INDEX ... USING ivfflat ...
-- public     | knowledge_base  | idx_knowledge_base_emb...  | CREATE INDEX ... USING ivfflat ...

-- Query 5: Sample migration SQL (if needed)
-- This shows how to manually migrate a vector column to a different dimension
-- UNCOMMENT AND MODIFY AS NEEDED:

/*
-- Example: Migrate memories.embedding from 768 to 1536 dimensions

BEGIN;

-- Step 1: Drop existing index
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

-- Verify
SELECT
  table_name,
  column_name,
  substring(format_type(atttypid, atttypmod) from '\((\d+)\)')::integer as dimensions
FROM information_schema.columns c
JOIN pg_attribute a ON a.attname = c.column_name
  AND a.attrelid = (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass
WHERE table_schema = 'public'
  AND table_name = 'memories'
  AND column_name = 'embedding';
*/
