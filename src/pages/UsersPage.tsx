import { useState, useEffect } from "react";
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
import { Plus, Loader2, UserCog, Trash2, Pencil, UserCheck, UserX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { SECTIONS, PermAction } from "@/lib/permissions";

const ACTIONS: { key: PermAction; label: string; col: string }[] = [
  { key: "view",   label: "مشاهده", col: "can_view" },
  { key: "add",    label: "افزودن", col: "can_add" },
  { key: "edit",   label: "ویرایش", col: "can_edit" },
  { key: "delete", label: "حذف",    col: "can_delete" },
];

type PermsState = Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean }>;

function emptyPerms(): PermsState {
  const out: PermsState = {};
  for (const s of SECTIONS) out[s.key] = { view: false, add: false, edit: false, delete: false };
  return out;
}

export default function UsersPage() {
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", username: "" });
  const [createPerms, setCreatePerms] = useState<PermsState>(emptyPerms());

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPerms, setEditPerms] = useState<PermsState>(emptyPerms());

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data: profiles, error } = await (supabase as any)
        .from("profiles").select("id, full_name, is_active").order("full_name");
      if (error) throw error;
      const { data: perms } = await (supabase as any)
        .from("user_permissions").select("user_id, section, can_view");
      const counts: Record<string, number> = {};
      for (const r of perms ?? []) {
        if (r.can_view) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
      }
      return (profiles ?? []).map((p: any) => ({
        ...p,
        is_active: p.is_active !== false,
        section_count: counts[p.id] ?? 0,
      }));
    },
  });

  // بارگذاری دسترسی‌های کاربر هنگام ویرایش
  useEffect(() => {
    if (!editOpen || !editUser) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_permissions").select("*").eq("user_id", editUser.id);
      const next = emptyPerms();
      for (const r of data ?? []) {
        if (next[r.section]) {
          next[r.section] = {
            view: !!r.can_view, add: !!r.can_add,
            edit: !!r.can_edit, delete: !!r.can_delete,
          };
        }
      }
      setEditPerms(next);
    })();
  }, [editOpen, editUser]);

  async function savePerms(userId: string, perms: PermsState) {
    // پاک کردن قبلی و درج جدید (فقط بخش‌هایی که حداقل یک تیک دارند)
    await (supabase as any).from("user_permissions").delete().eq("user_id", userId);
    const rows = SECTIONS
      .filter((s) => {
        const p = perms[s.key];
        return p && (p.view || p.add || p.edit || p.delete);
      })
      .map((s) => {
        const p = perms[s.key];
        return {
          user_id: userId, section: s.key,
          can_view: p.view, can_add: p.add, can_edit: p.edit, can_delete: p.delete,
        };
      });
    if (rows.length) {
      const { error } = await (supabase as any).from("user_permissions").insert(rows);
      if (error) throw error;
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.email || !form.password) throw new Error("ایمیل و رمز عبور الزامی است");
      if (!form.username.trim()) throw new Error("نام کاربری الزامی است");
      if (form.password.length < 6) throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      const anyView = SECTIONS.some((s) => createPerms[s.key]?.view);
      if (!anyView) throw new Error("حداقل یک بخش با دسترسی «مشاهده» انتخاب کنید");

      const { data, error } = await (supabase as any).functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name || form.username,
          username: form.username.trim().toLowerCase(),
          roles: [], // دیگر نقش انتخاب نمی‌کنیم؛ از دسترسی‌ها استفاده می‌کنیم
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.user_id) throw new Error("کاربر ایجاد نشد");

      await savePerms(data.user_id, createPerms);

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
      setCreatePerms(emptyPerms());
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      await (supabase as any).from("profiles").update({ full_name: editName || null }).eq("id", editUser.id);
      await savePerms(editUser.id, editPerms);
    },
    onSuccess: () => {
      toast.success("ذخیره شد ✓");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await (supabase as any).from("profiles").update({ is_active: isActive }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "کاربر فعال شد" : "کاربر غیرفعال شد");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await (supabase as any).from("user_permissions").delete().eq("user_id", userId);
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

  function openEdit(u: any) {
    setEditUser(u);
    setEditName(u.full_name ?? "");
    setEditPerms(emptyPerms());
    setEditOpen(true);
  }

  function togglePerm(perms: PermsState, setter: (p: PermsState) => void, section: string, action: PermAction) {
    const next = { ...perms, [section]: { ...perms[section], [action]: !perms[section][action] } };
    // اگر افزودن/ویرایش/حذف فعال شد، مشاهده هم اتومات فعال شود
    if (action !== "view" && next[section][action]) next[section].view = true;
    setter(next);
  }

  function setAllForSection(perms: PermsState, setter: (p: PermsState) => void, section: string, value: boolean) {
    setter({ ...perms, [section]: { view: value, add: value, edit: value, delete: value } });
  }

  function setAllPerms(setter: (p: PermsState) => void, value: boolean) {
    const next: PermsState = {};
    for (const s of SECTIONS) next[s.key] = { view: value, add: value, edit: value, delete: value };
    setter(next);
  }

  function PermsMatrix({ perms, setter }: { perms: PermsState; setter: (p: PermsState) => void }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> دسترسی به بخش‌ها</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setAllPerms(setter, true)}>انتخاب همه</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAllPerms(setter, false)}>پاک کردن</Button>
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead className="text-right">بخش</TableHead>
                  {ACTIONS.map((a) => <TableHead key={a.key} className="text-center w-20">{a.label}</TableHead>)}
                  <TableHead className="text-center w-16">همه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SECTIONS.map((s) => {
                  const p = perms[s.key];
                  const allChecked = p.view && p.add && p.edit && p.delete;
                  return (
                    <TableRow key={s.key}>
                      <TableCell className="font-medium text-sm">{s.label}</TableCell>
                      {ACTIONS.map((a) => (
                        <TableCell key={a.key} className="text-center">
                          <Checkbox
                            checked={p[a.key]}
                            onCheckedChange={() => togglePerm(perms, setter, s.key, a.key)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Checkbox
                          checked={allChecked}
                          onCheckedChange={(v) => setAllForSection(perms, setter, s.key, !!v)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          فعال‌سازی «افزودن/ویرایش/حذف» به‌صورت خودکار «مشاهده» را نیز فعال می‌کند.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="مدیریت کاربران و دسترسی‌ها"
        description="ایجاد کاربر و تعیین دسترسی هر بخش به‌صورت تیک‌وار"
        action={<Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> کاربر جدید</Button>}
      />

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
                  <TableHead className="text-right">تعداد بخش‌های قابل مشاهده</TableHead>
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
                      <Badge variant="outline">{u.section_count} بخش</Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" title="ویرایش دسترسی‌ها" onClick={() => openEdit(u)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          title={u.is_active ? "غیرفعال کردن" : "فعال کردن"}
                          onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.is_active })}>
                          {u.is_active
                            ? <UserX className="w-4 h-4 text-orange-500" />
                            : <UserCheck className="w-4 h-4 text-green-600" />}
                        </Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> کاربر جدید</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>نام کامل</Label><Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="مثال: احمد محمدی" /></div>
              <div>
                <Label>نام کاربری <span className="text-destructive">*</span></Label>
                <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="مثال: ahmad" dir="ltr" required />
              </div>
              <div><Label>ایمیل <span className="text-destructive">*</span></Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="example@school.com" dir="ltr" required /></div>
              <div><Label>رمز عبور <span className="text-destructive">*</span></Label><Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="حداقل ۶ کاراکتر" dir="ltr" required /></div>
            </div>

            <PermsMatrix perms={createPerms} setter={setCreatePerms} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}ایجاد کاربر</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* دیالوگ ویرایش */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> ویرایش دسترسی‌ها</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }}>
            <div><Label>نام کامل</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="نام کامل" /></div>
            <PermsMatrix perms={editPerms} setter={setEditPerms} />
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
