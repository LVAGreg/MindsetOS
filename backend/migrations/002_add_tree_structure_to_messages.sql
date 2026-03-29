-- Migration: Add tree structure fields to messages table
-- Date: 2025-11-18
-- Purpose: Support branching conversations and message editing

-- Add tree structure fields to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sibling_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP DEFAULT NULL;

-- Create index for parent message lookup (improves tree traversal performance)
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);

-- Create index for conversation + parent lookup (common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_parent ON messages(conversation_id, parent_message_id);

-- Add comment to document the tree structure
COMMENT ON COLUMN messages.parent_message_id IS 'Parent message ID for building conversation tree structure';
COMMENT ON COLUMN messages.branch_index IS 'Index of this message among siblings (0-based)';
COMMENT ON COLUMN messages.sibling_count IS 'Total number of sibling messages at this level';
COMMENT ON COLUMN messages.is_edited IS 'Whether this message has been edited';
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when message was last edited';

-- Verify migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages'
        AND column_name = 'parent_message_id'
    ) THEN
        RAISE NOTICE '✅ Tree structure fields added successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration failed - parent_message_id column not found';
    END IF;
END $$;
