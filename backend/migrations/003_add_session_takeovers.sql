-- Migration: 003_add_session_takeovers
-- Description: Add session takeover tracking for power users
-- Created: 2025-10-29

-- Session takeover tracking table
CREATE TABLE IF NOT EXISTS session_takeovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    power_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    session_duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
            ELSE NULL
        END
    ) STORED,
    CONSTRAINT no_self_takeover CHECK (power_user_id != target_user_id),
    CONSTRAINT one_active_takeover_per_power_user EXCLUDE USING gist (
        power_user_id WITH =,
        tsrange(started_at, COALESCE(ended_at, 'infinity'::timestamp), '[)') WITH &&
    ) WHERE (is_active = true)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_takeovers_power_user ON session_takeovers(power_user_id);
CREATE INDEX IF NOT EXISTS idx_takeovers_target ON session_takeovers(target_user_id);
CREATE INDEX IF NOT EXISTS idx_takeovers_active ON session_takeovers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_takeovers_started_at ON session_takeovers(started_at DESC);

-- Add comments
COMMENT ON TABLE session_takeovers IS 'Tracks when power users take over user sessions for coaching/support';
COMMENT ON COLUMN session_takeovers.session_duration_minutes IS 'Auto-calculated session duration in minutes';
COMMENT ON CONSTRAINT no_self_takeover ON session_takeovers IS 'Prevents users from taking over their own sessions';
COMMENT ON CONSTRAINT one_active_takeover_per_power_user ON session_takeovers IS 'Ensures power user can only have one active takeover at a time';
