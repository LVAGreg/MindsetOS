-- MindsetOS Agent Seed Data
-- 10 AI Agents for mindset coaching platform

INSERT INTO agents (slug, name, description, category, icon, accent_color, display_order, is_active, is_premium, onboarding_agent, onboarding_order, system_prompt) VALUES
('mindset-score', 'Mindset Score Agent', 'Your starting point — take the 5-question Mindset Score to reveal your weakest pillar and get a personalized report.', 'assessment', 'BarChart3', '#F59E0B', 1, true, false, true, 1, 'You are the Mindset Score Agent for MindsetOS...'),
('reset-guide', 'Reset Guide', 'Your 48-Hour Mindset Reset facilitator — 6 guided exercises over a weekend.', 'coaching', 'RotateCcw', '#06B6D4', 2, true, false, false, null, 'You are the Reset Guide for MindsetOS...'),
('architecture-coach', 'Architecture Coach', 'Your 90-day companion for the Mindset Architecture cohort.', 'coaching', 'Building2', '#8B5CF6', 3, true, true, false, null, 'You are the Architecture Coach for MindsetOS...'),
('inner-world-mapper', 'Inner World Mapper', 'Self-awareness excavation — maps beliefs, stories, and decision defaults.', 'self-awareness', 'Map', '#EC4899', 4, true, false, false, null, 'You are the Inner World Mapper for MindsetOS...'),
('practice-builder', 'Practice Builder', 'Creates your personalized 5-10 minute daily mindset routine.', 'coaching', 'Dumbbell', '#10B981', 5, true, false, false, null, 'You are the Practice Builder for MindsetOS...'),
('decision-framework', 'Decision Framework Agent', 'Real-time decision support using the DESIGN process.', 'strategy', 'GitBranch', '#3B82F6', 6, true, false, false, null, 'You are the Decision Framework Agent...'),
('accountability-partner', 'Accountability Partner', 'Daily check-ins, reflections, and streak tracking.', 'accountability', 'CheckCircle', '#059669', 7, true, false, false, null, 'You are the Accountability Partner...'),
('story-excavator', 'Story Excavator', 'Uncovers the 5-7 core stories running your decisions.', 'self-awareness', 'BookOpen', '#F97316', 8, true, false, false, null, 'You are the Story Excavator...'),
('conversation-curator', 'Conversation Curator', 'Podcast episode matchmaker for your current challenge.', 'content', 'Headphones', '#14B8A6', 9, true, false, false, null, 'You are the Conversation Curator...'),
('launch-companion', 'Launch Companion', 'Greg''s personal strategy assistant — cohort management and revenue tracking.', 'admin', 'Rocket', '#6B7280', 10, true, true, false, null, 'You are the Launch Companion...')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
