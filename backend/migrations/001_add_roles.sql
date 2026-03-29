-- Migration: 001_add_roles
-- Description: Add role system for RBAC (User, Power User, Admin)
-- Created: 2025-10-29

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- 1=user, 2=power_user, 3=admin
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (id, name, description, level) VALUES
    ('user', 'User', 'Standard consultant user with basic permissions', 1),
    ('power_user', 'Power User', 'Coach with user session takeover capability', 2),
    ('admin', 'Admin', 'Full system administrator with all permissions', 3)
ON CONFLICT (id) DO NOTHING;

-- Create user_roles junction table (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(20) REFERENCES roles(id),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON user_roles(granted_by);

-- Add comment
COMMENT ON TABLE roles IS 'System roles for RBAC (Role-Based Access Control)';
COMMENT ON TABLE user_roles IS 'Junction table linking users to roles (many-to-many relationship)';
