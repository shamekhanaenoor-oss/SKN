import CrudPage from "@/components/CrudPage";
import { supabase } from "@/integrations/supabase/client";

const DISCOUNT_TYPE = [
  { value: "amount", label: "مبلغ ثابت (افغانی)" },
  { value: "percent", label: "درصد (%)" },
];


const GENDER = [{ value: "male", label: "مرد" }, { value: "female", label: "زن" }];
const EMP_STATUS = [
  { value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" },
  { value: "on_leave", label: "مرخصی" }, { value: "terminated", label: "اخراج" },
];
const ATT_STATUS = [
  { value: "present", label: "حاضر" }, { value: "absent", label: "غایب" },
  { value: "late", label: "تأخیر" }, { value: "excused", label: "موجه" }, { value: "sick", label: "مریض" },
];
const PAY_STATUS = [
  { value: "pending", label: "در انتظار" }, { value: "partial", label: "ناقص" },
  { value: "paid", label: "پرداخت شده" }, { value: "overdue", label: "معوقه" }, { value: "cancelled", label: "لغو" },
];
const EXAM_TYPE = [
  { value: "monthly", label: "ماهانه" }, { value: "midterm", label: "میان‌ترم" },
  { value: "final", label: "نهایی" }, { value: "quiz", label: "کوییز" }, { value: "annual", label: "سالانه" },
];
const TERM_TYPE = [
  { value: "first", label: "اول" }, { value: "second", label: "دوم" }, { value: "final", label: "نهایی" },
  { value: "quiz", label: "کوییز" }, { value: "midterm", label: "میان‌ترم" }, { value: "assignment", label: "تکلیف" },
];
const EVENT_TYPE = [
  { value: "academic", label: "علمی" }, { value: "cultural", label: "فرهنگی" },
  { value: "sport", label: "ورزشی" }, { value: "exam", label: "امتحان" },
  { value: "holiday", label: "تعطیل" }, { value: "meeting", label: "جلسه" }, { value: "other", label: "سایر" },
];
const SEVERITY = [
  { value: "low", label: "کم" }, { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" }, { value: "critical", label: "بحرانی" },
];
const BOOK_STATUS = [
  { value: "available", label: "موجود" }, { value: "borrowed", label: "امانت" },
  { value: "reserved", label: "رزرو" }, { value: "lost", label: "گم" }, { value: "damaged", label: "خراب" },
];
export const AcademicYears = () => <CrudPage table="academic_years" title="سال تحصیلی" searchField="name" fields={[
  { name: "name", label: "نام", required: true }, { name: "start_date", label: "تاریخ شروع", type: "date", required: true },
  { name: "end_date", label: "تاریخ پایان", type: "date", required: true },
  { name: "is_current", label: "سال جاری", type: "select", options: [{value:"true",label:"بله"},{value:"false",label:"خیر"}] },
]} />;

export const Grades = () => <CrudPage table="grades" title="پایه‌های تحصیلی" searchField="name" fields={[
  { name: "name", label: "نام پایه", required: true },
  { name: "level", label: "سطح (عدد)", type: "number", required: true },
  { name: "description", label: "توضیحات", type: "textarea" },
]} />;

export const Classes = () => <CrudPage table="classes" title="صنف‌ها" searchField="name"
  fields={[
  { name: "name", label: "نام صنف", required: true },
  { name: "section", label: "بخش (الف/ب/...)" },
  { name: "capacity", label: "ظرفیت", type: "number" },
  { name: "fee_amount", label: "فیس (افغانی)", type: "number" },
  { name: "homeroom_teacher_id", label: "معلم سرپرست", type: "reference", refTable: "teachers", refLabelField: "full_name" },
]} displayColumns={["name","section","capacity","fee_amount","homeroom_teacher_id"]} />;

export const Subjects = () => <CrudPage table="subjects" title="مواد درسی" searchField="name" fields={[
  { name: "name", label: "نام ماده", required: true },
  { name: "code", label: "کد" },
  { name: "total_marks", label: "نمره کل", type: "number" },
  { name: "pass_marks", label: "نمره قبولی", type: "number" },
  { name: "grade_id", label: "پایه", type: "reference", refTable: "grades", refLabelField: "name", refOrderBy: "level" },
  { name: "description", label: "توضیحات", type: "textarea" },
]} />;

export const Teachers = () => <CrudPage table="teachers" title="معلمان" searchField="full_name" fields={[
  { name: "employee_code", label: "کد پرسنلی", required: true, autoIdEntity: "teacher" },
  { name: "full_name", label: "نام کامل", required: true },
  { name: "father_name", label: "نام پدر" },
  { name: "national_id", label: "تذکره/شناسنامه" },
  { name: "gender", label: "جنسیت", type: "select", options: GENDER },
  { name: "phone", label: "تلفن", type: "tel" },
  { name: "email", label: "ایمیل", type: "email" },
  { name: "qualification", label: "تحصیلات" },
  { name: "specialization", label: "تخصص" },
  { name: "hire_date", label: "تاریخ استخدام", type: "date" },
  { name: "salary", label: "معاش", type: "number" },
  { name: "status", label: "وضعیت", type: "select", options: EMP_STATUS },
  { name: "address", label: "آدرس", type: "textarea" },
]} displayColumns={["employee_code","full_name","phone","specialization","status"]} />;

export const Students = () => <CrudPage table="students" title="شاگردان" searchField="full_name"
  fields={[
  { name: "student_code", label: "کد شاگرد", required: true, autoIdEntity: "student" },
  { name: "full_name", label: "نام کامل", required: true },
  { name: "father_name", label: "نام پدر" },
  { name: "grandfather_name", label: "نام پدرکلان" },
  { name: "gender", label: "جنسیت", type: "select", options: GENDER },
  { name: "enrollment_type", label: "نوع ثبت‌نام", type: "select", required: true, options: [
    { value: "new",       label: "جدید" },
    { value: "transfer",  label: "سه‌پارچه (انتقالی از مکتب دیگر)" },
    { value: "returning", label: "مربوطه (شاگرد قبلی)" },
  ]},
  { name: "date_of_birth", label: "تاریخ تولد", type: "date" },
  { name: "tazkira_number", label: "شماره تذکره" },
  { name: "phone", label: "تلفن", type: "tel" },
  { name: "province", label: "ولایت", type: "province" },
  { name: "district", label: "ولسوالی", type: "district" },
  { name: "village", label: "قریه" },
  { name: "blood_group", label: "گروه خون" },
  { name: "admission_date", label: "تاریخ ثبت‌نام", type: "date" },
  { name: "current_class_id", label: "صنف فعلی", type: "reference", refTable: "classes", refLabelField: "name" },
  { name: "address", label: "آدرس", type: "textarea" },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["student_code","full_name","father_name","enrollment_type","gender","date_of_birth","phone","province"]} />;

export const Parents = () => <CrudPage table="parents" title="والدین" searchField="full_name" fields={[
  { name: "full_name", label: "نام کامل", required: true },
  { name: "national_id", label: "شماره تذکره" },
  { name: "relation", label: "نسبت (پدر/مادر/...)" },
  { name: "occupation", label: "شغل" },
  { name: "phone", label: "تلفن", required: true, type: "tel" },
  { name: "alt_phone", label: "تلفن دوم", type: "tel" },
  { name: "email", label: "ایمیل", type: "email" },
  { name: "address", label: "آدرس", type: "textarea" },
]} displayColumns={["full_name","relation","phone","occupation"]} />;

export const Attendance = () => <CrudPage table="attendance" title="حضور و غیاب" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "class_id", label: "صنف", type: "reference", refTable: "classes", refLabelField: "name", required: true },
  { name: "date", label: "تاریخ", type: "date", required: true },
  { name: "status", label: "وضعیت", type: "select", options: ATT_STATUS, required: true },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["student_id","class_id","date","status"]} />;

export const Exams = () => <CrudPage table="exams" title="امتحانات" searchField="name" fields={[
  { name: "name", label: "نام امتحان", required: true },
  { name: "exam_type", label: "نوع", type: "select", options: EXAM_TYPE, required: true },
  { name: "exam_date", label: "تاریخ", type: "date", required: true },
  { name: "total_marks", label: "نمره کل", type: "number" },
  { name: "duration_minutes", label: "مدت (دقیقه)", type: "number" },
  { name: "academic_year_id", label: "سال تحصیلی", type: "reference", refTable: "academic_years", refLabelField: "name" },
  { name: "class_id", label: "صنف", type: "reference", refTable: "classes", refLabelField: "name" },
  { name: "subject_id", label: "ماده درسی", type: "reference", refTable: "subjects", refLabelField: "name" },
]} displayColumns={["name","exam_type","exam_date","subject_id","class_id","total_marks"]} />;

export const ExamResults = () => <CrudPage table="exam_results" title="نمرات امتحانات" fields={[
  { name: "exam_id", label: "امتحان", type: "reference", refTable: "exams", refLabelField: "name", required: true },
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "marks_obtained", label: "نمره کسب‌شده", type: "number", required: true },
  { name: "grade", label: "درجه (A/B/...)" },
  { name: "remarks", label: "ملاحظات", type: "textarea" },
]} displayColumns={["exam_id","student_id","marks_obtained","grade"]} />;

