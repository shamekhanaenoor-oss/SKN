// @ts-nocheck
import { useEffect, useState } from "react";
import type { AppState, Person, CardTemplate } from "./idcard-types";

const KEY = "id-card-app-v1";

const defaultTemplate: CardTemplate = {
  width: 1012,
  height: 638,
  fields: [
    { id: "f-photo", key: "photo", label: "Photo", x: 8, y: 28, fontSize: 0, color: "#000", fontWeight: 400, width: 22, height: 50, align: "left" },
    { id: "f-name", key: "name", label: "Name", x: 35, y: 30, fontSize: 28, color: "#0b1f4a", fontWeight: 700, align: "left" },
    { id: "f-father", key: "fatherName", label: "Father", x: 35, y: 40, fontSize: 20, color: "#222", fontWeight: 500, align: "left" },
    { id: "f-class", key: "className", label: "Class", x: 35, y: 50, fontSize: 20, color: "#222", fontWeight: 500, align: "left" },
    { id: "f-transport", key: "transport", label: "Transport", x: 35, y: 60, fontSize: 18, color: "#444", fontWeight: 400, align: "left" },
    { id: "f-phone", key: "parentPhone", label: "Phone", x: 35, y: 70, fontSize: 18, color: "#444", fontWeight: 400, align: "left" },
    { id: "f-issue", key: "issueDate", label: "Issue", x: 35, y: 82, fontSize: 16, color: "#666", fontWeight: 400, align: "left" },
    { id: "f-expiry", key: "expiryDate", label: "Expiry", x: 65, y: 82, fontSize: 16, color: "#666", fontWeight: 400, align: "left" },
  ],
};

const defaultState: AppState = {
  people: [],
  template: defaultTemplate,
  templates: { students: defaultTemplate, staff: defaultTemplate, drivers: defaultTemplate },
  codeSettings: { students: "SKN-ST-0001", staff: "SKN-SF-0001", drivers: "SKN-DR-0001" },
  lang: "fa",
};

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, template: { ...defaultTemplate, ...(parsed.template || {}) } };
  } catch {
    return defaultState;
  }
}

let memo: AppState = defaultState;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    memo = load();
    initialized = true;
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(memo));
    } catch (e) {
      console.warn("localStorage quota exceeded, state not persisted", e);
    }
  }
  listeners.forEach((l) => l());
}

export function useAppState() {
  ensureInit();
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return memo;
}

export const actions = {
  addPerson(p: Person) { ensureInit(); memo = { ...memo, people: [...memo.people, p] }; persist(); },
  addManyPeople(ps: Person[]) { ensureInit(); memo = { ...memo, people: [...memo.people, ...ps] }; persist(); },
  updatePerson(id: string, patch: Partial<Person>) {
    ensureInit();
    memo = { ...memo, people: memo.people.map((p) => p.id === id ? { ...p, ...patch } : p) };
    persist();
  },
  deletePerson(id: string) {
    ensureInit();
    memo = { ...memo, people: memo.people.filter((p) => p.id !== id) };
    persist();
  },
  clearCategory(cat: Person["category"]) {
    ensureInit();
    memo = { ...memo, people: memo.people.filter((p) => p.category !== cat) };
    persist();
  },
  setTemplate(t: CardTemplate) { ensureInit(); memo = { ...memo, template: t }; persist(); },
  setCategoryTemplate(cat: Person["category"], t: CardTemplate) {
    ensureInit();
    memo = { ...memo, templates: { ...(memo.templates || {}), [cat]: t } };
    persist();
    if (typeof window !== "undefined") {
      import("./supabaseSync").then(m => m.pushCardTemplate(cat, t)).catch(() => {});
    }
  },
  removeField(id: string) {
    ensureInit();
    memo = { ...memo, template: { ...memo.template, fields: memo.template.fields.filter(f => f.id !== id) } };
    persist();
  },
  removeCategoryField(cat: Person["category"], id: string) {
    ensureInit();
    const cur = memo.templates?.[cat] || memo.template;
    const next = { ...cur, fields: cur.fields.filter(f => f.id !== id) };
    memo = { ...memo, templates: { ...(memo.templates || {}), [cat]: next } };
    persist();
  },
  setLang(l: "fa" | "en") { ensureInit(); memo = { ...memo, lang: l }; persist(); },
  setCodeStart(cat: Person["category"], code: string) {
    ensureInit();
    memo = { ...memo, codeSettings: { ...(memo.codeSettings || {}), [cat]: code } };
    persist();
  },
  autoFillIds(cat: Person["category"]) {
    ensureInit();
    const start = memo.codeSettings?.[cat] || "0001";
    const list = memo.people.filter(p => p.category === cat);
    let next = parseStartCode(start);
    const used = new Set(memo.people.map(p => p.idNumber).filter(Boolean) as string[]);
    const updated = list.map((p) => {
      if (p.idNumber) return p;
      let code = formatCode(next.prefix, next.num, next.pad);
      while (used.has(code)) { next.num++; code = formatCode(next.prefix, next.num, next.pad); }
      used.add(code);
      next.num++;
      return { ...p, idNumber: code };
    });
    const map = new Map(updated.map(p => [p.id, p]));
    memo = { ...memo, people: memo.people.map(p => map.get(p.id) || p) };
    persist();
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function parseStartCode(code: string): { prefix: string; num: number; pad: number } {
  const m = code.match(/^(.*?)(\d+)\s*$/);
  if (!m) return { prefix: code, num: 1, pad: 4 };
  return { prefix: m[1], num: parseInt(m[2], 10), pad: m[2].length };
}
function formatCode(prefix: string, num: number, pad: number): string {
  return `${prefix}${String(num).padStart(pad, "0")}`;
}
export function nextIdNumber(state: AppState, cat: Person["category"]): string {
  const start = state.codeSettings?.[cat] || "0001";
  const { prefix, num, pad } = parseStartCode(start);
  const used = new Set(state.people.map(p => p.idNumber).filter(Boolean) as string[]);
  let n = num;
  let code = formatCode(prefix, n, pad);
  while (used.has(code)) { n++; code = formatCode(prefix, n, pad); }
  return code;
}
export function getCategoryTemplate(state: AppState, cat: import("./types").Category) {
  return state.templates?.[cat] || state.template;
}
