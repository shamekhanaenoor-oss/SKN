import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, Search, MessageCircle, Send, Users, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { useSchoolProfile } from "@/lib/school-profile";

// تمیز کردن شماره تلفن برای واتساپ
function toWaPhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("0")) p = "93" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  return p;
}

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const { school_name } = useSchoolProfile();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null); // id اطلاعیه در حال ارسال
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");

  // بارگیری اطلاعیه‌ها
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // بارگیری شاگردانی که واتساپ دارند
  const { data: students = [] } = useQuery({
    queryKey: ["students-with-whatsapp"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("students")
        .select("id, full_name, student_code, whatsapp_number, father_phone, phone, class:classes(name)")
        .order("full_name");
      // فقط شاگردانی که حداقل یک شماره دارند
      return (data ?? []).filter((s: any) =>
        s.whatsapp_number || s.father_phone || s.phone
      );
    },
    staleTime: 30_000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!payload.title.trim() || !payload.content.trim()) throw new Error("عنوان و متن الزامی است");
      const cleaned = {
        title: payload.title,
        content: payload.content,
        audience: "all",
        published_at: new Date().toISOString(),
      };
      if (editing?.id) {
        const { error } = await (supabase as any).from("announcements").update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("announcements").insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "ویرایش شد" : "اطلاعیه ذخیره شد");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false); setEditing(null); setForm({ title: "", content: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("حذف شد"); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e: any) => toast.error(e.message ?? "خطا"),
  });

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "" });
    setOpen(true);
  }

  function openEdit(a: any) {
    setEditing(a);
    setForm({ title: a.title ?? "", content: a.content ?? "" });
    setOpen(true);
  }

  // باز کردن دیالوگ ارسال
  function openSendDialog(announcement: any) {
    setActiveAnnouncement(announcement);
    setSelectedStudents(new Set((students as any[]).map((s: any) => s.id)));
    setStudentSearch("");
    setSendDialogOpen(true);
  }

  // ارسال به یک شاگرد
  function sendToOne(student: any, announcement: any) {
    const phone = student.whatsapp_number || student.father_phone || student.phone;
    if (!phone) return;
    const wa = toWaPhone(phone);
    const msg = buildMessage(announcement, school_name);
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ارسال به همه انتخاب‌شده‌ها — یکی یکی tab باز می‌کند
  async function sendToAll() {
    if (!activeAnnouncement) return;
    const targets = (students as any[]).filter((s: any) => selectedStudents.has(s.id));
    if (targets.length === 0) { toast.error("هیچ شاگردی انتخاب نشده"); return; }

    setSending(activeAnnouncement.id);
    const msg = buildMessage(activeAnnouncement, school_name);

    let sent = 0;
    for (const s of targets) {
      const phone = s.whatsapp_number || s.father_phone || s.phone;
      if (!phone) continue;
      const wa = toWaPhone(phone);
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
      sent++;
      // تأخیر کوتاه بین هر tab
      await new Promise(r => setTimeout(r, 400));
    }

    setSending(null);
    setSendDialogOpen(false);
    toast.success(`اطلاعیه برای ${sent} شاگرد ارسال شد`);
  }

  function buildMessage(announcement: any, schoolName: string): string {
    return [
      `🏫 *${schoolName || "مکتب"}*`,
      `━━━━━━━━━━━━━━`,
      `📢 *${announcement.title}*`,
      ``,
      announcement.content,
      ``,
      `با احترام 🙏`,
    ].join("\n");
  }

  const filteredAnnouncements = search
    ? announcements.filter((a: any) =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.content?.toLowerCase().includes(search.toLowerCase())
      )
    : announcements;

  const filteredStudents = studentSearch
    ? (students as any[]).filter((s: any) =>
        s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.student_code?.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students as any[];

  const allSelected = filteredStudents.length > 0 &&
    filteredStudents.every((s: any) => selectedStudents.has(s.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedStudents(prev => {
        const next = new Set(prev);
        filteredStudents.forEach((s: any) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStudents(prev => {
        const next = new Set(prev);
        filteredStudents.forEach((s: any) => next.add(s.id));
        return next;
      });
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="اطلاعیه‌ها"
        description={`${students.length} شاگرد با شماره واتساپ`}
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> اطلاعیه جدید
          </Button>
        }
      />

      {/* خلاصه شاگردان */}
      <Card className="p-4 mb-5 flex items-center gap-3 bg-green-50 border-green-200">
        <Users className="w-5 h-5 text-green-700 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {students.length} شاگرد با شماره واتساپ/تلفن آماده دریافت اطلاعیه هستند
          </p>
          <p className="text-xs text-green-600">اطلاعیه را ذخیره کنید، سپس دکمه ارسال را بزنید</p>
        </div>
      </Card>

      {/* جستجو */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      {/* جدول اطلاعیه‌ها */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">هیچ اطلاعیه‌ای یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان</TableHead>
                  <TableHead className="text-right">متن</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{a.content}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {a.published_at ? new Date(a.published_at).toLocaleDateString("fa-IR") : "—"}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => openSendDialog(a)}
                          disabled={sending === a.id}
                        >
                          {sending === a.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <MessageCircle className="w-3.5 h-3.5" />}
                          ارسال واتساپ
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          onClick={() => { if (confirm("حذف شود؟")) deleteMutation.mutate(a.id); }}>
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

      {/* فرم افزودن/ویرایش */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش اطلاعیه" : "اطلاعیه جدید"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); upsertMutation.mutate(form); }}>
            <div>
              <Label>عنوان <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="مثال: تعطیلی فردا" />
            </div>
            <div>
              <Label>متن اطلاعیه <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                required rows={5}
                placeholder="متن کامل اطلاعیه را بنویسید..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* دیالوگ ارسال */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              ارسال اطلاعیه در واتساپ
            </DialogTitle>
          </DialogHeader>

          {activeAnnouncement && (
            <div className="space-y-4">
              {/* پیش‌نمایش اطلاعیه */}
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-semibold mb-1">{activeAnnouncement.title}</p>
                <p className="text-muted-foreground whitespace-pre-wrap text-xs">{activeAnnouncement.content}</p>
              </div>

              {/* آمار */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedStudents.size} شاگرد انتخاب شده از {students.length}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudents(new Set((students as any[]).map((s: any) => s.id)))}>
                    انتخاب همه
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudents(new Set())}>
                    لغو همه
                  </Button>
                </div>
              </div>

              {/* جستجو */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="جستجو شاگرد..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* لیست شاگردان */}
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <button onClick={toggleAll} className="flex items-center">
                          {allSelected
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">نام شاگرد</TableHead>
                      <TableHead className="text-right">صنف</TableHead>
                      <TableHead className="text-right">شماره</TableHead>
                      <TableHead className="text-left">ارسال تکی</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s: any) => {
                      const phone = s.whatsapp_number || s.father_phone || s.phone;
                      return (
                        <TableRow key={s.id} className={selectedStudents.has(s.id) ? "bg-green-50/50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.has(s.id)}
                              onCheckedChange={() => toggleStudent(s.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{s.full_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.class?.name ?? "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{phone}</TableCell>
                          <TableCell className="text-left">
                            <Button
                              size="icon" variant="ghost"
                              onClick={() => sendToOne(s, activeAnnouncement)}
                              title="ارسال تکی"
                            >
                              <Send className="w-3.5 h-3.5 text-green-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>انصراف</Button>
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={sendToAll}
                  disabled={selectedStudents.size === 0 || !!sending}
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <MessageCircle className="w-4 h-4" />}
                  ارسال به {selectedStudents.size} شاگرد
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
