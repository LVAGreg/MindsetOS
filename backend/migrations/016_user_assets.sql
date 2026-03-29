-- Migration: Add user_assets table for Notes & Assets System
-- Allows users to save notes, files, and AI-suggested content for later reference
-- Supports both conversation-specific and global assets

-- Create asset_type enum for type safety
CREATE TYPE asset_type AS ENUM ('note', 'file', 'suggested_note', 'memory_snapshot');

-- Create user_assets table
CREATE TABLE IF NOT EXISTS user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Asset type and content
  asset_type asset_type NOT NULL,
  title VARCHAR(500),
  content TEXT,
  file_path TEXT,
  file_name VARCHAR(255),
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),

  -- Context associations (all optional for global assets)
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  agent_id VARCHAR(100) REFERENCES agents(id) ON DELETE SET NULL,
  message_id UUID, -- future reference to specific message

  -- Organization and metadata
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- AI suggestion metadata
  suggestion_reason TEXT, -- why AI suggested this note
  suggestion_confidence DECIMAL(3,2), -- 0.00 to 1.00

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_user_assets_asset_type ON user_assets(asset_type);
CREATE INDEX idx_user_assets_conversation_id ON user_assets(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_user_assets_agent_id ON user_assets(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_user_assets_is_pinned ON user_assets(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_user_assets_tags ON user_assets USING GIN(tags);
CREATE INDEX idx_user_assets_created_at ON user_assets(created_at DESC);

-- Full-text search index for content
CREATE INDEX idx_user_assets_content_search ON user_assets USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_assets_updated_at
  BEFORE UPDATE ON user_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_assets_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_assets IS 'Stores user notes, files, and AI-suggested content as reusable assets';
COMMENT ON COLUMN user_assets.asset_type IS 'Type of asset: note (manual), file (uploaded), suggested_note (AI-generated), memory_snapshot (memory export)';
COMMENT ON COLUMN user_assets.conversation_id IS 'Optional: Links asset to specific conversation. NULL for global assets.';
COMMENT ON COLUMN user_assets.agent_id IS 'Optional: Links asset to specific agent. NULL for global assets.';
COMMENT ON COLUMN user_assets.is_pinned IS 'Pinned assets appear at top of asset list for quick access';
COMMENT ON COLUMN user_assets.is_archived IS 'Archived assets hidden from main view but not deleted';
COMMENT ON COLUMN user_assets.suggestion_reason IS 'For AI-suggested notes: explanation of why this content is worth saving';
COMMENT ON COLUMN user_assets.suggestion_confidence IS 'For AI-suggested notes: confidence score 0.00-1.00 indicating suggestion quality';
