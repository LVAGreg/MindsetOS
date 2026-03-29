-- Email Templates Management System
-- Allows admin to add, edit, enable/disable email templates

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'transactional', 'onboarding', 'engagement', 'milestone'
    subject VARCHAR(255) NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,

    -- Trigger configuration
    trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'manual'
    trigger_event VARCHAR(100), -- e.g., 'user.signup', 'user.forgot_password', 'onboarding.complete'
    trigger_delay_hours INTEGER DEFAULT 0, -- For scheduled emails (e.g., send 24 hours after signup)

    -- Status and settings
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher = more important (affects send order)

    -- Variables available in template
    available_variables JSONB DEFAULT '[]'::jsonb, -- ['user_name', 'user_email', 'reset_link', etc.]

    -- Tracking
    send_count INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create index for trigger lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON email_templates(trigger_type, trigger_event, is_enabled);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category, is_enabled);

-- Email send log for tracking
CREATE TABLE IF NOT EXISTS email_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(50) REFERENCES email_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id UUID REFERENCES users(id),
    subject VARCHAR(255),
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'bounced', 'opened', 'clicked'
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON email_send_log(template_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user ON email_send_log(recipient_user_id, sent_at DESC);

-- Insert default email templates
INSERT INTO email_templates (id, name, category, subject, trigger_type, trigger_event, trigger_delay_hours, is_enabled, priority, available_variables, html_template, text_template)
VALUES
-- TRANSACTIONAL EMAILS
('welcome', 'Welcome Email', 'transactional', 'Welcome to ExpertOS!', 'event', 'user.signup', 0, true, 100,
 '["user_name", "user_email", "login_url"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Welcome to ExpertOS, {{user_name}}!'),

('password-reset', 'Password Reset', 'transactional', 'Reset Your Password - ExpertOS', 'event', 'user.forgot_password', 0, true, 100,
 '["user_name", "reset_link", "expiry_hours"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Reset your password: {{reset_link}}'),

('email-verification', 'Email Verification', 'transactional', 'Verify Your Email - ExpertOS', 'event', 'user.email_change', 0, true, 100,
 '["user_name", "verification_link"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Verify your email: {{verification_link}}'),

-- ONBOARDING SEQUENCE
('onboarding-complete', 'Onboarding Complete', 'onboarding', 'You''re All Set! All Agents Unlocked', 'event', 'onboarding.complete', 0, true, 90,
 '["user_name", "agents_unlocked"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Your onboarding is complete!'),

('onboarding-day1', 'Quick Start Guide', 'onboarding', 'Your First Steps with ExpertOS', 'event', 'user.signup', 24, true, 80,
 '["user_name", "quick_start_url"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Get started with ExpertOS'),

('onboarding-day3', 'Meet Your AI Agents', 'onboarding', 'Meet the AI Agents Ready to Help You', 'event', 'user.signup', 72, true, 70,
 '["user_name", "featured_agents"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Meet your AI agents'),

('onboarding-day5', 'Progress Check-in', 'onboarding', 'How''s Your ExpertOS Journey Going?', 'event', 'user.signup', 120, true, 60,
 '["user_name", "progress_stats"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Check in on your progress'),

('onboarding-day7', 'Success Stories', 'onboarding', 'See What Other Consultants Built', 'event', 'user.signup', 168, true, 50,
 '["user_name", "success_stories"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Success stories from ExpertOS users'),

-- ENGAGEMENT EMAILS
('inactivity-7d', 'Inactivity Reminder (7 days)', 'engagement', 'We Miss You! Your AI Agents Are Waiting', 'schedule', 'user.inactive', 168, true, 40,
 '["user_name", "last_active_date", "featured_agent"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Come back to ExpertOS'),

('inactivity-14d', 'Re-engagement (14 days)', 'engagement', 'Your ExpertOS Account Misses You', 'schedule', 'user.inactive', 336, true, 30,
 '["user_name", "win_back_offer"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'We want you back!'),

('weekly-tips', 'Weekly Tips', 'engagement', 'This Week''s Expert Tips', 'schedule', 'weekly', 0, false, 20,
 '["user_name", "tips", "featured_content"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Your weekly tips'),

('new-feature', 'New Feature Announcement', 'engagement', 'New in ExpertOS: {{feature_name}}', 'manual', NULL, 0, true, 50,
 '["user_name", "feature_name", "feature_description", "feature_url"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Check out our new feature'),

-- MILESTONE EMAILS
('milestone-first-agent', 'First Agent Conversation', 'milestone', 'You Had Your First AI Conversation!', 'event', 'agent.first_conversation', 0, true, 60,
 '["user_name", "agent_name", "conversation_summary"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Congrats on your first conversation!'),

('milestone-money-model', 'Money Model Created', 'milestone', 'Your Money Model is Ready!', 'event', 'money_model.created', 0, true, 70,
 '["user_name", "money_model_summary"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Your Money Model is complete!'),

('milestone-campaign', 'First Campaign Created', 'milestone', 'Your First Campaign is Live!', 'event', 'campaign.created', 0, true, 70,
 '["user_name", "campaign_name"]'::jsonb,
 'TEMPLATE_PLACEHOLDER', 'Your campaign is ready!')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subject = EXCLUDED.subject,
    trigger_type = EXCLUDED.trigger_type,
    trigger_event = EXCLUDED.trigger_event,
    trigger_delay_hours = EXCLUDED.trigger_delay_hours,
    available_variables = EXCLUDED.available_variables,
    updated_at = NOW();

-- View for email template stats
CREATE OR REPLACE VIEW email_template_stats AS
SELECT
    t.id,
    t.name,
    t.category,
    t.is_enabled,
    t.send_count,
    t.last_sent_at,
    COUNT(CASE WHEN l.status = 'sent' THEN 1 END) as total_sent,
    COUNT(CASE WHEN l.status = 'opened' THEN 1 END) as total_opened,
    COUNT(CASE WHEN l.status = 'clicked' THEN 1 END) as total_clicked,
    COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as total_failed
FROM email_templates t
LEFT JOIN email_send_log l ON t.id = l.template_id
GROUP BY t.id, t.name, t.category, t.is_enabled, t.send_count, t.last_sent_at;

COMMENT ON TABLE email_templates IS 'Stores email templates with trigger configuration and enable/disable functionality';
COMMENT ON TABLE email_send_log IS 'Logs all sent emails for tracking and analytics';
