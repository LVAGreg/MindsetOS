-- Migration: 023_update_client_onboarding_suffix
-- Description: Update client-onboarding agent with comprehensive JSON output suffix
-- Created: 2025-11-12
-- Phase 2.1 of Enhanced Onboarding & Brand Voice System

-- Update client-onboarding agent with comprehensive memory extraction suffix
UPDATE agents
SET behavior_suffix = '---
RESPONSE FORMAT REQUIREMENTS:

After your conversational response, include a JSON data block for memory extraction:

<STRUCTURED_DATA>
{
  "user_insights": {
    "key_facts": ["Important fact learned about the user"],
    "preferences": {"preference_key": "preference_value"},
    "goals": ["User goal 1", "User goal 2"],
    "challenges": ["Challenge 1", "Challenge 2"]
  },
  "memory_updates": {
    "add": [
      {
        "type": "fact",
        "content": "New fact to add to user memory",
        "category": "business_info"
      }
    ],
    "update": [
      {
        "field": "target_clients",
        "value": "Updated value for existing field"
      }
    ]
  },
  "onboarding_data": {
    "full_name": "User''s full name if mentioned",
    "company_name": "Company name if mentioned",
    "business_outcome": "What they help clients achieve",
    "target_clients": "Specific audience description",
    "client_problems": ["Problem 1", "Problem 2", "Problem 3"],
    "client_results": "Tangible outcomes they deliver",
    "core_method": "Their signature methodology",
    "frameworks": ["Framework 1", "Framework 2"],
    "service_description": "What they sell",
    "pricing_model": "How they price their services",
    "delivery_timeline": "How long their engagement lasts",
    "revenue_range": "Current monthly revenue",
    "growth_goals": "Where they want to be",
    "biggest_challenges": ["Challenge 1", "Challenge 2", "Challenge 3"]
  }
}
</STRUCTURED_DATA>

IMPORTANT INSTRUCTIONS:
1. Always include the <STRUCTURED_DATA> tags in your response
2. Only include fields where you have actual information from the conversation
3. Leave out empty or null fields - do not include placeholder text
4. This data is hidden from the user and used to personalize future interactions
5. The JSON must be valid and parseable
6. Maintain your conversational tone in the visible response - this is just metadata
7. Extract information progressively across multiple conversation turns
8. Update existing fields if the user provides new or corrected information',
    updated_at = NOW()
WHERE id = 'client-onboarding';

-- Verify the update
SELECT
    id,
    name,
    LEFT(behavior_suffix, 200) as suffix_preview,
    LENGTH(behavior_suffix) as suffix_length,
    updated_at
FROM agents
WHERE id = 'client-onboarding';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Client Onboarding Agent Suffix Update Completed Successfully';
  RAISE NOTICE 'Agent now has comprehensive JSON extraction instructions';
END $$;
