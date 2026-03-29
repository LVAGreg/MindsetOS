-- Brand Voice System Migration
-- Phase 3: Brand Voice Agent & Document Upload System
-- Created: 2025-11-12

-- ============================================
-- BRAND VOICE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Voice Analysis
  tone VARCHAR(100), -- professional, casual, friendly, authoritative
  formality_level VARCHAR(50), -- formal, semi-formal, informal
  sentence_structure VARCHAR(50), -- short, varied, complex
  vocabulary_complexity VARCHAR(50), -- simple, moderate, advanced

  -- Style Patterns
  uses_contractions BOOLEAN DEFAULT false,
  uses_emojis BOOLEAN DEFAULT false,
  uses_metaphors BOOLEAN DEFAULT false,
  paragraph_length VARCHAR(50), -- short, medium, long

  -- Writing Characteristics
  voice_summary TEXT, -- AI-generated summary of writing style
  example_phrases TEXT[] DEFAULT '{}', -- Common phrases/expressions
  avoid_phrases TEXT[] DEFAULT '{}', -- Phrases user never uses

  -- Source Documents
  analyzed_documents INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_brand_voice_profiles_user_id ON brand_voice_profiles(user_id);

-- ============================================
-- BRAND VOICE DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS brand_voice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- website_copy, email, transcript, social_media
  content TEXT NOT NULL,
  word_count INTEGER,
  analyzed BOOLEAN DEFAULT false,
  analysis_result JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brand_voice_documents_user_id ON brand_voice_documents(user_id);
CREATE INDEX idx_brand_voice_documents_analyzed ON brand_voice_documents(analyzed);
CREATE INDEX idx_brand_voice_documents_created_at ON brand_voice_documents(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_brand_voice_profiles_updated_at
  BEFORE UPDATE ON brand_voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AGENT BEHAVIOR SUFFIX SUPPORT
-- ============================================

-- Add behavior_suffix column to agents table if it doesn't exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS behavior_suffix TEXT;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Brand Voice System Migration Completed Successfully';
END $$;
