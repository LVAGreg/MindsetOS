-- Fix get_message_siblings function - column reference ambiguity
-- The function had an ambiguous parent_message_id reference causing 500 errors
-- Changed table aliases from 'm' to 'msg' to avoid ambiguity with declared variables

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
  SELECT m.parent_message_id, m.conversation_id
  INTO v_parent_id, v_conversation_id
  FROM messages m
  WHERE m.id = p_message_id;

  -- Return all siblings (same parent, same conversation)
  RETURN QUERY
  SELECT
    msg.id,
    msg.role,
    msg.content,
    msg.parent_message_id,
    msg.branch_index,
    msg.is_edited,
    msg.edited_at,
    msg.created_at
  FROM messages msg
  WHERE msg.conversation_id = v_conversation_id
    AND (
      (v_parent_id IS NULL AND msg.parent_message_id IS NULL) OR
      (msg.parent_message_id = v_parent_id)
    )
  ORDER BY msg.branch_index ASC;
END;
$$ LANGUAGE plpgsql;
