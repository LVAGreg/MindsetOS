-- ECOS Voice Agents Schema
-- Created: 2026-01-14
-- Two voice agents: Voice ExpertAI + Sales Roleplay Coach

-- ============================================
-- VOICE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('expert_voice', 'sales_roleplay')),

    -- Session metadata
    difficulty VARCHAR(20) CHECK (difficulty IN ('kind', 'medium', 'hard_ass')), -- for roleplay only
    scenario_type VARCHAR(100), -- e.g., 'price_objection', 'timing_objection'
    duration_seconds INTEGER DEFAULT 0,

    -- Conversation data
    transcript JSONB DEFAULT '[]'::jsonb, -- Array of {role, content, timestamp}
    audio_url TEXT, -- S3/storage URL for recording

    -- Roleplay scoring (null for expert_voice)
    score INTEGER CHECK (score >= 0 AND score <= 100),
    objections_handled INTEGER DEFAULT 0,
    objections_total INTEGER DEFAULT 0,
    response_times JSONB DEFAULT '[]'::jsonb, -- Array of response times in ms

    -- AI feedback
    feedback JSONB DEFAULT '{}'::jsonb, -- Structured feedback object
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,
    tips JSONB DEFAULT '[]'::jsonb,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_agent_type ON voice_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at ON voice_sessions(created_at DESC);

-- ============================================
-- ROLEPLAY SCENARIOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roleplay_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'objection', 'discovery', 'closing', 'negotiation'
    difficulty_base VARCHAR(20) DEFAULT 'medium',

    -- Scenario setup
    prospect_persona JSONB NOT NULL, -- Name, role, company, pain points
    situation TEXT NOT NULL, -- Context for the roleplay
    opening_line TEXT, -- How the prospect starts

    -- Objections for this scenario
    objections JSONB DEFAULT '[]'::jsonb, -- Array of possible objections
    hidden_needs JSONB DEFAULT '[]'::jsonb, -- Things to uncover
    buying_signals JSONB DEFAULT '[]'::jsonb, -- Signs they're interested

    -- Scoring weights
    scoring_weights JSONB DEFAULT '{
        "rapport": 0.2,
        "discovery": 0.2,
        "objection_handling": 0.3,
        "closing": 0.2,
        "timing": 0.1
    }'::jsonb,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- OBJECTION LIBRARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS objection_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL, -- 'price', 'timing', 'authority', 'trust', 'need', 'competition'
    objection_text TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',

    -- Response guidance
    good_responses JSONB DEFAULT '[]'::jsonb,
    poor_responses JSONB DEFAULT '[]'::jsonb,
    frameworks JSONB DEFAULT '[]'::jsonb, -- e.g., ['Feel-Felt-Found', 'Acknowledge-Ask-Answer']

    -- Scoring
    max_points INTEGER DEFAULT 10,
    time_bonus_threshold INTEGER DEFAULT 5000, -- ms - bonus if responded under this

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER VOICE STATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_voice_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Expert Voice stats
    expert_sessions INTEGER DEFAULT 0,
    expert_total_minutes DECIMAL(10,2) DEFAULT 0,
    agents_used JSONB DEFAULT '[]'::jsonb, -- Which agents they've accessed via voice

    -- Roleplay stats
    roleplay_sessions INTEGER DEFAULT 0,
    roleplay_total_minutes DECIMAL(10,2) DEFAULT 0,
    avg_score DECIMAL(5,2),
    best_score INTEGER,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,

    -- Skill progression
    skill_levels JSONB DEFAULT '{
        "price_objections": 0,
        "timing_objections": 0,
        "authority_objections": 0,
        "trust_objections": 0,
        "need_objections": 0,
        "competition_objections": 0,
        "discovery": 0,
        "closing": 0
    }'::jsonb,

    -- Achievements
    achievements JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SEED DATA: OBJECTION LIBRARY
-- ============================================
INSERT INTO objection_library (category, objection_text, difficulty, good_responses, frameworks) VALUES
-- Price Objections
('price', 'That''s way too expensive for us right now.', 'medium',
 '["Acknowledge the concern, then ask what budget they had in mind", "Break down the ROI to show value exceeds cost", "Compare to cost of not solving the problem"]'::jsonb,
 '["Value Stack", "Cost of Inaction"]'::jsonb),

('price', 'Your competitor is 40% cheaper.', 'hard_ass',
 '["Ask what they''re comparing - features, support, results?", "Share case studies showing superior results", "Discuss total cost of ownership vs just price"]'::jsonb,
 '["Apples to Oranges", "Value Differentiation"]'::jsonb),

('price', 'I need to think about the price.', 'kind',
 '["Ask what specifically about the price concerns them", "Offer payment options if available", "Revisit the value they said they wanted"]'::jsonb,
 '["Feel-Felt-Found", "Isolate the Objection"]'::jsonb),

