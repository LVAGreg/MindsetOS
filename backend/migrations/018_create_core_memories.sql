-- Migration: Create core_memories table for structured profile data
-- Date: 2025-11-12
-- Purpose: Store structured onboarding and profile data extracted from agent conversations

CREATE TABLE IF NOT EXISTS core_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Section 1: Business Identity
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  business_outcome TEXT,

  -- Section 2: Client Profile
  target_clients TEXT,
  client_problems TEXT[], -- Array of top 3 problems
  client_results TEXT, -- Tangible outcomes

  -- Section 3: Methodology
  core_method TEXT,
  frameworks TEXT[], -- Key frameworks/processes

  -- Section 4: Service Details
  service_description TEXT,
  pricing_model VARCHAR(100),
  delivery_timeline VARCHAR(100),

  -- Section 5: Current State
  revenue_range VARCHAR(50),
  growth_goals TEXT,
  biggest_challenges TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_core_memories_user_id ON core_memories(user_id);

-- Audit log for core memory changes
CREATE TABLE IF NOT EXISTS core_memory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  core_memory_id UUID REFERENCES core_memories(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source VARCHAR(50) DEFAULT 'manual', -- manual, agent, system
  agent_id VARCHAR(100) REFERENCES agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit trail queries
CREATE INDEX idx_core_memory_audit_user_id ON core_memory_audit_log(user_id);
CREATE INDEX idx_core_memory_audit_changed_at ON core_memory_audit_log(changed_at DESC);
CREATE INDEX idx_core_memory_audit_memory_id ON core_memory_audit_log(core_memory_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_core_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER trigger_update_core_memories_timestamp
  BEFORE UPDATE ON core_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_core_memories_updated_at();

-- Comments for documentation
COMMENT ON TABLE core_memories IS 'Structured profile data extracted from agent conversations and user input';
COMMENT ON TABLE core_memory_audit_log IS 'Audit trail for all changes to core memories';
COMMENT ON COLUMN core_memory_audit_log.source IS 'Source of change: manual (user edited), agent (extracted from conversation), system (automated process)';
