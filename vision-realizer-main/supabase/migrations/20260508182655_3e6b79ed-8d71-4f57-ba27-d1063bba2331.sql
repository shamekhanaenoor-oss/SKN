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

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, phone TEXT, avatar_url TEXT,
  preferred_language TEXT DEFAULT 'fa',
  is_active BOOLEAN NOT NULL DEFAULT true,
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','principal','teacher','accountant','librarian')) $$;

CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid()=id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()=id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL, end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, level INT NOT NULL, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_id UUID REFERENCES public.grades(id) ON DELETE RESTRICT,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  section TEXT, capacity INT DEFAULT 40, room_number TEXT,
  homeroom_teacher_id UUID,
  fee_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL, father_name TEXT, national_id TEXT,
  gender public.gender_type, phone TEXT, email TEXT, address TEXT,
  qualification TEXT, specialization TEXT, hire_date DATE,
  salary NUMERIC(12,2),
  status public.employment_status DEFAULT 'active',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL, father_name TEXT, grandfather_name TEXT,
  gender public.gender_type, date_of_birth DATE,
  national_id TEXT, tazkira_number TEXT, phone TEXT, address TEXT,
  province TEXT, district TEXT, village TEXT, blood_group TEXT,
  admission_date DATE,
  current_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, notes TEXT,
  enrollment_type TEXT NOT NULL DEFAULT 'new' CHECK (enrollment_type IN ('new','transfer','returning')),
  father_phone TEXT, mother_phone TEXT, whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL, national_id TEXT, relation TEXT, occupation TEXT,
  phone TEXT NOT NULL, alt_phone TEXT, email TEXT, address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, academic_year_id)
);
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, code TEXT UNIQUE,
  grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  total_marks INT DEFAULT 100, pass_marks INT DEFAULT 50, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id, academic_year_id)
);
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL, end_time TIME NOT NULL, room_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exam_type public.exam_type NOT NULL DEFAULT 'monthly',
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL, total_marks INT DEFAULT 100, duration_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(6,2) NOT NULL DEFAULT 0,
  grade TEXT, remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);
