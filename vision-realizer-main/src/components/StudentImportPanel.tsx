import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = [
  "student_code",
  "full_name",
  "father_name",
  "grandfather_name",
  "gender",
  "enrollment_type",
  "class_name",
  "date_of_birth",
  "tazkira_number",
  "phone",
  "father_phone",
  "mother_phone",
  "whatsapp_number",
  "province",
  "district",
  "village",
  "blood_group",
  "admission_date",
  "address",
  "notes",
];

const HEADER_LABELS: Record<string, string> = {
  student_code:     "کد شاگرد *",
  full_name:        "نام کامل *",
  father_name:      "نام پدر",
  grandfather_name: "نام پدرکلان",
  gender:           "جنسیت (male/female)",
  enrollment_type:  "نوع ثبت‌نام (new/transfer/returning)",
  class_name:       "نام صنف (مثال: صنف ۱۰)",
  date_of_birth:    "تاریخ تولد (YYYY-MM-DD)",
  tazkira_number:   "شماره تذکره",
  phone:            "تلفن",
  father_phone:     "تلفن پدر",
  mother_phone:     "تلفن مادر",
  whatsapp_number:  "واتساپ",
  province:         "ولایت",
  district:         "ولسوالی",
  village:          "قریه",
  blood_group:      "گروه خون",
  admission_date:   "تاریخ ثبت‌نام (YYYY-MM-DD)",
  address:          "آدرس",
  notes:            "یادداشت",
};

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headerRow = TEMPLATE_HEADERS.map(h => HEADER_LABELS[h]);
  const sampleRow = [
    "STD-001", "عبدالولی", "مولوی محی الدین", "ملا سیف الدین",
    "male", "new", "صنف ۱۰",
    "2010-03-15", "1234567",
    "0700000000", "0701000000", "0702000000", "0700000000",
    "کابل", "کابل", "خیرخانه", "A+",
    "2024-01-01", "کابل، خیرخانه", "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headerRow, sampleRow]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "شاگردان");
  XLSX.writeFile(wb, "template_students.xlsx");
}

interface ImportRow {
  row: number;
  data: Record<string, any>;
  class_name: string;
  status: "pending" | "success" | "error" | "duplicate";
  error?: string;
}

