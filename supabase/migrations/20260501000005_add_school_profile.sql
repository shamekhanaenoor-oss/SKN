-- جدول پروفایل مکتب (یک ردیف ثابت)
CREATE TABLE IF NOT EXISTS public.school_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT '',
  address TEXT,
  phone TEXT,
  maarif_license TEXT,
  aisa_license TEXT,
  sanafi_license TEXT,
  school_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read school_profile" ON public.school_profile;
CREATE POLICY "staff read school_profile" ON public.school_profile
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admin manage school_profile" ON public.school_profile;
CREATE POLICY "admin manage school_profile" ON public.school_profile
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP TRIGGER IF EXISTS school_profile_set_updated_at ON public.school_profile;
CREATE TRIGGER school_profile_set_updated_at
  BEFORE UPDATE ON public.school_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- یک ردیف پیش‌فرض
INSERT INTO public.school_profile (school_name) VALUES ('') ON CONFLICT DO NOTHING;
