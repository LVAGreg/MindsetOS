-- Migration: 040_notifications_research_system
-- Description: Add notifications, research jobs, and user research tables
-- Created: 2025-12-06
-- Purpose: Enable notification bell, background research processing, and research storage with citations

BEGIN;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL, -- research_complete, research_failed, admin_broadcast, credit_low, memory_saved, agent_update, welcome
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}', -- Additional structured data (e.g., research_id, conversation_id)

  -- Status and priority
  is_read BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  source VARCHAR(50) DEFAULT 'system', -- system, admin, agent

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  expires_at TIMESTAMP, -- Optional expiration for temporary notifications

  -- For admin broadcasts
  broadcast_id UUID, -- Groups notifications from same broadcast

  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_source CHECK (source IN ('system', 'admin', 'agent'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON notifications(broadcast_id) WHERE broadcast_id IS NOT NULL;

-- ============================================================================
-- RESEARCH JOBS TABLE (Background Processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  agent_id VARCHAR(100),

  -- Job details
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  model VARCHAR(100) NOT NULL, -- perplexity/sonar-deep-research, x-ai/grok-2, etc.
  query TEXT NOT NULL, -- The research query/prompt

  -- Progress tracking
  progress INTEGER DEFAULT 0, -- 0-100
  progress_message VARCHAR(255), -- "Searching sources...", "Synthesizing report..."
  searches_count INTEGER DEFAULT 0, -- Number of web searches performed

  -- Results
  result TEXT, -- The full research report
  citations JSONB DEFAULT '[]', -- Array of citation objects
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_status ON research_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_research_jobs_user_created ON research_jobs(user_id, created_at DESC);

-- ============================================================================
-- USER RESEARCH TABLE (Saved Research with Citations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  research_job_id UUID REFERENCES research_jobs(id) ON DELETE SET NULL,

  -- Research content
  title VARCHAR(500) NOT NULL,
  query TEXT NOT NULL, -- Original research query
  summary TEXT, -- Executive summary
  report TEXT NOT NULL, -- Full research report

  -- Citations stored as JSONB array
  -- Each citation: {url, title, snippet, domain, relevance_score, accessed_at}
  citations JSONB DEFAULT '[]',
  citations_count INTEGER DEFAULT 0,

  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100), -- market_research, competitor_analysis, industry_trends, etc.

  -- Source models used
  models_used TEXT[] DEFAULT '{}', -- ['perplexity/sonar-deep-research', 'x-ai/grok-2']

  -- RAG embedding for semantic search
  embedding vector(1536), -- For OpenAI embeddings

  -- User interaction
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,

  -- Metadata
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_research_user ON user_research(user_id);
CREATE INDEX IF NOT EXISTS idx_user_research_user_pinned ON user_research(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_user_research_user_created ON user_research(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_research_category ON user_research(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_research_tags ON user_research USING gin(tags);

-- Vector similarity search index (if pgvector extension exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_research_embedding ON user_research USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
END
$$;

-- ============================================================================
-- ADMIN BROADCASTS TABLE (Track broadcast campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),

  -- Broadcast content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',

  -- Targeting
  target_type VARCHAR(20) NOT NULL, -- all, role, users
  target_roles TEXT[] DEFAULT '{}', -- ['admin', 'power_user', 'user']
  target_user_ids UUID[] DEFAULT '{}', -- Specific user IDs

  -- Delivery stats
  recipients_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,

  -- Scheduling
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, sent, cancelled

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_target_type CHECK (target_type IN ('all', 'role', 'users')),
  CONSTRAINT valid_broadcast_status CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_status ON admin_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_admin ON admin_broadcasts(admin_user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = false
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}',
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_source VARCHAR(50) DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, priority, source)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_priority, p_source)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send admin broadcast
CREATE OR REPLACE FUNCTION send_admin_broadcast(p_broadcast_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_broadcast admin_broadcasts%ROWTYPE;
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_broadcast FROM admin_broadcasts WHERE id = p_broadcast_id;

  IF v_broadcast.status != 'draft' AND v_broadcast.status != 'scheduled' THEN
    RAISE EXCEPTION 'Broadcast already sent or cancelled';
  END IF;

  -- Insert notifications for target users
  IF v_broadcast.target_type = 'all' THEN
    INSERT INTO notifications (user_id, type, title, message, priority, source, broadcast_id)
    SELECT id, 'admin_broadcast', v_broadcast.title, v_broadcast.message, v_broadcast.priority, 'admin', p_broadcast_id
    FROM users
    WHERE is_active = true;
  ELSIF v_broadcast.target_type = 'role' THEN
    INSERT INTO notifications (user_id, type, title, message, priority, source, broadcast_id)
    SELECT id, 'admin_broadcast', v_broadcast.title, v_broadcast.message, v_broadcast.priority, 'admin', p_broadcast_id
    FROM users
    WHERE is_active = true AND role = ANY(v_broadcast.target_roles);
  ELSIF v_broadcast.target_type = 'users' THEN
    INSERT INTO notifications (user_id, type, title, message, priority, source, broadcast_id)
    SELECT id, 'admin_broadcast', v_broadcast.title, v_broadcast.message, v_broadcast.priority, 'admin', p_broadcast_id
    FROM users
    WHERE id = ANY(v_broadcast.target_user_ids) AND is_active = true;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update broadcast status
  UPDATE admin_broadcasts
  SET status = 'sent', sent_at = NOW(), recipients_count = v_count
  WHERE id = p_broadcast_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'User notifications for research completion, admin broadcasts, system alerts';
COMMENT ON TABLE research_jobs IS 'Background research job queue for long-running Sonar/Grok queries';
COMMENT ON TABLE user_research IS 'Saved research reports with citations and embeddings for RAG';
COMMENT ON TABLE admin_broadcasts IS 'Admin broadcast campaigns for sending notifications to users';

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread, non-expired notifications for a user';
COMMENT ON FUNCTION create_notification IS 'Helper to create a notification for a user';
COMMENT ON FUNCTION send_admin_broadcast IS 'Sends a broadcast to target users and updates status';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications
UNION ALL
SELECT 'research_jobs', COUNT(*) FROM research_jobs
UNION ALL
SELECT 'user_research', COUNT(*) FROM user_research
UNION ALL
SELECT 'admin_broadcasts', COUNT(*) FROM admin_broadcasts;