export default function StudentImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) { toast.error("فایل خالی است"); return; }

        const parsed: ImportRow[] = raw.slice(1)
          .filter(r => r.some((c: any) => String(c).trim() !== ""))
          .map((r, i) => ({
            row: i + 2,
            status: "pending",
            class_name: String(r[6] ?? "").trim(),
            data: {
              student_code:     String(r[0]  ?? "").trim(),
              full_name:        String(r[1]  ?? "").trim(),
              father_name:      String(r[2]  ?? "").trim() || null,
              grandfather_name: String(r[3]  ?? "").trim() || null,
              gender:           String(r[4]  ?? "").trim() || null,
              enrollment_type:  String(r[5]  ?? "").trim() || "new",
              // r[6] = class_name — بعداً به ID تبدیل می‌شود
              date_of_birth:    String(r[7]  ?? "").trim() || null,
              tazkira_number:   String(r[8]  ?? "").trim() || null,
              phone:            String(r[9]  ?? "").trim() || null,
              father_phone:     String(r[10] ?? "").trim() || null,
              mother_phone:     String(r[11] ?? "").trim() || null,
              whatsapp_number:  String(r[12] ?? "").trim() || null,
              province:         String(r[13] ?? "").trim() || null,
              district:         String(r[14] ?? "").trim() || null,
              village:          String(r[15] ?? "").trim() || null,
              blood_group:      String(r[16] ?? "").trim() || null,
              admission_date:   String(r[17] ?? "").trim() || null,
              address:          String(r[18] ?? "").trim() || null,
              notes:            String(r[19] ?? "").trim() || null,
            },
          }));

        setRows(parsed);
        toast.success(`${parsed.length} ردیف از فایل خوانده شد`);
      } catch (err: any) {
        toast.error("خطا در خواندن فایل: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setDone(false);

    // بارگیری همه صنف‌ها یک‌بار
    const { data: classes = [] } = await (supabase as any)
      .from("classes")
      .select("id, name");
    const classMap: Record<string, string> = {};
    for (const c of classes as any[]) {
      classMap[c.name.trim().toLowerCase()] = c.id;
    }

    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];

      if (!row.data.student_code || !row.data.full_name) {
        updated[i] = { ...row, status: "error", error: "کد شاگرد و نام کامل الزامی است" };
        continue;
      }

      try {
        // بررسی تکراری
        const { data: existing } = await (supabase as any)
          .from("students")
          .select("id")
          .eq("student_code", row.data.student_code)
          .maybeSingle();

        if (existing) {
          updated[i] = { ...row, status: "duplicate", error: `کد ${row.data.student_code} قبلاً ثبت شده` };
          continue;
        }

        // تبدیل نام صنف به ID
        const payload = { ...row.data };
        if (row.class_name) {
          const classId = classMap[row.class_name.trim().toLowerCase()];
          if (classId) {
            payload.current_class_id = classId;
          } else {
            // صنف پیدا نشد — ثبت می‌کنیم اما بدون صنف
            console.warn(`صنف "${row.class_name}" پیدا نشد`);
          }
        }

        const { error } = await (supabase as any).from("students").insert(payload);

        if (error) {
          updated[i] = { ...row, status: "error", error: error.message };
        } else {
          updated[i] = { ...row, status: "success" };
        }
      } catch (e: any) {
        updated[i] = { ...row, status: "error", error: e.message };
      }

      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);

    const success = updated.filter(r => r.status === "success").length;
    const errors  = updated.filter(r => r.status === "error").length;
    const dupes   = updated.filter(r => r.status === "duplicate").length;
    toast.success(`وارد شد: ${success} | تکراری: ${dupes} | خطا: ${errors}`);
  }

  const successCount   = rows.filter(r => r.status === "success").length;
  const errorCount     = rows.filter(r => r.status === "error").length;
  const duplicateCount = rows.filter(r => r.status === "duplicate").length;
  const pendingCount   = rows.filter(r => r.status === "pending").length;

  return (
    <Card className="shadow-card max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          وارد کردن شاگردان از Excel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ابتدا فایل نمونه را دانلود کنید، اطلاعات شاگردان را وارد کنید، سپس فایل را آپلود نمایید.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* مرحله ۱ */}
        <div className="rounded-lg border p-4 bg-blue-50/50 border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-2">مرحله ۱ — دانلود فایل نمونه</p>
          <p className="text-xs text-muted-foreground mb-3">
            ستون‌های الزامی: <strong>کد شاگرد</strong> و <strong>نام کامل</strong>.
            برای صنف، نام دقیق صنف را بنویسید (مثال: صنف ۱۰).
          </p>
          <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100" onClick={downloadTemplate}>
            <Download className="w-4 h-4" />
            دانلود فایل نمونه (template_students.xlsx)
          </Button>
        </div>

        {/* مرحله ۲ */}
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold mb-2">مرحله ۲ — آپلود فایل تکمیل‌شده</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2"
              onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="w-4 h-4" /> انتخاب فایل Excel
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              className="hidden" onChange={handleFile} />
            {rows.length > 0 && (
              <span className="text-sm text-muted-foreground">{rows.length} ردیف آماده</span>
            )}
          </div>
        </div>

        {/* پیش‌نمایش */}
        {rows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-gray-50">{pendingCount} در انتظار</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{successCount} موفق</Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{errorCount} خطا</Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{duplicateCount} تکراری</Badge>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2">ردیف</th>
                    <th className="text-right px-3 py-2">کد</th>
                    <th className="text-right px-3 py-2">نام کامل</th>
                    <th className="text-right px-3 py-2">نام پدر</th>
                    <th className="text-right px-3 py-2">صنف</th>
                    <th className="text-right px-3 py-2">جنسیت</th>
                    <th className="text-right px-3 py-2">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.row} className={
                      r.status === "success"   ? "bg-green-50" :
                      r.status === "error"     ? "bg-red-50" :
                      r.status === "duplicate" ? "bg-yellow-50" : ""
                    }>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.row}</td>
                      <td className="px-3 py-1.5 font-mono">{r.data.student_code}</td>
                      <td className="px-3 py-1.5 font-medium">{r.data.full_name}</td>
                      <td className="px-3 py-1.5">{r.data.father_name ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.class_name || "—"}</td>
                      <td className="px-3 py-1.5">
                        {r.data.gender === "male" ? "ذکور" : r.data.gender === "female" ? "اناث" : "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.status === "pending"   && <span className="text-muted-foreground">در انتظار</span>}
                        {r.status === "success"   && <span className="flex items-center gap-1 text-green-700"><CheckCircle className="w-3 h-3" /> موفق</span>}
                        {r.status === "duplicate" && <span className="flex items-center gap-1 text-yellow-700"><AlertCircle className="w-3 h-3" /> تکراری</span>}
                        {r.status === "error"     && <span className="flex items-center gap-1 text-red-700" title={r.error}><XCircle className="w-3 h-3" /> {r.error?.slice(0, 30)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!done && (
              <Button className="gap-2 w-full" onClick={handleImport}
                disabled={importing || pendingCount === 0}>
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال وارد کردن...</>
                  : <><Upload className="w-4 h-4" /> وارد کردن {pendingCount} شاگرد</>}
              </Button>
            )}

            {done && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                عملیات تمام شد — {successCount} وارد شد، {duplicateCount} تکراری، {errorCount} خطا
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
