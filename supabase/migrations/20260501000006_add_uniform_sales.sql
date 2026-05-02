-- اضافه کردن قیمت خرید به یونیفورم‌ها
ALTER TABLE public.uniforms
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC NOT NULL DEFAULT 0;

-- جدول فروشات یونیفورم
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

CREATE POLICY "staff read uniform_sales" ON public.uniform_sales
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "admin manage uniform_sales" ON public.uniform_sales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP TRIGGER IF EXISTS uniform_sales_set_updated_at ON public.uniform_sales;
CREATE TRIGGER uniform_sales_set_updated_at
  BEFORE UPDATE ON public.uniform_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
