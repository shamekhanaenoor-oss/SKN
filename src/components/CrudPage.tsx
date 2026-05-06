import { useState, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "./PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePickerShamsi from "./DatePickerShamsi";
import { isoToShamsi, getShamsiMonthName, calcAgeFromIso } from "@/lib/shamsi";import ProvinceDistrictSelector from "./ProvinceDistrictSelector";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "email" | "tel" | "reference" | "province" | "district";
  required?: boolean;
  options?: { value: string; label: string }[];
  hideInTable?: boolean;
  hideInForm?: boolean;
  // For type="reference": load options from another table
  refTable?: string;
  refLabelField?: string | string[]; // field(s) to display, joined with " - "
  refValueField?: string; // default "id"
  refOrderBy?: string;
  // Auto-generate ID from id_number_settings
  autoIdEntity?: "student" | "teacher" | "staff" | "discount";
}

export interface CrudPageProps {
  table: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  displayColumns?: string[];
  searchField?: string;
  orderBy?: string;
  // برچسب سفارشی برای ستون‌های جدول (مثلاً ستون‌های computed)
  columnLabels?: Record<string, string>;
  // ستون‌های محاسبه‌شده: کلید = نام ستون، مقدار = تابع محاسبه
  computedColumns?: Record<string, (row: any) => React.ReactNode>;
  // Optional extra content rendered inside the dialog, after fields.
  formExtras?: (form: Record<string, any>, editingId?: string) => React.ReactNode;
}

