-- ============================================================================
-- Migration: Stage 10 Scoring System
-- ============================================================================

CREATE TABLE public.system_scoring_rules (
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    amenity_weights JSONB NOT NULL DEFAULT '{"cctv": 15, "24_7": 15, "security_guard": 10}',
    transit_weights JSONB NOT NULL DEFAULT '{"under_1km": 30, "1_to_3km": 15, "over_3km": 0}',
    
    luggage_rates JSONB NOT NULL DEFAULT '{"min_hr": 10, "max_hr": 40}',
    garage_bike_rates JSONB NOT NULL DEFAULT '{"min_hr": 10, "max_hr": 30}',
    garage_car_rates JSONB NOT NULL DEFAULT '{"min_hr": 40, "max_hr": 100}',
    
    gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT ensure_single_row CHECK (id = 1)
);

COMMENT ON TABLE public.system_scoring_rules IS 'Global configuration for the location scoring engine and dynamic pricing';

-- Seed the initial row
INSERT INTO public.system_scoring_rules (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Add scoring columns to partner_locations
ALTER TABLE public.partner_locations
  ADD COLUMN IF NOT EXISTS auto_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_padding INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transit_proximity TEXT DEFAULT 'over_3km'; -- 'under_1km', '1_to_3km', 'over_3km'

-- Ensure RLS on system_scoring_rules
ALTER TABLE public.system_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scoring rules" 
ON public.system_scoring_rules FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow partners to read scoring rules if needed (optional)
CREATE POLICY "Anyone can read scoring rules" 
ON public.system_scoring_rules FOR SELECT TO authenticated
USING (true);
