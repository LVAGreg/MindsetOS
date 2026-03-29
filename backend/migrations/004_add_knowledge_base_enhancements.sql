-- Migration: 004_add_knowledge_base_enhancements
-- Description: Enhance knowledge base for document upload and agent linking
-- Created: 2025-10-29

-- Add agent knowledge base linking table
CREATE TABLE IF NOT EXISTS agent_knowledge_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    knowledge_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(agent_id, knowledge_id)
);

-- Add processing status and metadata columns to knowledge_base
ALTER TABLE knowledge_base
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);

-- Update metadata JSONB structure
COMMENT ON COLUMN knowledge_base.metadata IS 'JSON metadata: {pages, wordCount, language, extractedAt, processingTime, etc}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_base(processing_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_uploaded_by ON knowledge_base(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON agent_knowledge_links(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_priority ON agent_knowledge_links(agent_id, priority DESC) WHERE is_active = true;

-- Add check constraint for valid processing statuses
ALTER TABLE knowledge_base
    ADD CONSTRAINT valid_processing_status
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'archived'));

-- Add comments
COMMENT ON TABLE agent_knowledge_links IS 'Links documents from knowledge base to specific agents for RAG';
COMMENT ON COLUMN agent_knowledge_links.priority IS 'Higher priority documents are searched first (0 = default)';
COMMENT ON COLUMN knowledge_base.processing_status IS 'Document processing pipeline status';
COMMENT ON COLUMN knowledge_base.chunk_count IS 'Number of text chunks created from document';
