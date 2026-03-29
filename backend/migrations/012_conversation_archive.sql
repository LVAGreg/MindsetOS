-- Migration 012: Add conversation archiving support
-- Purpose: Allow users to archive conversations
-- Created: 2025-10-31

-- Add is_archived column
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add index for filtering archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(user_id, is_archived, updated_at DESC);

-- Add comment
COMMENT ON COLUMN conversations.is_archived IS 'Whether the conversation has been archived by the user';
