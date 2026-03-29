-- Migration 017: Conversation Enhancements and Projects System
-- Purpose: Add title, starred, project association for conversations + projects table
-- Created: 2025-11-04

-- ============================================================================
-- PROJECTS TABLE
-- Organize conversations into projects for better management
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- hex color code (e.g., #FF5733)
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user projects
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_active ON projects(user_id, is_archived) WHERE is_archived = false;

-- ============================================================================
-- CONVERSATION ENHANCEMENTS
-- Add title, starred, project association fields
-- ============================================================================

-- Add title field for conversations (AI-generated, user-editable)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(500);

-- Add starred/favorited field
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Add project association field
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add archived_at timestamp (is_archived already exists from migration 012)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for starred conversations
CREATE INDEX IF NOT EXISTS idx_conversations_starred ON conversations(user_id, is_starred, updated_at DESC) WHERE is_starred = true;

-- Index for project conversations
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id) WHERE project_id IS NOT NULL;

-- Index for conversation title search
CREATE INDEX IF NOT EXISTS idx_conversations_title ON conversations(title) WHERE title IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update projects updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Trigger to set archived_at when conversation is archived
CREATE OR REPLACE FUNCTION set_conversation_archived_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_archived = true AND OLD.is_archived = false THEN
    NEW.archived_at = NOW();
  ELSIF NEW.is_archived = false AND OLD.is_archived = true THEN
    NEW.archived_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_conversation_archived_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_archived_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE projects IS 'User projects for organizing conversations into groups';
COMMENT ON COLUMN projects.name IS 'Project name (e.g., "Client Onboarding Campaign")';
COMMENT ON COLUMN projects.description IS 'Optional project description';
COMMENT ON COLUMN projects.color IS 'Hex color code for project UI display';

COMMENT ON COLUMN conversations.title IS 'Conversation title (AI-generated or user-edited)';
COMMENT ON COLUMN conversations.is_starred IS 'Whether conversation is starred/favorited by user';
COMMENT ON COLUMN conversations.project_id IS 'Optional project association for organizing conversations';
COMMENT ON COLUMN conversations.archived_at IS 'Timestamp when conversation was archived';

-- ============================================================================
-- SAMPLE QUERIES (for reference)
-- ============================================================================

-- Get all projects for a user
-- SELECT * FROM projects WHERE user_id = $1 AND is_archived = false ORDER BY updated_at DESC;

-- Get all conversations in a project
-- SELECT * FROM conversations WHERE project_id = $1 ORDER BY updated_at DESC;

-- Get all starred conversations
-- SELECT * FROM conversations WHERE user_id = $1 AND is_starred = true ORDER BY updated_at DESC;

-- Get recent conversations (not in project, not archived)
-- SELECT * FROM conversations
-- WHERE user_id = $1 AND project_id IS NULL AND is_archived = false
-- ORDER BY updated_at DESC LIMIT 20;

-- Move conversation to project
-- UPDATE conversations SET project_id = $2, updated_at = NOW() WHERE id = $1;

-- Star/unstar conversation
-- UPDATE conversations SET is_starred = $2, updated_at = NOW() WHERE id = $1;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS trigger_set_conversation_archived_at ON conversations;
-- DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON projects;
-- DROP FUNCTION IF EXISTS set_conversation_archived_at();
-- DROP FUNCTION IF EXISTS update_projects_updated_at();
-- DROP INDEX IF EXISTS idx_conversations_title;
-- DROP INDEX IF EXISTS idx_conversations_project;
-- DROP INDEX IF EXISTS idx_conversations_starred;
-- DROP INDEX IF EXISTS idx_projects_user_active;
-- DROP INDEX IF EXISTS idx_projects_user;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS archived_at;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS is_starred;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS title;
-- DROP TABLE IF EXISTS projects CASCADE;
