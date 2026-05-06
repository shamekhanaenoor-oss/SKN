import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

const BACKUP_TABLES = [
  "academic_years","grades","classes","subjects","teachers","students","parents",
  "student_parents","student_enrollments","teaching_assignments","schedules",
  "attendance","exams","exam_results","report_cards","fee_types","payments",
  "salary_payments","staff","library_books","book_loans","transport_routes",
  "student_transport","events","announcements","discipline_records","health_records",
  "uniforms","user_roles","profiles",
] as const;

export default function BackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    const backup: Record<string, any[]> = {};
    let totalRows = 0;
    try {
      for (const t of BACKUP_TABLES) {
        const { data, error } = await (supabase as any).from(t).select("*").limit(10000);
        if (error) {
          console.warn(`Skip ${t}:`, error.message);
          continue;
        }
        backup[t] = data ?? [];
        totalRows += (data ?? []).length;
      }
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables: backup,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-school-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`پشتیبان با ${totalRows} رکورد دانلود شد`);
    } catch (e: any) {
      toast.error(e.message ?? "خطا در گرفتن پشتیبان");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    if (!confirm("آیا مطمئن هستید؟ داده‌های موجود تغییر نمی‌کنند، فقط رکوردهای جدید اضافه می‌شوند (رکوردهای تکراری نادیده گرفته می‌شوند).")) return;
    setImporting(true);
    let inserted = 0, skipped = 0;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const tables = data.tables ?? data;
      for (const t of BACKUP_TABLES) {
        const rows = tables[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const { error } = await (supabase as any).from(t).upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) {
          console.warn(`Skip ${t}:`, error.message);
          skipped += rows.length;
        } else {
          inserted += rows.length;
        }
      }
      toast.success(`بازیابی انجام شد: ${inserted} رکورد. ${skipped > 0 ? `(${skipped} رد شد)` : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "خطا در بازیابی");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="shadow-card max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" /> پشتیبان‌گیری و بازیابی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            از تمام داده‌های سیستم یک نسخه پشتیبان به فرمت JSON تهیه کنید. این فایل را در جای امن نگه دارید.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            دانلود نسخه پشتیبان
          </Button>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            بازیابی از فایل پشتیبان قبلی. رکوردهای تکراری نادیده گرفته می‌شوند.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            بازیابی از فایل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
