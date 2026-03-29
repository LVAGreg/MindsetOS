-- Migration 045: Consolidate agent categories from 16 fragmented categories to 7 broad groups
-- This makes the Browse Agents view cleaner and more navigable

-- Consolidate categories
UPDATE agents SET category = CASE
  WHEN id = 'client-onboarding' THEN 'Getting Started'
  WHEN id IN ('mmm-5in30', 'five-ones-formula', 'expert-roadmap') THEN 'Strategy & Foundations'
  WHEN id IN ('offer-invitation-architect', 'email-promo-engine', 'daily-lead-sequence', 'content-catalyst', 'authority-content-engine') THEN 'Marketing & Content'
  WHEN id IN ('presentation-printer', 'linkedin-events-builder', 'easy-event-architect', 'profile-power-up') THEN 'Events & LinkedIn'
  WHEN id IN ('qualification-call-builder', 'sales-roleplay-coach', 'voice-expert') THEN 'Sales & Voice'
  WHEN id IN ('ecos-super-agent', 'deep-research-expert', 'admin-support-agent') THEN 'Research & Support'
  WHEN id = 'agent-creator' THEN 'Agency Tools'
  ELSE category
END
WHERE is_active = true;

-- Update sort orders for logical within-category ordering
UPDATE agents SET sort_order = CASE id
  WHEN 'client-onboarding' THEN 1
  WHEN 'mmm-5in30' THEN 10
  WHEN 'five-ones-formula' THEN 11
  WHEN 'expert-roadmap' THEN 12
  WHEN 'offer-invitation-architect' THEN 20
  WHEN 'email-promo-engine' THEN 21
  WHEN 'daily-lead-sequence' THEN 22
  WHEN 'content-catalyst' THEN 23
  WHEN 'authority-content-engine' THEN 24
  WHEN 'presentation-printer' THEN 30
  WHEN 'linkedin-events-builder' THEN 31
  WHEN 'easy-event-architect' THEN 32
  WHEN 'profile-power-up' THEN 33
  WHEN 'qualification-call-builder' THEN 40
  WHEN 'sales-roleplay-coach' THEN 41
  WHEN 'voice-expert' THEN 42
  WHEN 'ecos-super-agent' THEN 50
  WHEN 'deep-research-expert' THEN 51
  WHEN 'admin-support-agent' THEN 52
  WHEN 'agent-creator' THEN 90
  ELSE sort_order
END
WHERE is_active = true;
