import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type PermAction = "view" | "add" | "edit" | "delete";

export interface SectionDef { key: string; label: string; }

// لیست همه بخش‌های قابل تنظیم دسترسی
export const SECTIONS: SectionDef[] = [
  { key: "dashboard",          label: "داشبورد" },
  { key: "student-list",       label: "لست متعلمین" },
  { key: "students",           label: "شاگردان" },
  { key: "discounts",          label: "تخفیف" },
  { key: "payments",           label: "پرداخت فیس" },
  { key: "accounting",         label: "تاریخچه حسابی" },
  { key: "revenue",            label: "عواید مکتب" },
  { key: "expenses",           label: "مصارف‌ها" },
  { key: "salary-payments",    label: "پرداخت معاشات" },
  { key: "classes",            label: "صنف‌ها" },
  { key: "library-books",      label: "کتاب‌ها" },
  { key: "uniforms",           label: "یونیفورم‌ها" },
  { key: "teachers",           label: "معلمان" },
  { key: "staff",              label: "کارمندان" },
  { key: "staff-points",       label: "تشویق و اخطاری" },
  { key: "id-cards",           label: "کارت هویت" },
  { key: "transport-routes",   label: "ترانسپورت" },
  { key: "transport-list",     label: "لیست ترانسپورت" },
  { key: "academic-years",     label: "سال تحصیلی" },
  { key: "subjects",           label: "مواد درسی" },
  { key: "attendance",         label: "حضور و غیاب" },
  { key: "exams",              label: "امتحانات" },
  { key: "exam-results",       label: "نمرات" },
  { key: "report-cards",       label: "کارنامه" },
  { key: "book-loans",         label: "تسلیم کتاب و اسناد" },
  { key: "book-loans-history", label: "تاریخچه تسلیم" },
  { key: "events",             label: "رویدادها" },
  { key: "announcements",      label: "اطلاعیه‌ها" },
  { key: "discipline",         label: "انضباط" },
  { key: "settings",           label: "تنظیمات" },
  { key: "users",              label: "ایجاد کاربر" },
];

// نگاشت نام جدول دیتابیس به کلید بخش
const TABLE_TO_SECTION: Record<string, string> = {
  student_discounts: "discounts",
  transport_routes: "transport-routes",
  discipline_records: "discipline",
  library_books: "library-books",
  salary_payments: "salary-payments",
  exam_results: "exam-results",
  report_cards: "report-cards",
  book_loans: "book-loans",
  staff_points: "staff-points",
  academic_years: "academic-years",
  health_records: "discipline",
  student_parents: "students",
};

export function tableToSection(table: string): string {
  return TABLE_TO_SECTION[table] ?? table;
}

export interface SectionPerms { view: boolean; add: boolean; edit: boolean; delete: boolean; }
export type PermsMap = Record<string, SectionPerms>;

interface PermsContextValue {
  loading: boolean;
  isAdmin: boolean;
  perms: PermsMap;
  can: (section: string, action: PermAction) => boolean;
  refresh: () => Promise<void>;
}

const PermsContext = createContext<PermsContextValue | undefined>(undefined);

const ALL_TRUE: SectionPerms = { view: true, add: true, edit: true, delete: true };

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [perms, setPerms] = useState<PermsMap>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = hasRole("admin");

  async function load() {
    if (!user) { setPerms({}); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_permissions").select("*").eq("user_id", user.id);
    const map: PermsMap = {};
    for (const r of data ?? []) {
      map[r.section] = {
        view: !!r.can_view, add: !!r.can_add,
        edit: !!r.can_edit, delete: !!r.can_delete,
      };
    }
    setPerms(map);
    setLoading(false);
  }

  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user?.id, authLoading]);

  function can(section: string, action: PermAction): boolean {
    if (isAdmin) return true;
    return !!perms[section]?.[action];
  }

  return (
    <PermsContext.Provider value={{ loading, isAdmin, perms, can, refresh: load }}>
      {children}
    </PermsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

// helper برای hide/show سریع
export function Can({ section, action, children }: { section: string; action: PermAction; children: ReactNode }) {
  const { can } = usePermissions();
  if (!can(section, action)) return null;
  return <>{children}</>;
}
