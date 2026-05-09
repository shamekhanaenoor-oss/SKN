// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppState, getCategoryTemplate } from "@/lib/store";
import { CardPreview } from "@/components/CardPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, Search, Loader2 } from "lucide-react";
import type { Person, Category } from "@/lib/types";

type EntityType = "students" | "staff" | "drivers";

const TABLE_FOR: Record<EntityType, string> = {
  students: "students",
  staff: "staff",
  drivers: "transport_routes",
};

const TYPE_LABEL: Record<EntityType, string> = {
  students: "کارت شاگرد",
  staff: "کارت کارمند",
  drivers: "کارت راننده",
};

function normalizeCardKey(value?: string) {
  return (value || "")
    .normalize("NFKC")
    .replace(/[\u200c\u200d\s\-_]+/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase();
}

function personCardKey(p: Person) {
  const id = normalizeCardKey(p.idNumber);
  if (id) return `id:${id}`;
  return `person:${normalizeCardKey(p.name)}|${normalizeCardKey(p.fatherName)}|${normalizeCardKey(p.className)}`;
}

export default function IdCardsPageDefault() {
  return <IdCardsPage />;
}

function IdCardsPage() {
  const state = useAppState();
  const [tab, setTab] = useState<EntityType>("students");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const table = TABLE_FOR[tab];

    async function load() {
      setLoading(true);
      try {
        if (tab === "students") {
          const { data } = await (supabase as any)
            .from("students")
            .select(
              "*, classes:current_class_id(name), student_transport(is_active, transport_routes(route_name, vehicle_number))",
            )
            .eq("is_active", true)
            .limit(500);
          if (!cancelled) setRows(data || []);
        } else {
          const { data } = await (supabase as any).from(table).select("*").limit(500);
          if (!cancelled) setRows(data || []);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Realtime: auto-refresh when DB rows are added/updated/removed
    const channel = (supabase as any)
      .channel(`idcards-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      try {
        (supabase as any).removeChannel(channel);
      } catch {}
    };
  }, [tab]);

  const localCat: Category =
    tab === "students" ? "students" : tab === "drivers" ? "drivers" : "staff";
  const template = getCategoryTemplate(state, localCat);

  const dbPeople: Person[] = rows.map((r) => {
    if (tab === "students") {
      const activeTransport = (r.student_transport || []).find((t: any) => t.is_active);
      const route = activeTransport?.transport_routes;
      const transportLabel = route
        ? `${route.route_name || ""}${route.vehicle_number ? " - " + route.vehicle_number : ""}`
        : "";
      return {
        id: `db-${r.id}`,
        category: "students" as Category,
        idNumber: r.student_code || "",
        name: r.full_name || "",
        fatherName: r.father_name || "",
        className: r.classes?.name || "",
        transport: transportLabel,
        parentPhone: r.father_phone || r.mother_phone || r.phone || "",
        photo: r.photo_url,
      };
    }
    if (tab === "drivers") {
      return {
        id: `db-${r.id}`,
        category: "drivers" as Category,
        name: r.driver_name || r.route_name || "",
        fatherName: "",
        vehicleNumber: r.vehicle_number,
        licenseNumber: r.license_number,
        route: r.route_name,
        phone: r.driver_phone,
        photo: r.photo_url,
      };
    }
    // staff
    return {
      id: `db-${r.id}`,
      category: "staff" as Category,
      name: r.full_name || "",
      fatherName: r.father_name || "",
      position: r.position || r.department || "کارمند",
      phone: r.phone,
      photo: r.photo_url,
    };
  });

  // Deduplicate by idNumber/name to avoid showing the same person twice
  // (DB rows are the source of truth; local people only shown if not present in DB)
  const seen = new Set<string>();
  const allPeople: Person[] = [...dbPeople, ...state.people.filter((p) => p.category === localCat)]
    .filter((p) => {
      const key = personCardKey(p);
      if (key === "person:||") return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((p) => !search || p.name?.includes(search));

  // Students = CR80 horizontal (5/page). Teachers & drivers = larger vertical (3/page).
  const MM_PX = 3.7795275591;
  const isVertical = tab !== "students";
  const showBackSide = false;
  const BOX_W_MM = isVertical ? 60 : 85.6;
  const BOX_H_MM = isVertical ? 90 : 54;
  // Fit card to box keeping the template's real aspect ratio (no distortion)
  const printScale = Math.min(
    (BOX_W_MM * MM_PX) / template.width,
    (BOX_H_MM * MM_PX) / template.height,
  );
  const CARD_W_MM = (template.width * printScale) / MM_PX;
  const CARD_H_MM = (template.height * printScale) / MM_PX;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            inset: 0;
            display: block !important;
            transform: scaleX(-1);
            transform-origin: center top;
          }
          .no-print { display: none !important; }
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
          .print-row {
            display: flex !important;
            flex-direction: row !important;
            gap: 3mm !important;
            justify-content: center !important;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 3mm !important;
          }
        }
        .print-only { display: none; }
        .print-card-wrap {
          width: ${CARD_W_MM}mm;
          height: ${CARD_H_MM}mm;
          overflow: hidden;
        }
      `}</style>

      <div className="no-print mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">کارت هویت</h1>
            <p className="text-sm text-muted-foreground">
              چاپ به اندازهٔ استاندارد ({CARD_W_MM.toFixed(1)}×{CARD_H_MM.toFixed(1)}mm) —{" "}
              {isVertical ? "۳" : "۵"} کارت در یک ورق A4 (پشت و رو)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/idcard-students">
              <Button variant="outline" size="sm">
                شاگردان
              </Button>
            </a>
            <a href="/idcard-staff">
              <Button variant="outline" size="sm">
                کارمندان
              </Button>
            </a>
            <a href="/idcard-drivers">
              <Button variant="outline" size="sm">
                راننده‌گان
              </Button>
            </a>
            <a href="/idcard-designer">
              <Button variant="outline" size="sm">
                دیزاینر کارت
              </Button>
            </a>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> چاپ
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)} className="mb-4 hidden">
          <TabsList>
            <TabsTrigger value="students">شاگردان</TabsTrigger>
            <TabsTrigger value="staff">کارمندان</TabsTrigger>
            <TabsTrigger value="drivers">راننده‌گان</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {loading && allPeople.length === 0 ? (
        <Card>
          <CardContent className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : allPeople.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            هیچ موردی یافت نشد — ابتدا یک شاگرد/کارمند اضافه کنید
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Screen preview */}
          <div className="screen-only flex flex-wrap items-start justify-center gap-3">
            {allPeople.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 items-center">
                <CardPreview template={template} person={p} scale={0.5} />
                {showBackSide && template.back && (
                  <CardPreview
                    template={{
                      ...template,
                      fields: template.back.fields,
                      background: template.back.background,
                    }}
                    person={p}
                    scale={0.5}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Print layout: 5 cards per page, front + back side-by-side */}
          <div id="print-area" className="print-only">
            {allPeople.map((p) => (
              <div key={p.id} className="print-row">
                <div className="print-card-wrap">
                  <CardPreview template={template} person={p} scale={printScale} />
                </div>
                {template.back && (
                  <div className="print-card-wrap">
                    <CardPreview
                      template={{
                        ...template,
                        fields: template.back.fields,
                        background: template.back.background,
                      }}
                      person={p}
                      scale={printScale}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
