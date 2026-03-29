-- Migration: 022_add_behavior_suffix_column
-- Description: Add behavior_suffix column to agents table for JSON memory extraction
-- Created: 2025-11-12
-- Phase 2.1 of Enhanced Onboarding & Brand Voice System

-- Note: This column may already exist from migration 020
-- Using IF NOT EXISTS to ensure idempotency

-- Add behavior_suffix column if it doesn't exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS behavior_suffix TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN agents.behavior_suffix IS 'Dynamic suffix injected into agent system prompts to enable structured JSON memory extraction and brand voice application';

-- Set default memory extraction suffix for client-onboarding agent
UPDATE agents
SET behavior_suffix = '---
RESPONSE FORMAT REQUIREMENTS:

After your conversational response, include a JSON data block for memory extraction:

<STRUCTURED_DATA>
{
  "user_insights": {
    "key_facts": ["fact1", "fact2"],
    "preferences": {"pref1": "value1"},
    "goals": ["goal1", "goal2"]
  },
  "memory_updates": {
    "add": [{"type": "fact", "content": "..."}],
    "update": [{"field": "target_clients", "value": "..."}]
  }
}
</STRUCTURED_DATA>

This data is hidden from the user and used to improve your future responses.'
WHERE id = 'client-onboarding' AND behavior_suffix IS NULL;

-- Verify the update
SELECT
    id,
    name,
    LEFT(behavior_suffix, 100) as suffix_preview,
    updated_at
FROM agents
WHERE behavior_suffix IS NOT NULL
ORDER BY updated_at DESC;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Behavior Suffix Column Migration Completed Successfully';
  RAISE NOTICE 'Client onboarding agent now has default memory extraction suffix';
END $$;
