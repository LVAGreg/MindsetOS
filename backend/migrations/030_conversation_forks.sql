-- Migration: 030_conversation_forks
-- Description: Add conversation branching/forking capability with message editing and regeneration
-- Created: 2025-11-13
-- Purpose: Enable users to edit messages, create alternative branches, and navigate conversation forks

BEGIN;

-- ============================================================================
-- MESSAGES TABLE: Add fork tracking columns
-- ============================================================================

-- Parent message reference for tree structure
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Branch index among siblings (0, 1, 2, etc.)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS branch_index INTEGER DEFAULT 0;

-- Track if message was edited
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Timestamp of edit
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Count of sibling branches (denormalized for performance)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sibling_count INTEGER DEFAULT 0;

-- ============================================================================
-- CONVERSATIONS TABLE: Track active branch for persistence
-- ============================================================================

-- CRITICAL: ID of last message in active branch - restored on page refresh
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS active_branch_leaf_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES for efficient fork queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_parent ON messages(conversation_id, parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_branch_index ON messages(conversation_id, branch_index);
CREATE INDEX IF NOT EXISTS idx_conversations_active_branch ON conversations(active_branch_leaf_id);

-- ============================================================================
-- FUNCTION: Get full conversation path for a specific branch
-- ============================================================================

CREATE OR REPLACE FUNCTION get_branch_messages(p_conversation_id UUID, p_leaf_message_id UUID)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  role VARCHAR,
  content TEXT,
  parent_message_id UUID,
  branch_index INTEGER,
  sibling_count INTEGER,
  is_edited BOOLEAN,
  edited_at TIMESTAMP,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE message_tree AS (
    -- Start from the leaf message
    SELECT
      m.id,
      m.conversation_id,
      m.role,
      m.content,
      m.parent_message_id,
      m.branch_index,
      m.sibling_count,
      m.is_edited,
      m.edited_at,
      m.created_at
    FROM messages m
    WHERE m.id = p_leaf_message_id

    UNION ALL

    -- Traverse up to root
    SELECT
      m.id,
      m.conversation_id,
      m.role,
      m.content,
      m.parent_message_id,
      m.branch_index,
      m.sibling_count,
      m.is_edited,
      m.edited_at,
      m.created_at
    FROM messages m
    INNER JOIN message_tree mt ON m.id = mt.parent_message_id
  )
  SELECT
    mt.id,
    mt.conversation_id,
    mt.role,
    mt.content,
    mt.parent_message_id,
    mt.branch_index,
    mt.sibling_count,
    mt.is_edited,
    mt.edited_at,
    mt.created_at
  FROM message_tree mt
  WHERE mt.conversation_id = p_conversation_id
  ORDER BY mt.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get all sibling messages for a given message
-- ============================================================================

CREATE OR REPLACE FUNCTION get_message_siblings(p_message_id UUID)
RETURNS TABLE (
  id UUID,
  role VARCHAR,
  content TEXT,
  parent_message_id UUID,
  branch_index INTEGER,
  is_edited BOOLEAN,
  edited_at TIMESTAMP,
  created_at TIMESTAMP
) AS $$
DECLARE
  v_parent_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Get parent and conversation ID from the reference message
  SELECT parent_message_id, conversation_id
  INTO v_parent_id, v_conversation_id
  FROM messages
  WHERE id = p_message_id;

  -- Return all siblings (same parent, same conversation)
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.parent_message_id,
    m.branch_index,
    m.is_edited,
    m.edited_at,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = v_conversation_id
    AND (
      (v_parent_id IS NULL AND m.parent_message_id IS NULL) OR
      (m.parent_message_id = v_parent_id)
    )
  ORDER BY m.branch_index ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update sibling counts when branches are created
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sibling_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sibling_count for all messages with the same parent
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE messages
    SET sibling_count = (
      SELECT COUNT(*) - 1
      FROM messages m2
      WHERE m2.parent_message_id = NEW.parent_message_id
        AND m2.conversation_id = NEW.conversation_id
    )
    WHERE parent_message_id = NEW.parent_message_id
      AND conversation_id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update sibling counts
-- ============================================================================

CREATE TRIGGER trigger_update_sibling_counts
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_sibling_counts();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN messages.parent_message_id IS 'Parent message in conversation tree - NULL for root messages';
COMMENT ON COLUMN messages.branch_index IS 'Index among sibling branches (0, 1, 2, ...)';
COMMENT ON COLUMN messages.is_edited IS 'True if this message was edited (original marked as edited)';
COMMENT ON COLUMN messages.edited_at IS 'Timestamp when message was edited';
COMMENT ON COLUMN messages.sibling_count IS 'Number of alternative branches at this point';
COMMENT ON COLUMN conversations.active_branch_leaf_id IS 'ID of last message in currently active branch - persists across page refresh';

COMMENT ON FUNCTION get_branch_messages IS 'Returns full message path from root to specified leaf message';
COMMENT ON FUNCTION get_message_siblings IS 'Returns all sibling messages (alternative branches) for a given message';

-- ============================================================================
-- DATA MIGRATION: Set parent_message_id for existing linear conversations
-- ============================================================================

-- For existing conversations, build linear parent relationships
DO $$
DECLARE
  conv RECORD;
  msg RECORD;
  prev_msg_id UUID;
BEGIN
  -- Loop through all conversations
  FOR conv IN SELECT DISTINCT conversation_id FROM messages LOOP
    prev_msg_id := NULL;

    -- Loop through messages in chronological order
    FOR msg IN
      SELECT id
      FROM messages
      WHERE conversation_id = conv.conversation_id
      ORDER BY created_at ASC
    LOOP
      -- Set parent_message_id to previous message
      UPDATE messages
      SET parent_message_id = prev_msg_id
      WHERE id = msg.id;

      -- Update for next iteration
      prev_msg_id := msg.id;
    END LOOP;

    -- Set active_branch_leaf_id to last message in conversation
    IF prev_msg_id IS NOT NULL THEN
      UPDATE conversations
      SET active_branch_leaf_id = prev_msg_id
      WHERE id = conv.conversation_id;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify fork columns added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('parent_message_id', 'branch_index', 'is_edited', 'sibling_count')
ORDER BY column_name;

-- Verify conversations active_branch_leaf_id added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name = 'active_branch_leaf_id';

-- Count conversations with active branch set
SELECT
  COUNT(*) as total_conversations,
  COUNT(active_branch_leaf_id) as conversations_with_active_branch
FROM conversations;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 030: Conversation forks system installed';
  RAISE NOTICE '   - Messages table: parent_message_id, branch_index, is_edited, sibling_count';
  RAISE NOTICE '   - Conversations table: active_branch_leaf_id';
  RAISE NOTICE '   - Functions: get_branch_messages(), get_message_siblings()';
  RAISE NOTICE '   - Trigger: auto-update sibling counts';
  RAISE NOTICE '   - Data migration: parent relationships and active branches set';
END $$;
