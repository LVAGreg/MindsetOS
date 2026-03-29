-- Migration 008: Agent Prompt Management System
-- Purpose: Store agent system prompts in database for easy editing and version control
-- Created: 2025-10-13

-- ============================================================================
-- AGENT PROMPTS TABLE
-- Stores system prompts for each agent version with full editability
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT 'v7',
  agent_name TEXT NOT NULL,
  agent_description TEXT,

  -- Prompt components (modular for easy editing)
  system_prompt TEXT NOT NULL,
  security_instructions TEXT,
  voice_tone_instructions TEXT,
  workflow_instructions TEXT,
  handoff_instructions TEXT,

  -- Supporting data
  supporting_files JSONB DEFAULT '[]'::jsonb, -- Array of file references
  example_data JSONB DEFAULT '{}'::jsonb, -- Example inputs/outputs

  -- Agent configuration
  config JSONB DEFAULT '{}'::jsonb, -- Response limits, temperature, etc
  dependencies TEXT[] DEFAULT '{}', -- Other agents this depends on

  -- Status and versioning
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  version_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  -- Unique constraint on agent_id + version
  CONSTRAINT unique_agent_version UNIQUE(agent_id, agent_version)
);

-- Index for fast lookups by agent_id
CREATE INDEX idx_agent_prompts_agent_id ON agent_prompts(agent_id);

-- Index for active agents
CREATE INDEX idx_agent_prompts_active ON agent_prompts(is_active, is_published) WHERE is_active = true;

-- ============================================================================
-- AGENT PROMPT HISTORY TABLE
-- Track all changes to agent prompts for audit and rollback
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id UUID NOT NULL REFERENCES agent_prompts(id) ON DELETE CASCADE,

  -- Snapshot of prompt at time of change
  system_prompt TEXT NOT NULL,
  security_instructions TEXT,
  voice_tone_instructions TEXT,
  workflow_instructions TEXT,
  handoff_instructions TEXT,
  config JSONB,

  -- Change metadata
  change_description TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for prompt history lookups
CREATE INDEX idx_agent_prompt_history_prompt ON agent_prompt_history(agent_prompt_id, changed_at DESC);

-- ============================================================================
-- AGENT CATEGORIES TABLE
-- Organize agents into categories for better navigation
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  category_description TEXT,
  display_order INTEGER DEFAULT 0,
  icon TEXT, -- Emoji or icon identifier
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AGENT CATEGORY MAPPING
-- Many-to-many relationship between agents and categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_category_mapping (
  agent_prompt_id UUID NOT NULL REFERENCES agent_prompts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES agent_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (agent_prompt_id, category_id)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update agent prompt timestamp
CREATE OR REPLACE FUNCTION update_agent_prompt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_prompts updates
CREATE TRIGGER agent_prompts_updated_at
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_prompt_timestamp();

-- Function to automatically create history entry on prompt update
CREATE OR REPLACE FUNCTION create_agent_prompt_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if important fields changed
  IF (OLD.system_prompt IS DISTINCT FROM NEW.system_prompt OR
      OLD.security_instructions IS DISTINCT FROM NEW.security_instructions OR
      OLD.voice_tone_instructions IS DISTINCT FROM NEW.voice_tone_instructions OR
      OLD.workflow_instructions IS DISTINCT FROM NEW.workflow_instructions OR
      OLD.handoff_instructions IS DISTINCT FROM NEW.handoff_instructions OR
      OLD.config IS DISTINCT FROM NEW.config) THEN

    INSERT INTO agent_prompt_history (
      agent_prompt_id,
      system_prompt,
      security_instructions,
      voice_tone_instructions,
      workflow_instructions,
      handoff_instructions,
      config,
      changed_by
    )
    VALUES (
      OLD.id,
      OLD.system_prompt,
      OLD.security_instructions,
      OLD.voice_tone_instructions,
      OLD.workflow_instructions,
      OLD.handoff_instructions,
      OLD.config,
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create history on update
CREATE TRIGGER agent_prompt_history_trigger
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_prompt_history();

-- ============================================================================
-- SEED DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO agent_categories (category_name, category_description, display_order, icon) VALUES
('Core Workflow', 'Essential agents for complete consulting business setup', 1, '🎯'),
('Marketing', 'Promotional and campaign planning agents', 2, '📣'),
('Sales', 'Qualification and conversion agents', 3, '💰'),
('Events', 'LinkedIn event planning and promotion', 4, '🎤'),
('Analytics', 'Memory insights and business intelligence', 5, '📊')
ON CONFLICT (category_name) DO NOTHING;

-- ============================================================================
-- SAMPLE AGENT PROMPT INSERT
-- ============================================================================

-- Example: Insert Money Model Maker V7
-- INSERT INTO agent_prompts (
--   agent_id,
--   agent_version,
--   agent_name,
--   agent_description,
--   system_prompt,
--   security_instructions,
--   voice_tone_instructions,
--   workflow_instructions,
--   handoff_instructions,
--   config,
--   dependencies,
--   is_active,
--   is_published
-- ) VALUES (
--   'money-model-maker-v7',
--   'v7',
--   'Money Model Maker',
--   'Create high-converting offers using the Money Model framework',
--   'You are The EXPERT Money Model Maker...',
--   'READ THIS FIRST – NON-NEGOTIABLE...',
--   'Your tone must be warm, smart, and conversational...',
--   'Step 1: PEOPLE... Step 2: PROMISE... Step 3: PRINCIPLES...',
--   'After completion, offer handoff to Fast Fix Finder or Offer Promo Printer...',
--   '{"response_limit": 400, "temperature": 0.7}'::jsonb,
--   ARRAY[]::text[],
--   true,
--   true
-- );

-- ============================================================================
-- SAMPLE QUERIES (for reference)
-- ============================================================================

-- Get active agent prompts
-- SELECT * FROM agent_prompts WHERE is_active = true AND is_published = true ORDER BY agent_name;

-- Get full agent prompt with all components
-- SELECT
--   agent_id,
--   agent_name,
--   system_prompt || E'\n\n' ||
--   COALESCE(security_instructions, '') || E'\n\n' ||
--   COALESCE(voice_tone_instructions, '') || E'\n\n' ||
--   COALESCE(workflow_instructions, '') || E'\n\n' ||
--   COALESCE(handoff_instructions, '') AS full_prompt
-- FROM agent_prompts
-- WHERE agent_id = 'money-model-maker-v7' AND agent_version = 'v7';

-- Get agent history (for rollback)
-- SELECT * FROM agent_prompt_history
-- WHERE agent_prompt_id = $1
-- ORDER BY changed_at DESC;

-- Get agents by category
-- SELECT ap.*, ac.category_name
-- FROM agent_prompts ap
-- JOIN agent_category_mapping acm ON ap.id = acm.agent_prompt_id
-- JOIN agent_categories ac ON acm.category_id = ac.id
-- WHERE ac.category_name = 'Core Workflow'
-- ORDER BY acm.display_order;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS agent_prompt_history_trigger ON agent_prompts;
-- DROP TRIGGER IF EXISTS agent_prompts_updated_at ON agent_prompts;
-- DROP FUNCTION IF EXISTS create_agent_prompt_history();
-- DROP FUNCTION IF EXISTS update_agent_prompt_timestamp();
-- DROP TABLE IF EXISTS agent_category_mapping CASCADE;
-- DROP TABLE IF EXISTS agent_categories CASCADE;
-- DROP TABLE IF EXISTS agent_prompt_history CASCADE;
-- DROP TABLE IF EXISTS agent_prompts CASCADE;
