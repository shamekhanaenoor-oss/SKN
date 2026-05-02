CREATE TABLE IF NOT EXISTS public.class_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL,
  fee_type_id UUID NOT NULL,
  amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, fee_type_id)
);

ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage class_fees" ON public.class_fees
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));

CREATE POLICY "staff read class_fees" ON public.class_fees
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE TRIGGER class_fees_updated_at
  BEFORE UPDATE ON public.class_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_code TEXT,
  student_id UUID NOT NULL,
  fee_type_id UUID,
  discount_type TEXT NOT NULL DEFAULT 'amount',
  value NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage student_discounts" ON public.student_discounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal') OR has_role(auth.uid(),'accountant'));

CREATE POLICY "staff read student_discounts" ON public.student_discounts
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE TRIGGER student_discounts_updated_at
  BEFORE UPDATE ON public.student_discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();