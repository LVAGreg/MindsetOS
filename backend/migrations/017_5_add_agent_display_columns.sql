-- Migration: 017_5_add_agent_display_columns
-- Purpose: Add display columns (icon, color) to agents table
-- Date: 2025-11-12
-- Reason: Required for brand-voice-analyzer and other visual agent features

BEGIN;

-- Add icon column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'icon'
    ) THEN
        ALTER TABLE agents ADD COLUMN icon VARCHAR(10) DEFAULT '🤖';
        RAISE NOTICE '✅ Added icon column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️  icon column already exists';
    END IF;
END $$;

-- Add color column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'color'
    ) THEN
        ALTER TABLE agents ADD COLUMN color VARCHAR(50) DEFAULT 'blue';
        RAISE NOTICE '✅ Added color column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️  color column already exists';
    END IF;
END $$;

-- Add sort_order column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE agents ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added sort_order column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️  sort_order column already exists';
    END IF;
END $$;

-- Add capabilities column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'capabilities'
    ) THEN
        ALTER TABLE agents ADD COLUMN capabilities TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added capabilities column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️  capabilities column already exists';
    END IF;
END $$;

COMMIT;

-- Summary:
-- ✅ icon column added for agent visual representation
-- ✅ color column added for agent theming
-- ✅ sort_order column added for agent ordering
-- ✅ capabilities column added for agent feature list
