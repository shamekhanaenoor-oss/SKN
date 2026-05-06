-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM - ALL MIGRATIONS (FINAL CLEAN)
-- این فایل را یک‌بار در Supabase SQL Editor اجرا کنید
-- ============================================================

-- ENUMS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','principal','teacher','accountant','librarian','parent','student'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gender_type AS ENUM ('male','female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused','sick'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('pending','partial','paid','overdue','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fee_frequency AS ENUM ('one_time','monthly','quarterly','semester','yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.term_type AS ENUM ('first','second','final','quiz','midterm','assignment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.exam_type AS ENUM ('monthly','midterm','final','quiz','annual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.employment_status AS ENUM ('active','inactive','on_leave','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.event_type AS ENUM ('academic','cultural','sport','exam','holiday','meeting','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.discipline_severity AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.book_status AS ENUM ('available','borrowed','reserved','lost','damaged'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','principal','teacher','accountant','librarian')) $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone'); RETURN NEW; END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT, phone TEXT, avatar_url TEXT, preferred_language TEXT DEFAULT 'fa', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.user_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, role));
CREATE TABLE IF NOT EXISTS public.academic_years (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, start_date DATE NOT NULL, end_date DATE NOT NULL, is_current BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.grades (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, level INT NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.classes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, grade_id UUID REFERENCES public.grades(id) ON DELETE RESTRICT, academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE RESTRICT, section TEXT, capacity INT DEFAULT 40, room_number TEXT, homeroom_teacher_id UUID, fee_amount NUMERIC(12,2), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.teachers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, employee_code TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, father_name TEXT, national_id TEXT, gender public.gender_type, phone TEXT, email TEXT, address TEXT, qualification TEXT, specialization TEXT, hire_date DATE, salary NUMERIC(12,2), status public.employment_status DEFAULT 'active', photo_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.students (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, student_code TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, father_name TEXT, grandfather_name TEXT, gender public.gender_type, date_of_birth DATE, national_id TEXT, tazkira_number TEXT, phone TEXT, father_phone TEXT, mother_phone TEXT, whatsapp_number TEXT, address TEXT, province TEXT, district TEXT, village TEXT, blood_group TEXT, admission_date DATE, current_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, photo_url TEXT, is_active BOOLEAN NOT NULL DEFAULT true, enrollment_type TEXT NOT NULL DEFAULT 'new' CHECK (enrollment_type IN ('new','transfer','returning')), notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.parents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, full_name TEXT NOT NULL, national_id TEXT, relation TEXT, occupation TEXT, phone TEXT NOT NULL, alt_phone TEXT, email TEXT, address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.student_parents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE, is_primary BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, parent_id));
CREATE TABLE IF NOT EXISTS public.student_enrollments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT, academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT, enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE, status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, class_id, academic_year_id));
CREATE TABLE IF NOT EXISTS public.subjects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, code TEXT UNIQUE, grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL, total_marks INT DEFAULT 100, pass_marks INT DEFAULT 50, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.teaching_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE, class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE, academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(teacher_id, class_id, subject_id, academic_year_id));
CREATE TABLE IF NOT EXISTS public.schedules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE, teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL, day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), start_time TIME NOT NULL, end_time TIME NOT NULL, room_number TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, date DATE NOT NULL, status public.attendance_status NOT NULL DEFAULT 'present', notes TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, date));
CREATE TABLE IF NOT EXISTS public.exams (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, exam_type public.exam_type NOT NULL DEFAULT 'monthly', academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL, class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, exam_date DATE NOT NULL, total_marks INT DEFAULT 100, duration_minutes INT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.exam_results (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE, student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, marks_obtained NUMERIC(6,2) NOT NULL DEFAULT 0, grade TEXT, remarks TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(exam_id, student_id));
CREATE TABLE IF NOT EXISTS public.report_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL, term public.term_type NOT NULL, total_marks NUMERIC(8,2), obtained_marks NUMERIC(8,2), percentage NUMERIC(5,2), rank_in_class INT, remarks TEXT, issued_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.fee_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, frequency public.fee_frequency NOT NULL DEFAULT 'monthly', grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL, description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.library_books (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, author TEXT, isbn TEXT, category TEXT, publisher TEXT, publication_year INT, total_copies INT NOT NULL DEFAULT 1, available_copies INT NOT NULL DEFAULT 1, shelf_location TEXT, status public.book_status DEFAULT 'available', cover_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.uniforms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, size TEXT, gender TEXT, color TEXT, price NUMERIC NOT NULL DEFAULT 0, purchase_price NUMERIC NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, description TEXT, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL, amount NUMERIC(12,2) NOT NULL, paid_amount NUMERIC(12,2) DEFAULT 0, payment_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE, status public.payment_status NOT NULL DEFAULT 'pending', payment_method TEXT, receipt_number TEXT UNIQUE, payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12), payment_year INTEGER, transport_fee NUMERIC NOT NULL DEFAULT 0, book_sale_amount NUMERIC NOT NULL DEFAULT 0, uniform_sale_amount NUMERIC NOT NULL DEFAULT 0, id_card_fee NUMERIC NOT NULL DEFAULT 0, book_id UUID REFERENCES public.library_books(id) ON DELETE SET NULL, uniform_id UUID REFERENCES public.uniforms(id) ON DELETE SET NULL, notes TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_student_month_year ON public.payments (student_id, payment_month, payment_year) WHERE payment_month IS NOT NULL AND payment_year IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.staff (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, employee_code TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, position TEXT NOT NULL, department TEXT, gender public.gender_type, phone TEXT, email TEXT, address TEXT, hire_date DATE, salary NUMERIC(12,2), status public.employment_status DEFAULT 'active', photo_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.book_loans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE, borrower_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL, borrower_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL, loan_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE NOT NULL, return_date DATE, status TEXT NOT NULL DEFAULT 'active', fine_amount NUMERIC(8,2) DEFAULT 0, document_name TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.transport_routes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_name TEXT NOT NULL, vehicle_number TEXT, driver_name TEXT, driver_phone TEXT, capacity INT DEFAULT 30, monthly_fee NUMERIC(12,2), pickup_areas TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.student_transport (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE, pickup_point TEXT, start_date DATE DEFAULT CURRENT_DATE, end_date DATE, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(student_id, route_id));
CREATE TABLE IF NOT EXISTS public.events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT, event_type public.event_type DEFAULT 'other', start_date TIMESTAMPTZ NOT NULL, end_date TIMESTAMPTZ, location TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.announcements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, content TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'all', target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, is_pinned BOOLEAN DEFAULT false, published_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.discipline_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, incident_date DATE NOT NULL DEFAULT CURRENT_DATE, description TEXT NOT NULL, severity public.discipline_severity NOT NULL DEFAULT 'low', action_taken TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.health_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, visit_date DATE NOT NULL DEFAULT CURRENT_DATE, blood_group TEXT, allergies TEXT, chronic_conditions TEXT, vaccinations TEXT, notes TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, action TEXT NOT NULL, entity_type TEXT, entity_id UUID, metadata JSONB, ip_address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.salary_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')), teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL, staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL, pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12), pay_period_year INTEGER NOT NULL, base_salary NUMERIC NOT NULL DEFAULT 0, bonus NUMERIC NOT NULL DEFAULT 0, deduction NUMERIC NOT NULL DEFAULT 0, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, net_amount NUMERIC NOT NULL DEFAULT 0, payment_date DATE NOT NULL DEFAULT CURRENT_DATE, payment_method TEXT, status TEXT NOT NULL DEFAULT 'paid', notes TEXT, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.uniform_sales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), uniform_id UUID NOT NULL REFERENCES public.uniforms(id) ON DELETE CASCADE, student_id UUID REFERENCES public.students(id) ON DELETE SET NULL, quantity INTEGER NOT NULL DEFAULT 1, unit_price NUMERIC NOT NULL DEFAULT 0, total_amount NUMERIC NOT NULL DEFAULT 0, notes TEXT, sale_date DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.class_fees (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE, amount NUMERIC, is_active BOOLEAN NOT NULL DEFAULT true, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(class_id, fee_type_id));
CREATE TABLE IF NOT EXISTS public.student_discounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), discount_code TEXT, student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL, discount_type TEXT NOT NULL DEFAULT 'amount', value NUMERIC NOT NULL DEFAULT 0, reason TEXT, start_date DATE NOT NULL DEFAULT CURRENT_DATE, end_date DATE, is_active BOOLEAN NOT NULL DEFAULT true, transport_discount_type TEXT CHECK (transport_discount_type IN ('amount','percent')), transport_discount_value NUMERIC DEFAULT 0, approved_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.staff_points (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher','staff')), teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL, staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL, point_type TEXT NOT NULL CHECK (point_type IN ('reward','warning')), points INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL, date DATE NOT NULL DEFAULT CURRENT_DATE, recorded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.id_number_settings (entity TEXT PRIMARY KEY CHECK (entity IN ('student','teacher','staff','discount')), prefix TEXT NOT NULL DEFAULT '', padding INTEGER NOT NULL DEFAULT 3, next_value INTEGER NOT NULL DEFAULT 1, separator TEXT NOT NULL DEFAULT '-', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.school_profile (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_name TEXT NOT NULL DEFAULT '', address TEXT, phone TEXT, founder_whatsapp TEXT, maarif_license TEXT, aisa_license TEXT, sanafi_license TEXT, school_code TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), expense_date DATE NOT NULL DEFAULT CURRENT_DATE, title TEXT NOT NULL, category TEXT, amount NUMERIC NOT NULL DEFAULT 0, paid_to TEXT, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- FK
DO $$ BEGIN ALTER TABLE public.classes ADD CONSTRAINT classes_homeroom_teacher_fk FOREIGN KEY (homeroom_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(current_class_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON public.student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','academic_years','grades','classes','teachers','students','parents','subjects','exams','fee_types','payments','staff','library_books','transport_routes','events','announcements','health_records','salary_payments','uniforms','uniform_sales','class_fees','student_discounts','staff_points','expenses','school_profile']) LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t||'_set_updated_at') || ' ON public.' || quote_ident(t);
    EXECUTE 'CREATE TRIGGER ' || quote_ident(t||'_set_updated_at') || ' BEFORE UPDATE ON public.' || quote_ident(t) || ' FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END LOOP;
END $$;

-- ENABLE RLS
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','user_roles','academic_years','grades','classes','teachers','students','parents','student_parents','student_enrollments','subjects','teaching_assignments','schedules','attendance','exams','exam_results','report_cards','fee_types','payments','staff','library_books','book_loans','transport_routes','student_transport','events','announcements','discipline_records','health_records','activity_logs','salary_payments','uniforms','uniform_sales','class_fees','student_discounts','staff_points','id_number_settings','school_profile','expenses']) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================
-- RLS POLICIES — همه DROP قبل از CREATE
-- ============================================================

-- profiles: حذف همه و ایجاد مجدد
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='profiles' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles'; END LOOP; END $$;
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid()=id);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id);
CREATE POLICY "profiles_insert_own"   ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_all_admin"    ON public.profiles FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: حذف همه و ایجاد مجدد (همه authenticated)
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='user_roles' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_roles'; END LOOP; END $$;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (true);

-- academic_years, grades, classes, subjects, fee_types, transport_routes, library_books, events, announcements
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['academic_years','grades','classes','subjects','fee_types','transport_routes','library_books','events','announcements']) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "staff read '  || t || '" ON public.' || quote_ident(t);
    EXECUTE 'DROP POLICY IF EXISTS "admin manage '|| t || '" ON public.' || quote_ident(t);
    EXECUTE 'CREATE POLICY "staff read '  || t || '" ON public.' || quote_ident(t) || ' FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))';
    EXECUTE 'CREATE POLICY "admin manage '|| t || '" ON public.' || quote_ident(t) || ' FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal'')) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal''))';
  END LOOP;
END $$;

DROP POLICY IF EXISTS "staff read teachers"   ON public.teachers; DROP POLICY IF EXISTS "admin manage teachers" ON public.teachers; DROP POLICY IF EXISTS "teacher read self" ON public.teachers;
CREATE POLICY "staff read teachers"   ON public.teachers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage teachers" ON public.teachers FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "teacher read self"     ON public.teachers FOR SELECT TO authenticated USING (auth.uid()=user_id);

DROP POLICY IF EXISTS "staff read staff"   ON public.staff; DROP POLICY IF EXISTS "admin manage staff" ON public.staff;
CREATE POLICY "staff read staff"   ON public.staff FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage staff" ON public.staff FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read students"   ON public.students; DROP POLICY IF EXISTS "student read self" ON public.students; DROP POLICY IF EXISTS "parent read children" ON public.students; DROP POLICY IF EXISTS "admin manage students" ON public.students;
CREATE POLICY "staff read students"   ON public.students FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "student read self"     ON public.students FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "parent read children"  ON public.students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id WHERE sp.student_id=students.id AND p.user_id=auth.uid()));
CREATE POLICY "admin manage students" ON public.students FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read parents"   ON public.parents; DROP POLICY IF EXISTS "parent read self" ON public.parents; DROP POLICY IF EXISTS "admin manage parents" ON public.parents;
CREATE POLICY "staff read parents"   ON public.parents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "parent read self"     ON public.parents FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "admin manage parents" ON public.parents FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['student_parents','student_enrollments','teaching_assignments','schedules']) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "staff read '  || t || '" ON public.' || quote_ident(t);
    EXECUTE 'DROP POLICY IF EXISTS "admin manage '|| t || '" ON public.' || quote_ident(t);
    EXECUTE 'CREATE POLICY "staff read '  || t || '" ON public.' || quote_ident(t) || ' FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))';
    EXECUTE 'CREATE POLICY "admin manage '|| t || '" ON public.' || quote_ident(t) || ' FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal'')) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal''))';
  END LOOP;