export const ReportCards = () => <CrudPage table="report_cards" title="کارنامه" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "class_id", label: "صنف", type: "reference", refTable: "classes", refLabelField: "name" },
  { name: "academic_year_id", label: "سال تحصیلی", type: "reference", refTable: "academic_years", refLabelField: "name" },
  { name: "term", label: "ترم", type: "select", options: TERM_TYPE, required: true },
  { name: "total_marks", label: "نمره کل", type: "number" },
  { name: "obtained_marks", label: "نمره کسب‌شده", type: "number" },
  { name: "percentage", label: "درصد", type: "number" },
  { name: "rank_in_class", label: "رتبه در صنف", type: "number" },
  { name: "issued_date", label: "تاریخ صدور", type: "date" },
  { name: "remarks", label: "ملاحظات", type: "textarea" },
]} displayColumns={["student_id","term","obtained_marks","percentage","rank_in_class"]} />;

export const Payments = () => <CrudPage table="payments" title="پرداخت فیس شاگردان" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "amount", label: "مبلغ کل", type: "number", required: true },
  { name: "paid_amount", label: "مبلغ پرداختی", type: "number" },
  { name: "payment_date", label: "تاریخ پرداخت", type: "date" },
  { name: "status", label: "وضعیت", type: "select", options: PAY_STATUS },
  { name: "receipt_number", label: "شماره رسید" },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["student_id","amount","paid_amount","payment_date","status"]} />;

