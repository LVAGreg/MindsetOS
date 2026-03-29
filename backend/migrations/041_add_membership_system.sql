-- Migration 041: Add Membership System
-- Adds user tier tagging, membership status, and access control with grace period support
-- Run this in PGWeb or via backend admin/execute

-- ============================================
-- ADD MEMBERSHIP COLUMNS TO USERS TABLE
-- ============================================

-- Membership tier for categorizing users
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(50) DEFAULT 'foundations';
COMMENT ON COLUMN users.membership_tier IS 'User tier: 5in30, fast_start, foundations, accelerate, private';

-- Membership status for access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status VARCHAR(50) DEFAULT 'active';
COMMENT ON COLUMN users.membership_status IS 'Status: active, paused, cancelled, grace_period, expired';

-- When membership expires (for recurring billing tracking)
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP;
COMMENT ON COLUMN users.membership_expires_at IS 'When current membership period ends';

-- Grace period end date (7 days after pause/cancel)
ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;
COMMENT ON COLUMN users.grace_period_ends_at IS '7 days after membership pause/cancel, then access revoked';

-- Track when membership status was last changed
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_updated_at TIMESTAMP DEFAULT NOW();
COMMENT ON COLUMN users.membership_updated_at IS 'When membership status was last modified';

-- Admin notes about membership changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_notes TEXT;
COMMENT ON COLUMN users.membership_notes IS 'Admin notes about membership changes';

-- ============================================
-- ADD INDEXES FOR FILTERING
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_membership_tier ON users(membership_tier);
CREATE INDEX IF NOT EXISTS idx_users_membership_status ON users(membership_status);
CREATE INDEX IF NOT EXISTS idx_users_grace_period_ends ON users(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- Ensure valid membership tier values
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_membership_tier;
ALTER TABLE users ADD CONSTRAINT check_membership_tier
  CHECK (membership_tier IN ('5in30', 'fast_start', 'foundations', 'accelerate', 'private'));

-- Ensure valid membership status values
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_membership_status;
ALTER TABLE users ADD CONSTRAINT check_membership_status
  CHECK (membership_status IN ('active', 'paused', 'cancelled', 'grace_period', 'expired'));

-- ============================================
-- MEMBERSHIP AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS membership_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- tier_changed, status_changed, grace_started, access_revoked, reactivated
  previous_tier VARCHAR(50),
  new_tier VARCHAR(50),
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_audit_user_id ON membership_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_audit_created_at ON membership_audit_log(created_at DESC);

-- ============================================
-- HELPER FUNCTION: Start Grace Period
-- ============================================

CREATE OR REPLACE FUNCTION start_grace_period(p_user_id UUID, p_admin_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_admin_email VARCHAR(255);
  v_previous_status VARCHAR(50);
BEGIN
  -- Get current user status
  SELECT email, membership_status INTO v_user_email, v_previous_status
  FROM users WHERE id = p_user_id;

  -- Get admin email if provided
  IF p_admin_id IS NOT NULL THEN
    SELECT email INTO v_admin_email FROM users WHERE id = p_admin_id;
  END IF;

  -- Update user to grace period
  UPDATE users SET
    membership_status = 'grace_period',
    grace_period_ends_at = NOW() + INTERVAL '7 days',
    membership_updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the action
  INSERT INTO membership_audit_log (user_id, action, previous_status, new_status, admin_id, admin_email)
  VALUES (p_user_id, 'grace_started', v_previous_status, 'grace_period', p_admin_id, v_admin_email);

  RAISE NOTICE 'Grace period started for user %', v_user_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Revoke Access (after grace)
-- ============================================

CREATE OR REPLACE FUNCTION revoke_membership_access(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_previous_status VARCHAR(50);
BEGIN
  -- Get current user info
  SELECT email, membership_status INTO v_user_email, v_previous_status
  FROM users WHERE id = p_user_id;

  -- Revoke access
  UPDATE users SET
    is_active = false,
    membership_status = 'expired',
    membership_updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the action
  INSERT INTO membership_audit_log (user_id, action, previous_status, new_status, notes)
  VALUES (p_user_id, 'access_revoked', v_previous_status, 'expired', 'Automatic: grace period expired');

  RAISE NOTICE 'Access revoked for user %', v_user_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Reactivate Membership
-- ============================================

CREATE OR REPLACE FUNCTION reactivate_membership(p_user_id UUID, p_new_tier VARCHAR(50), p_admin_id UUID)
RETURNS void AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_admin_email VARCHAR(255);
  v_previous_tier VARCHAR(50);
  v_previous_status VARCHAR(50);
BEGIN
  -- Get current user info
  SELECT email, membership_tier, membership_status
  INTO v_user_email, v_previous_tier, v_previous_status
  FROM users WHERE id = p_user_id;

  -- Get admin email
  SELECT email INTO v_admin_email FROM users WHERE id = p_admin_id;

  -- Reactivate user
  UPDATE users SET
    is_active = true,
    membership_status = 'active',
    membership_tier = COALESCE(p_new_tier, membership_tier),
    grace_period_ends_at = NULL,
    membership_updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the action
  INSERT INTO membership_audit_log (
    user_id, action, previous_tier, new_tier, previous_status, new_status, admin_id, admin_email
  )
  VALUES (
    p_user_id, 'reactivated', v_previous_tier, COALESCE(p_new_tier, v_previous_tier),
    v_previous_status, 'active', p_admin_id, v_admin_email
  );

  RAISE NOTICE 'Membership reactivated for user %', v_user_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SET EXISTING USERS TO DEFAULT TIER
-- ============================================

-- All existing active users get 'foundations' tier (can be adjusted via admin)
UPDATE users
SET membership_tier = 'foundations',
    membership_status = 'active'
WHERE membership_tier IS NULL OR membership_tier = '';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'membership_tier';

  IF v_count > 0 THEN
    RAISE NOTICE '✅ Membership system migration completed successfully';
    RAISE NOTICE 'New columns: membership_tier, membership_status, membership_expires_at, grace_period_ends_at, membership_updated_at, membership_notes';
    RAISE NOTICE 'New table: membership_audit_log';
    RAISE NOTICE 'New functions: start_grace_period(), revoke_membership_access(), reactivate_membership()';
  ELSE
    RAISE EXCEPTION 'Migration failed - columns not created';
  END IF;
END $$;