END $$;

DROP POLICY IF EXISTS "staff read attendance" ON public.attendance; DROP POLICY IF EXISTS "teachers manage attendance" ON public.attendance; DROP POLICY IF EXISTS "student read own attendance" ON public.attendance; DROP POLICY IF EXISTS "parent read child attendance" ON public.attendance;
CREATE POLICY "staff read attendance"        ON public.attendance FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage attendance"   ON public.attendance FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own attendance"  ON public.attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=attendance.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child attendance" ON public.attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id WHERE sp.student_id=attendance.student_id AND p.user_id=auth.uid()));

DROP POLICY IF EXISTS "staff read exams" ON public.exams; DROP POLICY IF EXISTS "teachers manage exams" ON public.exams;
CREATE POLICY "staff read exams"      ON public.exams FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage exams" ON public.exams FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read exam_results" ON public.exam_results; DROP POLICY IF EXISTS "teachers manage exam_results" ON public.exam_results; DROP POLICY IF EXISTS "student read own results" ON public.exam_results; DROP POLICY IF EXISTS "parent read child results" ON public.exam_results;
CREATE POLICY "staff read exam_results"      ON public.exam_results FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage exam_results" ON public.exam_results FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own results"     ON public.exam_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=exam_results.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child results"    ON public.exam_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id WHERE sp.student_id=exam_results.student_id AND p.user_id=auth.uid()));

