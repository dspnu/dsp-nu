-- Default: show dues balance / installment card on home (preserves behavior for existing chapters)
INSERT INTO public.chapter_settings (key, value)
VALUES ('dues_home_widget_visible', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
