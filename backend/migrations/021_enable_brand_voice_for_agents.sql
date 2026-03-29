-- Enable Brand Voice for Content-Generating Agents
-- Migration 021: Set enable_brand_voice flag in agent metadata
-- Created: 2025-11-12

-- ============================================
-- UPDATE CONTENT-GENERATING AGENTS
-- ============================================

-- Money Model Maker (mmm-5in30) - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'money-model-maker';

-- Fast Fix Finder - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'fast-fix-finder';

-- Offer Promo Printer - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'offer-promo-printer';

-- Promo Planner - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'promo-planner';

-- Qualification Call Builder - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'qualification-call-builder';

-- LinkedIn Events Builder - Enable brand voice
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": true}'::jsonb,
    updated_at = NOW()
WHERE id = 'linkedin-events-builder';

-- ============================================
-- DISABLE BRAND VOICE FOR ANALYTICAL AGENTS
-- ============================================

-- General Agent - Disable brand voice (general assistance)
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": false}'::jsonb,
    updated_at = NOW()
WHERE id = 'general';

-- Client Onboarding - Disable brand voice (intake/data collection)
UPDATE agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"enable_brand_voice": false}'::jsonb,
    updated_at = NOW()
WHERE id = 'client-onboarding';

-- ============================================
-- VERIFICATION
-- ============================================

-- Display agents with brand voice settings
SELECT
    id,
    name,
    category,
    metadata->>'enable_brand_voice' as brand_voice_enabled,
    updated_at
FROM agents
ORDER BY
    CASE WHEN metadata->>'enable_brand_voice' = 'true' THEN 1 ELSE 2 END,
    name;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Brand Voice Agent Configuration Migration Completed Successfully';
  RAISE NOTICE '6 content-generating agents now have brand voice enabled';
  RAISE NOTICE '2 analytical agents have brand voice disabled';
END $$;
