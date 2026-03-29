-- Migration: Add per-agent model configuration
-- Allows each agent to override system-wide model settings

-- Add model columns to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS chat_model VARCHAR(200) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS memory_model VARCHAR(200) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS widget_model VARCHAR(200) DEFAULT NULL;

-- Add comments to document column purposes
COMMENT ON COLUMN agents.chat_model IS 'Override model for agent conversations (NULL = use model_preference)';
COMMENT ON COLUMN agents.memory_model IS 'Override model for memory extraction (NULL = use system default)';
COMMENT ON COLUMN agents.widget_model IS 'Override model for widget formatting (NULL = use system default)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_chat_model ON agents(chat_model) WHERE chat_model IS NOT NULL;

-- Verify columns added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='agents' AND column_name='chat_model') THEN
        RAISE NOTICE 'Successfully added per-agent model columns to agents table';
    ELSE
        RAISE EXCEPTION 'Failed to add per-agent model columns';
    END IF;
END $$;
