import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SchoolProfile {
  id?: string;
  school_name: string;
  address?: string;
  phone?: string;
  founder_whatsapp?: string;
  maarif_license?: string;
  aisa_license?: string;
  sanafi_license?: string;
  school_code?: string;
}

const LS_KEY = "school_profile_v3";

const defaultProfile: SchoolProfile = { school_name: "" };

interface SchoolProfileContextType extends SchoolProfile {
  refresh: () => Promise<void>;
}

const SchoolProfileContext = createContext<SchoolProfileContextType>({
  ...defaultProfile,
  refresh: async () => {},
});

function lsLoad(): SchoolProfile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {}
  return defaultProfile;
}

export function SchoolProfileProvider({ children }: { children: ReactNode }) {
  // اول از localStorage بخوان (فوری — بدون flash)
  const [profile, setProfile] = useState<SchoolProfile>(() => lsLoad());

  const loadFromDb = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("school_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const p: SchoolProfile = {
          id:               data.id,
          school_name:      data.school_name      || "",
          address:          data.address          || "",
          phone:            data.phone            || "",
          founder_whatsapp: data.founder_whatsapp || "",
          maarif_license:   data.maarif_license   || "",
          aisa_license:     data.aisa_license     || "",
          sanafi_license:   data.sanafi_license   || "",
          school_code:      data.school_code      || "",
        };
        // فقط اگر دیتابیس داده واقعی دارد، جایگزین کن
        if (data.school_name) {
          setProfile(p);
          try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
        } else {
          // ردیف خالی — id را بگیر، محتوا از localStorage
          const local = lsLoad();
          if (local.school_name) {
            setProfile(prev => ({ ...local, id: data.id }));
          }
        }
      }
    } catch (e) {
      // از localStorage استفاده می‌کنیم
    }
  }, []);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // گوش دادن به تغییرات localStorage (وقتی SchoolProfilePanel ذخیره می‌کند)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue);
          setProfile(p);
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // polling هر ۵ ثانیه برای sync بین tab ها
  useEffect(() => {
    const interval = setInterval(() => {
      const local = lsLoad();
      if (local.school_name && local.school_name !== profile.school_name) {
        setProfile(local);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [profile.school_name]);

  return (
    <SchoolProfileContext.Provider value={{ ...profile, refresh: loadFromDb }}>
      {children}
    </SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile() {
  return useContext(SchoolProfileContext);
}
