import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Wallet, Bus, BookOpen, Shirt, IdCard } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DatePickerShamsi from "@/components/DatePickerShamsi";
import { isoToShamsi, shamsiToIso, todayShamsi } from "@/lib/shamsi";
import { Label } from "@/components/ui/label";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const s = isoToShamsi(iso);
  if (!s) return "—";
  return `${s.year}/${String(s.month).padStart(2, "0")}/${String(s.day).padStart(2, "0")}`;
}

function SummaryCard({
  label, amount, icon: Icon, color,
}: {
  label: string; amount: number; icon: any; color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{amount.toLocaleString()} افغانی</p>
      </div>
    </Card>
  );
}

export default function AccountingPage() {
  const today = todayShamsi();
  const todayIso = shamsiToIso(today.year, today.month, today.day) ?? "";

  const [fromDate, setFromDate] = useState<string>(todayIso);
  const [toDate, setToDate] = useState<string>(todayIso);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["accounting-payments", fromDate, toDate],
    queryFn: async () => {
      if (!fromDate || !toDate) return [];
      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          id, payment_date, amount, paid_amount,
          transport_fee, book_sale_amount, uniform_sale_amount, id_card_fee,
          receipt_number, status,
          student:students(id, full_name, student_code)
        `)
        .gte("payment_date", fromDate)
        .lte("payment_date", toDate)
        .order("payment_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!fromDate && !!toDate,
  });

  // محاسبه مجموع‌ها
  const totals = payments.reduce(
    (acc: any, p: any) => ({
      fee:      acc.fee      + Number(p.paid_amount ?? p.amount ?? 0),
      transport: acc.transport + Number(p.transport_fee      || 0),
      book:     acc.book     + Number(p.book_sale_amount     || 0),
      uniform:  acc.uniform  + Number(p.uniform_sale_amount  || 0),
      idcard:   acc.idcard   + Number(p.id_card_fee          || 0),
    }),
    { fee: 0, transport: 0, book: 0, uniform: 0, idcard: 0 }
  );
  const grandTotal = totals.fee + totals.transport + totals.book + totals.uniform + totals.idcard;

  return (
    <div>
      <PageHeader
        title="تاریخچه حسابی"
        description="پرداخت‌های روزمره به تفکیک نوع"
      />

      {/* فیلتر تاریخ */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4" dir="rtl">
          <div>
            <Label className="text-sm mb-1 block">از تاریخ</Label>
            <DatePickerShamsi value={fromDate} onChange={v => setFromDate(v ?? "")} />
          </div>
          <div>
            <Label className="text-sm mb-1 block">تا تاریخ</Label>
            <DatePickerShamsi value={toDate} onChange={v => setToDate(v ?? "")} />
          </div>
          <div className="text-sm text-muted-foreground pb-2">
            {payments.length} رکورد یافت شد
          </div>
        </div>
      </Card>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard label="فیس"           amount={totals.fee}       icon={Wallet}   color="bg-blue-500" />
        <SummaryCard label="ترانسپورت"     amount={totals.transport} icon={Bus}      color="bg-orange-500" />
        <SummaryCard label="کتاب"          amount={totals.book}      icon={BookOpen} color="bg-purple-500" />
        <SummaryCard label="یونیفورم"      amount={totals.uniform}   icon={Shirt}    color="bg-pink-500" />
        <SummaryCard label="آی‌دی کارت"    amount={totals.idcard}    icon={IdCard}   color="bg-teal-500" />
        <SummaryCard label="مجموع کل"      amount={grandTotal}       icon={TrendingUp} color="bg-green-600" />
      </div>

      {/* جدول */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            هیچ پرداختی در این بازه تاریخی یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">رسید</TableHead>
                  <TableHead className="text-right">شاگرد</TableHead>
                  <TableHead className="text-right">فیس</TableHead>
                  <TableHead className="text-right">ترانسپورت</TableHead>
                  <TableHead className="text-right">کتاب</TableHead>
                  <TableHead className="text-right">یونیفورم</TableHead>
                  <TableHead className="text-right">آی‌دی کارت</TableHead>
                  <TableHead className="text-right">مجموع</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments as any[]).map((p: any) => {
                  const fee       = Number(p.paid_amount ?? p.amount ?? 0);
                  const transport = Number(p.transport_fee      || 0);
                  const book      = Number(p.book_sale_amount   || 0);
                  const uniform   = Number(p.uniform_sale_amount || 0);
                  const idcard    = Number(p.id_card_fee        || 0);
                  const total     = fee + transport + book + uniform + idcard;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.payment_date)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {p.receipt_number ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.student?.full_name ?? "—"}
                        {p.student?.student_code && (
                          <span className="text-xs text-muted-foreground mr-1">
                            ({p.student.student_code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fee > 0
                          ? <span className="text-blue-700 font-medium">{fee.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {transport > 0
                          ? <span className="text-orange-700 font-medium">{transport.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {book > 0
                          ? <span className="text-purple-700 font-medium">{book.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {uniform > 0
                          ? <span className="text-pink-700 font-medium">{uniform.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {idcard > 0
                          ? <span className="text-teal-700 font-medium">{idcard.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-700">{total.toLocaleString()} افغانی</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            p.status === "paid"      ? "bg-green-50 text-green-700 border-green-300" :
                            p.status === "partial"   ? "bg-blue-50 text-blue-700 border-blue-300" :
                            p.status === "pending"   ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                            p.status === "overdue"   ? "bg-red-50 text-red-700 border-red-300" :
                            "bg-gray-50 text-gray-500 border-gray-300"
                          }`}
                        >
                          {p.status === "paid"      ? "پرداخت شده" :
                           p.status === "partial"   ? "ناقص" :
                           p.status === "pending"   ? "در انتظار" :
                           p.status === "overdue"   ? "معوقه" :
                           p.status === "cancelled" ? "لغو" : p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {/* ردیف مجموع */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm">مجموع</td>
                  <td className="px-4 py-3 text-blue-700">{totals.fee.toLocaleString()}</td>
                  <td className="px-4 py-3 text-orange-700">{totals.transport.toLocaleString()}</td>
                  <td className="px-4 py-3 text-purple-700">{totals.book.toLocaleString()}</td>
                  <td className="px-4 py-3 text-pink-700">{totals.uniform.toLocaleString()}</td>
                  <td className="px-4 py-3 text-teal-700">{totals.idcard.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-700">{grandTotal.toLocaleString()} افغانی</td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
