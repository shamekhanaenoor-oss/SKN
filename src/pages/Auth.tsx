import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// نام کاربری‌های مجاز و ایمیل متناظر آن‌ها در Supabase
// این map از localStorage هم بارگیری می‌شود تا کاربران جدید هم کار کنند
function getUsernameMap(): Record<string, string> {
  const base: Record<string, string> = {
    founder: "founder@admin.local",
  };
  try {
    const extra = localStorage.getItem("username_map");
    if (extra) return { ...base, ...JSON.parse(extra) };
  } catch {}
  return base;
}

// ذخیره نام کاربری جدید در localStorage
export function saveUsernameMapping(username: string, email: string) {
  try {
    const extra = JSON.parse(localStorage.getItem("username_map") ?? "{}");
    extra[username.trim().toLowerCase()] = email;
    localStorage.setItem("username_map", JSON.stringify(extra));
  } catch {}
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem("remember_username") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("remember_username"));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUsername = username.trim().toLowerCase();
    setLoading(true);

    // اول از جدول user_usernames در Supabase بخوان
    let email: string | null = null;

    // اگر ایمیل مستقیم وارد شده
    if (trimmedUsername.includes("@")) {
      email = trimmedUsername;
    } else {
      // تلاش برای خواندن از Supabase (اگر جدول وجود داشت)
      try {
        const { data: mapping, error: mapErr } = await (supabase as any)
          .from("user_usernames")
          .select("email")
          .eq("username", trimmedUsername)
          .maybeSingle();

        if (!mapErr && mapping?.email) {
          email = mapping.email;
        }
      } catch {}

      // fallback به localStorage و map ثابت
      if (!email) {
        const localMap = getUsernameMap();
        email = localMap[trimmedUsername] ?? null;
      }
    }

    if (!email) {
      setLoading(false);
      toast.error("نام کاربری یافت نشد");
      return;
    }

    if (password.length < 6) {
      setLoading(false);
      toast.error("رمز عبور حداقل ۶ کاراکتر باشد");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      try {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("is_active, full_name")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          toast.error("حساب کاربری شما غیرفعال شده است.");
          return;
        }

        if (rememberMe) {
          localStorage.setItem("remember_username", trimmedUsername);
        } else {
          localStorage.removeItem("remember_username");
        }
        toast.success("خوش آمدید، " + (profile?.full_name || username));
      } catch {
        if (rememberMe) {
          localStorage.setItem("remember_username", trimmedUsername);
        } else {
          localStorage.removeItem("remember_username");
        }
        toast.success("خوش آمدید، " + username);
      }
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-soft" dir="rtl">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-elegant">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">سیستم مدیریت مکتب</CardTitle>
          <p className="text-sm text-muted-foreground">برای ادامه وارد شوید</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                dir="ltr"
                placeholder="founder"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {/* ردیف remember me + نمایش رمز */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                مرا به خاطر بسپار
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPassword ? "مخفی کردن" : "نمایش رمز"}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              ورود
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
