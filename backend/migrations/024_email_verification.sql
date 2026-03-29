-- Migration: Add email verification columns to users table
-- Run this in PGWeb or via backend admin execute

-- Add email verification columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
ON users(email_verification_token)
WHERE email_verification_token IS NOT NULL;

-- Mark all existing users as verified (since they registered before verification was required)
UPDATE users
SET email_verified = true
WHERE email_verified IS NULL OR email_verified = false;

-- Add comment
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Token for email verification, cleared after use';
COMMENT ON COLUMN users.email_verification_expires IS 'When the verification token expires (24 hours from creation)';
