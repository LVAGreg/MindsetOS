-- =====================================================
-- ECOS Networking Memory Schema
-- Purpose: Support opt-in memory sharing for Syncergy Agent
-- Created: 2025-01-28
-- =====================================================

-- =====================================================
-- 1. NETWORKING MEMORIES TABLE
-- Stores collaboration-related shared memories
-- Access: Admin and Facilitator roles only
-- =====================================================

CREATE TABLE IF NOT EXISTS networking_memories (
  id SERIAL PRIMARY KEY,
  collaboration_id INTEGER,  -- Links to collaboration_sessions
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for admin-only memories
  memory_type VARCHAR(50) NOT NULL,  -- 'collaboration_context', 'partnership_agreement', 'synergy_insight', 'referral_exchange'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,  -- Flexible storage for structured data (synergy scores, partnership details, etc.)
  category VARCHAR(100) DEFAULT 'networking_collaboration',
  visibility VARCHAR(50) DEFAULT 'admin_only',  -- 'admin_only', 'shared_with_partner', 'facilitator_only'
  retention_days INTEGER DEFAULT 90,  -- Auto-expire after 90 days
  expires_at TIMESTAMP,  -- Calculated expiration date
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_networking_memories_user_id ON networking_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_memories_shared_with ON networking_memories(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_networking_memories_collaboration_id ON networking_memories(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_networking_memories_type ON networking_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_networking_memories_visibility ON networking_memories(visibility);
CREATE INDEX IF NOT EXISTS idx_networking_memories_expires_at ON networking_memories(expires_at);
CREATE INDEX IF NOT EXISTS idx_networking_memories_created_at ON networking_memories(created_at);

-- =====================================================
-- 2. MEMORY SHARING CONSENT TABLE
-- Tracks opt-in permissions between users
-- =====================================================

CREATE TABLE IF NOT EXISTS memory_sharing_consent (
  id SERIAL PRIMARY KEY,
  requester_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  consenting_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  collaboration_id INTEGER,  -- Links to collaboration_sessions
  consent_status VARCHAR(50) NOT NULL,  -- 'pending', 'approved', 'declined', 'revoked'
  memory_categories TEXT[],  -- Array of categories to share: ['business_context', 'pain_points', 'goals', 'expertise']
  duration_type VARCHAR(50) NOT NULL,  -- '30_days', '90_days', 'ongoing', 'one_time_event'
  duration_days INTEGER,  -- NULL for ongoing, specific number for time-limited
  purpose TEXT,  -- Why memory sharing is requested
  consent_given_at TIMESTAMP,
  consent_expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_consent_pair UNIQUE(requester_user_id, consenting_user_id, collaboration_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_consent_requester ON memory_sharing_consent(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_memory_consent_consenting ON memory_sharing_consent(consenting_user_id);
CREATE INDEX IF NOT EXISTS idx_memory_consent_status ON memory_sharing_consent(consent_status);
CREATE INDEX IF NOT EXISTS idx_memory_consent_collaboration ON memory_sharing_consent(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_memory_consent_expires_at ON memory_sharing_consent(consent_expires_at);

-- =====================================================
-- 3. COLLABORATION SESSIONS TABLE
-- Logs facilitated events and outcomes
-- =====================================================

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id SERIAL PRIMARY KEY,
  session_type VARCHAR(100) NOT NULL,  -- 'hot_seat_roundtable', 'peer_mastermind', 'co_creation_workshop', 'expert_panel', 'speed_networking'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  facilitator_agent_id VARCHAR(100),  -- Agent that facilitated (e.g., 'syncergy-networking-agent')
  participants JSONB NOT NULL,  -- Array of user IDs: {"user_ids": ["uuid1", "uuid2"]}
  participant_count INTEGER,
  synergy_scores JSONB,  -- Synergy scores between participants: {"user1-user2": 87, "user1-user3": 72}
  session_agenda JSONB,  -- Structured agenda with timing: [{"duration": 10, "topic": "Challenge presentation"}]
  outcomes JSONB,  -- Action items, commitments, partnership agreements
  status VARCHAR(50) DEFAULT 'scheduled',  -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_minutes INTEGER,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_type ON collaboration_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_facilitator ON collaboration_sessions(facilitator_agent_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_scheduled_at ON collaboration_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_completed_at ON collaboration_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_participants ON collaboration_sessions USING GIN(participants);

-- =====================================================
-- 4. SYNERGY MATCHES TABLE
-- Stores calculated synergy scores between users
-- =====================================================

CREATE TABLE IF NOT EXISTS synergy_matches (
  id SERIAL PRIMARY KEY,
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  synergy_score INTEGER NOT NULL CHECK (synergy_score >= 0 AND synergy_score <= 100),
  score_breakdown JSONB,  -- Detailed scoring: {"market_overlap": 20, "skill_complementarity": 25, ...}
  match_status VARCHAR(50) DEFAULT 'identified',  -- 'identified', 'introduced', 'collaborating', 'inactive'
  introduction_made_at TIMESTAMP,
  collaboration_started_at TIMESTAMP,
  last_interaction_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_synergy_pair UNIQUE(user_a_id, user_b_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_synergy_matches_user_a ON synergy_matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_synergy_matches_user_b ON synergy_matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_synergy_matches_score ON synergy_matches(synergy_score DESC);
CREATE INDEX IF NOT EXISTS idx_synergy_matches_status ON synergy_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_synergy_matches_updated_at ON synergy_matches(updated_at);

-- =====================================================
-- 5. COLLABORATION OUTCOMES TABLE
-- Tracks tangible results from collaborations
-- =====================================================

CREATE TABLE IF NOT EXISTS collaboration_outcomes (
  id SERIAL PRIMARY KEY,
  collaboration_id INTEGER REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  synergy_match_id INTEGER REFERENCES synergy_matches(id) ON DELETE SET NULL,
  outcome_type VARCHAR(100) NOT NULL,  -- 'joint_offering', 'referral_agreement', 'co_marketing', 'resource_sharing', 'accountability_partnership'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  participants JSONB NOT NULL,  -- User IDs involved in this outcome
  value_generated_usd DECIMAL(10, 2),  -- Optional: track revenue impact
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'paused', 'completed', 'terminated'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  success_metrics JSONB,  -- Track KPIs: {"referrals_exchanged": 5, "revenue_generated": 15000}
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_outcomes_collaboration_id ON collaboration_outcomes(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_outcomes_synergy_match_id ON collaboration_outcomes(synergy_match_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_outcomes_type ON collaboration_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_outcomes_status ON collaboration_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_outcomes_participants ON collaboration_outcomes USING GIN(participants);

-- =====================================================
-- 6. ADD FOREIGN KEY CONSTRAINTS
-- Link networking_memories and memory_sharing_consent to collaboration_sessions
-- =====================================================

ALTER TABLE networking_memories
  ADD CONSTRAINT fk_networking_memories_collaboration
  FOREIGN KEY (collaboration_id) REFERENCES collaboration_sessions(id) ON DELETE SET NULL;

ALTER TABLE memory_sharing_consent
  ADD CONSTRAINT fk_memory_consent_collaboration
  FOREIGN KEY (collaboration_id) REFERENCES collaboration_sessions(id) ON DELETE SET NULL;

-- =====================================================
-- 7. POSTGRESQL FUNCTIONS FOR NETWORKING MEMORY OPERATIONS
-- =====================================================

-- Function: Create networking memory with automatic expiration
CREATE OR REPLACE FUNCTION create_networking_memory(
  p_user_id UUID,
  p_shared_with_user_id UUID,
  p_collaboration_id INTEGER,
  p_memory_type VARCHAR,
  p_title VARCHAR,
  p_content TEXT,
  p_metadata JSONB,
  p_visibility VARCHAR,
  p_retention_days INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_memory_id INTEGER;
  v_expires_at TIMESTAMP;
BEGIN
  -- Calculate expiration date
  v_expires_at := NOW() + (p_retention_days || ' days')::INTERVAL;

  -- Insert memory
  INSERT INTO networking_memories (
    user_id, shared_with_user_id, collaboration_id, memory_type,
    title, content, metadata, visibility, retention_days, expires_at
  ) VALUES (
    p_user_id, p_shared_with_user_id, p_collaboration_id, p_memory_type,
    p_title, p_content, p_metadata, p_visibility, p_retention_days, v_expires_at
  ) RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Grant memory sharing consent
CREATE OR REPLACE FUNCTION grant_memory_consent(
  p_requester_user_id UUID,
  p_consenting_user_id UUID,
  p_collaboration_id INTEGER,
  p_memory_categories TEXT[],
  p_duration_type VARCHAR,
  p_duration_days INTEGER,
  p_purpose TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_consent_id INTEGER;
  v_expires_at TIMESTAMP;
BEGIN
  -- Calculate expiration date
  IF p_duration_type = 'ongoing' THEN
    v_expires_at := NULL;
  ELSIF p_duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := NOW() + INTERVAL '90 days';  -- Default 90 days
  END IF;

  -- Insert or update consent
  INSERT INTO memory_sharing_consent (
    requester_user_id, consenting_user_id, collaboration_id,
    consent_status, memory_categories, duration_type, duration_days,
    purpose, consent_given_at, consent_expires_at
  ) VALUES (
    p_requester_user_id, p_consenting_user_id, p_collaboration_id,
    'approved', p_memory_categories, p_duration_type, p_duration_days,
    p_purpose, NOW(), v_expires_at
  )
  ON CONFLICT (requester_user_id, consenting_user_id, collaboration_id)
  DO UPDATE SET
    consent_status = 'approved',
    memory_categories = EXCLUDED.memory_categories,
    duration_type = EXCLUDED.duration_type,
    duration_days = EXCLUDED.duration_days,
    purpose = EXCLUDED.purpose,
    consent_given_at = NOW(),
    consent_expires_at = v_expires_at,
    updated_at = NOW()
  RETURNING id INTO v_consent_id;

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Revoke memory sharing consent
CREATE OR REPLACE FUNCTION revoke_memory_consent(
  p_consent_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE memory_sharing_consent
  SET consent_status = 'revoked',
      revoked_at = NOW(),
      updated_at = NOW()
  WHERE id = p_consent_id
    AND consent_status = 'approved';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if memory sharing is active
CREATE OR REPLACE FUNCTION has_active_memory_consent(
  p_requester_user_id UUID,
  p_consenting_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_consent BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM memory_sharing_consent
    WHERE requester_user_id = p_requester_user_id
      AND consenting_user_id = p_consenting_user_id
      AND consent_status = 'approved'
      AND (consent_expires_at IS NULL OR consent_expires_at > NOW())
      AND revoked_at IS NULL
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean up expired memories and consents
CREATE OR REPLACE FUNCTION cleanup_expired_networking_data() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete expired networking memories
  DELETE FROM networking_memories
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Update expired consents
  UPDATE memory_sharing_consent
  SET consent_status = 'expired',
      updated_at = NOW()
  WHERE consent_status = 'approved'
    AND consent_expires_at IS NOT NULL
    AND consent_expires_at < NOW();

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_networking_memories_updated_at
  BEFORE UPDATE ON networking_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_sharing_consent_updated_at
  BEFORE UPDATE ON memory_sharing_consent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synergy_matches_updated_at
  BEFORE UPDATE ON synergy_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_outcomes_updated_at
  BEFORE UPDATE ON collaboration_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. INITIAL DATA SETUP (Optional)
-- =====================================================

-- No initial data needed - tables will populate as collaborations occur

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Verification queries (commented out - run manually if needed):
-- SELECT COUNT(*) FROM networking_memories;
-- SELECT COUNT(*) FROM memory_sharing_consent;
-- SELECT COUNT(*) FROM collaboration_sessions;
-- SELECT COUNT(*) FROM synergy_matches;
-- SELECT COUNT(*) FROM collaboration_outcomes;
