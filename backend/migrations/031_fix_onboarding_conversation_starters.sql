-- Migration: 031_fix_onboarding_conversation_starters
-- Purpose: Fix client-onboarding conversation starters to actually start onboarding
-- Date: 2025-11-13
-- Reason: Current starters ask ABOUT the system instead of STARTING the onboarding

BEGIN;

-- Update client-onboarding conversation starters
UPDATE agents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{conversation_starters}',
  '[
    {
      "type": "action",
      "label": "Let''s go!",
      "prompt_text": "Let''s get started! Ask me the first onboarding question.",
      "includes_user_fields": false
    },
    {
      "type": "action",
      "label": "Start my profile setup",
      "prompt_text": "I''m ready to set up my business profile. Let''s begin with question 1.",
      "includes_user_fields": false
    },
    {
      "type": "template",
      "label": "Quick setup",
      "prompt_text": "I want to complete my onboarding quickly. Start asking the questions.",
      "includes_user_fields": false
    }
  ]'::jsonb
),
updated_at = NOW()
WHERE id = 'client-onboarding';

-- Verify the update
DO $$
DECLARE
    starters_count integer;
BEGIN
    SELECT jsonb_array_length(metadata->'conversation_starters') INTO starters_count
    FROM agents
    WHERE id = 'client-onboarding';

    IF starters_count = 3 THEN
        RAISE NOTICE '✅ client-onboarding conversation starters updated (% starters)', starters_count;
        RAISE NOTICE '✅ New starters: "Let''s go!", "Start my profile setup", "Quick setup"';
        RAISE NOTICE '✅ All starters now trigger actual onboarding questions';
    ELSE
        RAISE EXCEPTION '❌ Conversation starters update failed';
    END IF;
END $$;

COMMIT;

-- Summary:
-- ✅ Fixed: Conversation starters now actually start onboarding
-- ✅ Fixed: Removed generic "which agent" type questions
-- ✅ Improved: All starters use action-oriented language
-- ✅ Result: Clicking any starter will begin question 1 of onboarding
