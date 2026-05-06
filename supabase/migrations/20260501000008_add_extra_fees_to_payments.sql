-- اضافه کردن فیلدهای اضافی به جدول payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transport_fee      NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS book_sale_amount   NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uniform_sale_amount NUMERIC NOT NULL DEFAULT 0;
