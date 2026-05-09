CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')),
  teacher_id UUID, staff_id UUID,
  pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
  pay_period_year INTEGER NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  bonus NUMERIC NOT NULL DEFAULT 0,
  deduction NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT, recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accountant manage salary_payments" ON public.salary_payments FOR ALL TO authenticated
USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
WITH CHECK (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));
CREATE POLICY "staff read salary_payments" ON public.salary_payments FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER set_updated_at_salary_payments BEFORE UPDATE ON public.salary_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.uniforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, size TEXT, gender TEXT, color TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0, description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage uniforms" ON public.uniforms FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));
CREATE POLICY "staff read uniforms" ON public.uniforms FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER set_updated_at_uniforms BEFORE UPDATE ON public.uniforms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.id_number_settings (
  entity TEXT PRIMARY KEY CHECK (entity = ANY (ARRAY['student','teacher','staff','discount'])),
  prefix TEXT NOT NULL DEFAULT '', padding INTEGER NOT NULL DEFAULT 3,
  next_value INTEGER NOT NULL DEFAULT 1, separator TEXT NOT NULL DEFAULT '-',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.id_number_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read id_number_settings" ON public.id_number_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage id_number_settings" ON public.id_number_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
INSERT INTO public.id_number_settings (entity, prefix, padding, next_value) VALUES
  ('student','STD',3,1),('teacher','TCH',3,1),('staff','STF',3,1),('discount','DSC',3,1);

CREATE OR REPLACE FUNCTION public.generate_next_id(_entity TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; result TEXT;
BEGIN
  UPDATE public.id_number_settings
     SET next_value = next_value + 1, updated_at = now()
   WHERE entity = _entity
   RETURNING prefix, padding, next_value - 1 AS used, separator INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION 'No id_number_settings row for entity %', _entity; END IF;
  IF s.prefix IS NULL OR s.prefix = '' THEN
    result := lpad(s.used::text, s.padding, '0');
  ELSE
    result := s.prefix || s.separator || lpad(s.used::text, s.padding, '0');
  END IF;
  RETURN result;
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_next_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_id(text) TO service_role;

CREATE TABLE public.staff_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')),
  teacher_id UUID, staff_id UUID,
  point_type TEXT NOT NULL CHECK (point_type IN ('reward','warning')),
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read staff_points" ON public.staff_points FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage staff_points" ON public.staff_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER trg_staff_points_updated BEFORE UPDATE ON public.staff_points FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_staff_points_teacher ON public.staff_points(teacher_id);
CREATE INDEX idx_staff_points_staff ON public.staff_points(staff_id);

CREATE TABLE public.class_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL, fee_type_id UUID NOT NULL,
  amount NUMERIC, is_active BOOLEAN NOT NULL DEFAULT true, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, fee_type_id)
);
ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage class_fees" ON public.class_fees FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));
CREATE POLICY "staff read class_fees" ON public.class_fees FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER class_fees_updated_at BEFORE UPDATE ON public.class_fees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.student_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_code TEXT, student_id UUID NOT NULL, fee_type_id UUID,
  discount_type TEXT NOT NULL DEFAULT 'amount',
  value NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE, end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  transport_discount_type TEXT CHECK (transport_discount_type IN ('amount','percent')),
  transport_discount_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage student_discounts" ON public.student_discounts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'accountant'));
CREATE POLICY "staff read student_discounts" ON public.student_discounts FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER student_discounts_updated_at BEFORE UPDATE ON public.student_discounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.students
  ADD COLUMN enrollment_type TEXT NOT NULL DEFAULT 'new' CHECK (enrollment_type IN ('new','transfer','returning')),
  ADD COLUMN father_phone TEXT,
  ADD COLUMN mother_phone TEXT,
  ADD COLUMN whatsapp_number TEXT;
UPDATE public.students SET father_phone = phone WHERE father_phone IS NULL AND phone IS NOT NULL;

ALTER TABLE public.classes ADD COLUMN fee_amount NUMERIC(12,2);

ALTER TABLE public.payments
  ADD COLUMN payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12),
  ADD COLUMN payment_year INTEGER,
  ADD COLUMN transport_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN book_sale_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN uniform_sale_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN book_id UUID REFERENCES public.library_books(id) ON DELETE SET NULL,
  ADD COLUMN uniform_id UUID REFERENCES public.uniforms(id) ON DELETE SET NULL,
  ADD COLUMN id_card_fee NUMERIC NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_payments_student_month_year
  ON public.payments (student_id, payment_month, payment_year)
  WHERE payment_month IS NOT NULL AND payment_year IS NOT NULL;

ALTER TABLE public.salary_payments ADD COLUMN tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE public.school_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT '',
  address TEXT, phone TEXT,
  maarif_license TEXT, aisa_license TEXT, sanafi_license TEXT,
  school_code TEXT, founder_whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read school_profile" ON public.school_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated manage school_profile" ON public.school_profile FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER school_profile_set_updated_at BEFORE UPDATE ON public.school_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.school_profile (school_name) VALUES ('');

ALTER TABLE public.uniforms ADD COLUMN purchase_price NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE public.uniform_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uniform_id UUID NOT NULL REFERENCES public.uniforms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT, sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uniform_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read uniform_sales" ON public.uniform_sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage uniform_sales" ON public.uniform_sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER uniform_sales_set_updated_at BEFORE UPDATE ON public.uniform_sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL, category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_to TEXT, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();