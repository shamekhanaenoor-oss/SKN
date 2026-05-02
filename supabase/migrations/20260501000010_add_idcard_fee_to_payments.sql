-- اضافه کردن فیس آی‌دی کارت به جدول payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS id_card_fee NUMERIC NOT NULL DEFAULT 0;
