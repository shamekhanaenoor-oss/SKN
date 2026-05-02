import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, Search, Loader2, School } from "lucide-react";

type EntityType = "students" | "teachers" | "staff";

interface CardData {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  phone?: string;
  blood?: string;
  address?: string;
  photo?: string;
  emergency?: string;
}

function mapRow(t: EntityType, r: any): CardData {
  if (t === "students") return {
    id: r.id, code: r.student_code, name: r.full_name,
    subtitle: r.father_name ? `ولد ${r.father_name}` : undefined,
    phone: r.phone, blood: r.blood_group, address: r.address || r.province,
    photo: r.photo_url, emergency: r.father_name,
  };
  if (t === "teachers") return {
    id: r.id, code: r.employee_code, name: r.full_name,
    subtitle: r.specialization || "معلم",
    phone: r.phone, address: r.address, photo: r.photo_url,
  };
  return {
    id: r.id, code: r.employee_code, name: r.full_name,
    subtitle: r.position || "کارمند",
    phone: r.phone, address: r.address, photo: r.photo_url,
  };
}

const TYPE_LABEL: Record<EntityType, string> = {
  students: "کارت شاگرد",
  teachers: "کارت معلم",
  staff: "کارت کارمند",
};

export default function IdCardsPage() {
  const [tab, setTab] = useState<EntityType>("students");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["idcards", tab],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(tab).select("*").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = rows.map((r: any) => mapRow(tab, r))
    .filter((c: CardData) => !search || c.name?.includes(search) || c.code?.includes(search));

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          .id-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title="کارت هویت"
          description="ساخت و چاپ کارت هویت برای شاگردان، معلمان و کارمندان"
          action={
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> چاپ
            </Button>
          }
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)} className="mb-4">
          <TabsList>
            <TabsTrigger value="students">شاگردان</TabsTrigger>
            <TabsTrigger value="teachers">معلمان</TabsTrigger>
            <TabsTrigger value="staff">کارمندان</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></CardContent></Card>
      ) : cards.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">هیچ موردی یافت نشد</CardContent></Card>
      ) : (
        <div id="print-area" className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
          {cards.map((c: CardData) => (
            <IdCard key={c.id} data={c} typeLabel={TYPE_LABEL[tab]} />
          ))}
        </div>
      )}
    </div>
  );
}

function IdCard({ data, typeLabel }: { data: CardData; typeLabel: string }) {
  return (
    <div className="id-card grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Front */}
      <div className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-elegant" style={{ aspectRatio: "1.6" }}>
        <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <School className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">سیستم مکتب</p>
              <p className="text-xs font-bold leading-tight">{typeLabel}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{data.code}</span>
        </div>
        <div className="flex gap-3">
          <div className="w-16 h-20 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
            {data.photo ? <img src={data.photo} alt={data.name} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">عکس</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">نام و تخلص</p>
            <p className="font-bold text-sm truncate">{data.name}</p>
            {data.subtitle && (<>
              <p className="text-[10px] text-muted-foreground mt-1">{data.subtitle.startsWith("ولد") ? "نام پدر" : "سمت"}</p>
              <p className="text-xs truncate">{data.subtitle.replace("ولد ", "")}</p>
            </>)}
          </div>
        </div>
      </div>

      {/* Back */}
      <div className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-elegant" style={{ aspectRatio: "1.6" }}>
        <p className="text-xs font-bold border-b border-border pb-2 mb-2 text-primary">اطلاعات تماس</p>
        <div className="space-y-1.5 text-xs">
          {data.phone && <div className="flex justify-between"><span className="text-muted-foreground">تلفن:</span><span dir="ltr">{data.phone}</span></div>}
          {data.blood && <div className="flex justify-between"><span className="text-muted-foreground">گروه خون:</span><span className="font-bold text-destructive">{data.blood}</span></div>}
          {data.emergency && <div className="flex justify-between"><span className="text-muted-foreground">تماس اضطراری:</span><span>{data.emergency}</span></div>}
          {data.address && <div><span className="text-muted-foreground">آدرس: </span><span className="text-[11px]">{data.address}</span></div>}
        </div>
        <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted-foreground text-center">
          در صورت پیدا شدن، لطفاً به مکتب بازگردانده شود.
        </div>
      </div>
    </div>
  );
}
