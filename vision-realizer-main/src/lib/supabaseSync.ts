import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Person, CardTemplate } from "./types";
import { actions } from "./store";

function mapStudent(r: any): Person {
  return {
    id: `db-s-${r.id}`,
    category: "students",
    name: r.full_name || "",
    fatherName: r.father_name || "",
    className: r.classes?.name || "",
    transport: "",
    parentPhone: r.father_phone || r.mother_phone || r.phone || "",
    issueDate: r.admission_date || "",
    expiryDate: "",
    photo: r.photo_url || undefined,
  };
}

function mapTeacher(r: any): Person {
  return {
    id: `db-t-${r.id}`,
    category: "staff",
    name: r.full_name || "",
    fatherName: r.father_name || "",
    position: r.specialization || "معلم",
    department: r.qualification || "",
    phone: r.phone || "",
    issueDate: r.hire_date || "",
    expiryDate: "",
    photo: r.photo_url || undefined,
  };
}

export function useSupabaseSync(category: Category) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        // 1) Pull shared card template for this category (so design is the same on every device)
        try {
          const { data: tplRow } = await (supabase as any)
            .from("card_templates")
            .select("template")
            .eq("category", category)
            .maybeSingle();
          if (!cancelled && tplRow?.template) {
            actions.setCategoryTemplate(category, tplRow.template as CardTemplate);
          }
        } catch {/* table may not exist yet */}

        let mapped: Person[] = [];
        if (category === "students") {
          const { data, error } = await (supabase as any)
            .from("students")
            .select("*, classes(name)")
            .eq("is_active", true)
            .limit(1000);
          if (error) throw error;
          mapped = (data || []).map(mapStudent);
        } else if (category === "staff") {
          const { data, error } = await (supabase as any)
            .from("teachers")
            .select("*")
            .limit(1000);
          if (error) throw error;
          mapped = (data || []).map(mapTeacher);
        }
        if (cancelled) return;
        const existingIds = new Set(
          (JSON.parse(localStorage.getItem("id-card-app-v1") || "{}").people || [])
            .map((p: any) => p.id)
        );
        const fresh = mapped.filter(p => !existingIds.has(p.id));
        if (fresh.length) actions.addManyPeople(fresh);
        setSynced(mapped.length);
      } catch (e: any) {
        const msg = e?.message || "";
        if (msg.includes("schema cache") || msg.includes("does not exist") || e?.code === "PGRST205") {
          if (!cancelled) setError(null);
        } else if (!cancelled) {
          setError(msg || "خطا در اتصال به دیتابیس");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category]);

  return { loading, error, synced };
}

// Push the latest card template for a category to Supabase so other devices see it.
let saveTimers: Record<string, any> = {};
export function pushCardTemplate(category: Category, template: CardTemplate) {
  clearTimeout(saveTimers[category]);
  saveTimers[category] = setTimeout(async () => {
    try {
      await (supabase as any)
        .from("card_templates")
        .upsert({ category, template }, { onConflict: "category" });
    } catch (e) {
      console.warn("[card_templates] save failed — make sure the table exists in Cloud", e);
    }
  }, 600);
}
