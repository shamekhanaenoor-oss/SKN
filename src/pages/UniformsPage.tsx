import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Search, ShoppingCart, History } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { isoToShamsi } from "@/lib/shamsi";

// ===== فرم افزودن/ویرایش یونیفورم =====
function UniformFormDialog({
  open, onClose, editing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() =>
    editing
      ? {
          name: editing.name ?? "",
          size: editing.size ?? "",
          purchase_price: editing.purchase_price ?? "",
          price: editing.price ?? "",
          stock: editing.stock ?? 0,
          description: editing.description ?? "",
        }
      : { name: "", size: "", purchase_price: "", price: "", stock: 0, description: "" }
  );
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const buy = Number(form.purchase_price || 0);
  const sell = Number(form.price || 0);
  const profit = sell - buy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      size: form.size || null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : 0,
      price: form.price ? Number(form.price) : 0,
      stock: Number(form.stock || 0),
      description: form.description || null,
    };
    let error: any;
    if (editing?.id) {
      ({ error } = await (supabase as any).from("uniforms").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("uniforms").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "ویرایش شد" : "یونیفورم اضافه شد");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش یونیفورم" : "افزودن یونیفورم"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>نام یونیفورم <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} required />
          </div>
          <div>
            <Label>سایز</Label>
            <Input value={form.size} onChange={e => setField("size", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>قیمت خرید (افغانی)</Label>
              <Input type="number" min={0} value={form.purchase_price} onChange={e => setField("purchase_price", e.target.value)} />
            </div>
            <div>
              <Label>قیمت فروش (افغانی)</Label>
              <Input type="number" min={0} value={form.price} onChange={e => setField("price", e.target.value)} />
            </div>
          </div>
          {/* فایده */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm font-semibold ${
            profit > 0 ? "bg-green-50 border-green-300 text-green-700"
            : profit < 0 ? "bg-red-50 border-red-300 text-red-700"
            : "bg-muted border-muted-foreground/20 text-muted-foreground"
          }`}>
            <span>فایده:</span>
            <span>
              {profit > 0 ? `+${profit.toLocaleString()}` : profit < 0 ? profit.toLocaleString() : "—"} افغانی
            </span>
          </div>
          <div>
            <Label>موجودی <span className="text-destructive">*</span></Label>
            <Input type="number" min={0} value={form.stock} onChange={e => setField("stock", e.target.value)} required />
          </div>
          <div>
            <Label>توضیحات</Label>
            <Textarea value={form.description} onChange={e => setField("description", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== پنجره فروش یونیفورم =====
function SellUniformDialog({
  open, onClose, uniform, onSold,
}: {
  open: boolean;
  onClose: () => void;
  uniform: any | null;
  onSold: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-uniform-sale"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id,full_name,student_code")
        .order("full_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const sellPrice = Number(uniform?.price ?? 0);
  const total = sellPrice * qty;
  const available = Number(uniform?.stock ?? 0);

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) { toast.error("لطفاً شاگرد را انتخاب کنید"); return; }
    if (qty < 1) { toast.error("تعداد باید حداقل ۱ باشد"); return; }
    if (qty > available) { toast.error(`موجودی کافی نیست (موجود: ${available})`); return; }

    setSaving(true);

    // ثبت فروش در uniform_sales
    const { error: saleErr } = await (supabase as any).from("uniform_sales").insert({
      uniform_id: uniform.id,
      student_id: studentId,
      quantity: qty,
      unit_price: sellPrice,
      total_amount: total,
      notes: notes || null,
      sale_date: new Date().toISOString().slice(0, 10),
    });

    if (saleErr) { toast.error(saleErr.message); setSaving(false); return; }

    // کم کردن از موجودی
    const { error: updateErr } = await (supabase as any)
      .from("uniforms")
      .update({ stock: available - qty })
      .eq("id", uniform.id);

    setSaving(false);
    if (updateErr) { toast.error(updateErr.message); return; }

    toast.success(`فروش ثبت شد — ${total.toLocaleString()} افغانی`);
    onSold();
    onClose();
    setStudentId("");
    setQty(1);
    setNotes("");
  }

  if (!uniform) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setStudentId(""); setQty(1); setNotes(""); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            فروش یونیفورم
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSell}>
          {/* نام یونیفورم — read only */}
          <div>
            <Label>نام یونیفورم</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm font-semibold">
              {uniform.name}{uniform.size ? ` — سایز ${uniform.size}` : ""}
            </div>
          </div>

          {/* قیمت فروش — read only */}
          <div>
            <Label>قیمت فروش (افغانی)</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-primary/5 border-primary/30 text-sm font-semibold text-primary">
              {sellPrice > 0 ? `${sellPrice.toLocaleString()} افغانی` : "قیمت ثبت نشده"}
            </div>
          </div>

          {/* موجودی */}
          <div className="text-xs text-muted-foreground">
            موجودی فعلی:{" "}
            <span className={`font-semibold ${available === 0 ? "text-destructive" : "text-green-700"}`}>
              {available} عدد
            </span>
          </div>

          {/* نام شاگرد */}
          <div>
            <Label>نام شاگرد <span className="text-destructive">*</span></Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="انتخاب شاگرد" /></SelectTrigger>
              <SelectContent>
                {(students as any[]).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} — {s.student_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* تعداد */}
          <div>
            <Label>تعداد</Label>
            <Input
              type="number"
              min={1}
              max={available}
              value={qty}
              onChange={e => setQty(Math.max(1, Number(e.target.value)))}
            />
          </div>

          {/* یادداشت */}
          <div>
            <Label>یادداشت</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختیاری" />
          </div>

          {/* مجموع */}
          {sellPrice > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-green-50 border-green-300 text-sm font-semibold text-green-700">
              <span>مجموع:</span>
              <span>{total.toLocaleString()} افغانی</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onClose(); setStudentId(""); setQty(1); setNotes(""); }}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving || available === 0} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <ShoppingCart className="w-4 h-4" />
              ثبت فروش
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== تاریخچه فروشات یونیفورم =====
function UniformSalesHistory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["uniform-sales-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("uniform_sales")
        .select(`
          id, quantity, unit_price, total_amount, notes, sale_date, created_at,
          uniform:uniforms(id, name, size),
          student:students(id, full_name, student_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sale: any) => {
      // برگرداندن موجودی
      if (sale.uniform?.id) {
        const { data: uData } = await (supabase as any)
          .from("uniforms").select("stock").eq("id", sale.uniform.id).maybeSingle();
        if (uData) {
          await (supabase as any)
            .from("uniforms")
            .update({ stock: Number(uData.stock) + Number(sale.quantity) })
            .eq("id", sale.uniform.id);
        }
      }
      const { error } = await (supabase as any).from("uniform_sales").delete().eq("id", sale.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("فروش حذف شد و موجودی برگردانده شد");
      qc.invalidateQueries({ queryKey: ["uniform-sales-history"] });
      qc.invalidateQueries({ queryKey: ["uniforms"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function fmtDate(iso?: string) {
    if (!iso) return "—";
    const s = isoToShamsi(iso.slice(0, 10));
    if (!s) return iso.slice(0, 10);
    return `${s.year}/${String(s.month).padStart(2, "0")}/${String(s.day).padStart(2, "0")}`;
  }

  const filtered = search
    ? sales.filter((s: any) =>
        s.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.student?.student_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.uniform?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  const totalRevenue = filtered.reduce((sum: number, s: any) => sum + Number(s.total_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* خلاصه */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">تعداد فروشات</p>
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">مجموع درآمد</p>
          <p className="text-2xl font-bold text-green-700">{totalRevenue.toLocaleString()} افغانی</p>
        </Card>
        <Card className="p-4 md:col-span-1 col-span-2">
          <p className="text-xs text-muted-foreground">شاگردان خریدار</p>
          <p className="text-2xl font-bold">
            {new Set(filtered.map((s: any) => s.student?.id).filter(Boolean)).size}
          </p>
        </Card>
      </div>

      {/* جستجو */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام شاگرد یا یونیفورم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* جدول */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ فروشی ثبت نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">نام شاگرد</TableHead>
                  <TableHead className="text-right">کد شاگرد</TableHead>
                  <TableHead className="text-right">یونیفورم</TableHead>
                  <TableHead className="text-right">تعداد</TableHead>
                  <TableHead className="text-right">قیمت واحد</TableHead>
                  <TableHead className="text-right">مجموع</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any, idx: number) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{s.student?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {s.student?.student_code ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.uniform?.name ?? "—"}
                      {s.uniform?.size ? <span className="text-xs text-muted-foreground mr-1">({s.uniform.size})</span> : null}
                    </TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell>{Number(s.unit_price ?? 0).toLocaleString()} افغانی</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {Number(s.total_amount ?? 0).toLocaleString()} افغانی
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell className="text-left">
                      <Button
                        size="icon" variant="ghost"
                        title="حذف (موجودی برمی‌گردد)"
                        onClick={() => {
                          if (confirm("این فروش حذف شود؟ موجودی یونیفورم برگردانده می‌شود."))
                            deleteMutation.mutate(s);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ===== صفحه اصلی یونیفورم =====
export default function UniformsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUniform, setEditingUniform] = useState<any>(null);
  const [sellUniform, setSellUniform] = useState<any>(null);

  const { data: uniforms = [], isLoading } = useQuery({
    queryKey: ["uniforms", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("uniforms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("uniforms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["uniforms"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function openCreate() { setEditingUniform(null); setFormOpen(true); }
  function openEdit(u: any) { setEditingUniform(u); setFormOpen(true); }

  return (
    <div>
      <PageHeader
        title="یونیفورم‌ها"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> افزودن یونیفورم
          </Button>
        }
      />

      <Tabs defaultValue="uniforms" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="uniforms">یونیفورم‌ها</TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            تاریخچه فروشات
          </TabsTrigger>
        </TabsList>

        {/* تب یونیفورم‌ها */}
        <TabsContent value="uniforms">
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : uniforms.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">هیچ یونیفورمی یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">نام یونیفورم</TableHead>
                      <TableHead className="text-right">سایز</TableHead>
                      <TableHead className="text-right">قیمت خرید</TableHead>
                      <TableHead className="text-right">قیمت فروش</TableHead>
                      <TableHead className="text-right">فایده</TableHead>
                      <TableHead className="text-right">موجودی</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(uniforms as any[]).map((u: any) => {
                      const buy = Number(u.purchase_price ?? 0);
                      const sell = Number(u.price ?? 0);
                      const profit = sell - buy;
                      const stock = Number(u.stock ?? 0);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.size || "—"}</TableCell>
                          <TableCell>{buy > 0 ? `${buy.toLocaleString()} افغانی` : "—"}</TableCell>
                          <TableCell>{sell > 0 ? `${sell.toLocaleString()} افغانی` : "—"}</TableCell>
                          <TableCell>
                            {profit > 0
                              ? <span className="text-green-700 font-semibold">+{profit.toLocaleString()} افغانی</span>
                              : profit < 0
                              ? <span className="text-red-600 font-semibold">{profit.toLocaleString()} افغانی</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={stock === 0 ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-300"}>
                              {stock} عدد
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-primary border-primary/40 hover:bg-primary/5"
                                disabled={stock === 0}
                                onClick={() => setSellUniform(u)}
                                title={stock === 0 ? "موجودی ندارد" : "فروش"}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                فروش
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(u.id); }}>
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
        </TabsContent>

        {/* تب تاریخچه */}
        <TabsContent value="history">
          <UniformSalesHistory />
        </TabsContent>
      </Tabs>

      {/* فرم افزودن/ویرایش */}
      <UniformFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editingUniform}
        onSaved={() => qc.invalidateQueries({ queryKey: ["uniforms"] })}
      />

      {/* پنجره فروش */}
      <SellUniformDialog
        open={!!sellUniform}
        onClose={() => setSellUniform(null)}
        uniform={sellUniform}
        onSold={() => {
          qc.invalidateQueries({ queryKey: ["uniforms"] });
          qc.invalidateQueries({ queryKey: ["uniform-sales-history"] });
        }}
      />
    </div>
  );
}
