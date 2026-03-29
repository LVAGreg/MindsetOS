-- Migration: 002_add_user_profile_fields
-- Description: Add profile and role fields to users table
-- Created: 2025-10-29

-- Add profile-related columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS company VARCHAR(255),
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add foreign key constraint for role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_fkey'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_role_fkey
            FOREIGN KEY (role) REFERENCES roles(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- Update existing users to have 'user' role if not set
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add comments
COMMENT ON COLUMN users.role IS 'User role for RBAC: user, power_user, or admin';
COMMENT ON COLUMN users.is_active IS 'Account activation status - can be toggled by admins';
COMMENT ON COLUMN users.bio IS 'User bio/description (max 500 characters)';
COMMENT ON COLUMN users.company IS 'Company or organization name';
COMMENT ON COLUMN users.title IS 'Job title or professional designation';