export const Staff = () => <CrudPage table="staff" title="کارکنان اداری" searchField="full_name" fields={[
  { name: "employee_code", label: "کد پرسنلی", required: true, autoIdEntity: "staff" },
  { name: "full_name", label: "نام کامل", required: true },
  { name: "position", label: "سمت", required: true },
  { name: "gender", label: "جنسیت", type: "select", options: GENDER },
  { name: "phone", label: "تلفن", type: "tel" },
  { name: "email", label: "ایمیل", type: "email" },
  { name: "hire_date", label: "تاریخ استخدام", type: "date" },
  { name: "salary", label: "معاش", type: "number" },
  { name: "status", label: "وضعیت", type: "select", options: EMP_STATUS },
  { name: "address", label: "آدرس", type: "textarea" },
]} displayColumns={["employee_code","full_name","position","status"]} />;

export const LibraryBooks = () => <CrudPage
  table="library_books"
  title="کتابخانه"
  searchField="title"
  fields={[
    { name: "title",           label: "نام کتاب",   required: true },
    { name: "author",          label: " خرید",   type: "number" },
    { name: "isbn",            label: "فروش",        type: "number" },
    { name: "available_copies", label: "تعداد موجود", type: "number", required: true },
  ]}
  displayColumns={["title","author","isbn","category","available_copies"]}
  columnLabels={{ author: " خرید", isbn: "فروش", category: "فایده" }}
  computedColumns={{
    category: (row) => {
      const buy  = Number(row.author  ?? 0);
      const sell = Number(row.isbn    ?? 0);
      const profit = sell - buy;
      return profit > 0
        ? `+${profit.toLocaleString()} افغانی`
        : profit < 0
        ? `${profit.toLocaleString()} افغانی`
        : "—";
    },
  }}
/>;

