-- Migration 049: Security events table for tracking jailbreak attempts and suspicious activity

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- jailbreak_attempt, prompt_injection, config_access, suspicious_pattern
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  details JSONB DEFAULT '{}',
  message_content TEXT,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  conversation_id UUID,
  ip_address VARCHAR(45),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(resolved) WHERE resolved = false;
