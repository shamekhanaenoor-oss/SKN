import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface AcademicYearContextValue {
  currentYear: AcademicYear | null;
  loading: boolean;
  hasYear: boolean;
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  currentYear: null,
  loading: true,
  hasYear: false,
});

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["current-academic-year"],
    queryFn: async () => {
      // اول سال جاری را بگیر
      const { data: current } = await (supabase as any)
        .from("academic_years")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();
      if (current) return current as AcademicYear;

      // اگر سال جاری نبود، آخرین سال را بگیر
      const { data: latest } = await (supabase as any)
        .from("academic_years")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (latest as AcademicYear) ?? null;
    },
    // cache را برای 5 دقیقه نگه دار — از flash نشان دادن "سال نیست" جلوگیری می‌کند
    staleTime: 5 * 60 * 1000,
    // اگر cache موجود باشد، بلافاصله نشان بده و در پس‌زمینه refresh کن
    refetchOnWindowFocus: false,
  });

  return (
    <AcademicYearContext.Provider value={{
      currentYear: data ?? null,
      // فقط وقتی واقعاً در حال fetch اولیه هستیم loading=true باشد
      loading: isLoading,
      hasYear: !!data,
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
