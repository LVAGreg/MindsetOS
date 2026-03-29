-- =====================================================
-- ECOS Credit System Migration
-- =====================================================
-- Created: 2025-11-27
-- Purpose: Implement parallel credit tracking system
-- Conversion: 1 credit = $0.001 USD (100 credits = $0.10)
-- =====================================================

-- Create user_credits table for balance tracking
CREATE TABLE IF NOT EXISTS user_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Create credit_transactions table for full audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,  -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type VARCHAR(50) NOT NULL,  -- 'purchase', 'admin_grant', 'usage_deduction', 'refund', 'bonus'
  reference_id VARCHAR(255),  -- Links to api_usage_logs.id, purchase_id, etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- Create view for easy credit balance lookups with transaction counts
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  COALESCE(uc.balance, 0) as balance,
  COALESCE(uc.total_earned, 0) as total_earned,
  COALESCE(uc.total_spent, 0) as total_spent,
  COALESCE(uc.balance::DECIMAL / 1000, 0) as balance_usd,
  COALESCE(uc.total_earned::DECIMAL / 1000, 0) as total_earned_usd,
  COALESCE(uc.total_spent::DECIMAL / 1000, 0) as total_spent_usd,
  (SELECT COUNT(*) FROM credit_transactions WHERE user_id = u.id) as transaction_count,
  uc.created_at as credits_created_at,
  uc.updated_at as credits_updated_at
FROM users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
WHERE u.is_active = true;

-- Create view for recent credit transactions with user details
CREATE OR REPLACE VIEW recent_credit_transactions AS
SELECT
  ct.id,
  ct.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as user_name,
  ct.amount,
  ct.balance_after,
  ct.transaction_type,
  ct.reference_id,
  ct.description,
  ct.amount::DECIMAL / 1000 as amount_usd,
  ct.balance_after::DECIMAL / 1000 as balance_after_usd,
  ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
ORDER BY ct.created_at DESC;

-- Function to safely add credits (admin grant, purchase, bonus)
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_reference_id VARCHAR(255) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Insert or update user_credits record
  INSERT INTO user_credits (user_id, balance, total_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    balance = user_credits.balance + p_amount,
    total_earned = user_credits.total_earned + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, p_transaction_type, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to safely deduct credits (usage)
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference_id VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;

  -- Check if user has credits record
  IF v_current_balance IS NULL THEN
    RAISE NOTICE 'User % has no credit record', p_user_id;
    RETURN FALSE;
  END IF;

  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE NOTICE 'User % has insufficient credits: % < %', p_user_id, v_current_balance, p_amount;
    RETURN FALSE;
  END IF;

  -- Deduct credits
  UPDATE user_credits
  SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, 'usage_deduction', p_reference_id, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Initialize existing users with 10,000 credits ($10.00 starter balance)
INSERT INTO user_credits (user_id, balance, total_earned, created_at, updated_at)
SELECT
  id,
  10000,  -- 10,000 credits = $10.00
  10000,
  NOW(),
  NOW()
FROM users
WHERE is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- Create initial grant transactions for existing users
INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description, created_at)
SELECT
  id,
  10000,
  10000,
  'admin_grant',
  'Initial credit allocation - Welcome to ECOS! 🎉',
  NOW()
FROM users
WHERE is_active = true
AND id IN (SELECT user_id FROM user_credits WHERE total_earned = 10000);

-- Add comment documentation
COMMENT ON TABLE user_credits IS 'User credit balances - 1 credit = $0.001 USD';
COMMENT ON TABLE credit_transactions IS 'Complete audit trail of all credit transactions';
COMMENT ON COLUMN user_credits.balance IS 'Current credit balance (1 credit = $0.001 USD)';
COMMENT ON COLUMN user_credits.total_earned IS 'Lifetime credits earned through purchases and grants';
COMMENT ON COLUMN user_credits.total_spent IS 'Lifetime credits spent on AI usage';
COMMENT ON COLUMN credit_transactions.amount IS 'Positive for credit, negative for debit';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'Values: purchase, admin_grant, usage_deduction, refund, bonus';

-- =====================================================
-- Verification Queries
-- =====================================================

-- View all users with credit balances
-- SELECT * FROM user_credit_summary ORDER BY balance DESC;

-- View recent transactions
-- SELECT * FROM recent_credit_transactions LIMIT 20;

-- Check total credits in system
-- SELECT
--   SUM(balance) as total_balance_credits,
--   SUM(balance)::DECIMAL / 1000 as total_balance_usd,
--   COUNT(*) as user_count
-- FROM user_credits;

-- =====================================================
-- Migration Complete
-- =====================================================
