-- Add enabled toggle to brand_voice_profiles
-- Migration: 031_brand_voice_enabled_toggle
-- Created: 2025-11-14

-- Add is_enabled column to brand_voice_profiles
ALTER TABLE brand_voice_profiles
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT false;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_brand_voice_profiles_enabled
ON brand_voice_profiles(user_id, is_enabled);

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Brand Voice Enabled Toggle Migration Completed Successfully';
END $$;
