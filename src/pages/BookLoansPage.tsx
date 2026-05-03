import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, BookOpen, User, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { isoToShamsi } from "@/lib/shamsi";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso.slice(0, 10));
  if (!s) return iso.slice(0, 10);
  return `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
}

export default function BookLoansPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["book-loans-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("book_loans")
        .select(`
          id, loan_date, return_date, fine_amount, notes, document_name, status,
          book:library_books(id, title),
          teacher:teachers(id, full_name, employee_code)
        `)
        .order("loan_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // گروه‌بندی بر اساس معلم
  const grouped: Record<string, { teacher: any; items: any[]; total: number; unreturned: number }> = {};

  for (const loan of loans as any[]) {
    const tid = loan.teacher?.id ?? "unknown";
    if (!grouped[tid]) {
      grouped[tid] = {
        teacher: loan.teacher,
        items: [],
        total: 0,
        unreturned: 0,
      };
    }
    grouped[tid].items.push(loan);
    grouped[tid].total++;
    if (!loan.return_date) grouped[tid].unreturned++;
  }

  // فیلتر بر اساس جستجو
  const groups = Object.values(grouped).filter(g => {
    if (!search) return true;
    return (
      g.teacher?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.teacher?.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
      g.items.some((i: any) =>
        i.book?.title?.toLowerCase().includes(search.toLowerCase()) ||
        i.document_name?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }).sort((a, b) => (a.teacher?.full_name ?? "").localeCompare(b.teacher?.full_name ?? ""));

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalLoans     = (loans as any[]).length;
  const totalUnreturned = (loans as any[]).filter((l: any) => !l.return_date).length;

  return (
    <div>
      <PageHeader
        title="تاریخچه تسلیم کتاب و اسناد"
        description="گروه‌بندی بر اساس معلم و کارمند"
      />

      {/* خلاصه */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">مجموع تسلیم‌ها</p>
          <p className="text-2xl font-bold text-primary">{totalLoans}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">هنوز برنگشته</p>
          <p className="text-2xl font-bold text-orange-600">{totalUnreturned}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">تعداد معلمان/کارمندان</p>
          <p className="text-2xl font-bold">{groups.length}</p>
        </Card>
      </div>

      {/* جستجو */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام معلم یا کتاب..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* لیست گروه‌بندی‌شده */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : groups.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">هیچ رکوردی یافت نشد.</Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const tid = g.teacher?.id ?? "unknown";
            const isOpen = expanded.has(tid);
            return (
              <Card key={tid} className="overflow-hidden">
                {/* هدر معلم */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-right"
                  onClick={() => toggleExpand(tid)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{g.teacher?.full_name ?? "نامشخص"}</p>
                      {g.teacher?.employee_code && (
                        <p className="text-xs text-muted-foreground font-mono">{g.teacher.employee_code}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <BookOpen className="w-3 h-3 ml-1" />
                        {g.total} رکورد
                      </Badge>
                      {g.unreturned > 0 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {g.unreturned} برنگشته
                        </Badge>
                      )}
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* جدول رکوردها */}
                {isOpen && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">کتاب / سند</TableHead>
                          <TableHead className="text-right">نام اسناد</TableHead>
                          <TableHead className="text-right">ارزش قیمت</TableHead>
                          <TableHead className="text-right">تاریخ تسلیم</TableHead>
                          <TableHead className="text-right">تاریخ بازگشت</TableHead>
                          <TableHead className="text-right">وضعیت</TableHead>
                          <TableHead className="text-right">یادداشت</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((loan: any, idx: number) => (
                          <TableRow key={loan.id}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{loan.book?.title ?? "—"}</TableCell>
                            <TableCell>{loan.document_name ?? "—"}</TableCell>
                            <TableCell>
                              {loan.fine_amount
                                ? <span className="font-medium">{Number(loan.fine_amount).toLocaleString()} افغانی</span>
                                : "—"}
                            </TableCell>
                            <TableCell className="text-sm">{fmtDate(loan.loan_date)}</TableCell>
                            <TableCell className="text-sm">
                              {loan.return_date
                                ? <span className="text-green-700">{fmtDate(loan.return_date)}</span>
                                : <span className="text-orange-600 font-medium">برنگشته</span>}
                            </TableCell>
                            <TableCell>
                              {loan.return_date
                                ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">بازگشت شده</Badge>
                                : <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">در دست</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {loan.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
