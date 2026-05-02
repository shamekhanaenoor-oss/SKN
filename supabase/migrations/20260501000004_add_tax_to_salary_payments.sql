-- اضافه کردن ستون مالیه به جدول پرداخت معاشات
ALTER TABLE public.salary_payments
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
