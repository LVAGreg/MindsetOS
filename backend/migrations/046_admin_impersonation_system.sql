-- Migration 046: Admin Impersonation System
-- Allows admins to view user data (read-only by default) and request edit permission
-- Target user receives notification and can accept/decline

-- Impersonation request/session table
CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'viewing',
  -- viewing: admin can see user's data (read-only)
  -- edit_requested: admin asked for edit permission, waiting on user
  -- edit_approved: user approved edit access
  -- edit_declined: user declined edit access
  -- ended: session terminated
  permissions JSONB DEFAULT '{"view": true, "edit": false, "sendMessages": false, "savePlaybooks": false}',
  request_message TEXT, -- optional message from admin explaining why they need edit access
  response_message TEXT, -- optional message from target user
  created_at TIMESTAMP DEFAULT NOW(),
  edit_requested_at TIMESTAMP,
  resolved_at TIMESTAMP,
  expires_at TIMESTAMP, -- edit permission expires after 24h by default
  ended_at TIMESTAMP,
  CONSTRAINT check_status CHECK (status IN ('viewing', 'edit_requested', 'edit_approved', 'edit_declined', 'ended'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON admin_impersonation_sessions(admin_user_id, status);
CREATE INDEX IF NOT EXISTS idx_impersonation_target ON admin_impersonation_sessions(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON admin_impersonation_sessions(admin_user_id)
  WHERE status IN ('viewing', 'edit_requested', 'edit_approved');

-- Only one active session per admin at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_impersonation_one_active
  ON admin_impersonation_sessions(admin_user_id)
  WHERE status IN ('viewing', 'edit_requested', 'edit_approved');
