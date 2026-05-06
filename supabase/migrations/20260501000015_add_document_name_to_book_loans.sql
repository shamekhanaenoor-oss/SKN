-- اضافه کردن فیلد نام اسناد به جدول book_loans
ALTER TABLE public.book_loans
  ADD COLUMN IF NOT EXISTS document_name TEXT;
