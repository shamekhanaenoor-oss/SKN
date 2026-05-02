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
import { Plus, Pencil, Trash2, Loader2, Search, ShoppingCart, History } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { isoToShamsi } from "@/lib/shamsi";

// ===== فرم افزودن/ویرایش کتاب =====
function BookFormDialog({
  open, onClose, editing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() =>
    editing
      ? { title: editing.title ?? "", author: editing.author ?? "", isbn: editing.isbn ?? "", available_copies: editing.available_copies ?? 0 }
      : { title: "", author: "", isbn: "", available_copies: 0 }
  );
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const buy = Number(form.author || 0);
  const sell = Number(form.isbn || 0);
  const profit = sell - buy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      author: form.author ? Number(form.author) : null,
      isbn: form.isbn ? Number(form.isbn) : null,
      available_copies: Number(form.available_copies || 0),
      total_copies: Number(form.available_copies || 0),
    };
    let error: any;
    if (editing?.id) {
      ({ error } = await (supabase as any).from("library_books").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("library_books").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "ویرایش شد" : "کتاب اضافه شد");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش کتاب" : "افزودن کتاب"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>نام کتاب <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={e => setField("title", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نام خرید (افغانی)</Label>
              <Input type="number" value={form.author} onChange={e => setField("author", e.target.value)} />
            </div>
            <div>
              <Label>فروش (افغانی)</Label>
              <Input type="number" value={form.isbn} onChange={e => setField("isbn", e.target.value)} />
            </div>
          </div>
          {/* فایده */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm font-semibold ${profit > 0 ? "bg-green-50 border-green-300 text-green-700" : profit < 0 ? "bg-red-50 border-red-300 text-red-700" : "bg-muted border-muted-foreground/20 text-muted-foreground"}`}>
            <span>فایده:</span>
            <span>{profit > 0 ? `+${profit.toLocaleString()}` : profit < 0 ? profit.toLocaleString() : "—"} افغانی</span>
          </div>
          <div>
            <Label>تعداد موجود <span className="text-destructive">*</span></Label>
            <Input type="number" min={0} value={form.available_copies} onChange={e => setField("available_copies", e.target.value)} required />
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

// ===== پنجره فروش کتاب =====
function SellBookDialog({
  open, onClose, book, onSold,
}: {
  open: boolean;
  onClose: () => void;
  book: any | null;
  onSold: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-book-sale"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id,full_name,student_code")
        .order("full_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const sellPrice = Number(book?.isbn ?? 0);
  const total = sellPrice * qty;
  const available = Number(book?.available_copies ?? 0);

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) { toast.error("لطفاً شاگرد را انتخاب کنید"); return; }
    if (qty < 1) { toast.error("تعداد باید حداقل ۱ باشد"); return; }
    if (qty > available) { toast.error(`موجودی کافی نیست (موجود: ${available})`); return; }

    setSaving(true);

    // ثبت فروش در book_loans (استفاده از fine_amount برای مبلغ فروش)
    const { error: loanErr } = await (supabase as any).from("book_loans").insert({
      book_id: book.id,
      borrower_student_id: studentId,
      loan_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      return_date: new Date().toISOString().slice(0, 10),
      fine_amount: total,
      notes: `فروش: ${qty} عدد × ${sellPrice.toLocaleString()} افغانی`,
      status: "sold",
    });

    if (loanErr) { toast.error(loanErr.message); setSaving(false); return; }

    // کم کردن از موجودی
    const { error: updateErr } = await (supabase as any)
      .from("library_books")
      .update({ available_copies: available - qty })
      .eq("id", book.id);

    setSaving(false);
    if (updateErr) { toast.error(updateErr.message); return; }

    toast.success(`فروش ثبت شد — ${total.toLocaleString()} افغانی`);
    onSold();
    onClose();
    setStudentId("");
    setQty(1);
  }

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setStudentId(""); setQty(1); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            فروش کتاب
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSell}>

          {/* نام کتاب — read only */}
          <div>
            <Label>نام کتاب</Label>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm font-semibold">
              {book.title}
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
            موجودی فعلی: <span className={`font-semibold ${available === 0 ? "text-destructive" : "text-green-700"}`}>{available} عدد</span>
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

          {/* مجموع */}
          {sellPrice > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-green-50 border-green-300 text-sm font-semibold text-green-700">
              <span>مجموع:</span>
              <span>{total.toLocaleString()} افغانی</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onClose(); setStudentId(""); setQty(1); }}>
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

// ===== تاریخچه فروشات =====
function SalesHistory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["book-sales-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("book_loans")
        .select(`
          id, loan_date, fine_amount, notes, created_at,
          book:library_books(id, title, isbn),
          student:students(id, full_name, student_code)
        `)
        .eq("status", "sold")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-book-sale"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id,full_name,student_code")
        .order("full_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (sale: any) => {
      // برگرداندن موجودی کتاب
      if (sale.book?.id) {
        const { data: bookData } = await (supabase as any)
          .from("library_books").select("available_copies").eq("id", sale.book.id).maybeSingle();
        if (bookData) {
          await (supabase as any)
            .from("library_books")
            .update({ available_copies: Number(bookData.available_copies) + 1 })
            .eq("id", sale.book.id);
        }
      }
      const { error } = await (supabase as any).from("book_loans").delete().eq("id", sale.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("فروش حذف شد و موجودی برگردانده شد");
      qc.invalidateQueries({ queryKey: ["book-sales-history"] });
      qc.invalidateQueries({ queryKey: ["library_books"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(s: any) {
    setEditingSale(s);
    setEditForm({
      student_id: s.student?.id ?? "",
      fine_amount: String(s.fine_amount ?? ""),
      notes: s.notes ?? "",
    });
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    const { error } = await (supabase as any)
      .from("book_loans")
      .update({
        borrower_student_id: editForm.student_id || null,
        fine_amount: editForm.fine_amount ? Number(editForm.fine_amount) : null,
        notes: editForm.notes || null,
      })
      .eq("id", editingSale.id);
    setEditSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ویرایش شد");
    qc.invalidateQueries({ queryKey: ["book-sales-history"] });
    setEditingSale(null);
  }

  function fmtDate(iso?: string) {
    if (!iso) return "—";
    const s = isoToShamsi(iso.slice(0, 10));
    if (!s) return iso.slice(0, 10);
    return `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
  }

  const filtered = search
    ? sales.filter((s: any) =>
        s.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.student?.student_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.book?.title?.toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  const totalRevenue = filtered.reduce((sum: number, s: any) => sum + Number(s.fine_amount ?? 0), 0);

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
          <p className="text-2xl font-bold">{new Set(filtered.map((s: any) => s.student?.id).filter(Boolean)).size}</p>
        </Card>
      </div>

      {/* جستجو */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام شاگرد یا کتاب..."
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
                  <TableHead className="text-right">نام کتاب</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">یادداشت</TableHead>
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
                    <TableCell>{s.book?.title ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {Number(s.fine_amount ?? 0).toLocaleString()} افغانی
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(s.loan_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{s.notes ?? "—"}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" title="ویرایش" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          title="حذف (موجودی برمی‌گردد)"
                          onClick={() => { if (confirm("این فروش حذف شود؟ موجودی کتاب برگردانده می‌شود.")) deleteMutation.mutate(s); }}
                        >
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

      {/* دیالوگ ویرایش */}
      <Dialog open={!!editingSale} onOpenChange={v => { if (!v) setEditingSale(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش فروش</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <form className="space-y-4" onSubmit={handleEditSave}>
              {/* نام کتاب — read only */}
              <div>
                <Label>نام کتاب</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm font-semibold">
                  {editingSale.book?.title ?? "—"}
                </div>
              </div>
              {/* شاگرد */}
              <div>
                <Label>نام شاگرد <span className="text-destructive">*</span></Label>
                <Select value={editForm.student_id} onValueChange={v => setEditForm(prev => ({ ...prev, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب شاگرد" /></SelectTrigger>
                  <SelectContent>
                    {(students as any[]).map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.full_name} — {st.student_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* مبلغ */}
              <div>
                <Label>مبلغ (افغانی)</Label>
                <Input
                  type="number"
                  value={editForm.fine_amount}
                  onChange={e => setEditForm(prev => ({ ...prev, fine_amount: e.target.value }))}
                />
              </div>
              {/* یادداشت */}
              <div>
                <Label>یادداشت</Label>
                <Input
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSale(null)}>انصراف</Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  ذخیره
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== صفحه اصلی کتابخانه =====
export default function LibraryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [sellBook, setSellBook] = useState<any>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["library_books", search],
    queryFn: async () => {
      let q = (supabase as any)
        .from("library_books")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("library_books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["library_books"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function openCreate() { setEditingBook(null); setBookFormOpen(true); }
  function openEdit(b: any) { setEditingBook(b); setBookFormOpen(true); }

  return (
    <div>
      <PageHeader
        title="کتابخانه"
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> افزودن کتاب
          </Button>
        }
      />

      <Tabs defaultValue="books" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="books" className="gap-2">
            کتاب‌ها
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            تاریخچه فروشات
          </TabsTrigger>
        </TabsList>

        {/* تب کتاب‌ها */}
        <TabsContent value="books">
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
            ) : books.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">هیچ کتابی یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">نام کتاب</TableHead>
                      <TableHead className="text-right">نام خرید</TableHead>
                      <TableHead className="text-right">فروش</TableHead>
                      <TableHead className="text-right">فایده</TableHead>
                      <TableHead className="text-right">موجودی</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(books as any[]).map((b: any) => {
                      const buy = Number(b.author ?? 0);
                      const sell = Number(b.isbn ?? 0);
                      const profit = sell - buy;
                      const available = Number(b.available_copies ?? 0);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.title}</TableCell>
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
                            <Badge variant="outline" className={available === 0 ? "bg-red-50 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-300"}>
                              {available} عدد
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-primary border-primary/40 hover:bg-primary/5"
                                disabled={available === 0}
                                onClick={() => setSellBook(b)}
                                title={available === 0 ? "موجودی ندارد" : "فروش"}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                فروش
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(b.id); }}>
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
          <SalesHistory />
        </TabsContent>
      </Tabs>

      {/* فرم افزودن/ویرایش */}
      <BookFormDialog
        open={bookFormOpen}
        onClose={() => setBookFormOpen(false)}
        editing={editingBook}
        onSaved={() => qc.invalidateQueries({ queryKey: ["library_books"] })}
      />

      {/* پنجره فروش */}
      <SellBookDialog
        open={!!sellBook}
        onClose={() => setSellBook(null)}
        book={sellBook}
        onSold={() => qc.invalidateQueries({ queryKey: ["library_books"] })}
      />
    </div>
  );
}
