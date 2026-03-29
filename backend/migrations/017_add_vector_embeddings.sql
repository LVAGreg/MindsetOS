-- Migration: 017_add_vector_embeddings
-- Description: Add pgvector extension and document chunks table for RAG
-- Created: 2025-11-03

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for storing text chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 embedding dimension
    metadata JSONB DEFAULT '{}',
    word_count INTEGER,
    character_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(knowledge_id, chunk_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_knowledge ON document_chunks(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add full-text search index on chunk content
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_search ON document_chunks USING GIN(to_tsvector('english', content));

-- Create agent_rag_settings table for per-agent RAG configuration
CREATE TABLE IF NOT EXISTS agent_rag_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    max_chunks INTEGER DEFAULT 3,
    similarity_threshold REAL DEFAULT 0.7,
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_rag_agent ON agent_rag_settings(agent_id);

-- Add comments
COMMENT ON TABLE document_chunks IS 'Text chunks from documents with vector embeddings for semantic search';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding of the chunk content (1536 dimensions for ada-002)';
COMMENT ON COLUMN document_chunks.chunk_index IS 'Order of this chunk within the parent document';
COMMENT ON TABLE agent_rag_settings IS 'RAG configuration per agent (chunk size, similarity threshold, etc)';
COMMENT ON COLUMN agent_rag_settings.similarity_threshold IS 'Minimum cosine similarity score to include chunk (0-1)';
COMMENT ON COLUMN agent_rag_settings.max_chunks IS 'Maximum number of chunks to inject into context';

-- Insert default RAG settings for existing agents
INSERT INTO agent_rag_settings (agent_id, enabled)
SELECT id, false FROM agents
ON CONFLICT (agent_id) DO NOTHING;
