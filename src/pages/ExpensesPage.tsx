import { useState } from "react";
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
import { Plus, Pencil, Trash2, Loader2, Search, TrendingDown, Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import { isoToShamsi, todayShamsi, shamsiToIso } from "@/lib/shamsi";
import { useSchoolProfile } from "@/lib/school-profile";

const CATEGORIES = [
  { value: "salary",      label: "معاش" },
  { value: "utilities",   label: "برق و آب" },
  { value: "rent",        label: "کرایه" },
  { value: "stationery",  label: "قرطاسیه" },
  { value: "maintenance", label: "ترمیم و نگهداری" },
  { value: "transport",   label: "ترانسپورت" },
  { value: "food",        label: "خوراکه" },
  { value: "equipment",   label: "تجهیزات" },
  { value: "other",       label: "سایر" },
];

const CATEGORY_COLORS: Record<string, string> = {
  salary:      "bg-blue-50 text-blue-700 border-blue-200",
  utilities:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  rent:        "bg-purple-50 text-purple-700 border-purple-200",
  stationery:  "bg-green-50 text-green-700 border-green-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  transport:   "bg-cyan-50 text-cyan-700 border-cyan-200",
  food:        "bg-pink-50 text-pink-700 border-pink-200",
  equipment:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  other:       "bg-gray-50 text-gray-600 border-gray-200",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso);
  if (!s) return "—";
  return `${s.year}/${String(s.month).padStart(2, "0")}/${String(s.day).padStart(2, "0")}`;
}

function todayIso() {
  const t = todayShamsi();
  return shamsiToIso(t.year, t.month, t.day) ?? "";
}

