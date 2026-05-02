import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Wallet, Bus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAcademicYear } from "@/lib/academic-year";
import { isoToShamsi, todayShamsi } from "@/lib/shamsi";

const SHAMSI_MONTHS = [
  { value: 1,  label: "حمل" },
  { value: 2,  label: "ثور" },
  { value: 3,  label: "جوزا" },
  { value: 4,  label: "سرطان" },
  { value: 5,  label: "اسد" },
  { value: 6,  label: "سنبله" },
  { value: 7,  label: "میزان" },
  { value: 8,  label: "عقرب" },
  { value: 9,  label: "قوس" },
  { value: 10, label: "جدی" },
  { value: 11, label: "دلو" },
  { value: 12, label: "حوت" },
];

export default function RevenuePage() {
  const { currentYear } = useAcademicYear();
  const today = todayShamsi();

  const academicYear = (() => {
    if (!currentYear) return today.year;
    const matches = currentYear.name?.match(/\d{4}/g);
    if (matches?.length) return parseInt(matches[matches.length - 1]);
    if (currentYear.start_date) {
      const s = isoToShamsi(currentYear.start_date);
      if (s) return s.year;
    }
    return today.year;
  })();

  const [selectedYear, setSelectedYear] = useState<number>(academicYear);
  const yearOptions = Array.from({ length: 5 }, (_, i) => academicYear - 2 + i);

  // بارگیری پرداخت‌های سال انتخاب‌شده
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["revenue-payments", selectedYear],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payments")
        .select("payment_month, payment_year, paid_amount, amount, transport_fee, status")
        .eq("payment_year", selectedYear)
        .neq("status", "cancelled");
      return data ?? [];
    },
  });

  // محاسبه عواید واقعی به تفکیک ماه
  const monthlyData = SHAMSI_MONTHS.map(m => {
    const monthPayments = (payments as any[]).filter(p => p.payment_month === m.value);

    const receivedFee = monthPayments.reduce((sum: number, p: any) =>
      sum + Number(p.paid_amount ?? p.amount ?? 0), 0);

    const receivedTransport = monthPayments.reduce((sum: number, p: any) =>
      sum + Number(p.transport_fee ?? 0), 0);

    const totalReceived = receivedFee + receivedTransport;
    const paidCount = monthPayments.length;

    return {
      month: m.value,
      label: m.label,
      receivedFee,
      receivedTransport,
      totalReceived,
      paidCount,
    };
  });

  // مجموع کل سال
  const yearTotalFee       = monthlyData.reduce((s, m) => s + m.receivedFee, 0);
  const yearTotalTransport = monthlyData.reduce((s, m) => s + m.receivedTransport, 0);
  const yearTotal          = yearTotalFee + yearTotalTransport;

  return (
    <div>
      <PageHeader
        title="عواید مکتب"
        description="فیس شاگردان و فیس ترانسپورت به تفکیک ماه"
      />

      {/* فیلتر سال */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-muted-foreground">سال:</span>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => (
              <SelectItem key={y} value={String(y)}>
                {y}{y === academicYear ? " (جاری)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* کارت‌های خلاصه */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مجموع فیس دریافتی</p>
                  <p className="text-lg font-bold text-blue-700">{yearTotalFee.toLocaleString()} افغانی</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مجموع ترانسپورت دریافتی</p>
                  <p className="text-lg font-bold text-orange-700">{yearTotalTransport.toLocaleString()} افغانی</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مجموع کل عواید {selectedYear}</p>
                  <p className="text-lg font-bold text-green-700">{yearTotal.toLocaleString()} افغانی</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* جدول ماهانه */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">عواید ماهانه — سال {selectedYear}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">ماه</TableHead>
                    <TableHead className="text-right text-blue-700">فیس دریافتی</TableHead>
                    <TableHead className="text-right text-orange-700">ترانسپورت دریافتی</TableHead>
                    <TableHead className="text-right text-green-700 font-bold">مجموع عواید</TableHead>
                    <TableHead className="text-right text-muted-foreground">تعداد رسید</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map(m => (
                    <TableRow
                      key={m.month}
                      className={m.paidCount === 0 ? "opacity-40" : ""}
                    >
                      <TableCell className="font-semibold">{m.label}</TableCell>
                      <TableCell>
                        {m.receivedFee > 0
                          ? <span className="text-blue-700 font-medium">{m.receivedFee.toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {m.receivedTransport > 0
                          ? <span className="text-orange-700 font-medium">{m.receivedTransport.toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {m.totalReceived > 0
                          ? <span className="text-green-700 font-bold">{m.totalReceived.toLocaleString()} افغانی</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.paidCount > 0 ? m.paidCount : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {/* ردیف مجموع */}
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="px-4 py-3 text-right">مجموع سال {selectedYear}</td>
                    <td className="px-4 py-3 text-blue-700">{yearTotalFee.toLocaleString()} افغانی</td>
                    <td className="px-4 py-3 text-orange-700">{yearTotalTransport.toLocaleString()} افغانی</td>
                    <td className="px-4 py-3 text-green-700">{yearTotal.toLocaleString()} افغانی</td>
                    <td className="px-4 py-3 text-muted-foreground">{(payments as any[]).length} رسید</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
