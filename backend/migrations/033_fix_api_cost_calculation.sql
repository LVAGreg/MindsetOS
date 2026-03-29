-- Fix API cost calculation - OpenRouter prices are per million tokens
-- Current issue: Prices stored as $X per 1M tokens but being applied as $X per token
-- This causes costs to be 1,000,000x too high

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_api_cost(VARCHAR, INTEGER, INTEGER);

-- Recreate with correct calculation (divide by 1,000,000 since prices are per million tokens)
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
  -- Get pricing from ai_models table (prices are per million tokens)
  SELECT pricing_prompt, pricing_completion
  INTO v_input_price, v_output_price
  FROM ai_models
  WHERE model_id = p_model_id;

  -- If model not found, return 0
  IF v_input_price IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate cost: (input_tokens / 1M * input_price) + (output_tokens / 1M * output_price)
  -- Prices in ai_models are per million tokens, so divide token counts by 1,000,000
  v_cost := (p_input_tokens::DECIMAL / 1000000.0 * v_input_price) + (p_output_tokens::DECIMAL / 1000000.0 * v_output_price);

  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_api_cost IS 'Calculate API cost based on token usage and model pricing (prices per million tokens)';

-- Update all existing api_usage_logs records with corrected costs
UPDATE api_usage_logs
SET cost_usd = (
  SELECT calculate_api_cost(model_id, input_tokens, output_tokens)
  FROM api_usage_logs logs
  WHERE logs.id = api_usage_logs.id
)
WHERE cost_usd > 0;

-- Verify the fix
DO $$
DECLARE
  v_old_total DECIMAL;
  v_new_total DECIMAL;
BEGIN
  -- This will show the corrected total
  SELECT SUM(cost_usd) INTO v_new_total FROM api_usage_logs;

  RAISE NOTICE 'Cost calculation function updated successfully';
  RAISE NOTICE 'New total cost in database: $%', v_new_total;
END $$;
