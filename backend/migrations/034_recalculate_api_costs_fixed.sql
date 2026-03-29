-- Recalculate API costs with corrected formula
-- Previous migration may not have updated all records correctly

-- Recalculate all existing api_usage_logs records with corrected costs
UPDATE api_usage_logs
SET cost_usd = calculate_api_cost(model_id, input_tokens, output_tokens)
WHERE cost_usd > 0;

-- Verify the fix
DO $$
DECLARE
  v_new_total DECIMAL;
  v_record_count INTEGER;
BEGIN
  -- Count records updated
  SELECT COUNT(*), SUM(cost_usd)
  INTO v_record_count, v_new_total
  FROM api_usage_logs;

  RAISE NOTICE 'Recalculation complete';
  RAISE NOTICE 'Total records: %', v_record_count;
  RAISE NOTICE 'New total cost: $%', v_new_total;
END $$;
