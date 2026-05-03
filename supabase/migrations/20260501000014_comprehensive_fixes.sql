-- ===== اصلاح جامع =====

-- 1. اصلاح RLS برای school_profile
DROP POLICY IF EXISTS "staff read school_profile" ON public.school_profile;
DROP POLICY IF EXISTS "admin manage school_profile" ON public.school_profile;
DROP POLICY IF EXISTS "authenticated read school_profile" ON public.school_profile;
DROP POLICY IF EXISTS "authenticated manage school_profile" ON public.school_profile;

CREATE POLICY "authenticated read school_profile" ON public.school_profile
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated manage school_profile" ON public.school_profile
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. اضافه کردن founder_whatsapp اگر وجود ندارد
ALTER TABLE public.school_profile
  ADD COLUMN IF NOT EXISTS founder_whatsapp TEXT;

-- 3. اضافه کردن فیلدهای payments اگر وجود ندارند
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transport_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS book_sale_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uniform_sale_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS id_card_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES public.library_books(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uniform_id UUID REFERENCES public.uniforms(id) ON DELETE SET NULL;

-- 4. اضافه کردن فیلدهای تخفیف ترانسپورت اگر وجود ندارند
ALTER TABLE public.student_discounts
  ADD COLUMN IF NOT EXISTS transport_discount_type TEXT CHECK (transport_discount_type IN ('amount','percent')),
  ADD COLUMN IF NOT EXISTS transport_discount_value NUMERIC DEFAULT 0;

-- 5. اضافه کردن purchase_price به uniforms اگر وجود ندارد
ALTER TABLE public.uniforms
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC NOT NULL DEFAULT 0;

-- 6. ساختن جدول expenses اگر وجود ندارد
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_to TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read expenses" ON public.expenses;
DROP POLICY IF EXISTS "admin manage expenses" ON public.expenses;

CREATE POLICY "authenticated read expenses" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. اضافه کردن uniform_sales اگر وجود ندارد
CREATE TABLE IF NOT EXISTS public.uniform_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uniform_id UUID NOT NULL REFERENCES public.uniforms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uniform_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read uniform_sales" ON public.uniform_sales;
DROP POLICY IF EXISTS "admin manage uniform_sales" ON public.uniform_sales;

CREATE POLICY "authenticated read uniform_sales" ON public.uniform_sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated manage uniform_sales" ON public.uniform_sales
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. اطمینان از وجود ردیف پیش‌فرض در school_profile
INSERT INTO public.school_profile (school_name)
SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.school_profile);
