
ALTER TABLE public.pdp_assignments
ADD COLUMN submission_type text NOT NULL DEFAULT 'text'
CHECK (submission_type IN ('text', 'file', 'both'));
