import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCachedCards,
  setCachedCards,
  getCachedPhoto,
  cachePhoto,
  isOnline,
} from "@/lib/offline-idcards-db";

export interface CardData {
  id: string;
  code: string;
  name: string;
  fatherName?: string;
  className?: string;
  hasTransport?: boolean;
  parentPhone?: string;
  validFrom?: string;
  validUntil?: string;
  subtitle?: string;
  phone?: string;
  blood?: string;
  address?: string;
  photo?: string;
  emergency?: string;
}

type EntityType = "students" | "teachers" | "staff";

function formatDateDisplay(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  // Simple YYYY-MM-DD display; you can replace with Shamsi formatter if available
  return dateStr.slice(0, 10);
}

function addOneYear(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function buildFullAddress(r: any): string | undefined {
  // ادرس فغلی (خیابان/سرک/نمبر) اولویت دارد
  if (r.address) return r.address;
  // اگر ادرس فغلی خالی بود، ولایت/ولسوالی/قریه نمایش داده شود
  const parts: string[] = [];
  if (r.province) parts.push(r.province);
  if (r.district) parts.push(r.district);
  if (r.village) parts.push(r.village);
  return parts.length > 0 ? parts.join("، ") : undefined;
}

function mapRow(t: EntityType, r: any): CardData {
  if (t === "students") {
    const cls = r.classes;
    const transportArr = r.student_transport;
    const parentArr = r.student_parents;

    const hasTransport =
      Array.isArray(transportArr) && transportArr.length > 0
        ? transportArr.some((tr: any) => tr?.is_active !== false)
        : false;

    const parentPhone =
      Array.isArray(parentArr) && parentArr.length > 0
        ? parentArr.find((sp: any) => sp?.parents?.phone)?.parents?.phone ??
          parentArr[0]?.parents?.phone
        : undefined;

    return {
      id: r.id,
      code: r.student_code,
      name: r.full_name,
      fatherName: r.father_name || undefined,
      className: cls?.name || undefined,
      hasTransport,
      parentPhone: parentPhone || r.phone || undefined,
      validFrom: formatDateDisplay(r.admission_date),
      validUntil: addOneYear(r.admission_date),
      subtitle: r.father_name ? `ولد ${r.father_name}` : undefined,
      phone: r.phone,
      blood: r.blood_group,
      address: buildFullAddress(r),
      photo: r.photo_url,
      emergency: r.father_name,
    };
  }

  if (t === "teachers")
    return {
      id: r.id,
      code: r.employee_code,
      name: r.full_name,
      fatherName: r.father_name || undefined,
      className: r.specialization || undefined,
      parentPhone: r.phone,
      validFrom: formatDateDisplay(r.hire_date),
      validUntil: addOneYear(r.hire_date),
      subtitle: r.specialization || "معلم",
      phone: r.phone,
      address: r.address,
      photo: r.photo_url,
    };

  return {
    id: r.id,
    code: r.employee_code,
    name: r.full_name,
    className: r.department || undefined,
    parentPhone: r.phone,
    validFrom: formatDateDisplay(r.hire_date),
    validUntil: addOneYear(r.hire_date),
    subtitle: r.position || "کارمند",
    phone: r.phone,
    address: r.address,
    photo: r.photo_url,
  };
}

async function resolvePhotos(rows: CardData[]): Promise<CardData[]> {
  const resolved = await Promise.all(
    rows.map(async (r) => {
      if (!r.photo) return r;
      const cached = await getCachedPhoto(r.photo);
      if (cached) return { ...r, photo: cached };
      // try to cache now
      const base64 = await cachePhoto(r.photo);
      return base64 ? { ...r, photo: base64 } : r;
    })
  );
  return resolved;
}

interface UseOfflineIdCardsResult {
  cards: CardData[];
  isLoading: boolean;
  isOffline: boolean;
  lastSync: number | null;
  refresh: () => void;
}

export function useOfflineIdCards(entity: EntityType): UseOfflineIdCardsResult {
  const [cards, setCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setIsOffline(false);

      // 1. Load cached data immediately for fast render
      const cached = await getCachedCards(entity);
      if (cached && cached.data && cached.data.length > 0) {
        const mapped = cached.data.map((r: any) => mapRow(entity, r));
        const withPhotos = await resolvePhotos(mapped);
        if (!cancelled) {
          setCards(withPhotos);
          setLastSync(cached.lastSync);
        }
      }

      // 2. If online, fetch fresh data and update cache
      if (isOnline()) {
        try {
          let query = (supabase as any).from(entity).select("*").limit(500);

          if (entity === "students") {
            query = (supabase as any)
              .from("students")
              .select(
                `*,
                classes(name),
                student_transport(is_active),
                student_parents(parents(phone, is_primary))`
              )
              .limit(500);
          }

          const { data, error } = await query;
          if (error) throw error;

          const rows = data ?? [];
          await setCachedCards(entity, rows);

          const mapped = rows.map((r: any) => mapRow(entity, r));
          // cache photos in background
          const photoUrls = mapped
            .map((r: CardData) => r.photo)
            .filter(Boolean) as string[];
          Promise.all(photoUrls.map((url) => cachePhoto(url))).catch(() => {});

          const withPhotos = await resolvePhotos(mapped);
          if (!cancelled) {
            setCards(withPhotos);
            setLastSync(Date.now());
            setIsOffline(false);
          }
        } catch (err) {
          // fetch failed - stay on cached data and mark offline
          if (!cancelled) {
            setIsOffline(true);
          }
        }
      } else {
        if (!cancelled) setIsOffline(true);
      }

      if (!cancelled) setIsLoading(false);
    }

    load();

    const handleOnline = () => {
      setIsOffline(false);
      refresh();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [entity, refreshKey]);

  return { cards, isLoading, isOffline, lastSync, refresh };
}
