-- Migration: Create API usage analytics tables
-- Tracks token usage, costs, and performance metrics

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id VARCHAR(100) REFERENCES agents(id) ON DELETE SET NULL,
  model_id VARCHAR(200),
  operation VARCHAR(50) NOT NULL, -- 'chat', 'memory', 'widget'
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_agent_id ON api_usage_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_model_id ON api_usage_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_operation ON api_usage_logs(operation);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_conversation_id ON api_usage_logs(conversation_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_usage_agent_date ON api_usage_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage_logs(user_id, created_at DESC);

-- Add comments
COMMENT ON TABLE api_usage_logs IS 'Tracks all API usage for analytics and cost monitoring';
COMMENT ON COLUMN api_usage_logs.operation IS 'Type of operation: chat, memory, widget';
COMMENT ON COLUMN api_usage_logs.cost_usd IS 'Calculated cost in USD based on token usage and model pricing';
COMMENT ON COLUMN api_usage_logs.latency_ms IS 'Response time in milliseconds';

-- Create view for common analytics queries
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  agent_id,
  model_id,
  operation,
  COUNT(*) as total_requests,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency,
  MIN(latency_ms) as min_latency,
  MAX(latency_ms) as max_latency
FROM api_usage_logs
GROUP BY DATE_TRUNC('day', created_at), agent_id, model_id, operation
ORDER BY date DESC;

COMMENT ON VIEW analytics_summary IS 'Daily aggregated analytics by agent, model, and operation';

-- Create function to calculate cost based on token usage and model pricing
CREATE OR REPLACE FUNCTION calculate_api_cost(
  p_model_id VARCHAR(200),
  p_input_tokens INTEGER,
  p_output_tokens INTEGER
) RETURNS DECIMAL(10,6) AS $$
DECLARE
  v_cost DECIMAL(10,6);
  v_input_price DECIMAL(10,8);
  v_output_price DECIMAL(10,8);
BEGIN
  -- Get pricing from ai_models table
  SELECT pricing_prompt, pricing_completion
  INTO v_input_price, v_output_price
  FROM ai_models
  WHERE model_id = p_model_id;

  -- If model not found, return 0
  IF v_input_price IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate cost: (input_tokens * input_price) + (output_tokens * output_price)
  v_cost := (p_input_tokens * v_input_price) + (p_output_tokens * v_output_price);

  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_api_cost IS 'Calculate API cost based on token usage and model pricing';

-- Verify table creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name='api_usage_logs') THEN
        RAISE NOTICE 'Successfully created api_usage_logs table and analytics infrastructure';
    ELSE
        RAISE EXCEPTION 'Failed to create analytics tables';
    END IF;
END $$;
