-- Migration: Create invite codes system for controlled registration
-- Run this in PGWeb or via backend admin execute

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES users(id),
  max_uses INTEGER DEFAULT 1,          -- How many times code can be used (NULL = unlimited)
  uses_count INTEGER DEFAULT 0,         -- How many times code has been used
  expires_at TIMESTAMPTZ,               -- When code expires (NULL = never)
  is_active BOOLEAN DEFAULT true,       -- Can be disabled by admin
  assigned_role TEXT DEFAULT 'user',    -- Role assigned to users who use this code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which users used which invite code
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_code ON invite_code_uses(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_user ON invite_code_uses(user_id);

-- Add invite_code_id column to users table to track which code they used
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_id UUID REFERENCES invite_codes(id);

-- Comments
COMMENT ON TABLE invite_codes IS 'Invite codes for controlled user registration';
COMMENT ON COLUMN invite_codes.max_uses IS 'Maximum number of uses allowed. NULL means unlimited.';
COMMENT ON COLUMN invite_codes.assigned_role IS 'Role to assign to users who register with this code';
