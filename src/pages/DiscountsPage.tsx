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
import { Plus, Pencil, Trash2, Loader2, Search, Info } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import { isoToShamsi, todayShamsi, shamsiToIso } from "@/lib/shamsi";
import { generateNextIdClient } from "@/components/CrudPage";

const DISCOUNT_TYPE = [
  { value: "amount", label: "مبلغ ثابت (افغانی)" },
  { value: "percent", label: "درصد (%)" },
];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso);
  if (!s) return "—";
  return `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
}

function isExpired(endDate?: string): boolean {
  if (!endDate) return false;
  const today = todayShamsi();
  const todayIso = shamsiToIso(today.year, today.month, today.day);
  return endDate < todayIso;
}

function calcDiscountedFee(fee: number, discountType: string, value: number): number {
  if (discountType === "percent") return Math.max(0, fee - (fee * value / 100));
  return Math.max(0, fee - value);
}

export default function DiscountsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  // اطلاعات شاگرد انتخاب‌شده
  const [selectedStudentFee, setSelectedStudentFee] = useState<number | null>(null);
  const [selectedStudentClass, setSelectedStudentClass] = useState<string>("");
  const [selectedTransportFee, setSelectedTransportFee] = useState<number | null>(null);
  const [selectedRouteName, setSelectedRouteName] = useState<string>("");

  // بارگیری تخفیف‌ها
  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ["student_discounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_discounts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // بارگیری شاگردان (با صنف و ترانسپورت)
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-discount"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select(`
          id, full_name, student_code, current_class_id,
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

  // وقتی شاگرد انتخاب شد، فیس صنف و ترانسپورتش را بگیر
  useEffect(() => {
    if (form.student_id) {
      const st = students.find((s: any) => s.id === form.student_id);
      if (st?.class?.fee_amount != null) {
        setSelectedStudentFee(Number(st.class.fee_amount));
        setSelectedStudentClass(st.class.name ?? "");
      } else {
        setSelectedStudentFee(null);
        setSelectedStudentClass("");
      }
      const transport = Array.isArray(st?.transport) ? st.transport[0] : st?.transport;
      if (transport?.route?.monthly_fee != null) {
        setSelectedTransportFee(Number(transport.route.monthly_fee));
        setSelectedRouteName(transport.route.route_name ?? "");
      } else {
        setSelectedTransportFee(null);
        setSelectedRouteName("");
      }
    } else {
      setSelectedStudentFee(null);
      setSelectedStudentClass("");
      setSelectedTransportFee(null);
      setSelectedRouteName("");
    }
  }, [form.student_id, students]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const cleaned = {
        discount_code: payload.discount_code || null,
        student_id: payload.student_id || null,
        // تخفیف فیس صنف
        discount_type: payload.discount_type || "amount",
        value: payload.value ? Number(payload.value) : 0,
        // تخفیف ترانسپورت (جداگانه)
        transport_discount_type: payload.transport_discount_type || null,
        transport_discount_value: payload.transport_discount_value ? Number(payload.transport_discount_value) : 0,
        reason: payload.reason || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        is_active: payload.is_active !== "false",
      };
      if (editing?.id) {
        const { error } = await (supabase as any).from("student_discounts").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("student_discounts").insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "تخفیف اضافه شد");
      qc.invalidateQueries({ queryKey: ["student_discounts"] });
      setOpen(false); setEditing(null); setForm({});
      setSelectedStudentFee(null); setSelectedStudentClass("");
      setSelectedTransportFee(null); setSelectedRouteName("");
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("student_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["student_discounts"] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  async function startCreate() {
    setEditing(null);
    setSelectedStudentFee(null); setSelectedStudentClass("");
    setSelectedTransportFee(null); setSelectedRouteName("");
    const code = await generateNextIdClient("discount");
    setForm({ discount_code: code ?? "", is_active: "true" });
    setOpen(true);
  }

  function startEdit(row: any) {
    setEditing(row);
    setForm({ ...row, is_active: row.is_active ? "true" : "false" });
    const st = students.find((s: any) => s.id === row.student_id);
    setSelectedStudentFee(st?.class?.fee_amount != null ? Number(st.class.fee_amount) : null);
    setSelectedStudentClass(st?.class?.name ?? "");
    const transport = Array.isArray(st?.transport) ? st.transport[0] : st?.transport;
    setSelectedTransportFee(transport?.route?.monthly_fee != null ? Number(transport.route.monthly_fee) : null);
    setSelectedRouteName(transport?.route?.route_name ?? "");
    setOpen(true);
  }

  function setField(name: string, value: any) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // محاسبه فیس صنف بعد از تخفیف
  const discountedFee = selectedStudentFee != null && form.discount_type && form.value
    ? calcDiscountedFee(selectedStudentFee, form.discount_type, Number(form.value))
    : null;

  // محاسبه فیس ترانسپورت بعد از تخفیف جداگانه
  const discountedTransportFee = selectedTransportFee != null && form.transport_discount_type && form.transport_discount_value
    ? calcDiscountedFee(selectedTransportFee, form.transport_discount_type, Number(form.transport_discount_value))
    : null;

  const filteredDiscounts = search
    ? discounts.filter((d: any) => {
        const st = students.find((s: any) => s.id === d.student_id);
        return (
          st?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.discount_code?.toLowerCase().includes(search.toLowerCase())
        );
      })
    : discounts;

  return (
    <div>
      <PageHeader
        title="تخفیف شاگردان"
        description="برای شاگردان واجد شرایط تخفیف ثبت کنید"
        action={<Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> افزودن</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ تخفیفی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">کد تخفیف</TableHead>
                  <TableHead className="text-right">شاگرد</TableHead>
                  <TableHead className="text-right">فیس صنف</TableHead>
                  <TableHead className="text-right">نوع تخفیف فیس</TableHead>
                  <TableHead className="text-right">مقدار تخفیف فیس</TableHead>
                  <TableHead className="text-right">فیس بعد تخفیف</TableHead>
                  <TableHead className="text-right">فیس ترانسپورت</TableHead>
                  <TableHead className="text-right">نوع تخفیف ترانسپورت</TableHead>
                  <TableHead className="text-right">مقدار تخفیف ترانسپورت</TableHead>
                  <TableHead className="text-right">ترانسپورت بعد تخفیف</TableHead>
                  <TableHead className="text-right">تاریخ پایان</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.map((d: any) => {
                  const expired = isExpired(d.end_date);
                  const st = students.find((s: any) => s.id === d.student_id);
                  const fee = st?.class?.fee_amount != null ? Number(st.class.fee_amount) : null;
                  const afterFeeDiscount = fee != null && d.discount_type && d.value
                    ? calcDiscountedFee(fee, d.discount_type, Number(d.value))
                    : null;
                  const transport = Array.isArray(st?.transport) ? st.transport[0] : st?.transport;
                  const transportFee = transport?.route?.monthly_fee != null ? Number(transport.route.monthly_fee) : null;
                  const afterTransportDiscount = transportFee != null && d.transport_discount_type && d.transport_discount_value
                    ? calcDiscountedFee(transportFee, d.transport_discount_type, Number(d.transport_discount_value))
                    : null;
                  const active = d.is_active && !expired;

                  return (
                    <TableRow key={d.id} className={expired ? "opacity-60" : ""}>
                      <TableCell><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{d.discount_code ?? "—"}</span></TableCell>
                      <TableCell className="font-medium">{st?.full_name ?? "—"}</TableCell>
                      <TableCell>{fee != null ? `${fee.toLocaleString()} افغانی` : "—"}</TableCell>
                      <TableCell>{DISCOUNT_TYPE.find(t => t.value === d.discount_type)?.label ?? "—"}</TableCell>
                      <TableCell>
                        {d.discount_type === "percent" ? `${d.value}%` : d.value ? `${Number(d.value).toLocaleString()} افغانی` : "—"}
                      </TableCell>
                      <TableCell>
                        {afterFeeDiscount != null
                          ? <span className="font-semibold text-green-700">{afterFeeDiscount.toLocaleString()} افغانی</span>
                          : "—"}
                      </TableCell>
                      <TableCell>{transportFee != null ? `${transportFee.toLocaleString()} افغانی` : "—"}</TableCell>
                      <TableCell>{DISCOUNT_TYPE.find(t => t.value === d.transport_discount_type)?.label ?? "—"}</TableCell>
                      <TableCell>
                        {d.transport_discount_type === "percent"
                          ? `${d.transport_discount_value}%`
                          : d.transport_discount_value ? `${Number(d.transport_discount_value).toLocaleString()} افغانی` : "—"}
                      </TableCell>
                      <TableCell>
                        {afterTransportDiscount != null
                          ? <span className="font-semibold text-orange-700">{afterTransportDiscount.toLocaleString()} افغانی</span>
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {d.end_date ? (
                          <span className={expired ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {fmtDate(d.end_date)}{expired && " (منقضی)"}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"} className="text-xs">
                          {expired ? "منقضی" : d.is_active ? "فعال" : "غیرفعال"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => startEdit(d)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(d.id); }}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش تخفیف" : "افزودن تخفیف"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* کد تخفیف */}
              <div>
                <Label>کد تخفیف</Label>
                <Input value={form.discount_code ?? ""} onChange={e => setField("discount_code", e.target.value)} />
              </div>

              {/* شاگرد */}
              <div>
                <Label>شاگرد <span className="text-destructive">*</span></Label>
                <Select value={form.student_id ?? ""} onValueChange={v => setField("student_id", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {(students as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} — {s.student_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ───── بخش تخفیف فیس صنف ───── */}
              <div className="md:col-span-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <Info className="w-4 h-4" /> تخفیف فیس صنف
                  </p>

                  {/* فیس صنف — نمایش خودکار */}
                  {form.student_id && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${selectedStudentFee != null ? "bg-white border-blue-200" : "bg-muted/40 border-muted"}`}>
                      {selectedStudentFee != null ? (
                        <span>فیس صنف <strong>{selectedStudentClass}</strong>: <strong className="text-primary">{selectedStudentFee.toLocaleString()} افغانی</strong></span>
                      ) : (
                        <span className="text-muted-foreground">این شاگرد صنف ندارد یا صنفش فیس ندارد</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>نوع تخفیف فیس <span className="text-destructive">*</span></Label>
                      <Select value={form.discount_type ?? ""} onValueChange={v => setField("discount_type", v)}>
                        <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_TYPE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>مقدار تخفیف فیس <span className="text-destructive">*</span></Label>
                      <Input type="number" min={0} value={form.value ?? ""} onChange={e => setField("value", e.target.value)} required />
                    </div>
                  </div>

                  {/* فیس بعد از تخفیف */}
                  {discountedFee != null && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-green-50 border-green-300 text-sm font-semibold text-green-700">
                      <span>فیس بعد از تخفیف:</span>
                      <span>
                        {discountedFee.toLocaleString()} افغانی
                        <span className="text-xs font-normal text-muted-foreground mr-2">
                          (تخفیف: {form.discount_type === "percent"
                            ? `${form.value}% = ${(selectedStudentFee! * Number(form.value) / 100).toLocaleString()} افغانی`
                            : `${Number(form.value).toLocaleString()} افغانی`})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ───── بخش تخفیف ترانسپورت ───── */}
              <div className="md:col-span-2">
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <Info className="w-4 h-4" /> تخفیف ترانسپورت
                  </p>

                  {/* فیس ترانسپورت — نمایش خودکار */}
                  {form.student_id && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${selectedTransportFee != null ? "bg-white border-orange-200" : "bg-muted/40 border-muted"}`}>
                      {selectedTransportFee != null ? (
                        <span>فیس ترانسپورت مسیر <strong>{selectedRouteName}</strong>: <strong className="text-orange-700">{selectedTransportFee.toLocaleString()} افغانی</strong></span>
                      ) : (
                        <span className="text-muted-foreground">این شاگرد ترانسپورت ندارد</span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>نوع تخفیف ترانسپورت</Label>
                      <Select value={form.transport_discount_type ?? ""} onValueChange={v => setField("transport_discount_type", v)}>
                        <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                        <SelectContent>
                          {DISCOUNT_TYPE.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>مقدار تخفیف ترانسپورت</Label>
                      <Input
                        type="number" min={0}
                        value={form.transport_discount_value ?? ""}
                        onChange={e => setField("transport_discount_value", e.target.value)}
                        disabled={!form.transport_discount_type}
                      />
                    </div>
                  </div>

                  {/* فیس ترانسپورت بعد از تخفیف */}
                  {discountedTransportFee != null && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-orange-50 border-orange-300 text-sm font-semibold text-orange-700">
                      <span>ترانسپورت بعد از تخفیف:</span>
                      <span>
                        {discountedTransportFee.toLocaleString()} افغانی
                        <span className="text-xs font-normal text-muted-foreground mr-2">
                          (تخفیف: {form.transport_discount_type === "percent"
                            ? `${form.transport_discount_value}% = ${(selectedTransportFee! * Number(form.transport_discount_value) / 100).toLocaleString()} افغانی`
                            : `${Number(form.transport_discount_value).toLocaleString()} افغانی`})
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* دلیل */}
              <div className="md:col-span-2">
                <Label>دلیل</Label>
                <Textarea value={form.reason ?? ""} onChange={e => setField("reason", e.target.value)} />
              </div>

              {/* تاریخ شروع */}
              <div>
                <Label>تاریخ شروع</Label>
                <DatePickerShamsi value={form.start_date ?? ""} onChange={v => setField("start_date", v)} />
              </div>

              {/* تاریخ پایان */}
              <div>
                <Label>تاریخ پایان</Label>
                <DatePickerShamsi value={form.end_date ?? ""} onChange={v => setField("end_date", v)} />
                <p className="text-xs text-muted-foreground mt-1">بعد از این تاریخ تخفیف خودکار غیرفعال می‌شود</p>
              </div>

              {/* وضعیت */}
              <div>
                <Label>وضعیت</Label>
                <Select value={form.is_active ?? "true"} onValueChange={v => setField("is_active", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">فعال</SelectItem>
                    <SelectItem value="false">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
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
