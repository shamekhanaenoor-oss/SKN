-- اضافه کردن ID کتاب و یونیفورم به جدول payments برای برگرداندن موجودی هنگام حذف
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS book_id     UUID REFERENCES public.library_books(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uniform_id  UUID REFERENCES public.uniforms(id) ON DELETE SET NULL;