DROP POLICY IF EXISTS "staff read report_cards" ON public.report_cards; DROP POLICY IF EXISTS "admin manage report_cards" ON public.report_cards; DROP POLICY IF EXISTS "student read own report" ON public.report_cards; DROP POLICY IF EXISTS "parent read child report" ON public.report_cards;
CREATE POLICY "staff read report_cards"   ON public.report_cards FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage report_cards" ON public.report_cards FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "student read own report"   ON public.report_cards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=report_cards.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child report"  ON public.report_cards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id WHERE sp.student_id=report_cards.student_id AND p.user_id=auth.uid()));

DROP POLICY IF EXISTS "staff read payments" ON public.payments; DROP POLICY IF EXISTS "accountant manage payments" ON public.payments; DROP POLICY IF EXISTS "student read own payments" ON public.payments; DROP POLICY IF EXISTS "parent read child payments" ON public.payments;
CREATE POLICY "staff read payments"        ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "accountant manage payments" ON public.payments FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own payments"  ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=payments.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id WHERE sp.student_id=payments.student_id AND p.user_id=auth.uid()));

DROP POLICY IF EXISTS "staff read book_loans" ON public.book_loans; DROP POLICY IF EXISTS "librarian manage book_loans" ON public.book_loans;
CREATE POLICY "staff read book_loans"       ON public.book_loans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "librarian manage book_loans" ON public.book_loans FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'librarian') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'librarian') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "staff read student_transport" ON public.student_transport; DROP POLICY IF EXISTS "admin manage student_transport" ON public.student_transport;
CREATE POLICY "staff read student_transport"   ON public.student_transport FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage student_transport" ON public.student_transport FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['discipline_records','health_records']) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "staff read '   || t || '" ON public.' || quote_ident(t);
    EXECUTE 'DROP POLICY IF EXISTS "staff manage ' || t || '" ON public.' || quote_ident(t);
    EXECUTE 'CREATE POLICY "staff read '   || t || '" ON public.' || quote_ident(t) || ' FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))';
    EXECUTE 'CREATE POLICY "staff manage ' || t || '" ON public.' || quote_ident(t) || ' FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal'') OR public.has_role(auth.uid(),''teacher'')) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''principal'') OR public.has_role(auth.uid(),''teacher''))';
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admin view activity_logs" ON public.activity_logs; DROP POLICY IF EXISTS "auth insert activity_logs" ON public.activity_logs;
CREATE POLICY "admin view activity_logs"  ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

