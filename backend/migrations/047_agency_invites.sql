-- Agency Invites table for sub-user management
CREATE TABLE IF NOT EXISTS agency_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, revoked
  invite_code VARCHAR(100) UNIQUE,
  accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  allowed_agents JSONB DEFAULT '[]', -- array of agent IDs this sub-user can access
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agency_invites_agency ON agency_invites(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_invites_email ON agency_invites(email);
CREATE INDEX IF NOT EXISTS idx_agency_invites_code ON agency_invites(invite_code);

-- Agency managed users junction (tracks which users are managed by which agency user)
CREATE TABLE IF NOT EXISTS agency_managed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  managed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowed_agents JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency_user_id, managed_user_id)
);
CREATE INDEX IF NOT EXISTS idx_agency_managed_agency ON agency_managed_users(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_managed_user ON agency_managed_users(managed_user_id);

-- Add client_profile_id to user_onboarding_status for per-client onboarding
ALTER TABLE user_onboarding_status ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
ALTER TABLE user_onboarding_status DROP CONSTRAINT IF EXISTS user_onboarding_status_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_user_client
  ON user_onboarding_status(user_id, COALESCE(client_profile_id, '00000000-0000-0000-0000-000000000000'));
