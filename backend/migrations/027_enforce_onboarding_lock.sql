-- Migration: 027_enforce_onboarding_lock
-- Purpose: ENFORCE onboarding completion before agent access (reverse migration 026)
-- Date: 2025-11-12
-- Reason: User feedback - agents should be LOCKED until onboarding complete

BEGIN;

-- Lock ALL agents except client-onboarding until onboarding is complete
UPDATE agents
SET
    locked_until_onboarding = TRUE,
    requires_onboarding = TRUE,
    updated_at = NOW()
WHERE id != 'client-onboarding';  -- Only onboarding agent accessible

-- Ensure client-onboarding agent is never locked
UPDATE agents
SET
    locked_until_onboarding = FALSE,
    requires_onboarding = FALSE,
    updated_at = NOW()
WHERE id = 'client-onboarding';

-- Verification
DO $$
DECLARE
    locked_count integer;
    unlocked_count integer;
BEGIN
    -- Count locked agents
    SELECT COUNT(*) INTO locked_count
    FROM agents
    WHERE locked_until_onboarding = TRUE;

    -- Count unlocked agents
    SELECT COUNT(*) INTO unlocked_count
    FROM agents
    WHERE locked_until_onboarding = FALSE;

    RAISE NOTICE '✅ Onboarding enforcement active:';
    RAISE NOTICE '   - Locked agents: % (accessible only after onboarding)', locked_count;
    RAISE NOTICE '   - Unlocked agents: % (client-onboarding only)', unlocked_count;
    RAISE NOTICE '✅ Users must complete onboarding to access other agents';
    RAISE NOTICE '✅ Agents unlock at final delivery point (question 11)';
END $$;

COMMIT;

-- Summary:
-- ✅ All agents LOCKED until onboarding complete (except client-onboarding)
-- ✅ Forced onboarding flow - users can't skip
-- ✅ Agents unlock at delivery/output point (question 11)
-- ✅ Better user journey - clear progression
