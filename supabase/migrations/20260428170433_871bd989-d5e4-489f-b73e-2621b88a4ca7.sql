-- Salary payments table
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')),
  teacher_id UUID,
  staff_id UUID,
  pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
  pay_period_year INTEGER NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  bonus NUMERIC NOT NULL DEFAULT 0,
  deduction NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant manage salary_payments" ON public.salary_payments
FOR ALL TO authenticated
USING (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
WITH CHECK (has_role(auth.uid(),'accountant') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));

CREATE POLICY "staff read salary_payments" ON public.salary_payments
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

CREATE TRIGGER set_updated_at_salary_payments
BEFORE UPDATE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();