-- اضافه کردن فیلدهای تخفیف ترانسپورت به جدول student_discounts
ALTER TABLE public.student_discounts
  ADD COLUMN IF NOT EXISTS transport_discount_type TEXT CHECK (transport_discount_type IN ('amount','percent')),
  ADD COLUMN IF NOT EXISTS transport_discount_value NUMERIC DEFAULT 0;
