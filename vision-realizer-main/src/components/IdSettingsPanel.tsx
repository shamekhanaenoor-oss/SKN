import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Row {
  entity: "student" | "teacher" | "staff";
  prefix: string;
  padding: number;
  next_value: number;
  separator: string;
}

const LABELS: Record<Row["entity"], string> = {
  student: "شاگردان",
  teacher: "معلمان",
  staff: "کارمندان",
};

export default function IdSettingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("id_number_settings")
      .select("*")
      .order("entity");
    if (error) toast.error(error.message);
    else setRows(data as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(r: Row) {
    setSavingKey(r.entity);
    const { error } = await (supabase as any)
      .from("id_number_settings")
      .update({
        prefix: r.prefix,
        padding: Number(r.padding) || 1,
        next_value: Number(r.next_value) || 1,
        separator: r.separator || "-",
      })
      .eq("entity", r.entity);
    setSavingKey(null);
    if (error) toast.error(error.message);
    else toast.success("ذخیره شد");
  }

  function update(entity: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.entity === entity ? { ...r, ...patch } as Row : r)));
  }

  function preview(r: Row) {
    const padded = String(r.next_value || 1).padStart(r.padding || 1, "0");
    return r.prefix ? `${r.prefix}${r.separator || "-"}${padded}` : padded;
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>تنظیمات شماره خودکار (ID)</CardTitle>
        <p className="text-sm text-muted-foreground">
          هنگام افزودن شاگرد/معلم/کارمند جدید، شماره خودکار از مقدار «بعدی» تولید می‌شود و یکی به آن اضافه می‌گردد.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {rows.map((r) => (
              <div key={r.entity} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{LABELS[r.entity]}</h4>
                  <span className="text-sm text-muted-foreground">
                    نمونه ID بعدی: <span className="font-mono font-bold text-primary">{preview(r)}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>پیشوند</Label>
                    <Input value={r.prefix ?? ""} onChange={(e) => update(r.entity, { prefix: e.target.value })} placeholder="مثلا STD" />
                  </div>
                  <div>
                    <Label>جداکننده</Label>
                    <Input value={r.separator ?? "-"} onChange={(e) => update(r.entity, { separator: e.target.value })} maxLength={3} />
                  </div>
                  <div>
                    <Label>طول عدد (صفر-پر)</Label>
                    <Input type="number" min={1} max={10} value={r.padding} onChange={(e) => update(r.entity, { padding: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>شماره بعدی</Label>
                    <Input type="number" min={1} value={r.next_value} onChange={(e) => update(r.entity, { next_value: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => save(r)} disabled={savingKey === r.entity} className="gap-2">
                    {savingKey === r.entity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    ذخیره
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
