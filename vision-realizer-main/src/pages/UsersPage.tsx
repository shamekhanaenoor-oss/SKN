import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, UserCog, Trash2, Shield, Pencil, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const ROLES = [
  { value: "admin",      label: "مدیر سیستم", color: "bg-red-100 text-red-700 border-red-200",
    permissions: ["✅ دسترسی کامل به همه بخش‌ها","✅ ایجاد و حذف کاربران","✅ تنظیمات سیستم"] },
  { value: "principal",  label: "مدیر مکتب",  color: "bg-purple-100 text-purple-700 border-purple-200",
    permissions: ["✅ مشاهده همه بخش‌ها","✅ مدیریت شاگردان و معلمان","✅ مدیریت پرداخت‌ها"] },
  { value: "accountant", label: "محاسب",       color: "bg-blue-100 text-blue-700 border-blue-200",
    permissions: ["✅ مدیریت پرداخت‌ها و فیس","✅ مدیریت معاشات","✅ عواید و مصارف"] },
  { value: "teacher",    label: "معلم",        color: "bg-green-100 text-green-700 border-green-200",
    permissions: ["✅ مشاهده شاگردان","✅ ثبت حضور و غیاب","✅ ثبت نمرات"] },
  { value: "librarian",  label: "کتابدار",     color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    permissions: ["✅ مدیریت کتابخانه","✅ امانت کتاب"] },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role);
  return <Badge variant="outline" className={`text-xs ${r?.color ?? ""}`}>{r?.label ?? role}</Badge>;
}

