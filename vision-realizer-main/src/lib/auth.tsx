import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "principal" | "teacher" | "accountant" | "librarian" | "parent" | "student";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid recursion
        setTimeout(() => fetchRoles(sess.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRoles(session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const dbRoles = (data?.map((r) => r.role as AppRole)) ?? [];

    // اگر کاربر founder است، نقش admin را همیشه داشته باشد
    const { data: userData } = await supabase.auth.getUser();
    const userMeta = userData?.user?.user_metadata;
    if (userMeta?.username === "founder" || userData?.user?.email === "founder@admin.local") {
      if (!dbRoles.includes("admin")) {
        // ثبت نقش admin در دیتابیس اگر وجود ندارد
        await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        dbRoles.push("admin");
      }
    }

    setRoles(dbRoles);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const isStaff = roles.some((r) => ["admin", "principal", "teacher", "accountant", "librarian"].includes(r));

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, hasRole, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
