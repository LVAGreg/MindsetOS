-- Migration 011: System Prompts Configuration
-- Purpose: Store configurable system prompts for widget formatter and memory agent
-- Created: 2025-10-31

-- ============================================================================
-- SYSTEM PROMPTS TABLE
-- Stores configurable system prompts for internal AI components
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prompt identification
  prompt_type VARCHAR(100) NOT NULL UNIQUE, -- 'widget_formatter', 'memory_agent', etc.
  prompt_name VARCHAR(200) NOT NULL,
  prompt_description TEXT,

  -- Prompt content
  system_prompt TEXT NOT NULL,

  -- Model configuration
  model_id VARCHAR(200), -- FK to ai_models.model_id
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,

  -- Additional configuration
  config JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by type
CREATE INDEX idx_system_prompts_type ON system_prompts(prompt_type);

-- Index for active prompts
CREATE INDEX idx_system_prompts_active ON system_prompts(is_active) WHERE is_active = true;

-- ============================================================================
-- SYSTEM PROMPTS HISTORY TABLE
-- Track all changes for audit and rollback
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_prompts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,

  -- Snapshot at time of change
  system_prompt TEXT NOT NULL,
  model_id VARCHAR(200),
  temperature DECIMAL(3, 2),
  max_tokens INTEGER,
  config JSONB,

  -- Change metadata
  change_description TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX idx_system_prompts_history ON system_prompts_history(system_prompt_id, changed_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_system_prompts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updates
CREATE TRIGGER system_prompts_updated_at
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_system_prompts_timestamp();

-- Function to create history entry
CREATE OR REPLACE FUNCTION create_system_prompts_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.system_prompt IS DISTINCT FROM NEW.system_prompt OR
      OLD.model_id IS DISTINCT FROM NEW.model_id OR
      OLD.temperature IS DISTINCT FROM NEW.temperature OR
      OLD.max_tokens IS DISTINCT FROM NEW.max_tokens OR
      OLD.config IS DISTINCT FROM NEW.config) THEN

    INSERT INTO system_prompts_history (
      system_prompt_id,
      system_prompt,
      model_id,
      temperature,
      max_tokens,
      config,
      changed_by
    )
    VALUES (
      OLD.id,
      OLD.system_prompt,
      OLD.model_id,
      OLD.temperature,
      OLD.max_tokens,
      OLD.config,
      NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create history
CREATE TRIGGER system_prompts_history_trigger
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_system_prompts_history();

-- ============================================================================
-- SEED DEFAULT SYSTEM PROMPTS
-- ============================================================================

-- Widget Formatter Prompt
INSERT INTO system_prompts (
  prompt_type,
  prompt_name,
  prompt_description,
  system_prompt,
  model_id,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'widget_formatter',
  'Widget Formatter',
  'Adds interactive formatting markers to lists in AI responses',
  'Your task: Detect lists in the text below and add formatting markers. ONLY output the formatted text, nothing else.

RULES:
1. Keep ALL original content - never remove or change any text
2. If you find a clear list with 3+ items (numbered, bulleted, or lettered), add ONE marker before it:
   - "MULTI-SELECT:" for actionable choices
   - "OPTIONS:" for informational lists
3. If no clear list, or less than 3 items, or already has markers → return the EXACT original text unchanged
4. Never explain, never add commentary, ONLY return the formatted (or original) text

TEXT TO FORMAT:
{aiResponse}

FORMATTED OUTPUT:',
  'anthropic/claude-3.5-haiku-20250110',
  0.3,
  2000,
  true
);

-- Memory Agent Prompt
INSERT INTO system_prompts (
  prompt_type,
  prompt_name,
  prompt_description,
  system_prompt,
  model_id,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'memory_agent',
  'Memory Agent',
  'Stores and retrieves conversation context and user information',
  'You are a memory agent for an AI assistant system. Your role is to:

1. **Store Information**: When given conversation context, extract and store:
   - User preferences and goals
   - Important decisions and action items
   - Key facts and context about the user''s situation
   - Follow-up tasks and commitments

2. **Retrieve Information**: When asked, provide relevant context:
   - Recent conversations and decisions
   - User preferences and patterns
   - Action items and commitments
   - Related past interactions

3. **Update Information**: Merge new information with existing context:
   - Update changed preferences
   - Mark completed action items
   - Add new context without losing important history

4. **Prioritize**: Focus on information that will be most useful for:
   - Maintaining conversation continuity
   - Personalizing responses
   - Tracking progress on goals
   - Avoiding repetition

Always respond in structured JSON format for easy parsing.',
  'anthropic/claude-3.5-haiku-20250110',
  0.5,
  2000,
  true
)
ON CONFLICT (prompt_type) DO NOTHING;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get active system prompt
-- SELECT * FROM system_prompts WHERE prompt_type = 'widget_formatter' AND is_active = true;

-- Get all system prompts
-- SELECT * FROM system_prompts ORDER BY prompt_name;

-- Get prompt history
-- SELECT * FROM system_prompts_history WHERE system_prompt_id = $1 ORDER BY changed_at DESC;

-- Update a prompt
-- UPDATE system_prompts
-- SET system_prompt = 'new prompt text', updated_by = $1
-- WHERE prompt_type = 'widget_formatter';
