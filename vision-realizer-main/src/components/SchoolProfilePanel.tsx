import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, School } from "lucide-react";
import { useSchoolProfile } from "@/lib/school-profile";

const LS_KEY = "school_profile_v3";

interface Profile {
  id?: string;
  school_name: string;
  address: string;
  phone: string;
  founder_whatsapp: string;
  maarif_license: string;
  aisa_license: string;
  sanafi_license: string;
  school_code: string;
}

const empty: Profile = {
  school_name: "", address: "", phone: "", founder_whatsapp: "",
  maarif_license: "", aisa_license: "", sanafi_license: "", school_code: "",
};

function lsLoad(): Profile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...empty, ...JSON.parse(raw) };
  } catch {}
  return empty;
}

function lsSave(p: Profile) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

export default function SchoolProfilePanel() {
  const [form, setForm] = useState<Profile>(() => lsLoad());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbWorking, setDbWorking] = useState(false);
  const { refresh: refreshContext } = useSchoolProfile();

  useEffect(() => {
    loadFromDb();
  }, []);

  async function loadFromDb() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("school_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error) {
        setDbWorking(true);
        if (data) {
          const p: Profile = {
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
          // اگر دیتابیس داده واقعی دارد، از آن استفاده کن
          if (data.school_name) {
            setForm(p);
            lsSave(p);
          } else {
            // ردیف خالی — id را بگیر، محتوا از localStorage
            const local = lsLoad();
            setForm({ ...local, id: data.id });
          }
        }
      } else {
        console.warn("DB read error:", error.message);
        // از localStorage استفاده می‌کنیم
      }
    } catch (e) {
      console.warn("DB unavailable, using localStorage");
    }
    setLoading(false);
  }

  function setField(name: keyof Profile, value: string) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.school_name.trim()) {
      toast.error("نام مکتب الزامی است");
      return;
    }
    setSaving(true);

    const payload = {
      school_name:      form.school_name,
      address:          form.address          || null,
      phone:            form.phone            || null,
      founder_whatsapp: form.founder_whatsapp || null,
      maarif_license:   form.maarif_license   || null,
      aisa_license:     form.aisa_license     || null,
      sanafi_license:   form.sanafi_license   || null,
      school_code:      form.school_code      || null,
    };

    // همیشه در localStorage ذخیره کن
    lsSave(form);

    let savedToDb = false;

    try {
      if (form.id) {
        // update
        const { error } = await (supabase as any)
          .from("school_profile")
          .update(payload)
          .eq("id", form.id);
        if (!error) savedToDb = true;
        else console.error("Update error:", error.message);
      } else {
        // اول چک کن ردیف وجود دارد
        const { data: existing } = await (supabase as any)
          .from("school_profile")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await (supabase as any)
            .from("school_profile")
            .update(payload)
            .eq("id", existing.id);
          if (!error) {
            savedToDb = true;
            setForm(prev => {
              const updated = { ...prev, id: existing.id };
              lsSave(updated);
              return updated;
            });
          }
        } else {
          const { data: inserted, error } = await (supabase as any)
            .from("school_profile")
            .insert(payload)
            .select("id")
            .maybeSingle();
          if (!error && inserted?.id) {
            savedToDb = true;
            setForm(prev => {
              const updated = { ...prev, id: inserted.id };
              lsSave(updated);
              return updated;
            });
          }
        }
      }
    } catch (e: any) {
      console.error("DB save error:", e?.message);
    }

    setSaving(false);

    if (savedToDb) {
      toast.success("پروفایل مکتب در دیتابیس ذخیره شد ✓");
    } else {
      toast.success("پروفایل مکتب ذخیره شد ✓");
    }

    // به‌روز کردن فوری context — نام مکتب در منو، رسیدها و همه جا نمایش داده می‌شود
    lsSave(form);
    await refreshContext();
  }
  if (loading) {
    return (
      <Card className="shadow-card max-w-2xl">
        <CardContent className="flex justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <School className="w-5 h-5" /> پروفایل مکتب
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          اطلاعات مکتب در رسیدهای پرداخت و پیام‌های واتساپ نمایش داده می‌شود.
          {dbWorking && <span className="text-green-600 mr-2">● دیتابیس متصل</span>}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <Label>نام مکتب <span className="text-destructive">*</span></Label>
            <Input value={form.school_name}
              onChange={e => setField("school_name", e.target.value)}
              placeholder="مثال: لیسه عالی نور" />
          </div>

          <div>
            <Label>شماره تماس</Label>
            <Input type="tel" value={form.phone}
              onChange={e => setField("phone", e.target.value)}
              placeholder="0700000000" dir="ltr" />
          </div>

          <div>
            <Label>شماره واتساپ موسس</Label>
            <Input type="tel" value={form.founder_whatsapp}
              onChange={e => setField("founder_whatsapp", e.target.value)}
              placeholder="0700000000" dir="ltr" />
            <p className="text-xs text-muted-foreground mt-1">برای ارسال گزارش مصارف استفاده می‌شود</p>
          </div>

          <div>
            <Label>کد مکتب در معارف</Label>
            <Input value={form.school_code}
              onChange={e => setField("school_code", e.target.value)}
              placeholder="کد معارف" dir="ltr" />
          </div>

          <div>
            <Label>نمبر جواز معارف</Label>
            <Input value={form.maarif_license}
              onChange={e => setField("maarif_license", e.target.value)}
              placeholder="شماره جواز معارف" dir="ltr" />
          </div>

          <div>
            <Label>نمبر جواز آیسا (AISA)</Label>
            <Input value={form.aisa_license}
              onChange={e => setField("aisa_license", e.target.value)}
              placeholder="شماره جواز آیسا" dir="ltr" />
          </div>

          <div>
            <Label>نمبر جواز صنفی</Label>
            <Input value={form.sanafi_license}
              onChange={e => setField("sanafi_license", e.target.value)}
              placeholder="شماره جواز صنفی" dir="ltr" />
          </div>

          <div className="md:col-span-2">
            <Label>آدرس</Label>
            <Textarea value={form.address}
              onChange={e => setField("address", e.target.value)}
              placeholder="آدرس کامل مکتب" rows={2} />
          </div>

        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving || !form.school_name.trim()} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
