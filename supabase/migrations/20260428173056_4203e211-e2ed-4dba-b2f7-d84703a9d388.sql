-- 1) ID Number settings (sequence config) for students/teachers/staff
CREATE TABLE IF NOT EXISTS public.id_number_settings (
  entity TEXT PRIMARY KEY CHECK (entity IN ('student','teacher','staff')),
  prefix TEXT NOT NULL DEFAULT '',
  padding INTEGER NOT NULL DEFAULT 3,
  next_value INTEGER NOT NULL DEFAULT 1,
  separator TEXT NOT NULL DEFAULT '-',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.id_number_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read id_number_settings" ON public.id_number_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "admin manage id_number_settings" ON public.id_number_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

INSERT INTO public.id_number_settings (entity, prefix, padding, next_value) VALUES
  ('student','STD',3,1),
  ('teacher','TCH',3,1),
  ('staff','STF',3,1)
ON CONFLICT (entity) DO NOTHING;

-- Function to atomically generate next ID
CREATE OR REPLACE FUNCTION public.generate_next_id(_entity TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  result TEXT;
BEGIN
  UPDATE public.id_number_settings
     SET next_value = next_value + 1, updated_at = now()
   WHERE entity = _entity
   RETURNING prefix, padding, next_value - 1 AS used, separator INTO s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No id_number_settings row for entity %', _entity;
  END IF;

  IF s.prefix IS NULL OR s.prefix = '' THEN
    result := lpad(s.used::text, s.padding, '0');
  ELSE
    result := s.prefix || s.separator || lpad(s.used::text, s.padding, '0');
  END IF;
  RETURN result;
END $$;

-- 2) Points (تشویق و اخطاری) for teachers and staff
CREATE TABLE IF NOT EXISTS public.staff_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')),
  teacher_id UUID,
  staff_id UUID,
  point_type TEXT NOT NULL CHECK (point_type IN ('reward','warning')),
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read staff_points" ON public.staff_points
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "admin manage staff_points" ON public.staff_points
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

CREATE TRIGGER trg_staff_points_updated
  BEFORE UPDATE ON public.staff_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_staff_points_teacher ON public.staff_points(teacher_id);
CREATE INDEX IF NOT EXISTS idx_staff_points_staff ON public.staff_points(staff_id);