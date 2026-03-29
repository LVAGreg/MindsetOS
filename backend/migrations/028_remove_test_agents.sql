-- Migration: 028_remove_test_agents
-- Purpose: Remove test/development versioned agents from agent selection overlay
-- Date: 2025-11-13
-- Reason: Clean up agent list - remove v2, v3, v4, v5, V6 test agents

BEGIN;

-- Deactivate all versioned test agents
UPDATE agents
SET
    is_active = FALSE,
    updated_at = NOW()
WHERE
    id LIKE '%v2%' OR
    id LIKE '%v3%' OR
    id LIKE '%v4%' OR
    id LIKE '%v5%' OR
    id LIKE '%V6%' OR
    id LIKE '%value-quantifier%' OR
    id LIKE '%memory-insights%';

-- Verification
DO $$
DECLARE
    deactivated_count integer;
BEGIN
    -- Count deactivated agents
    SELECT COUNT(*) INTO deactivated_count
    FROM agents
    WHERE is_active = FALSE;

    RAISE NOTICE '✅ Test agents deactivated: %', deactivated_count;
    RAISE NOTICE '✅ Agent selection overlay cleaned up';
END $$;

COMMIT;

-- Summary:
-- ✅ Removed LinkedIn Events Builder v2, v3, V6
-- ✅ Removed Money Model Maker v2, v3, v4, v5
-- ✅ Removed Value Quantifier V6
-- ✅ Removed Memory Insights V6
-- ✅ Clean agent selection overlay with only production agents