export const BookLoans = () => <CrudPage table="book_loans" title="تسلیم کتاب و اسناد" fields={[
  { name: "book_id", label: "کتاب / سند", type: "reference", refTable: "library_books", refLabelField: "title", required: true },
  { name: "document_name", label: "نام اسناد" },
  { name: "borrower_teacher_id", label: "معلم و کارمند", type: "reference", refTable: "teachers", refLabelField: "full_name" },
  { name: "fine_amount", label: "ارزش قیمت", type: "number" },
  { name: "loan_date", label: "تاریخ تسلیم", type: "date", required: true },
  { name: "due_date", label: "تاریخ سررسید", type: "date", hideInTable: true, hideInForm: true },
  { name: "return_date", label: "تاریخ بازگشت", type: "date" },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["book_id","document_name","borrower_teacher_id","fine_amount","loan_date","return_date"]}
   columnLabels={{ borrower_teacher_id: "معلم و کارمند", fine_amount: "ارزش قیمت", loan_date: "تاریخ تسلیم", document_name: "نام اسناد" }} />;

export const TransportRoutes = () => <CrudPage table="transport_routes" title="سرویس مکتب" searchField="route_name" fields={[
  { name: "route_name", label: "نام مسیر", required: true },
  { name: "vehicle_number", label: "شماره وسیله" },
  { name: "driver_name", label: "نام راننده" },
  { name: "driver_phone", label: "تلفن راننده", type: "tel" },
  { name: "capacity", label: "ظرفیت", type: "number" },
  { name: "monthly_fee", label: "فیس ماهانه", type: "number" },
  { name: "pickup_areas", label: "نواحی توقف", type: "textarea" },
]} displayColumns={["route_name","driver_name","capacity","monthly_fee"]} />;

export const Events = () => <CrudPage table="events" title="رویدادها" searchField="title" fields={[
  { name: "title", label: "عنوان", required: true },
  { name: "event_type", label: "نوع", type: "select", options: EVENT_TYPE },
  { name: "start_date", label: "تاریخ شروع", type: "date", required: true },
  { name: "end_date", label: "تاریخ پایان", type: "date" },
  { name: "location", label: "مکان" },
  { name: "description", label: "توضیحات", type: "textarea" },
]} displayColumns={["title","event_type","start_date","location"]} />;

export const Announcements = () => <CrudPage table="announcements" title="اطلاعیه‌ها" searchField="title" fields={[
  { name: "title", label: "عنوان", required: true },
  { name: "content", label: "متن", type: "textarea", required: true },
  { name: "audience", label: "مخاطب", type: "select", options: [
    { value: "all", label: "همه" }, { value: "teachers", label: "معلمان" },
    { value: "students", label: "شاگردان" }, { value: "parents", label: "والدین" },
  ]},
  { name: "target_class_id", label: "صنف هدف", type: "reference", refTable: "classes", refLabelField: "name" },
  { name: "expires_at", label: "تاریخ انقضا", type: "date" },
]} displayColumns={["title","audience","published_at"]} />;

export const Discipline = () => <CrudPage table="discipline_records" title="انضباط" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "incident_date", label: "تاریخ رویداد", type: "date", required: true },
  { name: "severity", label: "شدت", type: "select", options: SEVERITY, required: true },
  { name: "description", label: "شرح", type: "textarea", required: true },
  { name: "action_taken", label: "اقدام انجام شده", type: "textarea" },
]} displayColumns={["student_id","incident_date","severity"]} />;

export const Health = () => <CrudPage table="health_records" title="صحت" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "visit_date", label: "تاریخ ویزیت", type: "date", required: true },
  { name: "blood_group", label: "گروه خون" },
  { name: "allergies", label: "حساسیت‌ها", type: "textarea" },
  { name: "chronic_conditions", label: "بیماری‌های مزمن", type: "textarea" },
  { name: "vaccinations", label: "واکسن‌ها", type: "textarea" },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["student_id","visit_date","blood_group"]} />;

const RECIPIENT_TYPE = [
  { value: "teacher", label: "معلم" }, { value: "staff", label: "کارمند اداری" },
];
const SALARY_STATUS = [
  { value: "paid", label: "پرداخت شده" }, { value: "pending", label: "در انتظار" },
  { value: "partial", label: "ناقص" }, { value: "cancelled", label: "لغو" },
];
const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i+1), label: String(i+1) }));

export const SalaryPayments = () => <CrudPage table="salary_payments" title="پرداخت معاشات" fields={[
  { name: "recipient_type", label: "نوع گیرنده", type: "select", options: RECIPIENT_TYPE, required: true },
  { name: "teacher_id", label: "معلم", type: "reference", refTable: "teachers", refLabelField: ["full_name","employee_code"] },
  { name: "staff_id", label: "کارمند", type: "reference", refTable: "staff", refLabelField: ["full_name","employee_code"] },
  { name: "pay_period_month", label: "ماه (1-12)", type: "select", options: MONTHS, required: true },
  { name: "pay_period_year", label: "سال", type: "number", required: true },
  { name: "base_salary", label: "معاش پایه", type: "number", required: true },
  { name: "bonus", label: "پاداش", type: "number" },
  { name: "deduction", label: "کسرات", type: "number" },
  { name: "net_amount", label: "مبلغ خالص", type: "number", required: true },
  { name: "payment_date", label: "تاریخ پرداخت", type: "date", required: true },
  { name: "payment_method", label: "روش پرداخت" },
  { name: "status", label: "وضعیت", type: "select", options: SALARY_STATUS },
  { name: "notes", label: "یادداشت", type: "textarea" },
]} displayColumns={["recipient_type","teacher_id","staff_id","pay_period_month","pay_period_year","net_amount","payment_date","status"]} />;


