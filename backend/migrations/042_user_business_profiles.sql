-- Migration 042: User Business Profiles for Large Document Processing
-- Extracts structured data from large documents to reduce token usage
-- Run this in PGWeb or via backend admin/execute

-- ============================================
-- USER BUSINESS PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  business_name TEXT,
  owner_name TEXT,
  business_type VARCHAR(50), -- 'solo', 'agency', 'company'

  -- Target Audience (structured)
  target_audience TEXT,
  target_roles JSONB DEFAULT '[]',      -- ["CEOs", "Senior Leaders", "Founders"]
  target_industries JSONB DEFAULT '[]', -- ["Tech", "Finance", "Healthcare"]
  target_company_size TEXT,             -- "50-250 employees", "SMB", "Enterprise"
  target_geography TEXT,                -- "AU/NZ", "DACH", "Global"

  -- Problems & Solutions
  problems JSONB DEFAULT '[]',          -- [{problem, pain_points, urgency}]
  solutions JSONB DEFAULT '[]',         -- [{solution, outcome, timeframe}]
  transformation TEXT,                  -- "From X → To Y" statement

  -- Frameworks & Methodology
  frameworks JSONB DEFAULT '[]',        -- [{name, steps, description}]
  delivery_model TEXT,                  -- "1:1 coaching", "group + course", "done-for-you"
  engagement_length TEXT,               -- "90 days", "6 months", "12-24 months"

  -- Pricing & Business Model
  pricing_model TEXT,                   -- "hourly", "package", "retainer"
  price_range TEXT,                     -- "$5k-$10k", "$20k+"
  current_revenue TEXT,                 -- "Under $5k/mo", "$10k-$30k/mo"
  revenue_goal TEXT,                    -- "$30k-$100k/mo"

  -- Results & Social Proof
  case_studies JSONB DEFAULT '[]',      -- [{client, problem, result, metrics}]
  testimonials JSONB DEFAULT '[]',      -- [{quote, client_name, outcome}]
  key_metrics JSONB DEFAULT '[]',       -- ["30M→52M revenue", "5hrs/week saved"]

  -- Challenges & Goals
  main_challenge TEXT,                  -- "Get more clients", "Productize services"
  secondary_challenges JSONB DEFAULT '[]',

  -- Raw Storage
  raw_document TEXT,                    -- Original document for reference
  raw_document_tokens INTEGER,          -- Token count of original

  -- Metadata
  extraction_model TEXT,                -- Model used for extraction
  extraction_cost DECIMAL(10,4),        -- Cost of extraction
  source VARCHAR(50) DEFAULT 'upload',  -- 'onboarding', 'upload', 'chat_paste'
  confidence_score DECIMAL(3,2),        -- 0.00-1.00 extraction confidence

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_business_profiles_user_id ON user_business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_profiles_created ON user_business_profiles(created_at DESC);

-- Unique constraint - one profile per user (can be updated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_business_profiles_unique_user
ON user_business_profiles(user_id)
WHERE source != 'chat_paste';

-- ============================================
-- DOCUMENT CHUNKS TABLE (for fallback RAG)
-- ============================================

CREATE TABLE IF NOT EXISTS user_document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES user_business_profiles(id) ON DELETE CASCADE,

  chunk_index INTEGER,
  chunk_text TEXT,
  chunk_tokens INTEGER,
  section_type VARCHAR(50),  -- 'audience', 'problems', 'pricing', 'case_study', 'other'

  embedding vector(1536),    -- For similarity search fallback

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_user ON user_document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_profile ON user_document_chunks(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_section ON user_document_chunks(section_type);

-- ============================================
-- HELPER FUNCTION: Get User Profile Summary
-- ============================================

CREATE OR REPLACE FUNCTION get_user_profile_summary(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_profile user_business_profiles%ROWTYPE;
  v_summary TEXT;
BEGIN
  SELECT * INTO v_profile FROM user_business_profiles
  WHERE user_id = p_user_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_summary := format(
    E'Business: %s\nOwner: %s\nTarget: %s\nProblems: %s\nTransformation: %s\nDelivery: %s\nChallenge: %s',
    COALESCE(v_profile.business_name, 'Not specified'),
    COALESCE(v_profile.owner_name, 'Not specified'),
    COALESCE(v_profile.target_audience, 'Not specified'),
    COALESCE(v_profile.problems::text, '[]'),
    COALESCE(v_profile.transformation, 'Not specified'),
    COALESCE(v_profile.delivery_model, 'Not specified'),
    COALESCE(v_profile.main_challenge, 'Not specified')
  );

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_business_profiles') THEN
    RAISE NOTICE '✅ Migration 042 completed: user_business_profiles and user_document_chunks tables created';
  ELSE
    RAISE EXCEPTION 'Migration failed - tables not created';
  END IF;
END $$;
