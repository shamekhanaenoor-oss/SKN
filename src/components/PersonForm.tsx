import { useState } from "react";
import type { Category, Person } from "@/lib/types";
import { actions, uid, nextIdNumber, useAppState } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  category: Category;
  initial?: Person;
  onDone?: () => void;
  lang: "fa" | "en";
}

export function PersonForm({ category, initial, onDone, lang }: Props) {
  const t = dict[lang];
  const state = useAppState();
  const [p, setP] = useState<Person>(initial || {
    id: uid(), category, idNumber: nextIdNumber(state, category),
    name: "", fatherName: "", className: "", transport: "", parentPhone: "", issueDate: "", expiryDate: "",
  });

  const set = (k: keyof Person, v: string) => setP(prev => ({ ...prev, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => set("photo", r.result as string);
    r.readAsDataURL(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) return;
    if (initial) actions.updatePerson(p.id, p);
    else actions.addPerson(p);
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={t.idNumber}><Input value={p.idNumber || ""} onChange={e => set("idNumber", e.target.value)} placeholder="SKN-0001" /></Field>
      <Field label={t.name} required><Input value={p.name} onChange={e => set("name", e.target.value)} /></Field>
      {(category === "staff" || category === "drivers") && (
        <Field label={t.surname}><Input value={p.surname || ""} onChange={e => set("surname", e.target.value)} /></Field>
      )}
      <Field label={t.fatherName}><Input value={p.fatherName} onChange={e => set("fatherName", e.target.value)} /></Field>

      {category === "students" && <>
        <Field label={t.className}><Input value={p.className || ""} onChange={e => set("className", e.target.value)} /></Field>
        <Field label={t.transport}><Input value={p.transport || ""} onChange={e => set("transport", e.target.value)} /></Field>
        <Field label={t.parentPhone}><Input value={p.parentPhone || ""} onChange={e => set("parentPhone", e.target.value)} /></Field>
      </>}

      {category === "staff" && <>
        <Field label={t.job}><Input value={p.position || ""} onChange={e => set("position", e.target.value)} /></Field>
      </>}

      {category === "drivers" && <>
        <Field label={t.job}><Input value={p.position || ""} onChange={e => set("position", e.target.value)} /></Field>
      </>}

      <Field label={t.issueDate}><Input value={p.issueDate || ""} onChange={e => set("issueDate", e.target.value)} placeholder="1403/07/01" dir="ltr" /></Field>
      <Field label={t.expiryDate}><Input value={p.expiryDate || ""} onChange={e => set("expiryDate", e.target.value)} placeholder="1404/07/01" dir="ltr" /></Field>
      <Field label={t.photo}>
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={onPhoto} />
          {p.photo && <img src={p.photo} className="h-10 w-10 rounded object-cover" />}
        </div>
      </Field>
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        {onDone && <Button type="button" variant="outline" onClick={onDone}>{t.cancel}</Button>}
        <Button type="submit">{t.save}</Button>
      </div>
    </form>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}