export const Uniforms = () => <CrudPage
  table="uniforms"
  title="یونیفورم‌ها"
  searchField="name"
  fields={[
    { name: "name",           label: "نام یونیفورم", required: true },
    { name: "size",           label: "سایز" },
    { name: "purchase_price", label: "قیمت خرید (افغانی)",  type: "number", required: true },
    { name: "price",          label: "قیمت فروش (افغانی)", type: "number", required: true },
    { name: "stock",          label: "موجودی",              type: "number", required: true },
    { name: "description",    label: "توضیحات",             type: "textarea" },
  ]}
  displayColumns={["name","size","purchase_price","price","profit","stock"]}
  columnLabels={{ purchase_price: "قیمت خرید", price: "قیمت فروش", profit: "فایده" }}
  computedColumns={{
    profit: (row) => {
      const buy  = Number(row.purchase_price ?? 0);
      const sell = Number(row.price          ?? 0);
      const diff = sell - buy;
      return diff > 0
        ? `+${diff.toLocaleString()} افغانی`
        : diff < 0
        ? `${diff.toLocaleString()} افغانی`
        : "—";
    },
  }}
  formExtras={(form) => {
    const buy  = Number(form.purchase_price ?? 0);
    const sell = Number(form.price          ?? 0);
    const diff = sell - buy;
    const label = diff > 0
      ? `+${diff.toLocaleString()} افغانی`
      : diff < 0
      ? `${diff.toLocaleString()} افغانی`
      : "— افغانی";
    const color = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : undefined;
    return (
      <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between md:col-span-2">
        <span className="font-medium text-sm text-muted-foreground">فایده:</span>
        <span className="font-semibold text-sm" style={color ? { color } : undefined}>{label}</span>
      </div>
    );
  }}
/>;

const POINT_TYPE = [
  { value: "reward", label: "تشویق" }, { value: "warning", label: "اخطاری" },
];

export const StaffPoints = () => <CrudPage table="staff_points" title="تشویق و اخطاری" fields={[
  { name: "recipient_type", label: "نوع گیرنده", type: "select", options: RECIPIENT_TYPE, required: true },
  { name: "teacher_id", label: "معلم", type: "reference", refTable: "teachers", refLabelField: ["full_name","employee_code"] },
  { name: "staff_id", label: "کارمند", type: "reference", refTable: "staff", refLabelField: ["full_name","employee_code"] },
  { name: "point_type", label: "نوع امتیاز", type: "select", options: POINT_TYPE, required: true },
  { name: "points", label: "امتیاز (عدد)", type: "number", required: true },
  { name: "reason", label: "دلیل", type: "textarea", required: true },
  { name: "date", label: "تاریخ", type: "date", required: true },
]} displayColumns={["recipient_type","teacher_id","staff_id","point_type","points","date"]} />;

export const StudentParents = () => <CrudPage table="student_parents" title="ارتباط شاگرد و والدین" fields={[
  { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
  { name: "parent_id", label: "والد", type: "reference", refTable: "parents", refLabelField: ["full_name","phone"], required: true },
  { name: "is_primary", label: "والد اصلی", type: "select", options: [{value:"true",label:"بله"},{value:"false",label:"خیر"}] },
]} displayColumns={["student_id","parent_id","is_primary"]} />;

// تخفیف شاگردان
export const Discounts = () => <CrudPage table="student_discounts" title="تخفیف شاگردان"
  description="برای شاگردان واجد شرایط، تخفیف ثبت کنید. تخفیف می‌تواند به‌صورت مبلغ ثابت یا درصد باشد."
  fields={[
    { name: "discount_code", label: "کد تخفیف", autoIdEntity: "discount" },
    { name: "student_id", label: "شاگرد", type: "reference", refTable: "students", refLabelField: ["full_name","student_code"], required: true },
    { name: "discount_type", label: "نوع تخفیف", type: "select", options: DISCOUNT_TYPE, required: true },
    { name: "value", label: "مقدار", type: "number", required: true },
    { name: "reason", label: "دلیل", type: "textarea" },
    { name: "start_date", label: "تاریخ شروع", type: "date" },
    { name: "end_date", label: "تاریخ پایان (اختیاری)", type: "date" },
    { name: "is_active", label: "فعال", type: "select", options: [{value:"true",label:"بله"},{value:"false",label:"خیر"}] },
  ]} displayColumns={["discount_code","student_id","discount_type","value","is_active"]} />;

