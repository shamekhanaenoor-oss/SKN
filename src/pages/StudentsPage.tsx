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
import { Plus, Pencil, Trash2, Loader2, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import ProvinceDistrictSelector from "@/components/ProvinceDistrictSelector";
import { isoToShamsi, calcAgeFromIso } from "@/lib/shamsi";
import { generateNextIdClient } from "@/components/CrudPage";

const GENDER = [{ value: "male", label: "مرد" }, { value: "female", label: "زن" }];
const YES_NO = [{ value: "true", label: "بلی" }, { value: "false", label: "نخیر" }];
const ENROLLMENT_TYPE = [
  { value: "new", label: "جدید" },
  { value: "transfer", label: "سه‌پارچه (انتقالی از مکتب دیگر)" },
  { value: "returning", label: "مربوطه (شاگرد قبلی)" },
];

const ENROLLMENT_BADGE: Record<string, string> = {
  new: "border-green-300 text-green-700 bg-green-50",
  transfer: "border-orange-300 text-orange-700 bg-orange-50",
  returning: "border-purple-300 text-purple-700 bg-purple-50",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso);
  if (!s) return "—";
  return `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
}

export default function StudentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  // فیس صنف انتخاب‌شده
  const [classFee, setClassFee] = useState<number | null>(null);
  // ترانسپورت
  const [transportEnabled, setTransportEnabled] = useState<string>("false");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");

  // بارگیری شاگردان
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("students")
        .select(`
          id, student_code, full_name, father_name, grandfather_name,
          gender, enrollment_type, date_of_birth, tazkira_number,
          phone, father_phone, mother_phone, whatsapp_number,
          province, district, village, blood_group,
          admission_date, current_class_id, address, notes,
          class:classes(id,name,section,fee_amount)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        father_phone: s.father_phone ?? s.phone ?? null,
        mother_phone: s.mother_phone ?? null,
        whatsapp_number: s.whatsapp_number ?? null,
      }));
    },
  });

  // بارگیری صنف‌ها
  const { data: classes = [] } = useQuery({
    queryKey: ["ref", "classes"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("classes")
        .select("id,name,section,fee_amount")
        .order("name");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // بارگیری مسیرهای ترانسپورت
  const { data: routes = [] } = useQuery({
    queryKey: ["ref", "transport_routes"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("transport_routes")
        .select("id,route_name,driver_name,monthly_fee")
        .order("route_name");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // وقتی صنف تغییر کرد، فیس را auto-fill کن
  useEffect(() => {
    if (form.current_class_id) {
      const cls = classes.find((c: any) => c.id === form.current_class_id);
      if (cls?.fee_amount != null) {
        setClassFee(Number(cls.fee_amount));
      } else {
        setClassFee(null);
      }
    } else {
      setClassFee(null);
    }
  }, [form.current_class_id, classes]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const cleaned: any = {
        student_code: payload.student_code || null,
        full_name: payload.full_name || null,
        father_name: payload.father_name || null,
        grandfather_name: payload.grandfather_name || null,
        gender: payload.gender || null,
        enrollment_type: payload.enrollment_type || "new",
        date_of_birth: payload.date_of_birth || null,
        tazkira_number: payload.tazkira_number || null,
        phone: payload.father_phone || payload.phone || null,
        father_phone: payload.father_phone || null,
        mother_phone: payload.mother_phone || null,
        whatsapp_number: payload.whatsapp_number || null,
        province: payload.province || null,
        district: payload.district || null,
        village: payload.village || null,
        blood_group: payload.blood_group || null,
        admission_date: payload.admission_date || null,
        current_class_id: payload.current_class_id || null,
        address: payload.address || null,
        notes: payload.notes || null,
      };

      let studentId = editing?.id;
      if (editing?.id) {
        const { error } = await (supabase as any).from("students").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("students").insert(cleaned).select("id").single();
        if (error) throw error;
        studentId = data.id;
      }

      // مدیریت ترانسپورت
      if (transportEnabled === "true" && selectedRouteId && studentId) {
        // حذف رکورد قبلی (اگر وجود داشت) و ثبت جدید
        await (supabase as any).from("student_transport").delete().eq("student_id", studentId);
        await (supabase as any).from("student_transport").insert({
          student_id: studentId,
          route_id: selectedRouteId,
          start_date: new Date().toISOString().slice(0, 10),
          is_active: true,
        });
      } else if (transportEnabled === "false" && studentId) {
        // اگر نخیر انتخاب شد، رکورد ترانسپورت را حذف کن
        await (supabase as any).from("student_transport").delete().eq("student_id", studentId);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "شاگرد اضافه شد");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["transport-list"] });
      setOpen(false); setEditing(null); setForm({}); setClassFee(null);
      setTransportEnabled("false"); setSelectedRouteId("");
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["students"] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  async function startCreate() {
    setEditing(null);
    setClassFee(null);
    setTransportEnabled("false");
    setSelectedRouteId("");
    const code = await generateNextIdClient("student");
    setForm({ student_code: code ?? "", enrollment_type: "new" });
    setOpen(true);
  }

  async function startEdit(row: any) {
    setEditing(row);
    setForm({ ...row });
    const cls = classes.find((c: any) => c.id === row.current_class_id);
    setClassFee(cls?.fee_amount != null ? Number(cls.fee_amount) : null);

    // بارگیری وضعیت ترانسپورت شاگرد
    const { data: tData } = await (supabase as any)
      .from("student_transport")
      .select("route_id")
      .eq("student_id", row.id)
      .eq("is_active", true)
      .maybeSingle();
    if (tData?.route_id) {
      setTransportEnabled("true");
      setSelectedRouteId(tData.route_id);
    } else {
      setTransportEnabled("false");
      setSelectedRouteId("");
    }
    setOpen(true);
  }

  function setField(name: string, value: any) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const age = form.date_of_birth ? calcAgeFromIso(form.date_of_birth) : null;

  function openWhatsApp(phone: string) {
    if (!phone) return;
    let num = phone.replace(/[\s()\-]/g, "");
    if (num.startsWith("0")) num = "93" + num.slice(1);
    else if (num.startsWith("+")) num = num.slice(1);
    window.open("https://wa.me/" + num, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="شاگردان"
        action={<Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> افزودن</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ شاگردی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">کد</TableHead>
                  <TableHead className="text-right">نام کامل</TableHead>
                  <TableHead className="text-right">نام پدر</TableHead>
                  <TableHead className="text-right">نوع ثبت‌نام</TableHead>
                  <TableHead className="text-right">جنسیت</TableHead>
                  <TableHead className="text-right">صنف</TableHead>
                  <TableHead className="text-right">فیس (افغانی)</TableHead>
                  <TableHead className="text-right">نمبر پدر</TableHead>
                  <TableHead className="text-right">واتساپ</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.student_code ?? "—"}</span></TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.father_name ?? "—"}</TableCell>
                    <TableCell>
                      {s.enrollment_type ? (
                        <Badge variant="outline" className={`text-xs font-normal ${ENROLLMENT_BADGE[s.enrollment_type] ?? ""}`}>
                          {ENROLLMENT_TYPE.find(e => e.value === s.enrollment_type)?.label ?? s.enrollment_type}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{s.gender === "male" ? "مرد" : s.gender === "female" ? "زن" : "—"}</TableCell>
                    <TableCell>
                      {s.class ? (
                        <Badge variant="secondary" className="font-normal">
                          {s.class.name}{s.class.section ? ` (${s.class.section})` : ""}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {s.class?.fee_amount != null ? (
                        <span className="font-semibold text-primary">
                          {Number(s.class.fee_amount).toLocaleString()} افغانی
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{s.father_phone ?? s.phone ?? "—"}</TableCell>
                    <TableCell>
                      {(s.whatsapp_number || s.father_phone || s.phone) ? (
                        <Button
                          size="icon" variant="ghost"
                          title="ارسال واتساپ"
                          onClick={() => openWhatsApp(s.whatsapp_number || s.father_phone || s.phone)}
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(s.id); }}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش شاگرد" : "افزودن شاگرد"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ overflow: "visible" }}>

              {/* کد شاگرد */}
              <div>
                <Label>کد شاگرد <span className="text-destructive">*</span></Label>
                <Input value={form.student_code ?? ""} onChange={e => setField("student_code", e.target.value)} required />
              </div>

              {/* نام کامل */}
              <div>
                <Label>نام کامل <span className="text-destructive">*</span></Label>
                <Input value={form.full_name ?? ""} onChange={e => setField("full_name", e.target.value)} required />
              </div>

              {/* نام پدر */}
              <div>
                <Label>نام پدر</Label>
                <Input value={form.father_name ?? ""} onChange={e => setField("father_name", e.target.value)} />
              </div>

              {/* نام پدرکلان */}
              <div>
                <Label>نام پدرکلان</Label>
                <Input value={form.grandfather_name ?? ""} onChange={e => setField("grandfather_name", e.target.value)} />
              </div>

              {/* جنسیت */}
              <div>
                <Label>جنسیت</Label>
                <Select value={form.gender ?? ""} onValueChange={v => setField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {GENDER.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* نوع ثبت‌نام */}
              <div>
                <Label>نوع ثبت‌نام <span className="text-destructive">*</span></Label>
                <Select value={form.enrollment_type ?? "new"} onValueChange={v => setField("enrollment_type", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {ENROLLMENT_TYPE.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* تاریخ تولد + سن */}
              <div>
                <Label>تاریخ تولد</Label>
                <DatePickerShamsi value={form.date_of_birth ?? ""} onChange={v => setField("date_of_birth", v)} />
                {age && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">سن:</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {age.years} سال{age.months > 0 ? ` و ${age.months} ماه` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* شماره تذکره */}
              <div>
                <Label>شماره تذکره</Label>
                <Input value={form.tazkira_number ?? ""} onChange={e => setField("tazkira_number", e.target.value)} />
              </div>

              {/* نمبر پدر */}
              <div>
                <Label>نمبر پدر</Label>
                <Input type="tel" value={form.father_phone ?? form.phone ?? ""} onChange={e => setField("father_phone", e.target.value)} placeholder="مثال: 0700000000" />
              </div>

              {/* نمبر مادر */}
              <div>
                <Label>نمبر مادر</Label>
                <Input type="tel" value={form.mother_phone ?? ""} onChange={e => setField("mother_phone", e.target.value)} placeholder="مثال: 0700000000" />
              </div>

              {/* نمبر واتساپ */}
              <div>
                <Label>نمبر واتساپ</Label>
                <div className="relative">
                  <Input
                    type="tel"
                    value={form.whatsapp_number ?? ""}
                    onChange={e => setField("whatsapp_number", e.target.value)}
                    placeholder="مثال: 0700000000"
                    className="pl-9"
                  />
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">این نمبر برای ارسال رسید فیس استفاده می‌شود</p>
              </div>

              {/* ولایت و ولسوالی */}
              <ProvinceDistrictSelector
                province={form.province ?? ""}
                district={form.district ?? ""}
                onProvinceChange={v => setField("province", v)}
                onDistrictChange={v => setField("district", v)}
              />

              {/* قریه */}
              <div>
                <Label>قریه</Label>
                <Input value={form.village ?? ""} onChange={e => setField("village", e.target.value)} />
              </div>

              {/* گروه خون */}
              <div>
                <Label>گروه خون</Label>
                <Input value={form.blood_group ?? ""} onChange={e => setField("blood_group", e.target.value)} />
              </div>

              {/* تاریخ ثبت‌نام */}
              <div>
                <Label>تاریخ ثبت‌نام</Label>
                <DatePickerShamsi value={form.admission_date ?? ""} onChange={v => setField("admission_date", v)} />
              </div>

              {/* صنف فعلی */}
              <div>
                <Label>صنف فعلی</Label>
                <Select value={form.current_class_id ?? ""} onValueChange={v => setField("current_class_id", v)}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` (${c.section})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* فیس — نمایش خودکار از صنف */}
              <div>
                <Label>فیس صنف (افغانی)</Label>
                <div className={`flex items-center h-10 px-3 rounded-md border text-sm ${classFee != null ? "bg-primary/5 border-primary/30 font-semibold text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                  {classFee != null
                    ? `${classFee.toLocaleString()} افغانی`
                    : form.current_class_id ? "این صنف فیس ندارد" : "ابتدا صنف را انتخاب کنید"}
                </div>
              </div>

              {/* ترانسپورت */}
              <div>
                <Label>ترانسپورت</Label>
                <Select value={transportEnabled} onValueChange={v => { setTransportEnabled(v); if (v === "false") setSelectedRouteId(""); }}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {YES_NO.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* مسیر ترانسپورت — فقط وقتی بلی انتخاب شده */}
              {transportEnabled === "true" && (
                <div>
                  <Label>مسیر <span className="text-destructive">*</span></Label>
                  <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                    <SelectTrigger><SelectValue placeholder="انتخاب مسیر" /></SelectTrigger>
                    <SelectContent>
                      {(routes as any[]).map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.route_name}{r.driver_name ? ` — ${r.driver_name}` : ""}
                          {r.monthly_fee ? ` (${Number(r.monthly_fee).toLocaleString()} افغانی)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* آدرس */}
              <div className="md:col-span-2">
                <Label>آدرس</Label>
                <Textarea value={form.address ?? ""} onChange={e => setField("address", e.target.value)} />
              </div>

              {/* یادداشت */}
              <div className="md:col-span-2">
                <Label>یادداشت</Label>
                <Textarea value={form.notes ?? ""} onChange={e => setField("notes", e.target.value)} />
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
