-- Migration: 020_agents_onboarding_columns
-- Description: Add onboarding-related columns to agents table
-- Created: 2025-11-12
-- Phase 1.1 of Enhanced Onboarding & Brand Voice System

-- Add behavior_suffix column for dynamic system prompt suffixes
ALTER TABLE agents ADD COLUMN IF NOT EXISTS behavior_suffix TEXT;

-- Add requires_onboarding flag (default false - most agents don't require onboarding)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS requires_onboarding BOOLEAN DEFAULT false;

-- Add locked_until_onboarding flag (default true - agents are locked until onboarding is complete)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS locked_until_onboarding BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN agents.behavior_suffix IS 'Dynamic suffix added to agent system prompts for memory extraction and brand voice';
COMMENT ON COLUMN agents.requires_onboarding IS 'If true, this agent is the onboarding agent';
COMMENT ON COLUMN agents.locked_until_onboarding IS 'If true, agent is locked until user completes onboarding';

-- Update the client-onboarding agent to require onboarding and NOT be locked
UPDATE agents
SET requires_onboarding = true,
    locked_until_onboarding = false
WHERE id = 'client-onboarding';

-- Optional: Set all other agents to be locked until onboarding
-- This ensures forced onboarding flow
UPDATE agents
SET locked_until_onboarding = true
WHERE id != 'client-onboarding';
