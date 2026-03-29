-- Migration: 018_user_onboarding_status
-- Description: Add user onboarding status tracking table
-- Created: 2025-11-12
-- Phase 1.1 of Enhanced Onboarding & Brand Voice System

CREATE TABLE IF NOT EXISTS user_onboarding_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_started_at TIMESTAMP,
  onboarding_completed_at TIMESTAMP,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 11,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON user_onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON user_onboarding_status(onboarding_completed);

-- Add comments
COMMENT ON TABLE user_onboarding_status IS 'Tracks user onboarding progress and completion status';
COMMENT ON COLUMN user_onboarding_status.current_step IS 'Current step in onboarding process (1-11)';
COMMENT ON COLUMN user_onboarding_status.total_steps IS 'Total number of onboarding steps (default: 11)';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_status_updated_at
BEFORE UPDATE ON user_onboarding_status
FOR EACH ROW
EXECUTE FUNCTION update_onboarding_updated_at();
