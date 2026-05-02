import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Loader2, Search, Printer, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import { isoToShamsi, todayShamsi, shamsiToIso } from "@/lib/shamsi";
import { useAcademicYear } from "@/lib/academic-year";
import { useSchoolProfile } from "@/lib/school-profile";

// ماه‌های شمسی
const SHAMSI_MONTHS = [
  { value: 1,  label: "حمل" },
  { value: 2,  label: "ثور" },
  { value: 3,  label: "جوزا" },
  { value: 4,  label: "سرطان" },
  { value: 5,  label: "اسد" },
  { value: 6,  label: "سنبله" },
  { value: 7,  label: "میزان" },
  { value: 8,  label: "عقرب" },
  { value: 9,  label: "قوس" },
  { value: 10, label: "جدی" },
  { value: 11, label: "دلو" },
  { value: 12, label: "حوت" },
];

const PAY_STATUS = [
  { value: "pending",   label: "در انتظار" },
  { value: "partial",   label: "ناقص" },
  { value: "paid",      label: "پرداخت شده" },
  { value: "overdue",   label: "معوقه" },
  { value: "cancelled", label: "لغو" },
];

const STATUS_BADGE: Record<string, string> = {
  paid:      "bg-green-100 text-green-700 border-green-300",
  pending:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  partial:   "bg-blue-100 text-blue-700 border-blue-300",
  overdue:   "bg-red-100 text-red-700 border-red-300",
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
  if (!m) return "—";
  return SHAMSI_MONTHS.find(x => x.value === m)?.label ?? String(m);
}

