-- اصلاح RLS برای school_profile — همه کاربران authenticated می‌توانند read/write کنند
DROP POLICY IF EXISTS "staff read school_profile" ON public.school_profile;
DROP POLICY IF EXISTS "admin manage school_profile" ON public.school_profile;

-- همه کاربران لاگین‌شده می‌توانند پروفایل مکتب را بخوانند و ویرایش کنند
CREATE POLICY "authenticated read school_profile" ON public.school_profile
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated manage school_profile" ON public.school_profile
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
