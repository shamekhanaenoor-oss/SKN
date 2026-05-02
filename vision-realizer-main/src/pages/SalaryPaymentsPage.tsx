import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search, Lock, Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import { isoToShamsi, todayShamsi, shamsiToIso } from "@/lib/shamsi";
import { useAcademicYear } from "@/lib/academic-year";
import { useSchoolProfile } from "@/lib/school-profile";

const SHAMSI_MONTHS = [
  { value: 1,  label: "حمل" },  { value: 2,  label: "ثور" },
  { value: 3,  label: "جوزا" }, { value: 4,  label: "سرطان" },
  { value: 5,  label: "اسد" },  { value: 6,  label: "سنبله" },
  { value: 7,  label: "میزان" },{ value: 8,  label: "عقرب" },
  { value: 9,  label: "قوس" },  { value: 10, label: "جدی" },
  { value: 11, label: "دلو" },  { value: 12, label: "حوت" },
];

const SALARY_STATUS = [
  { value: "paid",      label: "پرداخت شده" },
  { value: "pending",   label: "در انتظار" },
  { value: "partial",   label: "ناقص" },
  { value: "cancelled", label: "لغو" },
];

const STATUS_BADGE: Record<string, string> = {
  paid:      "bg-green-100 text-green-700 border-green-300",
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  partial:   "bg-blue-100 text-blue-700 border-blue-300",
  cancelled: "bg-gray-100 text-gray-500 border-gray-300",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso);
  if (!s) return "—";
  return `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
}

function todayIso() {
  const t = todayShamsi();
  return shamsiToIso(t.year, t.month, t.day);
}

function monthLabel(m?: number) {
  return SHAMSI_MONTHS.find(x => x.value === Number(m))?.label ?? "—";
}

// محاسبه مالیه دولتی: زیر 5000 → صفر، بالای 5000 → 2% از مازاد بر 5000
// مثال: 8000 → (8000-5000) × 2% = 60 افغانی
// مثال: 15000 → (15000-5000) × 2% = 200 افغانی
const TAX_THRESHOLD = 5000;
const TAX_RATE = 0.02;

function calcTax(base: any): number {
  const b = Number(base || 0);
  if (b <= TAX_THRESHOLD) return 0;
  return Math.round((b - TAX_THRESHOLD) * TAX_RATE);
}

// محاسبه مبلغ خالص (معاش پایه + پاداش - کسرات - مالیه)
function calcNet(base: any, bonus: any, deduction: any): number {
  const tax = calcTax(base);
  return Math.max(0, Number(base || 0) + Number(bonus || 0) - Number(deduction || 0) - tax);
}

// ===== رسید پرینت معاش =====
function handlePrint(payment: any, recipientName: string, schoolName: string, thermal = false) {
  const win = window.open("", "_blank", "width=420,height=650");
  if (!win) { toast.error("پنجره پرینت باز نشد"); return; }
  const t = todayShamsi();
  const printDate = `${t.year}/${String(t.month).padStart(2,"0")}/${String(t.day).padStart(2,"0")}`;
  const monthName = SHAMSI_MONTHS.find(m => m.value === Number(payment.pay_period_month))?.label ?? "—";

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>رسید معاش</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Vazirmatn',Tahoma,sans-serif;direction:rtl;${thermal ? "width:80mm;font-size:11px;" : "font-size:13px;padding:24px;"}}
  .wrap{${thermal ? "width:72mm;margin:0 auto;" : "max-width:380px;margin:0 auto;border:1px solid #ccc;padding:20px;border-radius:8px;"}}
  .hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
  .hdr h1{font-size:${thermal ? "15px" : "20px"};font-weight:bold}
  .hdr p{font-size:${thermal ? "10px" : "12px"};color:#555;margin-top:2px}
  .row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:${thermal ? "11px" : "13px"}}
  .lbl{font-weight:bold}
  .div{border-top:1px dashed #000;margin:8px 0}
  .total{font-size:${thermal ? "13px" : "16px"};font-weight:bold;border-top:2px solid #000;padding-top:6px;margin-top:6px}
  .green{color:#16a34a}
  .red{color:#dc2626}
  .month-badge{display:inline-block;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;padding:2px 10px;border-radius:4px;font-weight:bold}
  .status{text-align:center;margin:8px 0}
  .status span{border:1px solid #000;padding:2px 16px;border-radius:4px;font-weight:bold}
  .footer{text-align:center;font-size:10px;color:#888;border-top:1px solid #ccc;margin-top:10px;padding-top:6px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>${schoolName || "سیستم مکتب"}</h1><p>رسید پرداخت معاش</p></div>
  <div class="row"><span class="lbl">تاریخ پرداخت:</span><span>${fmtDate(payment.payment_date)}</span></div>
  <div class="row"><span class="lbl">ماه:</span><span class="month-badge">${monthName}${payment.pay_period_year ? " " + payment.pay_period_year : ""}</span></div>
  <div class="row"><span class="lbl">تاریخ چاپ:</span><span>${printDate}</span></div>
  <div class="div"></div>
  <div class="row"><span class="lbl">نام:</span><span>${recipientName}</span></div>
  <div class="row"><span class="lbl">نوع:</span><span>${payment.recipient_type === "teacher" ? "معلم" : "کارمند اداری"}</span></div>
  <div class="div"></div>
  <div class="row"><span class="lbl">معاش پایه:</span><span>${Number(payment.base_salary ?? 0).toLocaleString()} افغانی</span></div>
  ${Number(payment.bonus ?? 0) > 0 ? `<div class="row green"><span class="lbl">پاداش:</span><span>+${Number(payment.bonus).toLocaleString()} افغانی</span></div>` : ""}
  ${Number(payment.deduction ?? 0) > 0 ? `<div class="row red"><span class="lbl">کسرات:</span><span>-${Number(payment.deduction).toLocaleString()} افغانی</span></div>` : ""}
  ${Number(payment.tax_amount ?? 0) > 0 ? `<div class="row red"><span class="lbl">مالیه دولتی (2%):</span><span>-${Number(payment.tax_amount).toLocaleString()} افغانی</span></div>` : ""}
  <div class="row total"><span>مبلغ خالص:</span><span>${Number(payment.net_amount ?? 0).toLocaleString()} افغانی</span></div>
  ${payment.notes ? `<div style="font-size:10px;color:#555;margin-top:4px">یادداشت: ${payment.notes}</div>` : ""}
  <div class="footer">با تشکر</div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ===== ارسال پیام واتساپ معاش =====
function handleWhatsApp(payment: any, person: any, schoolName: string) {
  const phone = person?.phone;
  if (!phone) {
    toast.error("شماره تلفن ثبت نشده است");
    return;
  }
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) cleaned = "93" + cleaned.slice(1);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);

  const monthName = SHAMSI_MONTHS.find(m => m.value === Number(payment.pay_period_month))?.label ?? "—";

  const msg = [
    `🏫 *${schoolName || "سیستم مکتب"}*`,
    `━━━━━━━━━━━━━━`,
    `📋 *رسید پرداخت معاش*`,
    ``,
    `👤 نام: *${person?.full_name ?? "—"}*`,
    `🆔 کد: ${person?.employee_code ?? "—"}`,
    `👔 نوع: ${payment.recipient_type === "teacher" ? "معلم" : "کارمند اداری"}`,
    ``,
    `📅 ماه: *${monthName}${payment.pay_period_year ? " " + payment.pay_period_year : ""}*`,
    `📆 تاریخ پرداخت: ${fmtDate(payment.payment_date)}`,
    ``,
    `💰 معاش پایه: ${Number(payment.base_salary ?? 0).toLocaleString()} افغانی`,
    Number(payment.bonus ?? 0) > 0 ? `🎁 پاداش: +${Number(payment.bonus).toLocaleString()} افغانی` : null,
    Number(payment.deduction ?? 0) > 0 ? `➖ کسرات: -${Number(payment.deduction).toLocaleString()} افغانی` : null,
    Number(payment.tax_amount ?? 0) > 0 ? `🏛️ مالیه دولتی (2%): -${Number(payment.tax_amount).toLocaleString()} افغانی` : null,
    `✅ مبلغ خالص: *${Number(payment.net_amount ?? 0).toLocaleString()} افغانی*`,
    ``,
    `با تشکر 🙏`,
  ].filter(Boolean).join("\n");

  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

export default function SalaryPaymentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  // برای جلوگیری از loop در useEffect
  const skipAutoFill = useRef(false);
  const prevTeacherId = useRef<string>("");
  const prevStaffId = useRef<string>("");

  const { currentYear: academicYear } = useAcademicYear();
  const schoolProfile = useSchoolProfile();
  const academicShamsiYear = useMemo(() => {
    if (!academicYear) return todayShamsi().year;
    const matches = academicYear.name?.match(/\d{4}/g);
    if (matches?.length) return parseInt(matches[matches.length - 1]);
    if (academicYear.start_date) {
      const s = isoToShamsi(academicYear.start_date);
      if (s) return s.year;
    }
    return todayShamsi().year;
  }, [academicYear]);

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ["salary_payments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("salary_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ماه‌های پرداخت‌شده برای شخص انتخاب‌شده (قفل ماه)
  const paidMonths: { month: number; year: number }[] = salaries
    .filter((p: any) => {
      const personMatch = form.teacher_id
        ? p.teacher_id === form.teacher_id
        : form.staff_id
        ? p.staff_id === form.staff_id
        : false;
      return (
        personMatch &&
        p.pay_period_month != null &&
        p.pay_period_year != null &&
        p.status === "paid" &&
        (!editing || p.id !== editing.id)
      );
    })
    .map((p: any) => ({ month: p.pay_period_month, year: p.pay_period_year }));

  function isMonthLocked(month: number, year: number) {
    return paidMonths.some(pm => pm.month === month && pm.year === year);
  }

  const selectedMonthLocked = form.pay_period_month && form.pay_period_year
    ? isMonthLocked(Number(form.pay_period_month), Number(form.pay_period_year))
    : false;

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-for-salary"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("teachers")
        .select("id,full_name,employee_code,salary,phone")
        .order("full_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-for-salary"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("staff")
        .select("id,full_name,employee_code,salary,phone")
        .order("full_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // وقتی معلم یا کارمند انتخاب شد، معاش پایه را auto-fill کن
  useEffect(() => {
    const tid = form.teacher_id ?? "";
    const sid = form.staff_id ?? "";

    // فقط وقتی واقعاً تغییر کرده
    if (tid === prevTeacherId.current && sid === prevStaffId.current) return;
    prevTeacherId.current = tid;
    prevStaffId.current = sid;

    let baseSalary: number | null = null;

    if (tid) {
      const t = (teachers as any[]).find(x => x.id === tid);
      if (t?.salary != null) baseSalary = Number(t.salary);
    } else if (sid) {
      const s = (staff as any[]).find(x => x.id === sid);
      if (s?.salary != null) baseSalary = Number(s.salary);
    }

    if (baseSalary !== null) {
      setForm(prev => {
        const tax = calcTax(baseSalary);
        const net = calcNet(baseSalary, prev.bonus, prev.deduction);
        return { ...prev, base_salary: String(baseSalary), tax_amount: String(tax), net_amount: String(net) };
      });
    }
  }, [form.teacher_id, form.staff_id, teachers, staff]);

  function setField(name: string, value: any) {
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // محاسبه خودکار مالیه و net_amount
      if (["base_salary", "bonus", "deduction"].includes(name)) {
        const tax = calcTax(next.base_salary);
        next.tax_amount = String(tax);
        next.net_amount = String(calcNet(next.base_salary, next.bonus, next.deduction));
      }
      return next;
    });
  }

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!payload.teacher_id && !payload.staff_id) {
        throw new Error("لطفاً معلم یا کارمند را انتخاب کنید");
      }
      // بررسی قفل ماه
      if (payload.pay_period_month && payload.pay_period_year) {
        const personFilter = payload.teacher_id
          ? { teacher_id: payload.teacher_id }
          : { staff_id: payload.staff_id };
        const { data: existing } = await (supabase as any)
          .from("salary_payments")
          .select("id")
          .match({ ...personFilter, pay_period_month: Number(payload.pay_period_month), pay_period_year: Number(payload.pay_period_year), status: "paid" })
          .neq("id", editing?.id ?? "00000000-0000-0000-0000-000000000000")
          .maybeSingle();
        if (existing) {
          const mLabel = SHAMSI_MONTHS.find(m => m.value === Number(payload.pay_period_month))?.label ?? "";
          throw new Error(`معاش ماه ${mLabel} ${payload.pay_period_year} قبلاً پرداخت شده است`);
        }
      }
      const cleaned = {
        teacher_id: payload.teacher_id || null,
        staff_id: payload.staff_id || null,
        recipient_type: payload.teacher_id ? "teacher" : "staff",
        pay_period_month: payload.pay_period_month ? Number(payload.pay_period_month) : null,
        pay_period_year: payload.pay_period_year ? Number(payload.pay_period_year) : null,
        base_salary: Number(payload.base_salary || 0),
        bonus: Number(payload.bonus || 0),
        deduction: Number(payload.deduction || 0),
        net_amount: calcNet(payload.base_salary, payload.bonus, payload.deduction),
        payment_date: payload.payment_date || null,
        status: payload.status || "paid",
        notes: payload.notes || null,
      };
      // tax_amount را جداگانه اضافه می‌کنیم — اگر ستون وجود نداشت خطا نمی‌دهد
      const tax = calcTax(payload.base_salary);
      if (tax > 0) {
        (cleaned as any).tax_amount = tax;
      }
      if (editing?.id) {
        const { error } = await (supabase as any).from("salary_payments").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("salary_payments").insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "معاش ثبت شد");
      qc.invalidateQueries({ queryKey: ["salary_payments"] });
      setOpen(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("salary_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["salary_payments"] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  function startCreate() {
    setEditing(null);
    skipAutoFill.current = false;
    const t = todayShamsi();
    setForm({
      pay_period_month: String(t.month),
      pay_period_year: String(academicShamsiYear),
      payment_date: todayIso(),
      status: "paid",
      bonus: "0",
      deduction: "0",
      base_salary: "",
      tax_amount: "0",
      net_amount: "0",
    });
    setOpen(true);
  }

  function startEdit(row: any) {
    setEditing(row);
    skipAutoFill.current = true;
    setForm({
      ...row,
      bonus: String(row.bonus ?? 0),
      deduction: String(row.deduction ?? 0),
      base_salary: String(row.base_salary ?? 0),
      tax_amount: String(row.tax_amount ?? calcTax(row.base_salary)),
      net_amount: String(row.net_amount ?? 0),
      pay_period_month: row.pay_period_month ? String(row.pay_period_month) : "",
      pay_period_year: row.pay_period_year ? String(row.pay_period_year) : "",
    });
    setTimeout(() => { skipAutoFill.current = false; }, 200);
    setOpen(true);
  }

  function recipientName(p: any) {
    if (p.teacher_id) {
      const t = (teachers as any[]).find(x => x.id === p.teacher_id);
      return t ? `${t.full_name} (${t.employee_code})` : "—";
    }
    if (p.staff_id) {
      const s = (staff as any[]).find(x => x.id === p.staff_id);
      return s ? `${s.full_name} (${s.employee_code})` : "—";
    }
    return "—";
  }

  function getPersonObj(p: any) {
    if (p.teacher_id) return (teachers as any[]).find(x => x.id === p.teacher_id) ?? null;
    if (p.staff_id) return (staff as any[]).find(x => x.id === p.staff_id) ?? null;
    return null;
  }

  const filteredSalaries = search
    ? salaries.filter((p: any) => recipientName(p).toLowerCase().includes(search.toLowerCase()))
    : salaries;

  const yearOptions = Array.from({ length: 5 }, (_, i) => academicShamsiYear - 2 + i);

  const selectedPerson = form.teacher_id
    ? (teachers as any[]).find(t => t.id === form.teacher_id)
    : form.staff_id
    ? (staff as any[]).find(s => s.id === form.staff_id)
    : null;

  const taxAmount = calcTax(form.base_salary);
  const netAmount = calcNet(form.base_salary, form.bonus, form.deduction);

  return (
    <div>
      <PageHeader
        title="پرداخت معاشات"
        action={<Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> افزودن</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredSalaries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ پرداختی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام</TableHead>
                  <TableHead className="text-right">ماه</TableHead>
                  <TableHead className="text-right">سال</TableHead>
                  <TableHead className="text-right">معاش پایه</TableHead>
                  <TableHead className="text-right">پاداش</TableHead>
                  <TableHead className="text-right">کسرات</TableHead>
                  <TableHead className="text-right">مالیه</TableHead>
                  <TableHead className="text-right">مبلغ خالص</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{recipientName(p)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          {monthLabel(p.pay_period_month)}
                        </Badge>
                        {p.status === "paid" && <Lock className="w-3 h-3 text-green-600" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.pay_period_year ?? "—"}</TableCell>
                    <TableCell>{Number(p.base_salary ?? 0).toLocaleString()} افغانی</TableCell>
                    <TableCell className="text-green-700">
                      {Number(p.bonus ?? 0) > 0 ? `+${Number(p.bonus).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {Number(p.deduction ?? 0) > 0 ? `-${Number(p.deduction).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-orange-600 text-sm">
                      {Number(p.tax_amount ?? 0) > 0
                        ? <span className="flex flex-col"><span>-{Number(p.tax_amount).toLocaleString()}</span><span className="text-xs text-muted-foreground">2%</span></span>
                        : "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {Number(p.net_amount ?? 0).toLocaleString()} افغانی
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(p.payment_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[p.status] ?? ""}`}>
                        {SALARY_STATUS.find(s => s.value === p.status)?.label ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" title="پرینت رنگی" onClick={() => handlePrint(p, recipientName(p), schoolProfile.school_name, false)}>
                          <Printer className="w-4 h-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" title="پرینت حرارتی" onClick={() => handlePrint(p, recipientName(p), schoolProfile.school_name, true)}>
                          <Printer className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" title="ارسال در واتساپ" onClick={() => handleWhatsApp(p, getPersonObj(p), schoolProfile.school_name)}>
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(p.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); setForm({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش معاش" : "افزودن پرداخت معاش"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ overflow: "visible" }}>

              {/* معلم */}
              <div>
                <Label>معلم</Label>
                <Select
                  value={form.teacher_id || "__none__"}
                  onValueChange={v => setForm(prev => ({ ...prev, teacher_id: v === "__none__" ? "" : v, staff_id: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="انتخاب معلم" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— انتخاب نشده —</SelectItem>
                    {(teachers as any[]).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} ({t.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* کارمند */}
              <div>
                <Label>کارمند اداری</Label>
                <Select
                  value={form.staff_id || "__none__"}
                  onValueChange={v => setForm(prev => ({ ...prev, staff_id: v === "__none__" ? "" : v, teacher_id: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="انتخاب کارمند" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— انتخاب نشده —</SelectItem>
                    {(staff as any[]).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ماه */}
              <div>
                <Label>ماه <span className="text-destructive">*</span></Label>
                <Select value={form.pay_period_month ?? ""} onValueChange={v => setField("pay_period_month", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب ماه" /></SelectTrigger>
                  <SelectContent>
                    {SHAMSI_MONTHS.map(m => {
                      const locked = form.pay_period_year
                        ? isMonthLocked(m.value, Number(form.pay_period_year))
                        : false;
                      return (
                        <SelectItem key={m.value} value={String(m.value)} disabled={locked}>
                          <span className="flex items-center gap-2">
                            {m.label}
                            {locked && <Lock className="w-3 h-3 text-green-600" />}
                            {locked && <span className="text-xs text-green-600">(پرداخت شده)</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedMonthLocked && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    این ماه قبلاً پرداخت شده است
                  </p>
                )}
              </div>

              {/* سال */}
              <div>
                <Label>سال <span className="text-destructive">*</span></Label>
                <Select value={form.pay_period_year ?? ""} onValueChange={v => setField("pay_period_year", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب سال" /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}{y === academicShamsiYear ? " (سال جاری)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {academicYear && (
                  <p className="text-xs text-muted-foreground mt-1">سال تحصیلی: {academicYear.name}</p>
                )}
              </div>

              {/* معاش پایه */}
              <div>
                <Label>معاش پایه (افغانی) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={form.base_salary ?? ""}
                  onChange={e => setField("base_salary", e.target.value)}
                  placeholder="خودکار از پروفایل"
                  required
                />
                {selectedPerson?.salary != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    معاش ثبت‌شده:{" "}
                    <span className="font-semibold text-primary">
                      {Number(selectedPerson.salary).toLocaleString()} افغانی
                    </span>
                  </p>
                )}
              </div>

              {/* پاداش */}
              <div>
                <Label>پاداش (افغانی)</Label>
                <Input type="number" value={form.bonus ?? "0"} onChange={e => setField("bonus", e.target.value)} />
              </div>

              {/* کسرات */}
              <div>
                <Label>کسرات (افغانی)</Label>
                <Input type="number" value={form.deduction ?? "0"} onChange={e => setField("deduction", e.target.value)} />
              </div>

              {/* مالیه دولتی — read only */}
              <div>
                <Label>مالیه دولتی (افغانی)</Label>
                <div className={`flex items-center h-10 px-3 rounded-md border text-sm font-semibold ${taxAmount > 0 ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-muted border-muted-foreground/20 text-muted-foreground"}`}>
                  {taxAmount > 0
                    ? <span>-{taxAmount.toLocaleString()} افغانی <span className="font-normal text-xs">(2% معاش پایه)</span></span>
                    : <span className="font-normal">معاف (زیر 5,000 افغانی)</span>
                  }
                </div>
              </div>

              {/* مبلغ خالص — read only */}
              <div>
                <Label>مبلغ خالص (افغانی)</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-primary/5 border-primary/30 font-semibold text-primary text-sm">
                  {netAmount.toLocaleString()} افغانی
                </div>
              </div>

              {/* تاریخ پرداخت */}
              <div>
                <Label>تاریخ پرداخت <span className="text-destructive">*</span></Label>
                <DatePickerShamsi value={form.payment_date ?? ""} onChange={v => setField("payment_date", v)} />
              </div>

              {/* وضعیت */}
              <div>
                <Label>وضعیت</Label>
                <Select value={form.status ?? "paid"} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALARY_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* یادداشت */}
              <div className="md:col-span-2">
                <Label>یادداشت</Label>
                <Textarea value={form.notes ?? ""} onChange={e => setField("notes", e.target.value)} />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={upsertMutation.isPending || selectedMonthLocked}>
                {upsertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
