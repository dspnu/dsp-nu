-- Add eligible_voters column to eop_candidates table
ALTER TABLE public.eop_candidates 
ADD COLUMN eligible_voters integer DEFAULT 0;