export default function CrudPage({
  table, title, description, fields, displayColumns, searchField, orderBy = "created_at",
  columnLabels, computedColumns, formExtras,
}: CrudPageProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table, search],
    queryFn: async () => {
      let q = (supabase as any).from(table).select("*").order(orderBy, { ascending: false }).limit(500);
      if (search && searchField) q = q.ilike(searchField, `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load all referenced tables for dropdowns / display
  const refFields = useMemo(() => fields.filter(f => f.type === "reference" && f.refTable), [fields]);
  const refQueries = useQueries({
    queries: refFields.map(f => ({
      queryKey: ["ref", f.refTable, f.refOrderBy ?? "created_at"],
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from(f.refTable!)
          .select("*")
          .order(f.refOrderBy ?? "created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;
        return data ?? [];
      },
      staleTime: 30_000,
    })),
  });

  // Map fieldName -> { value -> label }
  const refMaps = useMemo(() => {
    const m: Record<string, { options: { value: string; label: string }[]; map: Record<string, string> }> = {};
    refFields.forEach((f, idx) => {
      const data = (refQueries[idx]?.data ?? []) as any[];
      const labelFields = Array.isArray(f.refLabelField) ? f.refLabelField : [f.refLabelField ?? "name"];
      const valueField = f.refValueField ?? "id";
      const options = data.map((row) => ({
        value: String(row[valueField]),
        label: labelFields.map(lf => row[lf]).filter(Boolean).join(" - ") || String(row[valueField]),
      }));
      const map: Record<string, string> = {};
      options.forEach(o => { map[o.value] = o.label; });
      m[f.name] = { options, map };
    });
    return m;
  }, [refFields, refQueries.map(q => q.data).join("|")]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const cleaned: any = {};
      for (const f of fields) {
        const v = payload[f.name];
        if (v === "" || v === undefined) cleaned[f.name] = null;
        else if (f.type === "number") cleaned[f.name] = Number(v);
        else cleaned[f.name] = v;
      }
      // اگر due_date خالی بود اما loan_date دارد، از loan_date استفاده کن
      if (cleaned["due_date"] === null && cleaned["loan_date"]) {
        cleaned["due_date"] = cleaned["loan_date"];
      }
      if (editing?.id) {
        const { error, count } = await (supabase as any).from(table).update(cleaned).eq("id", editing.id).select();
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(table).insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "با موفقیت ویرایش شد" : "با موفقیت اضافه شد");
      qc.invalidateQueries({ queryKey: [table] });
      setOpen(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message ?? "خطا رخ داد"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: [table] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا در حذف"),
  });

  const cols = displayColumns ?? fields.filter(f => !f.hideInTable).map(f => f.name);

  async function startCreate() {
    setEditing(null);
    // Pre-generate auto IDs for fields with autoIdEntity
    const initial: Record<string, any> = {};
    const autoFields = fields.filter(f => f.autoIdEntity);
    for (const f of autoFields) {
      try {
        const generated = await generateNextIdClient(f.autoIdEntity!);
        if (generated) initial[f.name] = generated;
      } catch (e: any) {
        // Non-fatal: user can type manually
        console.warn("auto-id failed", e?.message);
      }
    }
    setForm(initial);
    setOpen(true);
  }
  function startEdit(row: any) { setEditing(row); setForm({ ...row }); setOpen(true); }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={startCreate} className="gap-2">
            <Plus className="w-4 h-4" /> افزودن
          </Button>
        }
      />

      {searchField && (
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      )}

      <Card className="shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ داده‌ای یافت نشد. روی "افزودن" کلیک کنید.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map(c => {
                    const f = fields.find(x => x.name === c);
                    const label = columnLabels?.[c] ?? f?.label ?? c;
                    return <TableHead key={c} className="text-right">{label}</TableHead>;
                  })}
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    {cols.map(c => (
                      <TableCell key={c}>
                        {computedColumns?.[c]
                          ? computedColumns[c](r)
                          : formatValue(r[c], fields.find(x => x.name === c), refMaps)}
                      </TableCell>
                    ))}
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          onClick={() => { if (confirm("آیا مطمئن هستید؟")) deleteMutation.mutate(r.id); }}>
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
            <DialogTitle>{editing ? `ویرایش ${title}` : `افزودن ${title}`}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(form); }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ overflow: "visible" }}>
              {fields.map((f) => {
                // فیلدهای province و district را با هم رندر می‌کنیم
                if (f.type === "province") {
                  const districtField = fields.find(x => x.type === "district");
                  return (
                    <ProvinceDistrictSelector
                      key={f.name}
                      province={form[f.name] ?? ""}
                      district={districtField ? (form[districtField.name] ?? "") : ""}
                      onProvinceChange={v => setForm(prev => ({ ...prev, [f.name]: v }))}
                      onDistrictChange={v => districtField && setForm(prev => ({ ...prev, [districtField.name]: v }))}
                    />
                  );
                }
                // فیلد district را skip می‌کنیم چون با province رندر شد
                if (f.type === "district") return null;

                // فیلدهایی که باید در فرم پنهان باشند
                if (f.hideInForm) return null;

                return (
                <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                  <Label htmlFor={f.name}>
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea id={f.name} value={form[f.name] ?? ""}
                      onChange={(e) => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                      required={f.required} />
                  ) : f.type === "select" || f.type === "reference" ? (
                    <Select value={form[f.name] ?? ""}
                      onValueChange={(v) => setForm(prev => ({ ...prev, [f.name]: v }))}>
                      <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                      <SelectContent>
                        {(f.type === "reference" ? (refMaps[f.name]?.options ?? []) : (f.options ?? [])).map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "date" ? (
                    <div>
                      <DatePickerShamsi
                        id={f.name}
                        value={form[f.name] ?? ""}
                        onChange={(iso) => setForm(prev => ({ ...prev, [f.name]: iso }))}
                        required={f.required}
                      />
                      {/* نمایش خودکار سن در کنار تاریخ تولد */}
                      {f.name === "date_of_birth" && form[f.name] && (() => {
                        const age = calcAgeFromIso(form[f.name]);
                        if (!age) return null;
                        return (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">سن:</span>
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {age.years} سال
                              {age.months > 0 ? ` و ${age.months} ماه` : ""}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <Input id={f.name} type={f.type ?? "text"} value={form[f.name] ?? ""}
                      onChange={(e) => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                      required={f.required} />
                  )}
                </div>
                );
              })}
            </div>
            {formExtras && <div>{formExtras(form, editing?.id)}</div>}
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

function formatValue(v: any, f?: FieldDef, refMaps?: Record<string, { map: Record<string, string> }>) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
  if (typeof v === "boolean") return v ? "بله" : "خیر";
  if (f?.type === "reference" && refMaps?.[f.name]) {
    return refMaps[f.name].map[String(v)] ?? <span className="text-muted-foreground text-xs">{String(v).slice(0,8)}…</span>;
  }
  if (f?.type === "select" && f.options) {
    return f.options.find(o => o.value === v)?.label ?? v;
  }
  if (f?.type === "date" && typeof v === "string" && v.length >= 10) {
    const s = isoToShamsi(v.slice(0, 10));
    if (s) {
      const dateStr = `${s.year}/${String(s.month).padStart(2,"0")}/${String(s.day).padStart(2,"0")}`;
      // برای تاریخ تولد، سن را هم نمایش بده
      if (f.name === "date_of_birth") {
        const age = calcAgeFromIso(v.slice(0, 10));
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{dateStr}</span>
            {age && (
              <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full w-fit">
                {age.years} سال{age.months > 0 ? ` و ${age.months} ماه` : ""}
              </span>
            )}
          </div>
        );
      }
      return dateStr;
    }
  }
  if (typeof v === "string" && v.length > 80) return v.slice(0, 80) + "...";
  return String(v);
}

// Atomically reserve next ID by reading + updating id_number_settings
// (RLS allows admin/principal to update; staff can read)
export async function generateNextIdClient(entity: "student" | "teacher" | "staff" | "discount"): Promise<string | null> {
  const { data: row, error } = await (supabase as any)
    .from("id_number_settings")
    .select("*")
    .eq("entity", entity)
    .maybeSingle();
  if (error || !row) return null;
  const used = row.next_value as number;
  const padded = String(used).padStart(row.padding ?? 3, "0");
  const id = row.prefix ? `${row.prefix}${row.separator ?? "-"}${padded}` : padded;
  // Increment for next caller (best-effort; race-tolerant for admin tooling)
  await (supabase as any)
    .from("id_number_settings")
    .update({ next_value: used + 1, updated_at: new Date().toISOString() })
    .eq("entity", entity);
  return id;
}