CREATE TABLE public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  term public.term_type NOT NULL,
  total_marks NUMERIC(8,2), obtained_marks NUMERIC(8,2),
  percentage NUMERIC(5,2), rank_in_class INT, remarks TEXT,
  issued_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL,
  frequency public.fee_frequency NOT NULL DEFAULT 'monthly',
  grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  description TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, author TEXT, isbn TEXT, category TEXT,
  publisher TEXT, publication_year INT,
  total_copies INT NOT NULL DEFAULT 1, available_copies INT NOT NULL DEFAULT 1,
  shelf_location TEXT, status public.book_status DEFAULT 'available',
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.uniforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, size TEXT, gender TEXT, color TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0, description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL, paid_amount NUMERIC(12,2) DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE,
  status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT, receipt_number TEXT UNIQUE, notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  payment_month INTEGER CHECK (payment_month BETWEEN 1 AND 12),
  payment_year INTEGER,
  transport_fee NUMERIC NOT NULL DEFAULT 0,
  book_sale_amount NUMERIC NOT NULL DEFAULT 0,
  uniform_sale_amount NUMERIC NOT NULL DEFAULT 0,
  book_id UUID REFERENCES public.library_books(id) ON DELETE SET NULL,
  uniform_id UUID REFERENCES public.uniforms(id) ON DELETE SET NULL,
  id_card_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_payments_student_month_year
  ON public.payments (student_id, payment_month, payment_year)
  WHERE payment_month IS NOT NULL AND payment_year IS NOT NULL;
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL, position TEXT NOT NULL, department TEXT,
  gender public.gender_type, phone TEXT, email TEXT, address TEXT,
  hire_date DATE, salary NUMERIC(12,2),
  status public.employment_status DEFAULT 'active', photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.book_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  borrower_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  borrower_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL, return_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  fine_amount NUMERIC(8,2) DEFAULT 0, notes TEXT,
  document_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL, vehicle_number TEXT,
  driver_name TEXT, driver_phone TEXT,
  capacity INT DEFAULT 30, monthly_fee NUMERIC(12,2),
  pickup_areas TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.student_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  pickup_point TEXT, start_date DATE DEFAULT CURRENT_DATE, end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, route_id)
);
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT,
  event_type public.event_type DEFAULT 'other',
  start_date TIMESTAMPTZ NOT NULL, end_date TIMESTAMPTZ, location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, content TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  severity public.discipline_severity NOT NULL DEFAULT 'low',
  action_taken TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blood_group TEXT, allergies TEXT, chronic_conditions TEXT,
  vaccinations TEXT, notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type TEXT, entity_id UUID,
  metadata JSONB, ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ADD CONSTRAINT classes_homeroom_teacher_fk
  FOREIGN KEY (homeroom_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

CREATE INDEX idx_students_class ON public.students(current_class_id);
CREATE INDEX idx_students_active ON public.students(is_active);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_exam_results_student ON public.exam_results(student_id);
CREATE INDEX idx_enrollments_year ON public.student_enrollments(academic_year_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'academic_years','grades','classes','teachers','students','parents',
    'subjects','exams','fee_types','payments','staff','library_books',
    'transport_routes','events','announcements','health_records','uniforms'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'academic_years','grades','classes','teachers','students','parents',
    'student_parents','student_enrollments','subjects','teaching_assignments',
    'schedules','attendance','exams','exam_results','report_cards',
    'fee_types','payments','staff','library_books','book_loans','uniforms',
    'transport_routes','student_transport','events','announcements',
    'discipline_records','health_records','activity_logs'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'academic_years','grades','classes','subjects','fee_types',
    'transport_routes','library_books','events','announcements','uniforms'
  ])
  LOOP
    EXECUTE format($f$CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "admin manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))$f$, t);
  END LOOP;
END $$;

CREATE POLICY "staff read teachers" ON public.teachers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "teacher read self" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "staff read staff" ON public.staff FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

CREATE POLICY "staff read students" ON public.students FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "student read self" ON public.students FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "parent read children" ON public.students FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id = sp.parent_id
                 WHERE sp.student_id = students.id AND p.user_id = auth.uid()));
CREATE POLICY "admin manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

CREATE POLICY "staff read parents" ON public.parents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "parent read self" ON public.parents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin manage parents" ON public.parents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'student_parents','student_enrollments','teaching_assignments','schedules'
  ])
  LOOP
    EXECUTE format($f$CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "admin manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))$f$, t);
  END LOOP;
END $$;

CREATE POLICY "staff read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance.student_id AND s.user_id = auth.uid()));
CREATE POLICY "parent read child attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id
                 WHERE sp.student_id=attendance.student_id AND p.user_id = auth.uid()));

CREATE POLICY "staff read exams" ON public.exams FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));

CREATE POLICY "staff read exam_results" ON public.exam_results FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "teachers manage exam_results" ON public.exam_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own results" ON public.exam_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=exam_results.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child results" ON public.exam_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id
                 WHERE sp.student_id=exam_results.student_id AND p.user_id=auth.uid()));

CREATE POLICY "staff read report_cards" ON public.report_cards FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage report_cards" ON public.report_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "student read own report" ON public.report_cards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=report_cards.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child report" ON public.report_cards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id
                 WHERE sp.student_id=report_cards.student_id AND p.user_id=auth.uid()));

CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "accountant manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "student read own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id=payments.student_id AND s.user_id=auth.uid()));
CREATE POLICY "parent read child payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_parents sp JOIN public.parents p ON p.id=sp.parent_id
                 WHERE sp.student_id=payments.student_id AND p.user_id=auth.uid()));

CREATE POLICY "staff read book_loans" ON public.book_loans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "librarian manage book_loans" ON public.book_loans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'librarian') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'librarian') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "staff read student_transport" ON public.student_transport FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin manage student_transport" ON public.student_transport FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['discipline_records','health_records'])
  LOOP
    EXECUTE format($f$CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY "staff manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'teacher'))$f$, t);
  END LOOP;
END $$;

CREATE POLICY "admin view activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);