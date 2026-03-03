-- Add 'new_member' to the event_category enum
ALTER TYPE public.event_category ADD VALUE IF NOT EXISTS 'new_member';