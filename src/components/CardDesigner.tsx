import { useState, useRef } from "react";
import { actions, useAppState } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CardPreview } from "./CardPreview";
import { Upload, Trash2 } from "lucide-react";
import type { CardField, CardTemplate } from "@/lib/types";

const defaultSamplePerson = {
  idNumber: "SKN-0001",
  name: "نام تان را وارد نمایید",
  surname: "تخلص را وارد نمایید",
  fatherName: "نام پدر را وارد نمایید",
  className: "صنف را وارد نمایید",
  position: "وظیفه را وارد نمایید",
  transport: "دارد یا ندارد",
  parentPhone: "0700123456",
  issueDate: "1405/01/01",
  expiryDate: "1405/09/30",
};

const CATEGORIES: { key: "students" | "staff" | "drivers"; label: string }[] = [
  { key: "students", label: "شاگردان" },
  { key: "staff", label: "کارمندان" },
  { key: "drivers", label: "راننده‌گان" },
];

export function CardDesigner() {
  const state = useAppState();
  const { lang } = state;
  const t = dict[lang];
  const [category, setCategory] = useState<"students" | "staff" | "drivers">("students");
  const [side, setSide] = useState<"front" | "back">("front");
  const [issueDate, setIssueDate] = useState<string>(defaultSamplePerson.issueDate);
  const [expiryDate, setExpiryDate] = useState<string>(defaultSamplePerson.expiryDate);
  const samplePerson = { ...defaultSamplePerson, issueDate, expiryDate };
  const template = (state.templates?.[category]) || state.template;
  const activeBg = side === "front" ? template.background : template.back?.background;
  const activeFields = side === "front" ? template.fields : (template.back?.fields || []);
  const [selected, setSelected] = useState<string>(activeFields[0]?.id || "");
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; startW: number; startH: number; startFs: number; isPhoto: boolean } | null>(null);

  const saveSide = (patch: { background?: string; fields?: CardField[] }) => {
    if (side === "front") {
      actions.setCategoryTemplate(category, {
        ...template,
        background: patch.background !== undefined ? patch.background : template.background,
        fields: patch.fields !== undefined ? patch.fields : template.fields,
      });
    } else {
      const cur = template.back || { background: undefined, fields: [] };
      actions.setCategoryTemplate(category, {
        ...template,
        back: {
          background: patch.background !== undefined ? patch.background : cur.background,
          fields: patch.fields !== undefined ? patch.fields : cur.fields,
        },
      });
    }
  };

  const onBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale large designs so they fit in localStorage
        const MAX = 1400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const bg = canvas.toDataURL("image/jpeg", 0.85);
        if (side === "front") {
          const fields = autoLayoutFields(w, h);
          actions.setCategoryTemplate(category, { ...template, background: bg, width: w, height: h, fields });
        } else {
          saveSide({ background: bg });
        }
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(f);
  };

  function autoLayoutFields(w: number, h: number): CardField[] {
    const landscape = w >= h;
    // base font size relative to height
    const fs = (pct: number) => Math.round((h * pct) / 100);
    if (category === "staff" || category === "drivers") {
      const rowFs = fs(landscape ? 4.2 : 3.6);
      if (landscape) {
        return [
          { id: "f-photo", key: "photo", label: "Photo", x: 6, y: 28, width: 22, height: 52, fontSize: 0, color: "#000", fontWeight: 400, align: "left" },
          { id: "f-idnum", key: "idNumber", label: "ایدی", x: 60, y: 30, fontSize: rowFs, color: "#0b1f4a", fontWeight: 600, align: "right" },
          { id: "f-name", key: "name", label: "نام", x: 60, y: 40, fontSize: fs(5.2), color: "#0b1f4a", fontWeight: 700, align: "right" },
          { id: "f-surname", key: "surname", label: "تخلص", x: 60, y: 50, fontSize: rowFs, color: "#222", fontWeight: 500, align: "right" },
          { id: "f-father", key: "fatherName", label: "نام پدر", x: 60, y: 60, fontSize: rowFs, color: "#222", fontWeight: 500, align: "right" },
          { id: "f-job", key: "position", label: "وظیفه", x: 60, y: 70, fontSize: rowFs, color: "#444", fontWeight: 500, align: "right" },
          { id: "f-issue", key: "issueDate", label: "تاریخ صدور", x: 30, y: 90, fontSize: fs(3.6), color: "#666", fontWeight: 400, align: "left" },
          { id: "f-expiry", key: "expiryDate", label: "تاریخ ختم", x: 60, y: 90, fontSize: fs(3.6), color: "#666", fontWeight: 400, align: "right" },
        ];
      }
      return [
        { id: "f-photo", key: "photo", label: "Photo", x: 32, y: 8, width: 36, height: 32, fontSize: 0, color: "#000", fontWeight: 400, align: "left" },
        { id: "f-idnum", key: "idNumber", label: "ایدی", x: 50, y: 42, fontSize: fs(3.4), color: "#0b1f4a", fontWeight: 600, align: "center" },
        { id: "f-name", key: "name", label: "نام", x: 50, y: 48, fontSize: fs(5), color: "#0b1f4a", fontWeight: 700, align: "center" },
        { id: "f-surname", key: "surname", label: "تخلص", x: 50, y: 56, fontSize: rowFs, color: "#222", fontWeight: 500, align: "center" },
        { id: "f-father", key: "fatherName", label: "نام پدر", x: 50, y: 64, fontSize: rowFs, color: "#222", fontWeight: 500, align: "center" },
        { id: "f-job", key: "position", label: "وظیفه", x: 50, y: 72, fontSize: rowFs, color: "#444", fontWeight: 500, align: "center" },
        { id: "f-issue", key: "issueDate", label: "تاریخ صدور", x: 25, y: 90, fontSize: fs(2.8), color: "#666", fontWeight: 400, align: "left" },
        { id: "f-expiry", key: "expiryDate", label: "تاریخ ختم", x: 75, y: 90, fontSize: fs(2.8), color: "#666", fontWeight: 400, align: "right" },
      ];
    }
    if (landscape) {
      // Photo on the left, text stacked to the right — values aligned with labels (RTL)
      // Labels in background occupy right column. Values aligned right of them at same Y.
      const rowFs = fs(4.2);
      return [
        { id: "f-photo", key: "photo", label: "Photo", x: 6, y: 28, width: 22, height: 52, fontSize: 0, color: "#000", fontWeight: 400, align: "left" },
        { id: "f-idnum", key: "idNumber", label: "ID Number", x: 60, y: 33, fontSize: rowFs, color: "#0b1f4a", fontWeight: 600, align: "right" },
        { id: "f-name", key: "name", label: "Name", x: 60, y: 42, fontSize: fs(5.2), color: "#0b1f4a", fontWeight: 700, align: "right" },
        { id: "f-father", key: "fatherName", label: "Father", x: 60, y: 51, fontSize: rowFs, color: "#222", fontWeight: 500, align: "right" },
        { id: "f-class", key: "className", label: "Class", x: 60, y: 60, fontSize: rowFs, color: "#222", fontWeight: 500, align: "right" },
        { id: "f-phone", key: "parentPhone", label: "Phone", x: 60, y: 69, fontSize: rowFs, color: "#444", fontWeight: 400, align: "right" },
        { id: "f-transport", key: "transport", label: "Transport", x: 60, y: 78, fontSize: rowFs, color: "#444", fontWeight: 400, align: "right" },
        { id: "f-issue", key: "issueDate", label: "Issue", x: 30, y: 90, fontSize: fs(3.6), color: "#666", fontWeight: 400, align: "left" },
        { id: "f-expiry", key: "expiryDate", label: "Expiry", x: 60, y: 90, fontSize: fs(3.6), color: "#666", fontWeight: 400, align: "right" },
      ];
    }
    // Portrait: photo on top center, text below
    return [
      { id: "f-photo", key: "photo", label: "Photo", x: 32, y: 8, width: 36, height: 32, fontSize: 0, color: "#000", fontWeight: 400, align: "left" },
      { id: "f-idnum", key: "idNumber", label: "ID Number", x: 50, y: 40, fontSize: fs(3.4), color: "#0b1f4a", fontWeight: 600, align: "center" },
      { id: "f-name", key: "name", label: "Name", x: 50, y: 44, fontSize: fs(5), color: "#0b1f4a", fontWeight: 700, align: "center" },
      { id: "f-father", key: "fatherName", label: "Father", x: 50, y: 52, fontSize: fs(3.6), color: "#222", fontWeight: 500, align: "center" },
      { id: "f-class", key: "className", label: "Class", x: 50, y: 60, fontSize: fs(3.6), color: "#222", fontWeight: 500, align: "center" },
      { id: "f-transport", key: "transport", label: "Transport", x: 50, y: 68, fontSize: fs(3.2), color: "#444", fontWeight: 400, align: "center" },
      { id: "f-phone", key: "parentPhone", label: "Phone", x: 50, y: 76, fontSize: fs(3.2), color: "#444", fontWeight: 400, align: "center" },
      { id: "f-issue", key: "issueDate", label: "Issue", x: 25, y: 90, fontSize: fs(2.8), color: "#666", fontWeight: 400, align: "left" },
      { id: "f-expiry", key: "expiryDate", label: "Expiry", x: 75, y: 90, fontSize: fs(2.8), color: "#666", fontWeight: 400, align: "right" },
    ];
  }

  const updateField = (id: string, patch: Partial<CardField>) => {
    saveSide({ fields: activeFields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const sel = activeFields.find(f => f.id === selected);

  const scale = Math.min(1, 700 / template.width);
  const previewW = template.width * scale;
  const previewH = template.height * scale;

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    const f = activeFields.find(x => x.id === id);
    if (!f) return;
    const rect = previewWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    dragRef.current = { id, offX: px - f.x, offY: py - f.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (r) {
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      if (r.isPhoto) {
        const rect = previewWrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newW = Math.max(2, r.startW + (dx / rect.width) * 100);
        const newH = Math.max(2, r.startH + (dy / rect.height) * 100);
        updateField(r.id, { width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 });
      } else {
        const delta = Math.max(dx, dy) / scale;
        const newFs = Math.max(6, Math.round(r.startFs + delta));
        updateField(r.id, { fontSize: newFs });
      }
      return;
    }
    const d = dragRef.current; if (!d) return;
    const rect = previewWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(0, Math.min(100, px - d.offX));
    const y = Math.max(0, Math.min(100, py - d.offY));
    updateField(d.id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };
  const onPointerUp = () => { dragRef.current = null; resizeRef.current = null; };

  const onResizeDown = (e: React.PointerEvent, f: CardField) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(f.id);
    resizeRef.current = {
      id: f.id,
      startX: e.clientX,
      startY: e.clientY,
      startW: f.width || 22,
      startH: f.height || 50,
      startFs: f.fontSize || 16,
      isPhoto: f.key === "photo",
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid lg:grid-cols-[360px_1fr] gap-6">
      <Card className="p-4 space-y-3 h-fit lg:sticky lg:top-20">
        <div className="flex gap-1 rounded-md border bg-secondary/30 p-1">
          {(["front","back"] as const).map(s => (
            <button key={s} onClick={() => { setSide(s); setSelected(""); }}
              className={`flex-1 px-2 py-1 text-xs rounded ${side === s ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"}`}>
              {s === "front" ? "روی کارت" : "پشت کارت"}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t.fields}</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => {
              const fields = autoLayoutFields(template.width, template.height);
              saveSide({ fields });
              setSelected(fields[0]?.id || "");
            }}>بازچینش</Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (activeFields.some(f => f.key === "idNumber")) return;
              const id = "f-idnum";
              const nf: CardField = { id, key: "idNumber", label: "نمبر کارت", x: 40, y: 14, fontSize: 22, color: "#0b1f4a", fontWeight: 600, align: "left" };
              saveSide({ fields: [...activeFields, nf] });
              setSelected(id);
            }}>+ نمبر کارت</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const id = "f-" + Math.random().toString(36).slice(2, 7);
              const nf: CardField = { id, key: "name", label: "متن جدید", x: 40, y: 40, fontSize: 18, color: "#0b1f4a", fontWeight: 500, align: "left" };
              saveSide({ fields: [...activeFields, nf] });
              setSelected(id);
            }}>+ افزودن</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {activeFields.map(f => (
            <button key={f.id} onClick={() => setSelected(f.id)}
              className={`text-xs rounded-md border px-2 py-1.5 text-start ${selected === f.id ? "border-primary bg-secondary" : "hover:bg-secondary/50"}`}>
              {f.label}
            </button>
          ))}
          {!activeFields.length && <p className="col-span-2 text-xs text-muted-foreground text-center py-2">فیلدی نیست — افزودن کنید</p>}
        </div>
        {sel && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{sel.label}</span>
              <Button variant="destructive" size="sm" onClick={() => {
                const next = activeFields.filter(f => f.id !== sel.id);
                saveSide({ fields: next });
                setSelected(next[0]?.id || "");
              }}>
                <Trash2 className="h-3.5 w-3.5" /> {t.delete}
              </Button>
            </div>
            <Row label="نام برچسب / Label">
              <Input value={sel.label} onChange={e => updateField(sel.id, { label: e.target.value })} />
            </Row>
            <Row label="X (%)"><Input type="number" value={sel.x} onChange={e => updateField(sel.id, { x: +e.target.value })} /></Row>
            <Row label="Y (%)"><Input type="number" value={sel.y} onChange={e => updateField(sel.id, { y: +e.target.value })} /></Row>
            {sel.key !== "photo" ? (
              <>
                <Row label={t.fontSize}><Input type="number" value={sel.fontSize} onChange={e => updateField(sel.id, { fontSize: +e.target.value })} /></Row>
                <Row label={t.bold}>
                  <select value={sel.fontWeight} onChange={e => updateField(sel.id, { fontWeight: +e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                    {[400, 500, 600, 700, 800].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Row>
                <Row label={t.color}><Input type="color" value={sel.color} onChange={e => updateField(sel.id, { color: e.target.value })} /></Row>
                <Row label={t.align}>
                  <select value={sel.align} onChange={e => updateField(sel.id, { align: e.target.value as any })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                    <option value="left">left</option><option value="center">center</option><option value="right">right</option>
                  </select>
                </Row>
              </>
            ) : (
              <>
                <Row label={`${t.width} (%)`}><Input type="number" value={sel.width} onChange={e => updateField(sel.id, { width: +e.target.value })} /></Row>
                <Row label={`${t.height} (%)`}><Input type="number" value={sel.height} onChange={e => updateField(sel.id, { height: +e.target.value })} /></Row>
                <Row label="شکل فریم عکس">
                  <div className="flex gap-1 rounded-md border bg-secondary/30 p-1">
                    {([
                      { v: "rect", label: "چهارکنج" },
                      { v: "circle", label: "گول" },
                    ] as const).map(o => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => updateField(sel.id, { photoShape: o.v })}
                        className={`flex-1 px-2 py-1 text-xs rounded ${(sel.photoShape || "rect") === o.v ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </Row>
              </>
            )}
          </div>
        )}
        {activeBg && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => saveSide({ background: undefined })}>
            <Trash2 className="h-4 w-4" /> پس‌زمینه
          </Button>
        )}
        <div className="space-y-2 pt-3 border-t">
          <h3 className="font-semibold text-sm">تاریخ اعتبار (نمونه پیش‌نمایش)</h3>
          <Row label="تاریخ صدور">
            <Input value={issueDate} onChange={e => setIssueDate(e.target.value)} placeholder="1405/1/1" dir="ltr" />
          </Row>
          <Row label="تاریخ ختم">
            <Input value={expiryDate} onChange={e => setExpiryDate(e.target.value)} placeholder="1405/9/30" dir="ltr" />
          </Row>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t.designer}</h1>
            <p className="text-xs text-muted-foreground">هر دسته دیزاین جداگانه دارد و در صفحه همان دسته استفاده می‌شود.</p>
          </div>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" /> {t.uploadBg}
              <input type="file" accept="image/*" className="hidden" onChange={onBg} />
            </label>
          </Button>
        </div>
        <div className="flex gap-1 rounded-md border bg-secondary/30 p-1 w-fit">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setSelected(""); }}
              className={`px-3 py-1.5 text-sm rounded ${category === c.key ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Card className="p-4 overflow-auto">
          <p className="text-xs text-muted-foreground mb-2 text-center">برای جابجایی، فیلد را با ماوس بکشید</p>
          <div className="flex justify-center">
            <div className="relative" style={{ width: previewW, height: previewH }}>
              <div ref={previewWrapRef} className="absolute inset-0">
                <CardPreview
                  template={{ ...template, background: activeBg, fields: activeFields }}
                  person={samplePerson}
                  scale={scale}
                />
              </div>
              <div
                className="absolute inset-0"
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {activeFields.map(f => {
                  const left = (f.x / 100) * previewW;
                  const top = (f.y / 100) * previewH;
                  const isPhoto = f.key === "photo";
                  const w = isPhoto ? ((f.width || 22) / 100) * previewW : Math.max(40, (f.fontSize || 16) * scale * 4);
                  const h = isPhoto ? ((f.height || 50) / 100) * previewH : Math.max(20, (f.fontSize || 16) * scale * 1.4);
                  const isSel = selected === f.id;
                  const tx = !isPhoto && f.align === "center" ? "translateX(-50%)" : !isPhoto && f.align === "right" ? "translateX(-100%)" : undefined;
                  return (
                    <div
                      key={f.id}
                      onPointerDown={(e) => onPointerDown(e, f.id)}
                      className={`absolute cursor-move rounded-sm ${isSel ? "ring-2 ring-primary bg-primary/5" : "hover:ring-1 hover:ring-primary/40"}`}
                      style={{ left, top, width: w, height: h, transform: tx, touchAction: "none" }}
                      title={f.label}
                    >
                      {isSel && (
                        <div
                          onPointerDown={(e) => onResizeDown(e, f)}
                          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm bg-primary border border-background cursor-nwse-resize"
                          style={{ touchAction: "none" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">{t.setupInstructions}</h3>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal ps-5">
            <li>{t.instr1}</li>
            <li>{t.instr2}</li>
            <li>{t.instr3}</li>
            <li>{t.instr4}</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}