import { useEffect, useMemo, useState } from "react";
import type { Category, Person } from "@/lib/types";
import { actions, useAppState } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardPreview } from "./CardPreview";
import { PersonForm } from "./PersonForm";
import { exportCsvForPhotoshop, exportPhotoshopJsx } from "@/lib/exporters";
import { downloadAllPngZip, downloadCardPng, downloadCardsPdf, downloadCardsPdfGrouped } from "@/lib/cardRender";
import { Trash2, Pencil, Image as ImgIcon, Search, Download, Images, Loader2, Cloud, ExternalLink, FileDown } from "lucide-react";
import { useSupabaseSync } from "@/lib/supabaseSync";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

interface Props { category: Category; title: string; }

export function CategoryManager({ category, title }: Props) {
  const state = useAppState();
  const { people, lang } = state;
  const template = (state.templates?.[category]) || state.template;
  const t = dict[lang];
  const { loading: dbLoading, error: dbError, synced } = useSupabaseSync(category);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [dbClasses, setDbClasses] = useState<string[]>([]);

  const list = people.filter(p => p.category === category);
  const groupKey: keyof Person =
    category === "students" ? "className" : category === "staff" ? "department" : "route";

  // Load classes from database for students filter
  useEffect(() => {
    if (category !== "students") return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any).from("classes").select("name").order("name");
        if (!cancelled) setDbClasses((data || []).map((r: any) => r.name).filter(Boolean));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [category]);

  const classes = useMemo(() => {
    if (category === "students" && dbClasses.length) return dbClasses;
    return Array.from(new Set(list.map(p => p[groupKey] as string | undefined).filter(Boolean))) as string[];
  }, [list, groupKey, category, dbClasses]);

  const filtered = list.filter(p => {
    if (filterClass && p[groupKey] !== filterClass) return false;
    const phone = p.parentPhone || p.phone || "";
    if (search && !(`${p.name} ${p.fatherName} ${phone}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of filtered) {
      const k = (p[groupKey] as string | undefined) || "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupKey]);

  const fileToDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(f);
  });

  const onBulkExport = async (people: Person[], groupByKey?: keyof Person) => {
    if (!people.length) return;
    setProgress({ done: 0, total: people.length });
    try {
      await downloadAllPngZip(template, people, `${category}-cards.zip`, (done, total) => setProgress({ done, total }), groupByKey);
    } finally {
      setProgress(null);
    }
  };

  const onPdfExport = async (people: Person[]) => {
    if (!people.length) return;
    setProgress({ done: 0, total: people.length });
    try {
      await downloadCardsPdf(template, people, category, `${category}-cards.pdf`, (done, total) => setProgress({ done, total }));
    } finally {
      setProgress(null);
    }
  };

  const onPdfExportGrouped = async (people: Person[]) => {
    if (!people.length) return;
    setProgress({ done: 0, total: people.length });
    try {
      await downloadCardsPdfGrouped(template, people, category, groupKey, `${category}-cards-grouped.pdf`, (done, total) => setProgress({ done, total }));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {t.total}: {mounted ? list.length : 0}
            {mounted && dbLoading && <span className="inline-flex items-center gap-1 text-blue-600"><Loader2 className="h-3 w-3 animate-spin" /> در حال همگام‌سازی…</span>}
            {mounted && !dbLoading && synced > 0 && <span className="inline-flex items-center gap-1 text-green-600"><Cloud className="h-3 w-3" /> {synced} از Supabase</span>}
            {mounted && dbError && <span className="text-destructive">⚠ {dbError}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {category === "students" && (
            <Link to="/students">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> مدیریت شاگردان (دیتابیس)
              </Button>
            </Link>
          )}
          {category === "staff" && (
            <Link to="/staff">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> مدیریت کارمندان (دیتابیس)
              </Button>
            </Link>
          )}
          {category === "drivers" && (
            <Link to="/transport-routes">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> مدیریت ترانسپورت (دیتابیس)
              </Button>
            </Link>
          )}
          <Link to="/settings">
            <Button variant="ghost" className="gap-2">
              <FileDown className="h-4 w-4" /> تنظیم نمبر شروع (دیتابیس)
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-sm rounded-md border bg-secondary/40 px-3 py-2">
        برای افزودن، وارد کردن اکسل و تنظیم نمبر شروع از بخش‌های دیتابیس بالا استفاده کنید — اطلاعات به‌صورت خودکار همگام می‌شود.
      </div>
      {progress && (
        <div className="text-sm rounded-md border bg-secondary/40 px-3 py-2">
          در حال ساخت کارت‌ها… {progress.done} / {progress.total}
        </div>
      )}

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">{t.all}</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportCsvForPhotoshop(filtered)}><FileDown className="h-4 w-4" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => exportPhotoshopJsx(filtered)}><FileDown className="h-4 w-4" /> .jsx</Button>
          <Button size="sm" variant="default" onClick={() => onPdfExport(filtered)}><Download className="h-4 w-4" /> PDF (A4 - {category === "students" ? "۵" : "۳"} کارت در صفحه)</Button>
          <Button size="sm" variant="default" onClick={() => onPdfExportGrouped(filtered)}><Download className="h-4 w-4" /> PDF بر اساس {category === "students" ? "صنف" : category === "staff" ? "بخش" : "مسیر"}</Button>
        </div>
      </Card>

      <Card className="p-3 flex flex-wrap items-center gap-3 bg-primary/5 border-primary/30">
        <div className="text-sm font-medium">انتخاب کارت برای چاپ: <span className="text-primary">{selected.size}</span> از {filtered.length}</div>
        <div className="flex gap-2 flex-wrap ms-auto">
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set(filtered.map(p => p.id)))}>انتخاب همه</Button>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>پاک کردن</Button>
          <Button size="sm" variant="default" disabled={!selected.size} onClick={() => onPdfExport(filtered.filter(p => selected.has(p.id)))}>
            <Download className="h-4 w-4" /> چاپ PDF انتخاب‌شده‌ها ({selected.size})
          </Button>
          <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => onBulkExport(filtered.filter(p => selected.has(p.id)))}>
            <Images className="h-4 w-4" /> ZIP انتخاب‌شده‌ها
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="grouped">{t.groupByClass}</TabsTrigger>
          <TabsTrigger value="cards">{t.preview}</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="overflow-auto">
            <table dir="rtl" className="w-full text-sm text-right">
              <thead className="bg-secondary/50">
                <tr className="text-right">
                  <th className="p-3 text-right w-10">
                    <input type="checkbox"
                      checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
                      onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                    />
                  </th>
                  <th className="p-3 text-right">#</th>
                  <th className="p-3 text-right">{t.idNumber}</th>
                  <th className="p-3 text-right">{t.photo}</th>
                  <th className="p-3 text-right">{t.name}</th>
                  <th className="p-3 text-right">{t.fatherName}</th>
                  {category === "students" && <>
                    <th className="p-3 text-right">{t.className}</th>
                    <th className="p-3 text-right">{t.transport}</th>
                    <th className="p-3 text-right">{t.parentPhone}</th>
                  </>}
                  {category === "staff" && <>
                    <th className="p-3 text-right">{t.surname}</th>
                    <th className="p-3 text-right">{t.job}</th>
                    <th className="p-3 text-right">{t.issueDate}</th>
                    <th className="p-3 text-right">{t.expiryDate}</th>
                  </>}
                  {category === "drivers" && <>
                    <th className="p-3 text-right">{t.surname}</th>
                    <th className="p-3 text-right">{t.job}</th>
                    <th className="p-3 text-right">{t.issueDate}</th>
                    <th className="p-3 text-right">{t.expiryDate}</th>
                  </>}
                  <th className="p-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-t ${selected.has(p.id) ? "bg-primary/5" : ""}`}>
                    <td className="p-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} /></td>
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-mono text-xs">{p.idNumber || "—"}</td>
                    <td className="p-2">
                      <label className="cursor-pointer block">
                        <div className="h-12 w-12 rounded-md border bg-muted overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary transition">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImgIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const dataUrl = await fileToDataUrl(f);
                            actions.updatePerson(p.id, { photo: dataUrl });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.fatherName}</td>
                    {category === "students" && <>
                      <td className="p-3">{p.className}</td>
                      <td className="p-3">{p.transport}</td>
                      <td className="p-3">{p.parentPhone}</td>
                    </>}
                    {category === "staff" && <>
                      <td className="p-3">{p.surname}</td>
                      <td className="p-3">{p.position}</td>
                      <td className="p-3" dir="ltr">{p.issueDate}</td>
                      <td className="p-3" dir="ltr">{p.expiryDate}</td>
                    </>}
                    {category === "drivers" && <>
                      <td className="p-3">{p.surname}</td>
                      <td className="p-3">{p.position}</td>
                      <td className="p-3" dir="ltr">{p.issueDate}</td>
                      <td className="p-3" dir="ltr">{p.expiryDate}</td>
                    </>}
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => downloadCardPng(template, p)}><ImgIcon className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => actions.deletePerson(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">—</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="grouped" className="space-y-4">
          {grouped.map(([cls, ps]) => (
            <Card key={cls} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{cls} <span className="text-muted-foreground text-sm">({ps.length})</span></h3>
                <Button size="sm" variant="outline" onClick={() => onBulkExport(ps)}>
                  <Download className="h-4 w-4" /> ZIP
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {ps.map(p => <div key={p.id} className="rounded border px-2 py-1.5">{p.name} <span className="text-muted-foreground">— {p.fatherName}</span></div>)}
              </div>
            </Card>
          ))}
          {!grouped.length && <p className="text-center text-muted-foreground py-8">—</p>}
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id} className={`flex flex-col items-center gap-2 rounded-lg border p-2 transition ${selected.has(p.id) ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                <label className="flex items-center gap-2 self-start cursor-pointer text-sm font-medium">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} />
                  انتخاب کارت
                </label>
                <CardPreview template={template} person={p} scale={0.4} />
                <Button size="sm" variant="outline" onClick={() => downloadCardPng(template, p)}>
                  <Download className="h-3 w-3" /> {p.name}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.edit}</DialogTitle></DialogHeader>
          {editing && <PersonForm category={category} initial={editing} lang={lang} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}