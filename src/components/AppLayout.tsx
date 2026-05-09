import { ReactNode, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import {
  LayoutDashboard, Users, BookOpen, Calendar,
  ClipboardCheck, FileText, Wallet, Library, Bus,
  ShieldAlert, HeartPulse, Settings, LogOut, School, UserCog,
  CalendarDays, Megaphone, ScrollText, Shirt, Award, IdCard, Link2, Percent, ListOrdered, BookMarked, TrendingDown, TrendingUp
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSchoolProfile } from "@/lib/school-profile";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; section: string; }

const navItems: NavItem[] = [
  { to: "/", label: "داشبورد", icon: LayoutDashboard, section: "dashboard" },
  { to: "/student-list", label: "لست متعلمین", icon: ListOrdered, section: "student-list" },
  { to: "/students", label: "شاگردان", icon: Users, section: "students" },
  { to: "/discounts", label: "تخفیف", icon: Percent, section: "discounts" },
  { to: "/payments", label: "پرداخت فیس", icon: Wallet, section: "payments" },
  { to: "/accounting", label: "تاریخچه حسابی", icon: BookMarked, section: "accounting" },
  { to: "/revenue",    label: "عواید مکتب",    icon: TrendingUp, section: "revenue" },
  { to: "/expenses",   label: "مصارف‌ها",      icon: TrendingDown, section: "expenses" },
  { to: "/salary-payments", label: "پرداخت معاشات", icon: Wallet, section: "salary-payments" },
  { to: "/classes", label: "صنف‌ها", icon: School, section: "classes" },
  { to: "/library-books", label: "کتاب‌ها", icon: Library, section: "library-books" },
  { to: "/uniforms", label: "یونیفورم‌ها", icon: Shirt, section: "uniforms" },
  { to: "/teachers", label: "معلمان", icon: UserCog, section: "teachers" },
  { to: "/staff", label: "کارمندان", icon: Users, section: "staff" },
  { to: "/staff-points", label: "تشویق و اخطاری", icon: Award, section: "staff-points" },
  { to: "/id-cards", label: "کارت هویت", icon: IdCard, section: "id-cards" },
  { to: "/transport-routes", label: "ترانسپورت", icon: Bus, section: "transport-routes" },
  { to: "/transport-list", label: "لیست ترانسپورت", icon: Bus, section: "transport-list" },
  { to: "/academic-years", label: "سال تحصیلی", icon: CalendarDays, section: "academic-years" },
  { to: "/subjects", label: "مواد درسی", icon: BookOpen, section: "subjects" },
  { to: "/attendance", label: "حضور و غیاب", icon: ClipboardCheck, section: "attendance" },
  { to: "/exams", label: "امتحانات", icon: FileText, section: "exams" },
  { to: "/exam-results", label: "نمرات", icon: ScrollText, section: "exam-results" },
  { to: "/report-cards", label: "کارنامه", icon: FileText, section: "report-cards" },
  { to: "/book-loans", label: "تسلیم کتاب و اسناد", icon: Library, section: "book-loans" },
  { to: "/book-loans-history", label: "تاریخچه تسلیم", icon: Library, section: "book-loans-history" },
  { to: "/events", label: "رویدادها", icon: Calendar, section: "events" },
  { to: "/announcements", label: "اطلاعیه‌ها", icon: Megaphone, section: "announcements" },
  { to: "/discipline", label: "انضباط", icon: ShieldAlert, section: "discipline" },
  { to: "/settings", label: "تنظیمات", icon: Settings, section: "settings" },
  { to: "/users",    label: "ایجاد کاربر", icon: UserCog, section: "users" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const { can } = usePermissions();
  const { school_name } = useSchoolProfile();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => can(item.section, "view"));

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
    onNavigate?.();
  }

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant shrink-0">
            <School className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate" title={school_name || "سیستم مکتب"}>
              {school_name || "سیستم مکتب"}
            </h1>
            <p className="text-xs text-sidebar-foreground/70">مدیریت جامع</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-1.5">
          <p className="text-xs text-sidebar-foreground/60">کاربر</p>
          <p className="text-sm truncate" title={user?.email ?? ""}>{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>خروج</span>
        </button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { school_name } = useSchoolProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden" dir="rtl">
      {/* Sidebar - ثابت */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 h-screen sticky top-0">
        <SidebarContent />
        <div className="p-3 border-t border-sidebar-border bg-sidebar">
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>
        </div>
      </aside>

      {/* محتوا - اسکرول مستقل */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-4 bg-card border-b shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-72 bg-sidebar border-sidebar-border">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <School className="w-5 h-5 text-primary" />
            <span className="font-bold truncate max-w-[180px]">{school_name || "سیستم مکتب"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
