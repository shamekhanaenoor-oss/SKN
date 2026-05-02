-- اضافه کردن ماه پرداخت به جدول پرداخت‌ها
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS payment_year INTEGER;

-- unique constraint: هر شاگرد در هر ماه/سال فقط یک پرداخت داشته باشد
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_student_month_year
  ON public.payments (student_id, payment_month, payment_year)
  WHERE payment_month IS NOT NULL AND payment_year IS NOT NULL;
