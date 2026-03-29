-- Migration: 033_agent_accent_colors
-- Description: Add accent_color column to agents table for UI customization
-- Created: 2025-11-17

-- Add accent_color column (stores hex color code)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment
COMMENT ON COLUMN agents.accent_color IS 'Hex color code for agent UI accent (e.g., #3B82F6 for blue)';

-- Set default colors for existing agents based on category
UPDATE agents SET accent_color = '#10B981' WHERE category = 'Onboarding' AND accent_color = '#3B82F6'; -- Green
UPDATE agents SET accent_color = '#8B5CF6' WHERE category = 'Offer Development' AND accent_color = '#3B82F6'; -- Purple
UPDATE agents SET accent_color = '#F59E0B' WHERE category = 'Marketing & Promotion' AND accent_color = '#3B82F6'; -- Orange
UPDATE agents SET accent_color = '#EC4899' WHERE category = 'Sales & Conversion' AND accent_color = '#3B82F6'; -- Pink
UPDATE agents SET accent_color = '#06B6D4' WHERE category = 'Brand Voice' AND accent_color = '#3B82F6'; -- Cyan
UPDATE agents SET accent_color = '#6366F1' WHERE category = 'General' AND accent_color = '#3B82F6'; -- Indigo

-- Create index for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_agents_accent_color ON agents(accent_color);
