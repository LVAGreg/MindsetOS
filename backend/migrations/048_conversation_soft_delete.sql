-- Migration 048: Add soft-delete support for conversations
-- Conversations are now soft-deleted (deleted_at set) instead of hard-deleted
-- This preserves data for admin forensic review

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index for efficient filtering of non-deleted conversations
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Partial index for common query pattern (non-deleted conversations)
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(user_id, updated_at DESC) WHERE deleted_at IS NULL;
