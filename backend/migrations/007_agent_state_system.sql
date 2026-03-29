-- Migration 007: Agent State System for V7 Multi-Agent Handoffs
-- Purpose: Enable state persistence and handoffs between V7 agents
-- Created: 2025-10-13

-- ============================================================================
-- AGENT STATE TABLE
-- Stores completed agent outputs for handoff to next agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT 'v7',

  -- State data as JSONB for flexibility
  state_data JSONB NOT NULL,

  -- Completion tracking
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for fast lookups
  CONSTRAINT agent_state_user_agent UNIQUE(user_id, agent_id, agent_version)
);

-- Index for fast user + agent lookups
CREATE INDEX idx_agent_state_user_agent ON agent_state(user_id, agent_id);

-- Index for conversation-based lookups
CREATE INDEX idx_agent_state_conversation ON agent_state(conversation_id);

-- Index for incomplete states (for resume functionality)
CREATE INDEX idx_agent_state_incomplete ON agent_state(user_id, is_complete) WHERE is_complete = false;

-- ============================================================================
-- AGENT HANDOFFS TABLE
-- Tracks transitions between agents for analytics and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source and destination agents
  from_agent_id TEXT NOT NULL,
  from_agent_version TEXT NOT NULL DEFAULT 'v7',
  to_agent_id TEXT NOT NULL,
  to_agent_version TEXT NOT NULL DEFAULT 'v7',

  -- State passed during handoff
  state_passed JSONB NOT NULL,

  -- Handoff metadata
  handoff_method TEXT, -- 'widget_click', 'command', 'auto'
  handoff_at TIMESTAMP DEFAULT NOW(),

  -- Foreign keys to agent_state records
  from_state_id UUID REFERENCES agent_state(id) ON DELETE SET NULL,
  to_state_id UUID REFERENCES agent_state(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user handoff history
CREATE INDEX idx_agent_handoffs_user ON agent_handoffs(user_id, handoff_at DESC);

-- Index for agent transition analytics
CREATE INDEX idx_agent_handoffs_transition ON agent_handoffs(from_agent_id, to_agent_id);

-- ============================================================================
-- AGENT JOURNEY TABLE
-- Tracks complete multi-agent workflows per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Journey metadata
  journey_name TEXT, -- e.g., "Complete Consulting Business Setup"
  start_agent_id TEXT NOT NULL,
  current_agent_id TEXT,

  -- Journey progress
  agents_completed TEXT[] DEFAULT '{}',
  total_handoffs INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,

  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT NOW(),

  -- Journey state snapshot
  journey_state JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user journeys
CREATE INDEX idx_agent_journey_user ON agent_journey(user_id, last_activity_at DESC);

-- Index for incomplete journeys (for resume)
CREATE INDEX idx_agent_journey_incomplete ON agent_journey(user_id, is_complete) WHERE is_complete = false;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update agent state
CREATE OR REPLACE FUNCTION update_agent_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_state updates
CREATE TRIGGER agent_state_updated_at
  BEFORE UPDATE ON agent_state
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_state_timestamp();

-- Trigger for agent_journey updates
CREATE TRIGGER agent_journey_updated_at
  BEFORE UPDATE ON agent_journey
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_state_timestamp();

-- Function to automatically update journey on handoff
CREATE OR REPLACE FUNCTION update_journey_on_handoff()
RETURNS TRIGGER AS $$
DECLARE
  journey_record RECORD;
BEGIN
  -- Find or create journey for this user
  SELECT * INTO journey_record FROM agent_journey
  WHERE user_id = NEW.user_id AND is_complete = false
  ORDER BY last_activity_at DESC
  LIMIT 1;

  IF journey_record IS NULL THEN
    -- Create new journey
    INSERT INTO agent_journey (user_id, start_agent_id, current_agent_id, agents_completed, total_handoffs)
    VALUES (NEW.user_id, NEW.from_agent_id, NEW.to_agent_id, ARRAY[NEW.from_agent_id], 1);
  ELSE
    -- Update existing journey
    UPDATE agent_journey
    SET
      current_agent_id = NEW.to_agent_id,
      agents_completed = array_append(agents_completed, NEW.from_agent_id),
      total_handoffs = total_handoffs + 1,
      last_activity_at = NOW()
    WHERE id = journey_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update journey on handoff
CREATE TRIGGER journey_updated_on_handoff
  AFTER INSERT ON agent_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_on_handoff();

-- ============================================================================
-- SAMPLE QUERIES (for reference)
-- ============================================================================

-- Get latest state for a specific agent per user
-- SELECT * FROM agent_state
-- WHERE user_id = $1 AND agent_id = $2 AND agent_version = 'v7'
-- ORDER BY updated_at DESC LIMIT 1;

-- Get all completed states for a user (their agent history)
-- SELECT agent_id, agent_version, state_data, completed_at
-- FROM agent_state
-- WHERE user_id = $1 AND is_complete = true
-- ORDER BY completed_at DESC;

-- Get user's current journey progress
-- SELECT * FROM agent_journey
-- WHERE user_id = $1 AND is_complete = false
-- ORDER BY last_activity_at DESC LIMIT 1;

-- Get handoff analytics (which transitions are most common)
-- SELECT from_agent_id, to_agent_id, COUNT(*) as handoff_count
-- FROM agent_handoffs
-- GROUP BY from_agent_id, to_agent_id
-- ORDER BY handoff_count DESC;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS journey_updated_on_handoff ON agent_handoffs;
-- DROP TRIGGER IF EXISTS agent_journey_updated_at ON agent_journey;
-- DROP TRIGGER IF EXISTS agent_state_updated_at ON agent_state;
-- DROP FUNCTION IF EXISTS update_journey_on_handoff();
-- DROP FUNCTION IF EXISTS update_agent_state_timestamp();
-- DROP TABLE IF EXISTS agent_journey CASCADE;
-- DROP TABLE IF EXISTS agent_handoffs CASCADE;
-- DROP TABLE IF EXISTS agent_state CASCADE;