DROP POLICY IF EXISTS "staff read salary_payments" ON public.salary_payments; DROP POLICY IF EXISTS "accountant manage salary_payments" ON public.salary_payments;
CREATE POLICY "staff read salary_payments"        ON public.salary_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "accountant manage salary_payments" ON public.salary_payments FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read uniforms" ON public.uniforms; DROP POLICY IF EXISTS "admin manage uniforms" ON public.uniforms;
CREATE POLICY "staff read uniforms"   ON public.uniforms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage uniforms" ON public.uniforms FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read uniform_sales" ON public.uniform_sales; DROP POLICY IF EXISTS "admin manage uniform_sales" ON public.uniform_sales;
CREATE POLICY "staff read uniform_sales"   ON public.uniform_sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage uniform_sales" ON public.uniform_sales FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read class_fees" ON public.class_fees; DROP POLICY IF EXISTS "admin manage class_fees" ON public.class_fees;
CREATE POLICY "staff read class_fees"   ON public.class_fees FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage class_fees" ON public.class_fees FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read student_discounts" ON public.student_discounts; DROP POLICY IF EXISTS "admin manage student_discounts" ON public.student_discounts;
CREATE POLICY "staff read student_discounts"   ON public.student_discounts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage student_discounts" ON public.student_discounts FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));

