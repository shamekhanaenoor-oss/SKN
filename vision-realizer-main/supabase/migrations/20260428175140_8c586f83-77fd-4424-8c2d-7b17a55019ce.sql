ALTER TABLE public.id_number_settings DROP CONSTRAINT id_number_settings_entity_check;
ALTER TABLE public.id_number_settings ADD CONSTRAINT id_number_settings_entity_check
  CHECK (entity = ANY (ARRAY['student','teacher','staff','discount']));

INSERT INTO public.id_number_settings (entity, prefix, padding, separator, next_value)
VALUES ('discount', 'DSC', 3, '-', 1)
ON CONFLICT (entity) DO NOTHING;