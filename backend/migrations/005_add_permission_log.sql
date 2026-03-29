-- Migration: 005_add_permission_log
-- Description: Add audit log for all permission checks and admin actions
-- Created: 2025-10-29

-- Permission audit log table
CREATE TABLE IF NOT EXISTS permission_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    granted BOOLEAN NOT NULL,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance and queries
CREATE INDEX IF NOT EXISTS idx_permission_log_user ON permission_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_log_action ON permission_log(action);
CREATE INDEX IF NOT EXISTS idx_permission_log_resource ON permission_log(resource);
CREATE INDEX IF NOT EXISTS idx_permission_log_granted ON permission_log(granted);
CREATE INDEX IF NOT EXISTS idx_permission_log_created ON permission_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_log_user_created ON permission_log(user_id, created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_permission_log_user_action_created
    ON permission_log(user_id, action, created_at DESC);

-- Add partitioning for log table (optional but recommended for large datasets)
-- Partition by month for better performance
-- ALTER TABLE permission_log PARTITION BY RANGE (created_at);

-- Create view for denied permissions (useful for security monitoring)
CREATE OR REPLACE VIEW denied_permissions AS
SELECT
    pl.id,
    u.email AS user_email,
    u.role AS user_role,
    pl.action,
    pl.resource,
    pl.resource_id,
    pl.reason,
    pl.ip_address,
    pl.created_at
FROM permission_log pl
LEFT JOIN users u ON pl.user_id = u.id
WHERE pl.granted = false
ORDER BY pl.created_at DESC;

-- Create view for admin actions
CREATE OR REPLACE VIEW admin_actions AS
SELECT
    pl.id,
    u.email AS admin_email,
    pl.action,
    pl.resource,
    pl.resource_id,
    pl.created_at,
    pl.ip_address
FROM permission_log pl
JOIN users u ON pl.user_id = u.id
WHERE u.role = 'admin' AND pl.granted = true
ORDER BY pl.created_at DESC;

-- Add comments
COMMENT ON TABLE permission_log IS 'Audit log for all permission checks and admin actions';
COMMENT ON COLUMN permission_log.granted IS 'Whether the permission check passed (true) or was denied (false)';
COMMENT ON COLUMN permission_log.reason IS 'Explanation for permission decision (especially important for denials)';
COMMENT ON VIEW denied_permissions IS 'Quick view of all denied permission attempts for security monitoring';
COMMENT ON VIEW admin_actions IS 'Audit trail of all admin actions for compliance';