DROP POLICY IF EXISTS "staff read staff_points" ON public.staff_points; DROP POLICY IF EXISTS "admin manage staff_points" ON public.staff_points;
CREATE POLICY "staff read staff_points"   ON public.staff_points FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage staff_points" ON public.staff_points FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DROP POLICY IF EXISTS "staff read id_number_settings" ON public.id_number_settings; DROP POLICY IF EXISTS "admin manage id_number_settings" ON public.id_number_settings;
CREATE POLICY "staff read id_number_settings"   ON public.id_number_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage id_number_settings" ON public.id_number_settings FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

-- school_profile: همه authenticated
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='school_profile' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_profile'; END LOOP; END $$;
CREATE POLICY "sp_select" ON public.school_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "sp_insert" ON public.school_profile FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sp_update" ON public.school_profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sp_delete" ON public.school_profile FOR DELETE TO authenticated USING (true);

-- expenses: همه authenticated
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE tablename='expenses' AND schemaname='public' LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.expenses'; END LOOP; END $$;
CREATE POLICY "exp_select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exp_update" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exp_delete" ON public.expenses FOR DELETE TO authenticated USING (true);

-- ============================================================
-- INITIAL DATA
-- ============================================================
INSERT INTO public.id_number_settings (entity, prefix, padding, next_value, separator)
VALUES ('student','STD',3,1,'-'),('teacher','TCH',3,1,'-'),('staff','STF',3,1,'-'),('discount','DSC',3,1,'-')
ON CONFLICT (entity) DO NOTHING;

