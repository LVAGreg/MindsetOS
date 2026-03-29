-- Migration: Add model_override column to conversations table
-- This allows admins to override the agent's default model per conversation

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS model_override VARCHAR(255) DEFAULT NULL;

-- Add index for faster lookups when filtering by model override
CREATE INDEX IF NOT EXISTS idx_conversations_model_override
ON conversations(model_override)
WHERE model_override IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN conversations.model_override IS 'Admin-specified model override for this conversation. When NULL, uses agent default model.';
