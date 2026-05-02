import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Bus } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function TransportListPage() {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["transport-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_transport")
        .select(`
          id,
          pickup_point,
          start_date,
          student:students(id, full_name, father_name),
          route:transport_routes(id, route_name, driver_name, monthly_fee)
        `)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = search
    ? rows.filter((r: any) =>
        r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.student?.father_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.route?.route_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.route?.driver_name?.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  return (
    <div>
      <PageHeader
        title="لیست ترانسپورت"
        description={`مجموع: ${filtered.length} شاگرد`}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام شاگرد، مسیر یا راننده..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <Card className="shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            هیچ شاگردی در ترانسپورت ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">نام شاگرد</TableHead>
                  <TableHead className="text-right">نام پدر</TableHead>
                  <TableHead className="text-right">مسیر</TableHead>
                  <TableHead className="text-right">فیس ترانسپورت</TableHead>
                  <TableHead className="text-right">نام راننده</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any, idx: number) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.student?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.student?.father_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Bus className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{r.route?.route_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.route?.monthly_fee
                        ? <span className="font-semibold text-primary">{Number(r.route.monthly_fee).toLocaleString()} افغانی</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>{r.route?.driver_name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
