-- اضافه کردن نوع ثبت‌نام به جدول شاگردان
-- سه نوع: جدید، سه‌پارچه (انتقالی از مکتب دیگر)، مربوطه (شاگرد قبلی همین مکتب)

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS enrollment_type TEXT NOT NULL DEFAULT 'new'
  CHECK (enrollment_type IN ('new', 'transfer', 'returning'));

COMMENT ON COLUMN public.students.enrollment_type IS
  'new=جدید | transfer=سه‌پارچه (از مکتب دیگر) | returning=مربوطه (شاگرد قبلی)';
