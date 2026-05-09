ALTER TABLE public.book_loans ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS public.user_usernames (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_usernames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read usernames" ON public.user_usernames FOR SELECT USING (true);