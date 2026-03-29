-- Update agent metadata with Lucide icon names for database-driven icons
-- This ensures agents display correct icons from the database instead of hardcoded frontend mappings

UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"GraduationCap"') WHERE id = 'general';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"HandshakeIcon"') WHERE id = 'client-onboarding';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"DollarSign"') WHERE id = 'money-model-maker';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Gem"') WHERE id = 'mmm-5in30';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Zap"') WHERE id = 'fast-fix-finder';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Megaphone"') WHERE id = 'offer-promo-printer';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Calendar"') WHERE id = 'promo-planner';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Phone"') WHERE id = 'qualification-call-builder';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"Target"') WHERE id = 'linkedin-events-builder';
UPDATE agents SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{icon}', '"PenLine"') WHERE id = 'brand-voice-analyzer';

-- Verify the updates
SELECT id, name, metadata->>'icon' as icon_name, accent_color FROM agents ORDER BY id;
