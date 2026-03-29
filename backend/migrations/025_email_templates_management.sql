-- Migration: Create email templates management table
-- Run this in PGWeb or via backend admin execute

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'transactional',  -- transactional, onboarding, marketing, milestone
  trigger_event TEXT,  -- What event triggers this email
  delay_minutes INTEGER DEFAULT 0,  -- Delay before sending (for sequences)
  priority INTEGER DEFAULT 10,  -- Lower = higher priority in sequences
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_enabled ON email_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON email_templates(trigger_event);

-- Seed default email templates
INSERT INTO email_templates (id, name, description, subject, enabled, category, trigger_event, priority) VALUES
  ('verification', 'Email Verification', 'Sent immediately after registration to verify email address', 'Verify your email - ExpertOS', true, 'transactional', 'user_registered', 1),
  ('welcome', 'Welcome Email', 'Sent after email verification is complete', 'You''re in - let''s build something', false, 'onboarding', 'email_verified', 2),
  ('onboarding_complete', 'Onboarding Complete', 'Sent when user completes the onboarding process', 'All agents unlocked', true, 'onboarding', 'onboarding_completed', 3),
  ('quick_start', 'Quick Start Guide', 'Day 1 of 5-day onboarding sequence', '15 minutes changes everything', false, 'onboarding', 'day_1_sequence', 4),
  ('meet_agents', 'Meet Your Agents', 'Day 3 of 5-day onboarding sequence', 'Which agent should you use first?', false, 'onboarding', 'day_3_sequence', 5),
  ('password_reset', 'Password Reset', 'Sent when user requests password reset', 'Reset your password', true, 'transactional', 'password_reset_requested', 1),
  ('inactivity_reminder', 'Inactivity Reminder', 'Sent after 7 days of inactivity', '20 minutes could change your month', false, 'marketing', 'user_inactive_7_days', 10),
  ('first_conversation', 'First Conversation', 'Sent after user completes first agent conversation', 'First chat done - now keep going', false, 'milestone', 'first_conversation_completed', 6),
  ('money_model_created', 'Money Model Created', 'Sent when user creates their first Money Model', 'Money Model done - now let''s write copy', false, 'milestone', 'money_model_created', 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  category = EXCLUDED.category,
  trigger_event = EXCLUDED.trigger_event,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE email_templates IS 'Email templates configuration - enable/disable emails from admin panel';
COMMENT ON COLUMN email_templates.enabled IS 'Whether this email is active and will be sent';
COMMENT ON COLUMN email_templates.trigger_event IS 'The event that triggers this email to be sent';
COMMENT ON COLUMN email_templates.delay_minutes IS 'Delay in minutes before sending (for drip campaigns)';