export default function UsersPage() {
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", username: "" });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const [showRoleInfo, setShowRoleInfo] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data: profiles, error } = await (supabase as any)
        .from("profiles").select("id, full_name, is_active").order("full_name");
      if (error) throw error;
      const { data: roles } = await (supabase as any)
        .from("user_roles").select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      for (const r of roles ?? []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }
      return (profiles ?? []).map((p: any) => ({
        ...p,
        is_active: p.is_active !== false, // پیش‌فرض true
        roles: roleMap[p.id] ?? [],
      }));
    },
  });

  // ایجاد کاربر
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.email || !form.password) throw new Error("ایمیل و رمز عبور الزامی است");
      if (!form.username.trim()) throw new Error("نام کاربری الزامی است");
      if (form.password.length < 6) throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      if (selectedRoles.length === 0) throw new Error("حداقل یک نقش انتخاب کنید");

      const { data: { session: currentSession } } = await (supabase as any).auth.getSession();
      const { data: authData, error: authError } = await (supabase as any).auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.full_name || form.email } },
      });
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error("کاربر ایجاد نشد");

      if (currentSession && authData?.session) {
        await (supabase as any).auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }
      for (const role of selectedRoles) {
        await (supabase as any).from("user_roles").insert({ user_id: userId, role });
      }
      if (form.full_name) {
        await (supabase as any).from("profiles").upsert({ id: userId, full_name: form.full_name, is_active: true });
      }
      try {
        const extra = JSON.parse(localStorage.getItem("username_map") ?? "{}");
        extra[form.username.trim().toLowerCase()] = form.email;
        localStorage.setItem("username_map", JSON.stringify(extra));
      } catch {}
    },
    onSuccess: () => {
      toast.success("کاربر ایجاد شد ✓");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setCreateOpen(false);
      setForm({ email: "", password: "", full_name: "", username: "" });
      setSelectedRoles([]);
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  // ویرایش
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      await (supabase as any).from("profiles").update({ full_name: editName || null }).eq("id", editUser.id);
      await (supabase as any).from("user_roles").delete().eq("user_id", editUser.id);
      for (const role of editRoles) {
        await (supabase as any).from("user_roles").insert({ user_id: editUser.id, role });
      }
    },
    onSuccess: () => {
      toast.success("ویرایش شد ✓");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  // فعال/غیرفعال
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "کاربر فعال شد" : "کاربر غیرفعال شد");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // حذف کاربر (فقط از profiles و user_roles — auth.users نیاز به admin API دارد)
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await (supabase as any).from("user_roles").delete().eq("user_id", userId);
      const { error } = await (supabase as any).from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("کاربر حذف شد");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await (supabase as any).from("user_roles")
        .delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("نقش حذف شد"); qc.invalidateQueries({ queryKey: ["users-list"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(u: any) {
    setEditUser(u); setEditName(u.full_name ?? ""); setEditRoles([...u.roles]); setEditOpen(true);
  }

  function toggleRole(role: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(role) ? list.filter(r => r !== role) : [...list, role]);
  }

  return (
    <div>
      <PageHeader
        title="مدیریت کاربران"
        description="ایجاد کاربران و تعیین نقش‌ها"
        action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> کاربر جدید</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        {ROLES.map(r => (
          <button key={r.value}
            onClick={() => setShowRoleInfo(showRoleInfo === r.value ? null : r.value)}
            className={`rounded-lg border p-2 text-xs font-medium text-right transition-all ${r.color} ${showRoleInfo === r.value ? "ring-2 ring-offset-1 ring-current" : ""}`}>
            <Shield className="w-3 h-3 inline ml-1" />{r.label}
          </button>
        ))}
      </div>

      {showRoleInfo && (
        <Card className="p-4 mb-5 border-dashed">
          <p className="font-semibold text-sm mb-2">دسترسی‌های «{ROLES.find(r => r.value === showRoleInfo)?.label}»:</p>
          <ul className="space-y-1">{ROLES.find(r => r.value === showRoleInfo)?.permissions.map((p, i) => <li key={i} className="text-xs">{p}</li>)}</ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ کاربری یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام کاربر</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">نقش‌ها</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users as any[]).map((u: any) => (
                  <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${u.is_active ? "bg-primary/10" : "bg-muted"}`}>
                          <UserCog className={`w-4 h-4 ${u.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={u.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                        {u.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">بدون نقش</span>}
                        {u.roles.map((role: string) => (
                          <div key={role} className="flex items-center gap-0.5">
                            <RoleBadge role={role} />
                            <button className="text-muted-foreground hover:text-destructive ml-0.5"
                              onClick={() => { if (confirm(`نقش "${ROLES.find(r => r.value === role)?.label}" حذف شود؟`)) deleteRoleMutation.mutate({ userId: u.id, role }); }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        {/* ویرایش */}
                        <Button size="icon" variant="ghost" title="ویرایش" onClick={() => openEdit(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {/* فعال/غیرفعال */}
                        <Button size="icon" variant="ghost"
                          title={u.is_active ? "غیرفعال کردن" : "فعال کردن"}
                          onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.is_active })}>
                          {u.is_active
                            ? <UserX className="w-4 h-4 text-orange-500" />
                            : <UserCheck className="w-4 h-4 text-green-600" />}
                        </Button>
                        {/* حذف */}
                        <Button size="icon" variant="ghost" title="حذف کاربر"
                          onClick={() => { if (confirm("این کاربر حذف شود؟ این عمل قابل بازگشت نیست.")) deleteMutation.mutate(u.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* دیالوگ ایجاد */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> کاربر جدید</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}>
            <div><Label>نام کامل</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="مثال: احمد محمدی" /></div>
            <div>
              <Label>نام کاربری <span className="text-destructive">*</span></Label>
              <Input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="مثال: ahmad" dir="ltr" required />
              <p className="text-xs text-muted-foreground mt-1">با این نام در صفحه ورود وارد می‌شود</p>
            </div>
            <div><Label>ایمیل <span className="text-destructive">*</span></Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="example@school.com" dir="ltr" required /></div>
            <div><Label>رمز عبور <span className="text-destructive">*</span></Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="حداقل ۶ کاراکتر" dir="ltr" required /></div>
            <div>
              <Label className="mb-2 block">نقش‌ها <span className="text-destructive">*</span></Label>
              <div className="space-y-1.5">
                {ROLES.map(r => (
                  <div key={r.value} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30">
                    <Checkbox id={`cr-${r.value}`} checked={selectedRoles.includes(r.value)} onCheckedChange={() => toggleRole(r.value, selectedRoles, setSelectedRoles)} />
                    <label htmlFor={`cr-${r.value}`} className="cursor-pointer flex items-center gap-2 flex-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${r.color}`}>{r.label}</span>
                      <span className="text-xs text-muted-foreground truncate">{r.permissions[0]}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}ایجاد کاربر</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* دیالوگ ویرایش */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> ویرایش کاربر</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); editMutation.mutate(); }}>
            <div><Label>نام کامل</Label><Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="نام کامل" /></div>
            <div>
              <Label className="mb-2 block">نقش‌ها</Label>
              <div className="space-y-1.5">
                {ROLES.map(r => (
                  <div key={r.value} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30">
                    <Checkbox id={`er-${r.value}`} checked={editRoles.includes(r.value)} onCheckedChange={() => toggleRole(r.value, editRoles, setEditRoles)} />
                    <label htmlFor={`er-${r.value}`} className="cursor-pointer flex items-center gap-2 flex-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${r.color}`}>{r.label}</span>
                      <span className="text-xs text-muted-foreground truncate">{r.permissions[0]}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={editMutation.isPending}>{editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}ذخیره</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
