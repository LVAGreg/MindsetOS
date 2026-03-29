-- Migration: 026_allow_agent_access_during_onboarding
-- Purpose: Allow users to access all 9 agents during onboarding (don't lock agents)
-- Date: 2025-11-12
-- Reason: User feedback - agents should be accessible during onboarding, not locked

BEGIN;

-- Update all agents to NOT be locked during onboarding
-- But still require onboarding completion for full feature unlock
UPDATE agents
SET
    locked_until_onboarding = FALSE,
    requires_onboarding = TRUE,
    updated_at = NOW()
WHERE id != 'client-onboarding';  -- Keep client-onboarding as the onboarding agent

-- Ensure client-onboarding agent is never locked
UPDATE agents
SET
    locked_until_onboarding = FALSE,
    requires_onboarding = TRUE,
    updated_at = NOW()
WHERE id = 'client-onboarding';

-- Verification
DO $$
DECLARE
    locked_count integer;
    total_count integer;
BEGIN
    -- Count agents that are still locked
    SELECT COUNT(*) INTO locked_count
    FROM agents
    WHERE locked_until_onboarding = TRUE;

    -- Count total active agents
    SELECT COUNT(*) INTO total_count
    FROM agents
    WHERE is_active = TRUE;

    IF locked_count = 0 THEN
        RAISE NOTICE '✅ All % agents are now accessible during onboarding', total_count;
        RAISE NOTICE '✅ Users can use any agent while completing their profile';
        RAISE NOTICE '✅ Onboarding completion unlocks additional features';
    ELSE
        RAISE WARNING '⚠️  % agents still locked', locked_count;
    END IF;
END $$;

COMMIT;

-- Summary:
-- ✅ All agents accessible during onboarding
-- ✅ No agent locking - users can explore freely
-- ✅ Onboarding completion still tracked for feature unlocks
-- ✅ Better user experience - no frustration with locked features
