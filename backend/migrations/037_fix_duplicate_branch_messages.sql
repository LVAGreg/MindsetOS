-- Fix get_branch_messages to prevent duplicate messages
-- Issue: Recursive CTE may return duplicates if tree structure has issues
-- Solution: Add DISTINCT to final SELECT

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
  GROUP BY mt.id, mt.conversation_id, mt.role, mt.content, mt.parent_message_id,
           mt.branch_index, mt.sibling_count, mt.is_edited, mt.edited_at, mt.created_at
  ORDER BY mt.created_at ASC;
END;
$$ LANGUAGE plpgsql;