INSERT INTO public.school_profile (school_name) SELECT '' WHERE NOT EXISTS (SELECT 1 FROM public.school_profile);

-- ============================================================
-- END OF SCRIPT
-- ============================================================
-- اجازه دادن به همه staff برای دیدن همه profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "admins view all profiles" ON public.profiles;

CREATE POLICY "staff view all profiles" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "staff update profiles" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- اضافه کردن is_active اگر وجود ندارد
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
-- فعال کردن pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ایجاد function برای ساختن کاربر
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_roles TEXT[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at,
    aud, role, instance_id
  ) VALUES (
    gen_random_uuid(),
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', p_full_name),
    now(), now(),
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000'
  ) RETURNING id INTO v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  SELECT v_user_id, unnest(p_roles)::public.app_role;

  INSERT INTO public.profiles (id, full_name, is_active)
  VALUES (v_user_id, p_full_name, true)
  ON CONFLICT (id) DO UPDATE SET full_name = p_full_name;

  RETURN v_user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;
-- فعال کردن pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- اضافه کردن is_active به profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- اصلاح RLS profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "staff view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "staff update profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (true);
-- جدول نام کاربری‌ها
CREATE TABLE IF NOT EXISTS public.user_usernames (
  username TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_usernames ENABLE ROW LEVEL SECURITY;

-- همه می‌توانند بخوانند (برای login)
CREATE POLICY "anyone read usernames" ON public.user_usernames 
  FOR SELECT TO anon, authenticated USING (true);

-- authenticated می‌توانند اضافه/ویرایش کنند
CREATE POLICY "auth manage usernames" ON public.user_usernames 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- اضافه کردن founder
INSERT INTO public.user_usernames (username, email) 
VALUES ('founder', 'founder@admin.local') 
ON CONFLICT DO NOTHING;

-- فعال کردن pgcrypto برای ایجاد کاربر
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- function برای ایجاد کاربر
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_roles TEXT[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at,
    aud, role, instance_id
  ) VALUES (
    gen_random_uuid(),
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', p_full_name),
    now(), now(),
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000'
  ) RETURNING id INTO v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  SELECT v_user_id, unnest(p_roles)::public.app_role;

  INSERT INTO public.profiles (id, full_name, is_active)
  VALUES (v_user_id, p_full_name, true)
  ON CONFLICT (id) DO UPDATE SET full_name = p_full_name;

  RETURN v_user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;

-- اضافه کردن is_active به profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- RLS profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "staff view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "staff update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (true);
