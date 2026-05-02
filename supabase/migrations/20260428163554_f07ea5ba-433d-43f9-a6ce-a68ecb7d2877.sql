-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin','principal','teacher','accountant','librarian','parent','student');
CREATE TYPE public.gender_type AS ENUM ('male','female');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused','sick');
CREATE TYPE public.payment_status AS ENUM ('pending','partial','paid','overdue','cancelled');
CREATE TYPE public.fee_frequency AS ENUM ('one_time','monthly','quarterly','semester','yearly');
CREATE TYPE public.term_type AS ENUM ('first','second','final','quiz','midterm','assignment');
CREATE TYPE public.exam_type AS ENUM ('monthly','midterm','final','quiz','annual');
CREATE TYPE public.employment_status AS ENUM ('active','inactive','on_leave','terminated');
CREATE TYPE public.event_type AS ENUM ('academic','cultural','sport','exam','holiday','meeting','other');
CREATE TYPE public.discipline_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.book_status AS ENUM ('available','borrowed','reserved','lost','damaged');

-- ============================================
-- PROFILES & ROLES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'fa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','principal','teacher','accountant','librarian')) $$;

-- RLS: profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid()=id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- RLS: user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();