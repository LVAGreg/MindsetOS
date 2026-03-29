-- Migration: Create user_profiles table
-- Purpose: Store comprehensive user business profile for AI context injection

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Section 1: About Your Business
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  business_outcomes TEXT,
  why_people_work_with_you TEXT,

  -- Section 2: Your Clients & Their Problems
  target_clients TEXT, -- titles, industries, business types
  top_3_problems TEXT[], -- Array of problems
  main_results TEXT[], -- Array of outcomes

  -- Section 3: How You Help
  core_method TEXT, -- framework or key services
  main_offers TEXT[], -- Array of offers/services

  -- Section 4: Proof & Credibility
  credentials TEXT, -- qualifications, experience, certifications
  success_stories TEXT[], -- Array of client results

  -- Section 5: Core Business Promise
  business_promise TEXT,

  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();
