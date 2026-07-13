-- Batch E: Settlement Stored Procedure and Commission Setup
-- Execute this manually in Supabase SQL Editor

-- 1. Insert Default Commission Rate (if not exists)
INSERT INTO public.system_config (key, value, description)
VALUES (
  'default_commission_rate',
  '0.15',
  'Global platform commission rate (15%) taken from each booking.'
) ON CONFLICT (key) DO UPDATE SET value = '0.15';

-- 2. Create Stored Procedure for Monthly Settlement Aggregation
-- This procedure calculates the total payable amount for partners for a given month,
-- creating pending transfer records in `partner_transactions` if they don't already exist.

CREATE OR REPLACE FUNCTION generate_monthly_settlements(
  target_month TEXT -- format: 'YYYY-MM'
) RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
BEGIN
  -- We aggregate all 'checked_out' bookings for the target month that haven't been settled yet.
  
  WITH monthly_totals AS (
    SELECT 
      b.partner_id,
      SUM(b.partner_amount) as total_payable,
      COUNT(b.id) as booking_count
    FROM public.bookings b
    WHERE to_char(b.end_time, 'YYYY-MM') = target_month
      AND b.status = 'checked_out'
      -- ensure we haven't already generated a batch settlement for this booking (if we tracked it)
      -- or just rely on a unique constraint. Here we assume one transaction per month per partner.
    GROUP BY b.partner_id
  )
  INSERT INTO public.partner_transactions (
    partner_id,
    amount,
    status,
    settlement_month,
    notes
  )
  SELECT 
    partner_id,
    total_payable,
    'pending'::transfer_status,
    target_month,
    'Automated monthly settlement for ' || booking_count || ' bookings.'
  FROM monthly_totals
  WHERE NOT EXISTS (
    SELECT 1 FROM public.partner_transactions pt
    WHERE pt.partner_id = monthly_totals.partner_id
      AND pt.settlement_month = target_month
  );

  GET DIAGNOSTICS processed_count = ROW_COUNT;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_monthly_settlements IS 'Aggregates monthly booking revenues for partners and creates pending settlement transactions.';
