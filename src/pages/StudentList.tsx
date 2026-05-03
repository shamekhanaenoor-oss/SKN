import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, X, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { isoToShamsi, calcAgeFromIso } from "@/lib/shamsi";

const GENDER_LABEL: Record<string, string> = {
  male: "مرد",
  female: "زن",
};

const ENROLLMENT_LABEL: Record<string, { label: string; color: string }> = {
  new:       { label: "جدید",      color: "border-green-300 text-green-700 bg-green-50" },
  transfer:  { label: "سه‌پارچه",  color: "border-orange-300 text-orange-700 bg-orange-50" },
  returning: { label: "مربوطه",    color: "border-purple-300 text-purple-700 bg-purple-50" },
};

export default function StudentList() {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterEnrollment, setFilterEnrollment] = useState("all");

  // بارگیری شاگردان با اطلاعات صنف
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["student-list-full"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("students")
        .select(`
          id,
          student_code,
          full_name,
          father_name,
          grandfather_name,
          gender,
          date_of_birth,
          tazkira_number,
          phone,
          province,
          district,
          village,
          blood_group,
          admission_date,
          address,
          current_class_id,
          class:classes(id, name, section)
        `)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // بارگیری لیست صنف‌ها برای فیلتر
  const { data: classes = [] } = useQuery({
    queryKey: ["classes-for-filter"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("classes")
        .select("id, name, section")
        .order("name");
      return data ?? [];
    },
  });

  // استخراج ولایت‌های منحصربه‌فرد
  const provinces = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s: any) => { if (s.province) set.add(s.province); });
    return Array.from(set).sort();
  }, [students]);

  // فیلتر کردن شاگردان
  const filtered = useMemo(() => {
    return students.filter((s: any) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.father_name?.toLowerCase().includes(q) ||
        s.student_code?.toLowerCase().includes(q) ||
        s.tazkira_number?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q);

      const matchClass =
        filterClass === "all" || s.current_class_id === filterClass;

      const matchGender =
        filterGender === "all" || s.gender === filterGender;

      const matchProvince =
        filterProvince === "all" || s.province === filterProvince;

      const matchEnrollment =
        filterEnrollment === "all" || s.enrollment_type === filterEnrollment;

      return matchSearch && matchClass && matchGender && matchProvince && matchEnrollment;
    });
  }, [students, search, filterClass, filterGender, filterProvince]);

  const hasFilters =
    search || filterClass !== "all" || filterGender !== "all" || filterProvince !== "all" || filterEnrollment !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterClass("all");
    setFilterGender("all");
    setFilterProvince("all");
    setFilterEnrollment("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="لست متعلمین"
        description={`مجموع ${students.length} شاگرد ثبت شده`}
      />

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-primary">{students.length}</div>
            <div className="text-xs text-muted-foreground mt-1">مجموع شاگردان</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">
              {students.filter((s: any) => s.gender === "male").length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">پسران</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-pink-600">
              {students.filter((s: any) => s.gender === "female").length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">دختران</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{filtered.length}</div>
            <div className="text-xs text-muted-foreground mt-1">نتایج فیلتر</div>
          </CardContent>
        </Card>
      </div>

      {/* بخش جستجو و فیلتر */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            جستجو و فیلتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* جستجو */}
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجو: نام، کد، تذکره، تلفن..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>

            {/* فیلتر نوع ثبت‌نام */}
            <Select value={filterEnrollment} onValueChange={setFilterEnrollment}>
              <SelectTrigger>
                <SelectValue placeholder="همه انواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                <SelectItem value="new">جدید</SelectItem>
                <SelectItem value="transfer">سه‌پارچه</SelectItem>
                <SelectItem value="returning">مربوطه</SelectItem>
              </SelectContent>
            </Select>

            {/* فیلتر صنف */}
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue placeholder="همه صنف‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه صنف‌ها</SelectItem>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.section ? ` (${c.section})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* فیلتر جنسیت */}
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger>
                <SelectValue placeholder="همه جنسیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه جنسیت‌ها</SelectItem>
                <SelectItem value="male">پسر</SelectItem>
                <SelectItem value="female">دختر</SelectItem>
              </SelectContent>
            </Select>

            {/* فیلتر ولایت */}
            <Select value={filterProvince} onValueChange={setFilterProvince}>
              <SelectTrigger>
                <SelectValue placeholder="همه ولایات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه ولایات</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* دکمه پاک کردن فیلترها */}
          {hasFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {filtered.length} نتیجه از {students.length} شاگرد
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mr-auto text-destructive hover:text-destructive"
              >
                <X className="w-3.5 h-3.5 ml-1" />
                پاک کردن فیلترها
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول شاگردان */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm">در حال بارگیری...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">هیچ شاگردی یافت نشد</p>
              {hasFilters && (
                <p className="text-xs mt-1">فیلترها را تغییر دهید یا پاک کنید</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right font-semibold">#</TableHead>
                    <TableHead className="text-right font-semibold">کد شاگرد</TableHead>
                    <TableHead className="text-right font-semibold">نام کامل</TableHead>
                    <TableHead className="text-right font-semibold">نام پدر</TableHead>
                    <TableHead className="text-right font-semibold">نوع ثبت‌نام</TableHead>
                    <TableHead className="text-right font-semibold">صنف</TableHead>
                    <TableHead className="text-right font-semibold">جنسیت</TableHead>
                    <TableHead className="text-right font-semibold">سن</TableHead>
                    <TableHead className="text-right font-semibold">تلفن</TableHead>
                    <TableHead className="text-right font-semibold">ولایت</TableHead>
                    <TableHead className="text-right font-semibold">تاریخ ثبت‌نام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student: any, index: number) => (
                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-muted-foreground text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {student.student_code ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.father_name ?? "—"}
                      </TableCell>
                      {/* نوع ثبت‌نام */}
                      <TableCell>
                        {(() => {
                          const et = ENROLLMENT_LABEL[student.enrollment_type];
                          if (!et) return <span className="text-muted-foreground text-xs">—</span>;
                          return (
                            <Badge variant="outline" className={`font-normal text-xs ${et.color}`}>
                              {et.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {student.class ? (
                          <Badge variant="secondary" className="font-normal">
                            {student.class.name}
                            {student.class.section ? ` (${student.class.section})` : ""}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">تعیین نشده</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.gender ? (
                          <Badge
                            variant="outline"
                            className={
                              student.gender === "male"
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : "border-pink-300 text-pink-700 bg-pink-50"
                            }
                          >
                            {GENDER_LABEL[student.gender] ?? student.gender}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      {/* ستون سن */}
                      <TableCell>
                        {student.date_of_birth ? (() => {
                          const age = calcAgeFromIso(student.date_of_birth);
                          if (!age) return <span className="text-muted-foreground text-xs">—</span>;
                          return (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {age.years} سال{age.months > 0 ? ` و ${age.months} ماه` : ""}
                            </span>
                          );
                        })() : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{student.phone ?? "—"}</TableCell>
                      <TableCell className="text-sm">{student.province ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.admission_date
                          ? (() => {
                              const s = isoToShamsi(student.admission_date);
                              return s ? `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}` : "—";
                            })()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
