import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, School, UserCog, CalendarDays, AlertCircle, UserCheck, UserMinus, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useAcademicYear } from "@/lib/academic-year";
import { useSchoolProfile } from "@/lib/school-profile";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { table: "students",  label: "شاگردان",   icon: Users,   color: "text-primary" },
  { table: "teachers",  label: "معلمان",    icon: UserCog, color: "text-accent" },
  { table: "classes",   label: "صنف‌ها",    icon: School,  color: "text-success" },
  { table: "payments",  label: "پرداخت‌ها", icon: Wallet,  color: "text-success" },
];

function StatCard({ table, label, icon: Icon, color }: typeof stats[number]) {
  const { data } = useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count } = await (supabase as any).from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  return (
    <Card className="shadow-card hover:shadow-elegant transition-shadow">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{data ?? "..."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// کارت آمار شاگردان به تفکیک نوع ثبت‌نام و جنسیت
function StudentStatsCard() {
  const { data: students = [] } = useQuery({
    queryKey: ["students-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("enrollment_type, gender")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  function count(type: string, gender?: string) {
    return students.filter((s: any) =>
      s.enrollment_type === type && (gender ? s.gender === gender : true)
    ).length;
  }

  const rows = [
    {
      label: "جدید",
      icon: UserPlus,
      color: "text-blue-600",
      bg: "bg-blue-50",
      male: count("new", "male"),
      female: count("new", "female"),
      total: count("new"),
    },
    {
      label: "سه‌پارچه آمد",
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      male: count("transfer", "male"),
      female: count("transfer", "female"),
      total: count("transfer"),
    },
    {
      label: "سه‌پارچه رفت",
      icon: UserMinus,
      color: "text-orange-600",
      bg: "bg-orange-50",
      male: count("returning", "male"),
      female: count("returning", "female"),
      total: count("returning"),
    },
  ];

  const totalMale   = students.filter((s: any) => s.gender === "male").length;
  const totalFemale = students.filter((s: any) => s.gender === "female").length;

  return (
    <Card className="shadow-card md:col-span-2 lg:col-span-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          معیار شاگردان
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2 pr-2 font-medium text-muted-foreground">نوع ثبت‌نام</th>
                <th className="text-center py-2 font-medium text-blue-600">ذکور</th>
                <th className="text-center py-2 font-medium text-pink-600">اناث</th>
                <th className="text-center py-2 font-medium text-foreground">مجموع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${row.bg} flex items-center justify-center shrink-0`}>
                        <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
                      </div>
                      <span className="font-medium">{row.label}</span>
                    </div>
                  </td>
                  <td className="text-center py-3">
                    <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm">
                      {row.male}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-semibold text-sm">
                      {row.female}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-muted text-foreground font-bold text-sm">
                      {row.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td className="py-3 pr-2 font-bold">مجموع کل</td>
                <td className="text-center py-3">
                  <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                    {totalMale}
                  </span>
                </td>
                <td className="text-center py-3">
                  <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold text-sm">
                    {totalFemale}
                  </span>
                </td>
                <td className="text-center py-3">
                  <span className="inline-block min-w-[2rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {students.length}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, roles } = useAuth();
  const { currentYear, hasYear, loading } = useAcademicYear();
  const { school_name, address, phone } = useSchoolProfile();
  const navigate = useNavigate();

  return (
    <div>
      {/* هدر با نام مکتب */}
      {school_name && (
        <div className="mb-6 rounded-2xl overflow-hidden relative bg-gradient-to-l from-primary/90 to-primary shadow-elegant">
          <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-white/5 -translate-x-16 -translate-y-16 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-10 translate-y-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
              <School className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-xl md:text-2xl leading-tight truncate">
                {school_name}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                {address && <p className="text-white/80 text-xs truncate">{address}</p>}
                {phone && <p className="text-white/80 text-xs" dir="ltr">{phone}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={`خوش آمدید، ${user?.email?.split("@")[0] ?? "کاربر"}`}
        description={hasYear ? `سال تحصیلی فعال: ${currentYear?.name}` : "نمای کلی از وضعیت مکتب"}
      />

      {roles.length === 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm">
            ⚠️ هنوز هیچ نقشی به حساب شما اختصاص داده نشده است. لطفاً با مدیر سیستم تماس بگیرید.
          </CardContent>
        </Card>
      )}

      {!loading && !hasYear && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-sm">سال تحصیلی تعریف نشده است</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تمام بخش‌های سیستم غیرفعال هستند. ابتدا یک سال تحصیلی ایجاد کنید.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/academic-years")}>
              <CalendarDays className="w-4 h-4 ml-1" />
              ایجاد سال تحصیلی
            </Button>
          </CardContent>
        </Card>
      )}

      {hasYear && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-sm">سال تحصیلی فعال: <span className="text-primary">{currentYear?.name}</span></p>
              <p className="text-xs text-muted-foreground">{currentYear?.start_date} تا {currentYear?.end_date}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((s) => <StatCard key={s.table} {...s} />)}
      </div>

      {/* جدول معیار شاگردان */}
      <div className="grid grid-cols-1 gap-4">
        <StudentStatsCard />
      </div>
    </div>
  );
}
