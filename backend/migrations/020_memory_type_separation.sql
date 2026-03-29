-- Migration: 020_memory_type_separation
-- Description: Add memory type system and indexes for core vs conversational memory separation
-- Created: 2025-11-18
-- Phase: Memory System Enhancement

-- ============================================
-- STEP 1: Add memory type constraints and indexes
-- ============================================

-- Create enum type for memory types (if not exists)
DO $$ BEGIN
  CREATE TYPE memory_type_enum AS ENUM ('core', 'conversational', 'episodic', 'semantic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add check constraint to ensure memory_type is valid
ALTER TABLE memories
DROP CONSTRAINT IF EXISTS memories_memory_type_check;

ALTER TABLE memories
ADD CONSTRAINT memories_memory_type_check
CHECK (memory_type IN ('core', 'conversational', 'episodic', 'semantic', 'user_profile', 'conversation', 'entity', 'artifact'));

-- Create indexes for memory type filtering
CREATE INDEX IF NOT EXISTS idx_memories_type_user ON memories(memory_type, user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type_created ON memories(memory_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_core_user ON memories(user_id) WHERE memory_type = 'core';

-- Add created_at index for conversational memory cleanup
CREATE INDEX IF NOT EXISTS idx_memories_conversational_created ON memories(created_at)
WHERE memory_type IN ('conversational', 'episodic');

-- ============================================
-- STEP 2: Add memory lifecycle metadata
-- ============================================

-- Add expiry and retention columns
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS retention_policy VARCHAR(50) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- Create index for expiry cleanup jobs
CREATE INDEX IF NOT EXISTS idx_memories_expiry ON memories(expires_at)
WHERE expires_at IS NOT NULL;

-- ============================================
-- STEP 3: Add memory source tracking
-- ============================================

-- Track where conversational memories came from
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'conversation',
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}';

-- ============================================
-- STEP 4: Create memory lifecycle policies table
-- ============================================

CREATE TABLE IF NOT EXISTS memory_lifecycle_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type VARCHAR(50) NOT NULL,
  retention_days INTEGER, -- NULL means never expire
  auto_cleanup BOOLEAN DEFAULT true,
  importance_threshold DECIMAL(3,2), -- Minimum importance to keep
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(memory_type)
);

-- Insert default lifecycle policies
INSERT INTO memory_lifecycle_policies (memory_type, retention_days, auto_cleanup, importance_threshold, description)
VALUES
  ('core', NULL, false, NULL, 'Core memories never expire - persistent user profile and business information'),
  ('conversational', 90, true, 0.3, 'Conversational memories auto-delete after 90 days unless importance >= 0.3'),
  ('episodic', 30, true, 0.4, 'Episodic memories (session-specific) auto-delete after 30 days unless importance >= 0.4'),
  ('semantic', 180, true, 0.5, 'Semantic memories (general knowledge) retained 180 days if importance >= 0.5')
ON CONFLICT (memory_type) DO NOTHING;

-- ============================================
-- STEP 5: Create cleanup function
-- ============================================

-- Function to apply lifecycle policies and mark memories for deletion
CREATE OR REPLACE FUNCTION apply_memory_lifecycle_policies()
RETURNS TABLE (
  memory_type VARCHAR,
  expired_count BIGINT,
  protected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH policy_application AS (
    -- Mark memories for expiry based on policies
    UPDATE memories m
    SET expires_at = CASE
      WHEN p.retention_days IS NOT NULL AND m.expires_at IS NULL
      THEN m.created_at + (p.retention_days || ' days')::INTERVAL
      ELSE m.expires_at
    END
    FROM memory_lifecycle_policies p
    WHERE m.memory_type = p.memory_type
      AND p.auto_cleanup = true
      AND (m.importance_score IS NULL OR m.importance_score < COALESCE(p.importance_threshold, 0))
      AND m.is_protected = false
    RETURNING m.memory_type, m.id
  )
  SELECT
    m.memory_type,
    COUNT(DISTINCT pa.id) as expired_count,
    COUNT(DISTINCT CASE WHEN m.is_protected THEN m.id END) as protected_count
  FROM memories m
  LEFT JOIN policy_application pa ON pa.id = m.id
  GROUP BY m.memory_type;
END;
$$ LANGUAGE plpgsql;

-- Function to delete expired memories
CREATE OR REPLACE FUNCTION cleanup_expired_memories()
RETURNS TABLE (
  memory_type VARCHAR,
  deleted_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM memories
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND is_protected = false
    RETURNING memory_type
  )
  SELECT
    d.memory_type,
    COUNT(*) as deleted_count
  FROM deleted d
  GROUP BY d.memory_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Add trigger for policy enforcement
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_memory_lifecycle_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memory_lifecycle_policies_updated_at
BEFORE UPDATE ON memory_lifecycle_policies
FOR EACH ROW
EXECUTE FUNCTION update_memory_lifecycle_policies_updated_at();

-- ============================================
-- STEP 7: Create views for memory routing
-- ============================================

-- View for core memories only
CREATE OR REPLACE VIEW v_core_memories AS
SELECT
  id,
  user_id,
  agent_id,
  content,
  importance_score,
  metadata,
  created_at,
  updated_at
FROM memories
WHERE memory_type = 'core'
  AND (expires_at IS NULL OR expires_at > NOW());

-- View for active conversational memories
CREATE OR REPLACE VIEW v_conversational_memories AS
SELECT
  id,
  user_id,
  agent_id,
  content,
  importance_score,
  metadata,
  created_at,
  updated_at,
  source_conversation_id
FROM memories
WHERE memory_type IN ('conversational', 'episodic')
  AND (expires_at IS NULL OR expires_at > NOW())
  AND created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- STEP 8: Add comments for documentation
-- ============================================

COMMENT ON COLUMN memories.memory_type IS 'Type of memory: core (persistent profile), conversational (ephemeral context), episodic (session-specific), semantic (general knowledge)';
COMMENT ON COLUMN memories.expires_at IS 'Timestamp when memory expires (NULL = never expires)';
COMMENT ON COLUMN memories.retention_policy IS 'Retention policy identifier (standard, extended, permanent)';
COMMENT ON COLUMN memories.is_protected IS 'Protected memories cannot be auto-deleted';
COMMENT ON COLUMN memories.source_type IS 'Source of memory: conversation, onboarding, manual, import';
COMMENT ON COLUMN memories.source_metadata IS 'Additional source information';

COMMENT ON TABLE memory_lifecycle_policies IS 'Defines retention and cleanup policies for different memory types';
COMMENT ON VIEW v_core_memories IS 'Non-expired core memories - always loaded for context';
COMMENT ON VIEW v_conversational_memories IS 'Recent conversational memories - loaded based on recency and relevance';

-- ============================================
-- Migration complete
-- ============================================

-- Run initial policy application
SELECT apply_memory_lifecycle_policies();
