-- اضافه کردن فیلدهای شماره تلفن به جدول شاگردان
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS father_phone TEXT,
  ADD COLUMN IF NOT EXISTS mother_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- کپی داده‌های قدیمی phone به father_phone
UPDATE public.students 
SET father_phone = phone 
WHERE father_phone IS NULL AND phone IS NOT NULL;
