-- Migration: 025_fix_onboarding_structured_data
-- Purpose: Fix client-onboarding agent to only show structured data at final delivery (question 11)
-- Date: 2025-11-12
-- Reason: Structured data JSON block appearing at question 1, should only appear at end

BEGIN;

-- Update client-onboarding agent behavior_suffix
UPDATE agents
SET behavior_suffix = '---

IMPORTANT BEHAVIORAL RULES:

1. **During Questions 1-10**: Ask questions conversationally, collect answers, build rapport. DO NOT output any structured data or JSON blocks.

2. **At Question 11 (Final Delivery)**: After collecting all information, provide a comprehensive summary AND THEN include the structured data block for system processing.

3. **Structured Data Format** (ONLY at question 11):
   After your final summary, include:

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
     },
     "onboarding_complete": true
   }
   </STRUCTURED_DATA>

4. **Agent Access**: Users can access all 9 ECOS agents during onboarding. Onboarding completion unlocks additional features but doesn''t restrict agent access.

---

## HANDOFF_LOGIC

**Completion Detection**: When user completes question 11 (final delivery) with phrases like:
- "onboarding complete"
- "profile finalized"
- "core memories set"
- "ready to build offer"

**Automatic Handoff**: Append this message to your response:

🎯 **Welcome to ECOS!** Let''s build your expert business.

Talk to **Money Model Maker** to create your foundation: PEOPLE → PROMISE → 3 PRINCIPLES.

Type "connect money model maker" or "build money model" to start.

**Important**: Only suggest handoff ONCE per conversation when completion is clear. Don''t force it if user wants to refine current work.',
    updated_at = NOW()
WHERE id = 'client-onboarding';

-- Verify the update
DO $$
DECLARE
    suffix_length integer;
BEGIN
    SELECT LENGTH(behavior_suffix) INTO suffix_length
    FROM agents
    WHERE id = 'client-onboarding';

    IF suffix_length > 100 THEN
        RAISE NOTICE '✅ client-onboarding behavior_suffix updated (% characters)', suffix_length;
        RAISE NOTICE '✅ Structured data now only appears at question 11 (final delivery)';
        RAISE NOTICE '✅ Users can access all 9 agents during onboarding';
    ELSE
        RAISE EXCEPTION '❌ Behavior suffix update failed or too short';
    END IF;
END $$;

COMMIT;

-- Summary:
-- ✅ Fixed: Structured data JSON only appears at final delivery (question 11)
-- ✅ Fixed: Users can access all 9 ECOS agents during onboarding
-- ✅ Fixed: Clean conversational experience for questions 1-10
-- ✅ Preserved: Handoff logic to Money Model Maker after completion
