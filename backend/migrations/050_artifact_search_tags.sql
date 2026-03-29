-- Migration 050: Add search and tag indexes for artifacts (Playbook Phase 4)

-- GIN index for tag queries on metadata JSONB
CREATE INDEX IF NOT EXISTS idx_artifacts_metadata_tags ON artifacts USING GIN ((metadata->'tags'));

-- Index for text search on title
CREATE INDEX IF NOT EXISTS idx_artifacts_title_trgm ON artifacts USING GIN (title gin_trgm_ops);

-- Enable pg_trgm extension if not already enabled (for ILIKE performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