-- Timing Objections
('timing', 'Now''s not a good time. Maybe next quarter.', 'medium',
 '["Ask what changes next quarter", "Calculate cost of delay", "Offer a lighter starting engagement"]'::jsonb,
 '["Cost of Delay", "Foot in the Door"]'::jsonb),

('timing', 'We''re in the middle of another project.', 'medium',
 '["Ask about timeline of current project", "Explore parallel implementation", "Position as support for current project"]'::jsonb,
 '["Synergy Positioning", "Timeline Mapping"]'::jsonb),

-- Authority Objections
('authority', 'I need to run this by my business partner.', 'medium',
 '["Offer to include partner in next conversation", "Ask what partner typically focuses on", "Provide materials for partner review"]'::jsonb,
 '["Champion Building", "Stakeholder Mapping"]'::jsonb),

('authority', 'The CEO makes all purchasing decisions.', 'hard_ass',
 '["Ask to understand CEO''s priorities", "Request warm introduction", "Provide executive summary materials"]'::jsonb,
 '["Executive Alignment", "Champion Strategy"]'::jsonb),

-- Trust Objections
('trust', 'I''ve been burned by consultants before.', 'hard_ass',
 '["Acknowledge past experience, ask what happened", "Explain how you''re different", "Offer pilot or guarantee"]'::jsonb,
 '["Feel-Felt-Found", "Risk Reversal"]'::jsonb),

('trust', 'How do I know this will actually work for us?', 'medium',
 '["Share relevant case studies", "Offer references in their industry", "Propose small pilot engagement"]'::jsonb,
 '["Social Proof", "Pilot Proposal"]'::jsonb),

-- Need Objections
('need', 'We''re actually doing pretty well without this.', 'hard_ass',
 '["Acknowledge success, explore growth goals", "Discuss opportunity cost", "Ask about their vision for next level"]'::jsonb,
 '["Future Pacing", "Gap Analysis"]'::jsonb),

('need', 'I''m not sure we really need this right now.', 'kind',
 '["Revisit pain points they mentioned earlier", "Ask about impact of problem continuing", "Explore what would make it a priority"]'::jsonb,
 '["Pain Amplification", "Priority Ladder"]'::jsonb),

-- Competition Objections
('competition', 'We''re already talking to another provider.', 'medium',
 '["Ask what they like about the other option", "Highlight unique differentiators", "Offer comparison framework"]'::jsonb,
 '["Competitive Positioning", "Unique Value Prop"]'::jsonb)

ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA: ROLEPLAY SCENARIOS
-- ============================================
INSERT INTO roleplay_scenarios (name, description, category, difficulty_base, prospect_persona, situation, opening_line, objections) VALUES
(
    'The Price-Sensitive Startup Founder',
    'A bootstrapped startup founder interested in your consulting but worried about budget',
    'objection',
    'medium',
    '{"name": "Alex Chen", "role": "Founder & CEO", "company": "TechStart Inc", "pain_points": ["Struggling to close enterprise deals", "No systematic sales process", "Wearing too many hats"]}'::jsonb,
    'Alex reached out after seeing your LinkedIn content about B2B sales. They''ve bootstrapped to $500k ARR but are stuck. They have limited runway and every dollar counts.',
    'Hey, thanks for taking the time. I''ve been following your content and I think you could help us, but I''ll be honest - we''re really watching our cash right now.',
    '["price", "timing"]'::jsonb
),
(
    'The Skeptical Executive',
    'A VP who has been burned by consultants before and is highly skeptical',
    'objection',
    'hard_ass',
    '{"name": "Sarah Mitchell", "role": "VP of Sales", "company": "Enterprise Corp", "pain_points": ["Previous consultant wasted budget", "Team resistant to change", "Under pressure from board"]}'::jsonb,
    'Sarah''s company hired a big consulting firm last year that delivered a 200-page report and nothing changed. She''s under pressure to hit numbers and the board is watching.',
    'Look, I''ll be direct with you. We spent $150k on consultants last year and got nothing. Why should I believe you''re any different?',
    '["trust", "authority", "price"]'::jsonb
),
(
    'The Timing Staller',
    'A qualified prospect who keeps pushing to "next quarter"',
    'objection',
    'kind',
    '{"name": "Marcus Johnson", "role": "Director of Operations", "company": "GrowthCo", "pain_points": ["Team overwhelmed", "Multiple initiatives running", "Needs help but stretched thin"]}'::jsonb,
    'Marcus genuinely needs help but his team is swamped. He keeps agreeing with everything you say but won''t commit to starting.',
    'This all sounds great, honestly. I think we definitely need something like this. Can we maybe circle back in Q2 when things calm down?',
    '["timing", "need"]'::jsonb
)

ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON voice_sessions TO ecos_user;
GRANT ALL ON roleplay_scenarios TO ecos_user;
GRANT ALL ON objection_library TO ecos_user;
GRANT ALL ON user_voice_stats TO ecos_user;
