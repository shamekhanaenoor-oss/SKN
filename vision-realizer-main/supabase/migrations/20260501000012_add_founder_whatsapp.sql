-- اضافه کردن شماره واتساپ موسس به پروفایل مکتب
ALTER TABLE public.school_profile
  ADD COLUMN IF NOT EXISTS founder_whatsapp TEXT;