async function generateReceiptNumber(): Promise<string> {
  const { data } = await (supabase as any)
    .from("payments")
    .select("receipt_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = 1;
  if (data?.receipt_number) {
    const match = data.receipt_number.match(/(\d+)$/);
    if (match) next = parseInt(match[1]) + 1;
  }
  return `RCP-${String(next).padStart(4, "0")}`;
}

// ===== رسید پرینت =====
function handlePrint(payment: any, student: any, schoolName: string, thermal = false) {
  const win = window.open("", "_blank", "width=420,height=650");
  if (!win) { toast.error("پنجره پرینت باز نشد"); return; }
  const t = todayShamsi();
  const printDate = `${t.year}/${String(t.month).padStart(2,"0")}/${String(t.day).padStart(2,"0")}`;
  const discount = payment.amount != null && payment.paid_amount != null
    ? Number(payment.amount) - Number(payment.paid_amount)
    : 0;
  const transportFee  = Number(payment.transport_fee   || 0);
  const bookFee       = Number(payment.book_sale_amount || 0);
  const uniformFee    = Number(payment.uniform_sale_amount || 0);
  const grandTotal    = Number(payment.paid_amount ?? payment.amount ?? 0) + transportFee + bookFee + uniformFee;

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>رسید</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Vazirmatn',Tahoma,sans-serif;direction:rtl;${thermal?"width:80mm;font-size:11px;":"font-size:13px;padding:24px;"}}
  .wrap{${thermal?"width:72mm;margin:0 auto;":"max-width:380px;margin:0 auto;border:1px solid #ccc;padding:20px;border-radius:8px;"}}
  .hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
  .hdr h1{font-size:${thermal?"15px":"20px"};font-weight:bold}
  .hdr p{font-size:${thermal?"10px":"12px"};color:#555;margin-top:2px}
  .row{display:flex;justify-content:space-between;margin-bottom:5px;font-size:${thermal?"11px":"13px"}}
  .lbl{font-weight:bold}
  .div{border-top:1px dashed #000;margin:8px 0}
  .total{font-size:${thermal?"13px":"16px"};font-weight:bold;border-top:2px solid #000;padding-top:6px;margin-top:6px}
  .disc{color:#16a34a}
  .extra{color:#0369a1}
  .month-badge{display:inline-block;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;padding:2px 10px;border-radius:4px;font-weight:bold;font-size:${thermal?"11px":"13px"}}
  .status{text-align:center;margin:8px 0}
  .status span{border:1px solid #000;padding:2px 16px;border-radius:4px;font-weight:bold}
  .footer{text-align:center;font-size:10px;color:#888;border-top:1px solid #ccc;margin-top:10px;padding-top:6px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>${schoolName || "سیستم مکتب"}</h1><p>رسید پرداخت فیس</p></div>
  <div class="row"><span class="lbl">شماره رسید:</span><span>${payment.receipt_number ?? "—"}</span></div>
  <div class="row"><span class="lbl">تاریخ پرداخت:</span><span>${fmtDate(payment.payment_date)}</span></div>
  <div class="row"><span class="lbl">ماه:</span><span class="month-badge">${monthLabel(payment.payment_month)}${payment.payment_year ? " " + payment.payment_year : ""}</span></div>
  <div class="row"><span class="lbl">تاریخ چاپ:</span><span>${printDate}</span></div>
  <div class="div"></div>
  <div class="row"><span class="lbl">نام شاگرد:</span><span>${student?.full_name ?? "—"}</span></div>
  <div class="row"><span class="lbl">کد شاگرد:</span><span>${student?.student_code ?? "—"}</span></div>
  <div class="row"><span class="lbl">صنف:</span><span>${student?.class?.name ?? "—"}</span></div>
  <div class="div"></div>
  <div class="row"><span class="lbl">فیس اصلی:</span><span>${Number(payment.amount ?? 0).toLocaleString()} افغانی</span></div>
  ${discount > 0 ? `<div class="row disc"><span class="lbl">تخفیف:</span><span>- ${discount.toLocaleString()} افغانی</span></div>` : ""}
  <div class="row"><span class="lbl">فیس پرداختی:</span><span>${Number(payment.paid_amount ?? payment.amount ?? 0).toLocaleString()} افغانی</span></div>
  ${transportFee > 0 ? `<div class="row extra"><span class="lbl">فیس ترانسپورت:</span><span>${transportFee.toLocaleString()} افغانی</span></div>` : ""}
  ${bookFee > 0 ? `<div class="row extra"><span class="lbl">فروش کتاب:</span><span>${bookFee.toLocaleString()} افغانی</span></div>` : ""}
  ${uniformFee > 0 ? `<div class="row extra"><span class="lbl">فروش یونیفورم:</span><span>${uniformFee.toLocaleString()} افغانی</span></div>` : ""}
  <div class="row total"><span>مجموع کل:</span><span>${grandTotal.toLocaleString()} افغانی</span></div>
  <div class="status"><span>${PAY_STATUS.find(s => s.value === payment.status)?.label ?? payment.status}</span></div>
  ${payment.notes ? `<div style="font-size:10px;color:#555;margin-top:4px">یادداشت: ${payment.notes}</div>` : ""}
  <div class="footer">با تشکر از پرداخت شما</div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ===== ارسال پیام واتساپ =====
function handleWhatsApp(payment: any, student: any, schoolName: string) {
  const phone = student?.whatsapp_number || student?.father_phone || student?.phone;
  if (!phone) {
    toast.error("شماره تلفن شاگرد ثبت نشده است");
    return;
  }

  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) cleaned = "93" + cleaned.slice(1);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);

  const discount = payment.amount != null && payment.paid_amount != null
    ? Number(payment.amount) - Number(payment.paid_amount)
    : 0;
  const transportFee = Number(payment.transport_fee   || 0);
  const bookFee      = Number(payment.book_sale_amount || 0);
  const uniformFee   = Number(payment.uniform_sale_amount || 0);
  const grandTotal   = Number(payment.paid_amount ?? payment.amount ?? 0) + transportFee + bookFee + uniformFee;

  const monthName = SHAMSI_MONTHS.find(m => m.value === payment.payment_month)?.label ?? "";

  const msg = [
    `🏫 *${schoolName || "سیستم مکتب"}*`,
    `━━━━━━━━━━━━━━`,
    `📋 *رسید پرداخت فیس*`,
    ``,
    `👤 شاگرد: *${student?.full_name ?? "—"}*`,
    `🆔 کد: ${student?.student_code ?? "—"}`,
    `🏫 صنف: ${student?.class?.name ?? "—"}`,
    ``,
    `📅 ماه: *${monthName}${payment.payment_year ? " " + payment.payment_year : ""}*`,
    `📆 تاریخ پرداخت: ${fmtDate(payment.payment_date)}`,
    ``,
    `💰 فیس اصلی: ${Number(payment.amount ?? 0).toLocaleString()} افغانی`,
    discount > 0 ? `🎁 تخفیف: - ${discount.toLocaleString()} افغانی` : null,
    `✅ فیس پرداختی: *${Number(payment.paid_amount ?? payment.amount ?? 0).toLocaleString()} افغانی*`,
    transportFee > 0 ? `🚌 فیس ترانسپورت: ${transportFee.toLocaleString()} افغانی` : null,
    bookFee > 0      ? `📚 فروش کتاب: ${bookFee.toLocaleString()} افغانی` : null,
    uniformFee > 0   ? `👕 فروش یونیفورم: ${uniformFee.toLocaleString()} افغانی` : null,
    (transportFee > 0 || bookFee > 0 || uniformFee > 0) ? `━━━━━━━━━━━━━━` : null,
    (transportFee > 0 || bookFee > 0 || uniformFee > 0) ? `💵 *مجموع کل: ${grandTotal.toLocaleString()} افغانی*` : null,
    ``,
    `🧾 شماره رسید: ${payment.receipt_number ?? "—"}`,
    ``,
    `با تشکر از پرداخت شما 🙏`,
  ].filter(Boolean).join("\n");

  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ===== صفحه اصلی =====
export default function PaymentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  // سال تحصیلی جاری
  const { currentYear: academicYear } = useAcademicYear();
  const schoolProfile = useSchoolProfile();

  // سال شمسی از سال تحصیلی — آخرین عدد 4 رقمی در نام (مثلاً "1404-1405" → 1405)
  const academicShamsiYear = (() => {
    if (!academicYear) return todayShamsi().year;
    // همه اعداد 4 رقمی را بگیر و آخرین را برگردان (مثلاً 1404-1405 → 1405)
    const matches = academicYear.name?.match(/\d{4}/g);
    if (matches && matches.length > 0) {
      return parseInt(matches[matches.length - 1]);
    }
    // از تاریخ شروع
    if (academicYear.start_date) {
      const s = isoToShamsi(academicYear.start_date);
      if (s) return s.year;
    }
    return todayShamsi().year;
  })();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", search],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-payment"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select(`
          id, full_name, student_code, current_class_id,
          phone, father_phone, whatsapp_number,
          class:classes(id, name, fee_amount),
          transport:student_transport(
            route:transport_routes(id, route_name, monthly_fee)
          )
        `)
        .order("full_name");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const { data: activeDiscounts = [] } = useQuery({
    queryKey: ["active-discounts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_discounts")
        .select("*")
        .eq("is_active", true);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // بارگیری کتاب‌ها
  const { data: books = [] } = useQuery({
    queryKey: ["library_books-for-payment"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("library_books")
        .select("id, title, author, isbn, available_copies")
        .order("title");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // بارگیری یونیفورم‌ها
  const { data: uniforms = [] } = useQuery({
    queryKey: ["uniforms-for-payment"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("uniforms")
        .select("id, name, size, price")
        .order("name");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // ماه‌های پرداخت‌شده این شاگرد (قفل‌شده)
  const paidMonths: { month: number; year: number }[] = payments
    .filter((p: any) =>
      p.student_id === form.student_id &&
      p.payment_month != null &&
      p.payment_year != null &&
      p.status === "paid" &&
      (!editing || p.id !== editing.id)
    )
    .map((p: any) => ({ month: p.payment_month, year: p.payment_year }));

  function isMonthLocked(month: number, year: number) {
    return paidMonths.some(pm => pm.month === month && pm.year === year);
  }

  // auto-fill فیس و تخفیف وقتی شاگرد تغییر کرد
  const studentId = form.student_id;
  useEffect(() => {
    if (!studentId) return;
    const st = (students as any[]).find((s: any) => s.id === studentId);
    const fee = st?.class?.fee_amount != null ? Number(st.class.fee_amount) : 0;

    // فیس ترانسپورت از student_transport
    const transport = Array.isArray(st?.transport) ? st.transport[0] : st?.transport;
    const rawTransportFee = transport?.route?.monthly_fee != null ? Number(transport.route.monthly_fee) : 0;

    const today = todayIso();
    const discount = (activeDiscounts as any[]).find((d: any) => {
      if (d.student_id !== studentId) return false;
      if (d.end_date && d.end_date < today) return false;
      if (d.start_date && d.start_date > today) return false;
      return true;
    });

    // فیس صنف بعد از تخفیف
    let paid = fee;
    if (discount && fee > 0) {
      paid = discount.discount_type === "percent"
        ? Math.max(0, fee - fee * Number(discount.value) / 100)
        : Math.max(0, fee - Number(discount.value));
    }

    // فیس ترانسپورت بعد از تخفیف ترانسپورت
    let paidTransport = rawTransportFee;
    if (discount?.transport_discount_type && rawTransportFee > 0) {
      paidTransport = discount.transport_discount_type === "percent"
        ? Math.max(0, rawTransportFee - rawTransportFee * Number(discount.transport_discount_value) / 100)
        : Math.max(0, rawTransportFee - Number(discount.transport_discount_value));
    }

    setForm(prev => ({
      ...prev,
      amount: fee > 0 ? String(fee) : prev.amount,
      paid_amount: fee > 0 ? String(Math.round(paid)) : prev.paid_amount,
      transport_fee: rawTransportFee > 0 ? String(Math.round(paidTransport)) : prev.transport_fee,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, students, activeDiscounts]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      // بررسی قفل ماه
      if (payload.payment_month && payload.payment_year && payload.student_id) {
        const { data: existing } = await (supabase as any)
          .from("payments")
          .select("id")
          .eq("student_id", payload.student_id)
          .eq("payment_month", Number(payload.payment_month))
          .eq("payment_year", Number(payload.payment_year))
          .eq("status", "paid")
          .neq("id", editing?.id ?? "00000000-0000-0000-0000-000000000000")
          .maybeSingle();
        if (existing) {
          throw new Error(`فیس ماه ${monthLabel(Number(payload.payment_month))} ${payload.payment_year} قبلاً پرداخت شده است`);
        }
      }
      const cleaned = {
        student_id: payload.student_id || null,
        amount: payload.amount ? Number(payload.amount) : 0,
        paid_amount: payload.paid_amount ? Number(payload.paid_amount) : null,
        payment_date: payload.payment_date || null,
        payment_month: payload.payment_month ? Number(payload.payment_month) : null,
        payment_year: payload.payment_year ? Number(payload.payment_year) : null,
        status: payload.status || "paid",
        receipt_number: payload.receipt_number || null,
        notes: payload.notes || null,
        transport_fee: payload.transport_fee ? Number(payload.transport_fee) : 0,
        book_sale_amount: payload.book_sale_amount ? Number(payload.book_sale_amount) : 0,
        uniform_sale_amount: payload.uniform_sale_amount ? Number(payload.uniform_sale_amount) : 0,
        id_card_fee: payload.id_card_fee ? Number(payload.id_card_fee) : 0,
        // ذخیره ID برای برگرداندن موجودی هنگام حذف
        book_id: (payload.book_id && payload.book_id !== "none") ? payload.book_id : null,
        uniform_id: (payload.uniform_id && payload.uniform_id !== "none") ? payload.uniform_id : null,
      };
      if (editing?.id) {
        const { error } = await (supabase as any).from("payments").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("payments").insert(cleaned);
        if (error) throw error;
      }

      // کم کردن موجودی کتاب (فقط در ثبت جدید)
      if (!editing?.id && payload.book_id && payload.book_id !== "none" && payload.book_sale_amount) {
        const { data: bookData } = await (supabase as any)
          .from("library_books")
          .select("available_copies")
          .eq("id", payload.book_id)
          .maybeSingle();
        if (bookData) {
          const newCopies = Math.max(0, Number(bookData.available_copies) - 1);
          await (supabase as any)
            .from("library_books")
            .update({ available_copies: newCopies })
            .eq("id", payload.book_id);
        }
      }

      // کم کردن موجودی یونیفورم (فقط در ثبت جدید)
      if (!editing?.id && payload.uniform_id && payload.uniform_id !== "none" && payload.uniform_sale_amount) {
        const { data: uniData } = await (supabase as any)
          .from("uniforms")
          .select("stock")
          .eq("id", payload.uniform_id)
          .maybeSingle();
        if (uniData) {
          const newStock = Math.max(0, Number(uniData.stock) - 1);
          await (supabase as any)
            .from("uniforms")
            .update({ stock: newStock })
            .eq("id", payload.uniform_id);
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "پرداخت ثبت شد");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["library_books"] });
      qc.invalidateQueries({ queryKey: ["uniforms"] });
      setOpen(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (p: any) => {
      // اگر کتاب فروخته شده، موجودی را برگردان
      if (p.book_id && Number(p.book_sale_amount || 0) > 0) {
        const { data: bookData } = await (supabase as any)
          .from("library_books")
          .select("available_copies")
          .eq("id", p.book_id)
          .maybeSingle();
        if (bookData) {
          await (supabase as any)
            .from("library_books")
            .update({ available_copies: Number(bookData.available_copies) + 1 })
            .eq("id", p.book_id);
        }
      }
      // اگر یونیفورم فروخته شده، موجودی را برگردان
      if (p.uniform_id && Number(p.uniform_sale_amount || 0) > 0) {
        const { data: uniData } = await (supabase as any)
          .from("uniforms")
          .select("stock")
          .eq("id", p.uniform_id)
          .maybeSingle();
        if (uniData) {
          await (supabase as any)
            .from("uniforms")
            .update({ stock: Number(uniData.stock) + 1 })
            .eq("id", p.uniform_id);
        }
      }
      const { error } = await (supabase as any).from("payments").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("حذف شد");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["library_books"] });
      qc.invalidateQueries({ queryKey: ["uniforms"] });
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  async function startCreate() {
    setEditing(null);
    const receipt = await generateReceiptNumber();
    const t = todayShamsi();
    const year = academicShamsiYear;
    setForm({
      receipt_number: receipt,
      payment_date: todayIso(),
      payment_month: t.month,
      payment_year: year,
      status: "paid",
      book_id: "",
      uniform_id: "",
    });
    setOpen(true);
  }

  function startEdit(row: any) {
    setEditing(row);
    setForm({ ...row, book_id: "", uniform_id: "" });
    setOpen(true);
  }

  function setField(name: string, value: any) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const formDiscount = form.amount && form.paid_amount
    ? Number(form.amount) - Number(form.paid_amount)
    : 0;

  const selectedMonthLocked = form.payment_month && form.payment_year
    ? isMonthLocked(Number(form.payment_month), Number(form.payment_year))
    : false;

  const filteredPayments = search
    ? payments.filter((p: any) => {
        const st = students.find((s: any) => s.id === p.student_id);
        return (
          st?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.receipt_number?.toLowerCase().includes(search.toLowerCase())
        );
      })
    : payments;

  // سال‌های موجود — سال تحصیلی جاری در مرکز
  const yearOptions = Array.from({ length: 5 }, (_, i) => academicShamsiYear - 2 + i);

  return (
    <div>
      <PageHeader
        title="پرداخت فیس شاگردان"
        action={<Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> افزودن</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ پرداختی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رسید</TableHead>
                  <TableHead className="text-right">شاگرد</TableHead>
                  <TableHead className="text-right">ماه</TableHead>
                  <TableHead className="text-right">فیس اصلی</TableHead>
                  <TableHead className="text-right">مبلغ پرداختی</TableHead>
                  <TableHead className="text-right">ترانسپورت</TableHead>
                  <TableHead className="text-right">کتاب</TableHead>
                  <TableHead className="text-right">یونیفورم</TableHead>
                  <TableHead className="text-right">آی‌دی کارت</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((p: any) => {
                  const st = students.find((s: any) => s.id === p.student_id);
                  const hasDiscount = p.paid_amount != null && Number(p.paid_amount) < Number(p.amount);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.receipt_number ?? "—"}</span>
                      </TableCell>
                      <TableCell className="font-medium">{st?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        {p.payment_month ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                              {monthLabel(p.payment_month)}
                            </Badge>
                            {p.payment_year && <span className="text-xs text-muted-foreground">{p.payment_year}</span>}
                            {p.status === "paid" && <Lock className="w-3 h-3 text-green-600" />}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{Number(p.amount ?? 0).toLocaleString()} افغانی</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={hasDiscount ? "font-semibold text-green-700" : ""}>
                            {Number(p.paid_amount ?? p.amount ?? 0).toLocaleString()} افغانی
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-green-600">
                              تخفیف: {(Number(p.amount) - Number(p.paid_amount)).toLocaleString()} افغانی
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {Number(p.transport_fee || 0) > 0
                          ? <span className="text-sm font-medium">{Number(p.transport_fee).toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {Number(p.book_sale_amount || 0) > 0
                          ? <span className="text-sm font-medium">{Number(p.book_sale_amount).toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {Number(p.uniform_sale_amount || 0) > 0
                          ? <span className="text-sm font-medium">{Number(p.uniform_sale_amount).toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {Number(p.id_card_fee || 0) > 0
                          ? <span className="text-sm font-medium">{Number(p.id_card_fee).toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtDate(p.payment_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_BADGE[p.status] ?? ""}`}>
                          {PAY_STATUS.find(s => s.value === p.status)?.label ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" title="پرینت رنگی" onClick={() => handlePrint(p, st, schoolProfile.school_name, false)}>
                            <Printer className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" title="پرینت حرارتی" onClick={() => handlePrint(p, st, schoolProfile.school_name, true)}>
                            <Printer className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" title="ارسال در واتساپ" onClick={() => handleWhatsApp(p, st, schoolProfile.school_name)}>
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(p); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* فرم */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش پرداخت" : "افزودن پرداخت فیس"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ overflow: "visible" }}>

              {/* شاگرد */}
              <div className="md:col-span-2">
                <Label>شاگرد <span className="text-destructive">*</span></Label>
                <Select value={form.student_id ?? ""} onValueChange={v => setField("student_id", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} — {s.student_code}{s.class?.name ? ` (${s.class.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ماه پرداخت */}
              <div>
                <Label>ماه پرداخت</Label>
                <Select
                  value={form.payment_month ? String(form.payment_month) : ""}
                  onValueChange={v => setField("payment_month", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب ماه" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAMSI_MONTHS.map(m => {
                      const locked = form.payment_year
                        ? isMonthLocked(m.value, Number(form.payment_year))
                        : false;
                      return (
                        <SelectItem
                          key={m.value}
                          value={String(m.value)}
                          disabled={locked}
                        >
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

              {/* سال پرداخت */}
              <div>
                <Label>سال پرداخت</Label>
                <Select
                  value={form.payment_year ? String(form.payment_year) : ""}
                  onValueChange={v => setField("payment_year", v)}
                >
                  <SelectTrigger><SelectValue placeholder="انتخاب سال" /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}{y === academicShamsiYear ? " (سال تحصیلی جاری)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {academicYear && (
                  <p className="text-xs text-muted-foreground mt-1">
                    سال تحصیلی: {academicYear.name}
                  </p>
                )}
              </div>

              {/* مبلغ کل */}
              <div>
                <Label>فیس اصلی (افغانی) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={form.amount ?? ""}
                  onChange={e => setField("amount", e.target.value)}
                  required
                  placeholder="خودکار از صنف"
                />
              </div>

              {/* مبلغ پرداختی */}
              <div>
                <Label>مبلغ پرداختی (افغانی)</Label>
                <Input
                  type="number"
                  value={form.paid_amount ?? ""}
                  onChange={e => setField("paid_amount", e.target.value)}
                  placeholder="خودکار بعد از تخفیف"
                />
                {formDiscount > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    تخفیف: {formDiscount.toLocaleString()} افغانی
                  </p>
                )}
              </div>

              {/* تاریخ پرداخت */}
              <div>
                <Label>تاریخ پرداخت</Label>
                <DatePickerShamsi value={form.payment_date ?? ""} onChange={v => setField("payment_date", v)} />
              </div>

              {/* وضعیت */}
              <div>
                <Label>وضعیت</Label>
                <Select value={form.status ?? "paid"} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* شماره رسید */}
              <div>
                <Label>شماره رسید</Label>
                <Input
                  value={form.receipt_number ?? ""}
                  onChange={e => setField("receipt_number", e.target.value)}
                />
              </div>

              {/* یادداشت */}
              <div className="md:col-span-2">
                <Label>یادداشت</Label>
                <Textarea value={form.notes ?? ""} onChange={e => setField("notes", e.target.value)} />
              </div>

              {/* ───── پرداخت‌های اضافی ───── */}
              <div className="md:col-span-2">
                <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">پرداخت‌های اضافی (اختیاری)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* فیس ترانسپورت */}
                    <div>
                      <Label>فیس ترانسپورت (افغانی)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.transport_fee ?? ""}
                        onChange={e => setField("transport_fee", e.target.value)}
                        placeholder="0"
                      />
                      {(() => {
                        const st = (students as any[]).find((s: any) => s.id === form.student_id);
                        const transport = Array.isArray(st?.transport) ? st.transport[0] : st?.transport;
                        const routeName = transport?.route?.route_name;
                        const rawFee = transport?.route?.monthly_fee;
                        if (!routeName) return null;
                        return (
                          <p className="text-xs text-muted-foreground mt-1">
                            مسیر: <span className="font-medium text-foreground">{routeName}</span>
                            {rawFee != null && ` — فیس اصلی: ${Number(rawFee).toLocaleString()} افغانی`}
                          </p>
                        );
                      })()}
                    </div>

                    {/* فروش کتاب */}
                    <div>
                      <Label>کتاب</Label>
                      <Select
                        value={form.book_id ?? ""}
                        onValueChange={v => {
                          const book = (books as any[]).find((b: any) => b.id === v);
                          // isbn = قیمت فروش در LibraryPage
                          const sellPrice = book?.isbn ? Number(book.isbn) : 0;
                          setField("book_id", v);
                          setField("book_sale_amount", sellPrice > 0 ? String(sellPrice) : "");
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="انتخاب کتاب" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— بدون کتاب —</SelectItem>
                          {(books as any[]).map((b: any) => (
                            <SelectItem key={b.id} value={b.id} disabled={b.available_copies != null && Number(b.available_copies) === 0}>
                              {b.title}
                              {b.isbn ? ` — ${Number(b.isbn).toLocaleString()} افغانی` : ""}
                              {b.available_copies != null && Number(b.available_copies) === 0 ? " (ناموجود)" : b.available_copies != null ? ` (${b.available_copies} عدد)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.book_id && form.book_id !== "none" && (
                        <div className="mt-1.5">
                          <Label className="text-xs">قیمت فروش کتاب (افغانی)</Label>
                          <Input
                            type="number" min={0}
                            value={form.book_sale_amount ?? ""}
                            onChange={e => setField("book_sale_amount", e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {/* فروش یونیفورم */}
                    <div>
                      <Label>یونیفورم</Label>
                      <Select
                        value={form.uniform_id ?? ""}
                        onValueChange={v => {
                          const uni = (uniforms as any[]).find((u: any) => u.id === v);
                          setField("uniform_id", v);
                          setField("uniform_sale_amount", uni?.price ? String(Number(uni.price)) : "");
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="انتخاب یونیفورم" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— بدون یونیفورم —</SelectItem>
                          {(uniforms as any[]).map((u: any) => (
                            <SelectItem key={u.id} value={u.id} disabled={u.stock != null && Number(u.stock) === 0}>
                              {u.name}{u.size ? ` (${u.size})` : ""}
                              {u.price ? ` — ${Number(u.price).toLocaleString()} افغانی` : ""}
                              {u.stock != null && Number(u.stock) === 0 ? " (ناموجود)" : u.stock != null ? ` (${u.stock} عدد)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.uniform_id && form.uniform_id !== "none" && (
                        <div className="mt-1.5">
                          <Label className="text-xs">قیمت فروش یونیفورم (افغانی)</Label>
                          <Input
                            type="number" min={0}
                            value={form.uniform_sale_amount ?? ""}
                            onChange={e => setField("uniform_sale_amount", e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {/* آی‌دی کارت */}
                    <div>
                      <Label>فیس آی‌دی کارت (افغانی)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.id_card_fee ?? ""}
                        onChange={e => setField("id_card_fee", e.target.value)}
                        placeholder="0"
                      />
                    </div>

                  </div>

                  {/* مجموع کل */}
                  {(Number(form.transport_fee || 0) + Number(form.book_sale_amount || 0) + Number(form.uniform_sale_amount || 0) + Number(form.id_card_fee || 0)) > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-primary/5 border-primary/20 text-sm font-semibold text-primary">
                      <span>مجموع پرداخت‌های اضافی:</span>
                      <span>
                        {(Number(form.transport_fee || 0) + Number(form.book_sale_amount || 0) + Number(form.uniform_sale_amount || 0) + Number(form.id_card_fee || 0)).toLocaleString()} افغانی
                      </span>
                    </div>
                  )}
                </div>
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
