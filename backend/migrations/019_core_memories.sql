-- Migration: 019_core_memories
-- Description: Add core memories table for user profile and business information
-- Created: 2025-11-12
-- Phase 1.1 of Enhanced Onboarding & Brand Voice System

CREATE TABLE IF NOT EXISTS core_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Section 1: Business Identity
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  business_outcome TEXT,

  -- Section 2: Client Profile
  target_clients TEXT,
  client_problems TEXT[], -- Array of top 3 problems
  client_results TEXT, -- Tangible outcomes

  -- Section 3: Methodology
  core_method TEXT,
  frameworks TEXT[], -- Key frameworks/processes

  -- Section 4: Service Details
  service_description TEXT,
  pricing_model VARCHAR(100),
  delivery_timeline VARCHAR(100),

  -- Section 5: Current State
  revenue_range VARCHAR(50),
  growth_goals TEXT,
  biggest_challenges TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_core_memories_user ON core_memories(user_id);

-- Add comments
COMMENT ON TABLE core_memories IS 'Stores core business and profile information extracted from onboarding';
COMMENT ON COLUMN core_memories.client_problems IS 'Array of top 3 client problems (max 3)';
COMMENT ON COLUMN core_memories.frameworks IS 'Array of key frameworks or processes used';
COMMENT ON COLUMN core_memories.biggest_challenges IS 'Array of biggest business challenges';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_core_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER core_memories_updated_at
BEFORE UPDATE ON core_memories
FOR EACH ROW
EXECUTE FUNCTION update_core_memories_updated_at();
