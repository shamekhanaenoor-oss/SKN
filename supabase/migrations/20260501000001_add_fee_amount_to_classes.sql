-- اضافه کردن فیلد فیس مستقیم به جدول صنف‌ها
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2);
