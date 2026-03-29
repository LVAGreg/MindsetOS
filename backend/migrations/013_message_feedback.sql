-- Migration 013: Add message feedback system
-- Purpose: Track user feedback (thumbs up/down) on assistant messages
-- Created: 2025-10-31

-- Create message_feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  feedback_type VARCHAR(10) NOT NULL CHECK (feedback_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one feedback per user per message
  UNIQUE(user_id, message_id)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_message_feedback_user ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_conversation ON message_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_agent ON message_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_type ON message_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created ON message_feedback(created_at DESC);

-- Add comments
COMMENT ON TABLE message_feedback IS 'User feedback on assistant messages';
COMMENT ON COLUMN message_feedback.feedback_type IS 'Type of feedback: up (positive) or down (negative)';
COMMENT ON COLUMN message_feedback.message_id IS 'References the message UUID from the messages array in conversations';
