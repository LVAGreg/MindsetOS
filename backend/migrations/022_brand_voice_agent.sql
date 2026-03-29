-- Brand Voice Analyzer Agent
-- Phase 3: Brand Voice System - Agent Creation
-- Created: 2025-11-12

-- ============================================
-- INSERT BRAND VOICE ANALYZER AGENT
-- ============================================

INSERT INTO agents (
  id,
  name,
  tier,
  category,
  description,
  icon,
  color,
  system_prompt,
  capabilities,
  sort_order,
  is_active,
  requires_onboarding,
  locked_until_onboarding,
  created_at,
  updated_at
) VALUES (
  'brand-voice-analyzer',
  'Brand Voice Analyzer',
  3, -- Tier 3: Advanced/Specialized
  'Brand Voice',
  'I analyze your writing samples to capture your unique brand voice and style. Upload documents like website copy, emails, or transcripts, and I''ll create a comprehensive voice profile to help other agents write like you.',
  '🎨',
  'purple',
  '-- SYSTEM PROMPT WILL BE SET IN SEPARATE FILE: /home/equalsfiveai/ECOS/agents/brand-voice-analyzer.md --',
  ARRAY[
    'Analyzes writing samples for tone and style patterns',
    'Identifies vocabulary complexity and sentence structure',
    'Extracts common phrases and expressions',
    'Detects writing preferences (contractions, emojis, metaphors)',
    'Generates structured JSON voice profiles',
    'Provides actionable insights for brand consistency'
  ],
  7,
  true,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  capabilities = EXCLUDED.capabilities,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  requires_onboarding = EXCLUDED.requires_onboarding,
  locked_until_onboarding = EXCLUDED.locked_until_onboarding,
  updated_at = NOW();

-- ============================================
-- LOG SUCCESSFUL MIGRATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Brand Voice Analyzer Agent Created Successfully';
  RAISE NOTICE '✅ Agent ID: brand-voice-analyzer';
  RAISE NOTICE '✅ Sort Order: 7 (after LinkedIn Events Builder Buddy)';
  RAISE NOTICE '⚠️  Requires onboarding completion to access';
  RAISE NOTICE '📝 System prompt must be defined in: /home/equalsfiveai/ECOS/agents/brand-voice-analyzer.md';
END $$;
