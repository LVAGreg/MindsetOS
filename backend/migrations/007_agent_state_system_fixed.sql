-- ============================================================================
-- V7 Agent State System - Fixed Version
-- ============================================================================
-- Purpose: State persistence, handoffs, and journey tracking for V7 agents
-- Dependencies: users table (exists)
-- ============================================================================

-- Drop existing partial tables if any
DROP TABLE IF EXISTS agent_handoffs CASCADE;
DROP TABLE IF EXISTS agent_state CASCADE;
DROP TABLE IF EXISTS agent_journey CASCADE;

-- ============================================================================
-- AGENT STATE - User-specific agent completion states
-- ============================================================================
CREATE TABLE agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT 'v7',

  -- State data stored as JSONB for flexibility
  state_data JSONB NOT NULL DEFAULT '{}',

  -- Completion tracking
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one state per user per agent version
  UNIQUE(user_id, agent_id, agent_version)
);

-- Indexes for performance
CREATE INDEX idx_agent_state_user ON agent_state(user_id);
CREATE INDEX idx_agent_state_agent ON agent_state(agent_id);
CREATE INDEX idx_agent_state_complete ON agent_state(user_id, is_complete);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_agent_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.is_complete = true AND OLD.is_complete = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_state_update_timestamp
  BEFORE UPDATE ON agent_state
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_state_timestamp();

-- ============================================================================
-- AGENT HANDOFFS - Track agent-to-agent transitions
-- ============================================================================
CREATE TABLE agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source and destination agents
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,

  -- State passed during handoff
  state_passed JSONB,

  -- Handoff metadata
  handoff_method TEXT, -- 'widget_click', 'auto', 'manual'
  handoff_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_handoffs_user ON agent_handoffs(user_id);
CREATE INDEX idx_handoffs_from_agent ON agent_handoffs(from_agent_id);
CREATE INDEX idx_handoffs_to_agent ON agent_handoffs(to_agent_id);
CREATE INDEX idx_handoffs_timestamp ON agent_handoffs(handoff_at);

-- ============================================================================
-- AGENT JOURNEY - Complete multi-agent workflow tracking
-- ============================================================================
CREATE TABLE agent_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Journey metadata
  journey_name TEXT, -- 'primary_workflow', 'express_workflow', etc.
  current_agent_id TEXT,

  -- Completion tracking
  agents_completed TEXT[] DEFAULT '{}',
  total_handoffs INTEGER DEFAULT 0,

  -- Journey state
  is_complete BOOLEAN DEFAULT false,
  journey_state JSONB DEFAULT '{}',

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for journey tracking
CREATE INDEX idx_journey_user ON agent_journey(user_id);
CREATE INDEX idx_journey_complete ON agent_journey(user_id, is_complete);
CREATE INDEX idx_journey_activity ON agent_journey(last_activity_at);

-- Auto-update journey on handoff
CREATE OR REPLACE FUNCTION update_journey_on_handoff()
RETURNS TRIGGER AS $$
DECLARE
  v_journey_id UUID;
BEGIN
  -- Find or create active journey for user
  SELECT id INTO v_journey_id
  FROM agent_journey
  WHERE user_id = NEW.user_id
    AND is_complete = false
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_journey_id IS NULL THEN
    -- Create new journey
    INSERT INTO agent_journey (user_id, current_agent_id, journey_name)
    VALUES (NEW.user_id, NEW.to_agent_id, 'primary_workflow')
    RETURNING id INTO v_journey_id;
  END IF;

  -- Update journey
  UPDATE agent_journey
  SET
    current_agent_id = NEW.to_agent_id,
    agents_completed = array_append(agents_completed, NEW.from_agent_id),
    total_handoffs = total_handoffs + 1,
    last_activity_at = NOW()
  WHERE id = v_journey_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journey_handoff_trigger
  AFTER INSERT ON agent_handoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_on_handoff();

-- ============================================================================
-- SAMPLE DATA QUERIES (for testing)
-- ============================================================================

-- Get user's current agent state
-- SELECT * FROM agent_state WHERE user_id = 'USER_UUID' AND is_complete = false;

-- Get user's completed agents
-- SELECT agent_id, completed_at FROM agent_state WHERE user_id = 'USER_UUID' AND is_complete = true;

-- Get user's handoff history
-- SELECT from_agent_id, to_agent_id, handoff_at FROM agent_handoffs WHERE user_id = 'USER_UUID' ORDER BY handoff_at;

-- Get user's current journey
-- SELECT * FROM agent_journey WHERE user_id = 'USER_UUID' AND is_complete = false;

COMMENT ON TABLE agent_state IS 'V7 agent completion states per user';
COMMENT ON TABLE agent_handoffs IS 'V7 agent-to-agent transitions';
COMMENT ON TABLE agent_journey IS 'V7 multi-agent workflow tracking';
