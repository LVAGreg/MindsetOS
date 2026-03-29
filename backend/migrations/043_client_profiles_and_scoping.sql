-- Migration 043: Client Profiles & Multi-Client Scoping
-- Adds client_profiles table and client_profile_id FK to all memory/conversation tables
-- Part of the Agency tier feature for consultants managing multiple clients
-- All new columns are nullable — zero impact on existing users/data

BEGIN;

-- ============================================
-- 1. Create client_profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_type VARCHAR(50) DEFAULT 'company',  -- company | individual
  industry VARCHAR(100),
  description TEXT,
  color VARCHAR(7),          -- hex color for UI badge, e.g. '#3B82F6'
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_active ON client_profiles(user_id, is_active) WHERE is_archived = false;

-- ============================================
-- 2. Create client_agent_settings table (per-client agent activation)
-- ============================================
CREATE TABLE IF NOT EXISTS client_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,  -- matches agents.id which is VARCHAR
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_profile_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_client_agent_settings_client ON client_agent_settings(client_profile_id);

-- ============================================
-- 3. Add client_profile_id to conversations
-- ============================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(user_id, client_profile_id);

-- ============================================
-- 4. Add client_profile_id to memories (semantic)
-- ============================================
ALTER TABLE memories ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_memories_client ON memories(user_id, client_profile_id);

-- ============================================
-- 5. Add client_profile_id to core_memories
--    Drop UNIQUE(user_id), replace with composite unique
-- ============================================
ALTER TABLE core_memories ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
ALTER TABLE core_memories DROP CONSTRAINT IF EXISTS core_memories_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_memories_user_client_unique
  ON core_memories(user_id, COALESCE(client_profile_id, '00000000-0000-0000-0000-000000000000'));

-- ============================================
-- 6. Add client_profile_id to user_business_profiles
--    Update the partial unique index
-- ============================================
ALTER TABLE user_business_profiles ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
DROP INDEX IF EXISTS idx_user_business_profiles_unique_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_business_profiles_user_client_unique
  ON user_business_profiles(user_id, COALESCE(client_profile_id, '00000000-0000-0000-0000-000000000000'))
  WHERE source != 'chat_paste';

-- ============================================
-- 7. Add client_profile_id to user_document_chunks
-- ============================================
ALTER TABLE user_document_chunks ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_document_chunks_client ON user_document_chunks(user_id, client_profile_id);

-- ============================================
-- 8. Add client_profile_id to brand_voice_profiles
--    Drop UNIQUE(user_id), replace with composite unique
-- ============================================
ALTER TABLE brand_voice_profiles ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
ALTER TABLE brand_voice_profiles DROP CONSTRAINT IF EXISTS brand_voice_profiles_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_voice_profiles_user_client_unique
  ON brand_voice_profiles(user_id, COALESCE(client_profile_id, '00000000-0000-0000-0000-000000000000'));

-- ============================================
-- 9. Add client_profile_id to artifacts (playbooks)
-- ============================================
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_artifacts_client ON artifacts(user_id, client_profile_id);

-- ============================================
-- 10. Add agency role support + custom agent columns
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';  -- private | client | public
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_agents_custom ON agents(created_by_user_id) WHERE is_custom = true;

COMMIT;