// ===== پرینت A4 =====
function handlePrint(
  expenses: any[],
  fromDate: string,
  toDate: string,
  totalAmount: number,
  byCategory: { label: string; total: number }[],
  schoolName: string
) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { toast.error("پنجره پرینت باز نشد"); return; }

  const t = todayShamsi();
  const printDate = `${t.year}/${String(t.month).padStart(2,"0")}/${String(t.day).padStart(2,"0")}`;

  const rows = expenses.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmtDate(e.expense_date)}</td>
      <td>${e.title ?? "—"}</td>
      <td>${CATEGORIES.find(c => c.value === e.category)?.label ?? e.category ?? "—"}</td>
      <td class="amount">${Number(e.amount || 0).toLocaleString()} افغانی</td>
      <td>${e.paid_to ?? "—"}</td>
      <td>${e.description ?? "—"}</td>
    </tr>
  `).join("");

  const catRows = byCategory.map(c => `
    <span class="cat-badge">${c.label}: ${c.total.toLocaleString()} افغانی</span>
  `).join("");

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>گزارش مصارف</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Vazirmatn',Tahoma,sans-serif; direction:rtl; font-size:11px; padding:20px; color:#111; }
  .header { text-align:center; border-bottom:2px solid #333; padding-bottom:10px; margin-bottom:14px; }
  .header h1 { font-size:18px; font-weight:700; }
  .header p { font-size:11px; color:#555; margin-top:3px; }
  .meta { display:flex; justify-content:space-between; margin-bottom:12px; font-size:11px; color:#444; }
  .summary { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; padding:10px; background:#f9f9f9; border:1px solid #ddd; border-radius:6px; }
  .summary .total { font-size:13px; font-weight:700; color:#c0392b; width:100%; margin-bottom:4px; }
  .cat-badge { display:inline-block; padding:2px 8px; border:1px solid #ccc; border-radius:4px; font-size:10px; background:#fff; }
  table { width:100%; border-collapse:collapse; font-size:10.5px; }
  th { background:#2d3748; color:#fff; padding:7px 6px; text-align:right; font-weight:600; }
  td { padding:6px; border-bottom:1px solid #e2e8f0; text-align:right; vertical-align:top; }
  tr:nth-child(even) td { background:#f7fafc; }
  .amount { font-weight:600; color:#c0392b; white-space:nowrap; }
  tfoot td { background:#edf2f7; font-weight:700; border-top:2px solid #333; }
  .footer { text-align:center; font-size:9px; color:#888; margin-top:14px; border-top:1px solid #ccc; padding-top:6px; }
  @media print {
    body { padding:10px; }
    @page { size:A4; margin:15mm; }
  }
</style></head><body>
<div class="header">
  <h1>${schoolName || "سیستم مکتب"}</h1>
  <p>گزارش مصارف‌ها</p>
</div>
<div class="meta">
  <span>از تاریخ: <strong>${fmtDate(fromDate)}</strong> تا تاریخ: <strong>${fmtDate(toDate)}</strong></span>
  <span>تاریخ چاپ: ${printDate}</span>
</div>
<div class="summary">
  <div class="total">مجموع کل مصارف: ${totalAmount.toLocaleString()} افغانی</div>
  ${catRows}
</div>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>تاریخ</th>
      <th>عنوان</th>
      <th>دسته‌بندی</th>
      <th>مبلغ</th>
      <th>پرداخت به</th>
      <th>توضیحات</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr>
      <td colspan="4" style="text-align:right">مجموع کل</td>
      <td class="amount">${totalAmount.toLocaleString()} افغانی</td>
      <td colspan="2"></td>
    </tr>
  </tfoot>
</table>
<div class="footer">تعداد رکوردها: ${expenses.length}</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { school_name, founder_whatsapp } = useSchoolProfile();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  // فیلتر تاریخ
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", search, fromDate, toDate],
    queryFn: async () => {
      let q = (supabase as any)
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .limit(1000);
      if (search)   q = q.ilike("title", `%${search}%`);
      if (fromDate) q = q.gte("expense_date", fromDate);
      if (toDate)   q = q.lte("expense_date", toDate);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // مجموع کل (فیلترشده)
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  // مجموع به تفکیک دسته‌بندی
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses
      .filter((e: any) => e.category === cat.value)
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0),
  })).filter(c => c.total > 0);

  // گروه‌بندی بر اساس تاریخ
  const byDate: Record<string, { items: any[]; total: number }> = {};
  for (const e of expenses as any[]) {
    const d = e.expense_date ?? "نامشخص";
    if (!byDate[d]) byDate[d] = { items: [], total: 0 };
    byDate[d].items.push(e);
    byDate[d].total += Number(e.amount || 0);
  }
  const dateGroups = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const cleaned = {
        expense_date: payload.expense_date || todayIso(),
        title:        payload.title || "",
        category:     payload.category || null,
        amount:       payload.amount ? Number(payload.amount) : 0,
        paid_to:      payload.paid_to || null,
        description:  payload.description || null,
      };
      if (editing?.id) {
        const { error } = await (supabase as any).from("expenses").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("expenses").insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "مصرف ثبت شد");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  function startCreate() {
    setEditing(null);
    setForm({ expense_date: todayIso() });
    setOpen(true);
  }

  function startEdit(row: any) {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  }

  function setField(name: string, value: any) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleWhatsApp() {
    if (!founder_whatsapp) {
      toast.error("شماره واتساپ موسس در تنظیمات ثبت نشده است");
      return;
    }
    let phone = founder_whatsapp.replace(/[\s\-\(\)]/g, "");
    if (phone.startsWith("0")) phone = "93" + phone.slice(1);
    if (phone.startsWith("+")) phone = phone.slice(1);

    const t = todayShamsi();
    const today = `${t.year}/${String(t.month).padStart(2,"0")}/${String(t.day).padStart(2,"0")}`;
    const rangeLabel = fromDate || toDate
      ? `از ${fmtDate(fromDate) !== "—" ? fmtDate(fromDate) : "ابتدا"} تا ${fmtDate(toDate) !== "—" ? fmtDate(toDate) : "اکنون"}`
      : "همه رکوردها";

    const catLines = byCategory.map(c => `  • ${c.label}: ${c.total.toLocaleString()} افغانی`).join("\n");

    const topItems = (expenses as any[]).slice(0, 10).map((e: any, i: number) =>
      `  ${i + 1}. ${fmtDate(e.expense_date)} — ${e.title} — ${Number(e.amount || 0).toLocaleString()} افغانی`
    ).join("\n");

    const msg = [
      `🏫 *${school_name || "سیستم مکتب"}*`,
      `━━━━━━━━━━━━━━`,
      `📊 *گزارش مصارف‌ها*`,
      `📅 بازه: ${rangeLabel}`,
      `🗓 تاریخ گزارش: ${today}`,
      ``,
      `💸 *مجموع کل: ${totalAmount.toLocaleString()} افغانی*`,
      `📋 تعداد رکوردها: ${expenses.length}`,
      ``,
      byCategory.length > 0 ? `📂 *به تفکیک دسته‌بندی:*\n${catLines}` : null,
      ``,
      expenses.length > 0 ? `📝 *آخرین مصارف:*\n${topItems}` : null,
      expenses.length > 10 ? `  ... و ${expenses.length - 10} مورد دیگر` : null,
      ``,
      `با احترام 🙏`,
    ].filter(v => v !== null).join("\n");

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="مصارف‌ها"
        description="ثبت و مدیریت هزینه‌های مکتب"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="w-4 h-4" /> ارسال به واتساپ موسس
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handlePrint(expenses, fromDate, toDate, totalAmount, byCategory, school_name)}
            >
              <Printer className="w-4 h-4" /> پرینت A4
            </Button>
            <Button onClick={startCreate} className="gap-2">
              <Plus className="w-4 h-4" /> افزودن مصرف
            </Button>
          </div>
        }
      />

      {/* فیلتر تاریخ */}
      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-4" dir="rtl">
          <div>
            <Label className="text-sm mb-1 block">از تاریخ</Label>
            <DatePickerShamsi value={fromDate} onChange={v => setFromDate(v ?? "")} />
          </div>
          <div>
            <Label className="text-sm mb-1 block">تا تاریخ</Label>
            <DatePickerShamsi value={toDate} onChange={v => setToDate(v ?? "")} />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
              پاک کردن فیلتر
            </Button>
          )}
          <span className="text-sm text-muted-foreground pb-1">{expenses.length} رکورد</span>
        </div>
      </Card>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50/50">
          <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">مجموع کل مصارف</p>
            <p className="text-xl font-bold text-red-700">{totalAmount.toLocaleString()} افغانی</p>
          </div>
        </Card>

        {byCategory.length > 0 && (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-2">به تفکیک دسته‌بندی</p>
            <div className="flex flex-wrap gap-2">
              {byCategory.map(c => (
                <div key={c.value} className={`text-xs px-2 py-1 rounded border ${CATEGORY_COLORS[c.value] ?? ""}`}>
                  {c.label}: <span className="font-semibold">{c.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* جستجو */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس عنوان..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* جدول — گروه‌بندی بر اساس تاریخ */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : expenses.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">هیچ مصرفی یافت نشد.</Card>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(([date, group]) => (
            <Card key={date} className="overflow-hidden">
              {/* هدر تاریخ */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b">
                <span className="font-semibold text-sm">{fmtDate(date)}</span>
                <span className="text-sm font-bold text-red-700">
                  {group.total.toLocaleString()} افغانی
                  <span className="text-xs font-normal text-muted-foreground mr-2">
                    ({group.items.length} رکورد)
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان</TableHead>
                      <TableHead className="text-right">دسته‌بندی</TableHead>
                      <TableHead className="text-right">مبلغ</TableHead>
                      <TableHead className="text-right">پرداخت به</TableHead>
                      <TableHead className="text-right">توضیحات</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>
                          {e.category ? (
                            <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[e.category] ?? ""}`}>
                              {CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-red-700">
                            {Number(e.amount || 0).toLocaleString()} افغانی
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.paid_to ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {e.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(e)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(e.id); }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}

          {/* مجموع کل */}
          <div className="flex justify-end">
            <div className="px-5 py-3 rounded-lg border bg-red-50 border-red-200 text-sm font-bold text-red-700">
              مجموع کل: {totalAmount.toLocaleString()} افغانی
            </div>
          </div>
        </div>
      )}

      {/* فرم */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش مصرف" : "افزودن مصرف"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="md:col-span-2">
                <Label>عنوان <span className="text-destructive">*</span></Label>
                <Input value={form.title ?? ""} onChange={e => setField("title", e.target.value)} required placeholder="مثال: خرید قرطاسیه" />
              </div>

              <div>
                <Label>تاریخ <span className="text-destructive">*</span></Label>
                <DatePickerShamsi value={form.expense_date ?? ""} onChange={v => setField("expense_date", v)} />
              </div>

              <div>
                <Label>دسته‌بندی</Label>
                <Select value={form.category ?? ""} onValueChange={v => setField("category", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>مبلغ (افغانی) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.amount ?? ""} onChange={e => setField("amount", e.target.value)} required placeholder="0" />
              </div>

              <div>
                <Label>پرداخت به</Label>
                <Input value={form.paid_to ?? ""} onChange={e => setField("paid_to", e.target.value)} placeholder="نام شخص یا شرکت" />
              </div>

              <div className="md:col-span-2">
                <Label>توضیحات</Label>
                <Textarea value={form.description ?? ""} onChange={e => setField("description", e.target.value)} placeholder="جزئیات بیشتر..." />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
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
