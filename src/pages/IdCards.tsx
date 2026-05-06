import { useState, useRef, useCallback, useEffect } from "react";
import { useOfflineIdCards, type CardData } from "@/hooks/use-offline-id-cards";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Printer,
  Search,
  Loader2,
  School,
  RefreshCw,
  WifiOff,
  ImageUp,
  Trash2,
  Bus,
  Calendar,
  Phone,
  User,
} from "lucide-react";
import { getTemplate, saveTemplate, removeTemplate } from "@/lib/offline-idcards-db";
import { useSchoolProfile } from "@/lib/school-profile";

type EntityType = "students" | "teachers" | "staff";

interface TemplateInfo {
  side: "front" | "back";
  base64: string;
  name: string;
}

const TYPE_LABEL: Record<EntityType, string> = {
  students: "کارت شاگرد",
  teachers: "کارت معلم",
  staff: "کارت کارمند",
};

const ENTITY_LABEL: Record<EntityType, string> = {
  students: "شاگردان",
  teachers: "معلمان",
  staff: "کارمندان",
};

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${days} روز پیش`;
}

export default function IdCardsPage() {
  const [tab, setTab] = useState<EntityType>("students");
  const [search, setSearch] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<"front" | "back", TemplateInfo | null>>({
    front: null,
    back: null,
  });
  const [uploading, setUploading] = useState<"front" | "back" | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const { cards: allCards, isLoading, isOffline, lastSync, refresh } = useOfflineIdCards(tab);
  const schoolProfile = useSchoolProfile();

  const loadTemplates = useCallback(async () => {
    const [front, back] = await Promise.all([
      getTemplate(tab, "front"),
      getTemplate(tab, "back"),
    ]);
    setTemplates({
      front: front ? { side: front.side, base64: front.base64, name: front.name } : null,
      back: back ? { side: back.side, base64: back.base64, name: back.name } : null,
    });
  }, [tab]);

  useEffect(() => {
    if (templatesOpen) {
      loadTemplates();
    }
  }, [tab, templatesOpen, loadTemplates]);

  const handleFileSelect = async (side: "front" | "back", file: File | null) => {
    if (!file) return;
    setUploading(side);
    const entry = await saveTemplate(tab, side, file);
    if (entry) {
      setTemplates((prev) => ({
        ...prev,
        [side]: { side: entry.side, base64: entry.base64, name: entry.name },
      }));
    }
    setUploading(null);
  };

  const handleRemoveTemplate = async (side: "front" | "back") => {
    await removeTemplate(tab, side);
    setTemplates((prev) => ({ ...prev, [side]: null }));
  };

  const cards = allCards.filter(
    (c: CardData) =>
      !search || c.name?.includes(search) || c.code?.includes(search)
  );

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
            <div className="flex items-center gap-2">
              {isOffline && (
                <Badge variant="secondary" className="gap-1 text-amber-600 bg-amber-50">
                  <WifiOff className="w-3 h-3" /> آفلاین
                </Badge>
              )}
              <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ImageUp className="w-4 h-4" /> تمپلیت {ENTITY_LABEL[tab]}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>تمپلیت کارت هویت — {ENTITY_LABEL[tab]}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 mt-2">
                    {/* Front template */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">تمپلیت روی کارت</Label>
                        {templates.front && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 px-2"
                            onClick={() => handleRemoveTemplate("front")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {templates.front ? (
                        <div className="relative rounded border overflow-hidden bg-muted">
                          <img
                            src={templates.front.base64}
                            alt="Front template"
                            className="w-full h-40 object-contain"
                          />
                          <p className="text-[11px] text-muted-foreground px-2 py-1 truncate">
                            {templates.front.name}
                          </p>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition"
                          onClick={() => frontInputRef.current?.click()}
                        >
                          <ImageUp className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">
                            برای آپلود تمپلیت روی کارت کلیک کنید
                          </p>
                        </div>
                      )}
                      <Input
                        ref={frontInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelect("front", e.target.files?.[0] ?? null)
                        }
                      />
                      {!templates.front && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => frontInputRef.current?.click()}
                          disabled={uploading === "front"}
                        >
                          {uploading === "front" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageUp className="w-4 h-4" />
                          )}
                          انتخاب تصویر
                        </Button>
                      )}
                    </div>

                    {/* Back template */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">تمپلیت پشت کارت</Label>
                        {templates.back && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 px-2"
                            onClick={() => handleRemoveTemplate("back")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {templates.back ? (
                        <div className="relative rounded border overflow-hidden bg-muted">
                          <img
                            src={templates.back.base64}
                            alt="Back template"
                            className="w-full h-40 object-contain"
                          />
                          <p className="text-[11px] text-muted-foreground px-2 py-1 truncate">
                            {templates.back.name}
                          </p>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition"
                          onClick={() => backInputRef.current?.click()}
                        >
                          <ImageUp className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">
                            برای آپلود تمپلیت پشت کارت کلیک کنید
                          </p>
                        </div>
                      )}
                      <Input
                        ref={backInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelect("back", e.target.files?.[0] ?? null)
                        }
                      />
                      {!templates.back && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => backInputRef.current?.click()}
                          disabled={uploading === "back"}
                        >
                          {uploading === "back" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageUp className="w-4 h-4" />
                          )}
                          انتخاب تصویر
                        </Button>
                      )}
                    </div>

                    <Button className="w-full" onClick={() => setTemplatesOpen(false)}>
                      بستن
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
                <RefreshCw className="w-4 h-4" /> بروزرسانی
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" /> چاپ
              </Button>
            </div>
          }
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as EntityType)} className="mb-4">
          <TabsList>
            <TabsTrigger value="students">شاگردان</TabsTrigger>
            <TabsTrigger value="teachers">معلمان</TabsTrigger>
            <TabsTrigger value="staff">کارمندان</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            آخرین همگام‌سازی: <span className="font-mono">{formatRelativeTime(lastSync)}</span>
            {isOffline && (
              <span className="text-amber-600 mr-1">(داده‌های ذخیره‌شده نمایش داده می‌شود)</span>
            )}
          </div>
        </div>
      </div>

      {isLoading && cards.length === 0 ? (
        <Card>
          <CardContent className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            هیچ موردی یافت نشد
          </CardContent>
        </Card>
      ) : (
        <div id="print-area" className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
          {cards.map((c: CardData) => (
            <IdCard
              key={c.id}
              data={c}
              typeLabel={TYPE_LABEL[tab]}
              frontTemplate={templates.front?.base64}
              backTemplate={templates.back?.base64}
              schoolPhone={schoolProfile.phone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IdCard({
  data,
  typeLabel,
  frontTemplate,
  backTemplate,
  schoolPhone,
}: {
  data: CardData;
  typeLabel: string;
  frontTemplate?: string;
  backTemplate?: string;
  schoolPhone?: string;
}) {
  const labelClass = frontTemplate ? "text-white/70" : "text-muted-foreground";
  const valueClass = frontTemplate ? "text-white" : "";
  const borderClass = frontTemplate ? "border-white/20" : "border-border/50";

  return (
    <div className="id-card grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Front */}
      <div
        className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-elegant relative overflow-hidden"
        style={{ aspectRatio: "1.6" }}
      >
        {frontTemplate && (
          <img
            src={frontTemplate}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}
        <div className={`relative z-10 h-full flex flex-col ${frontTemplate ? "text-white drop-shadow" : ""}`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${borderClass} pb-1.5 mb-2`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <School className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <p className={`text-[9px] leading-none ${frontTemplate ? "text-white/80" : "text-muted-foreground"}`}>
                  سیستم مکتب
                </p>
                <p className="text-[11px] font-bold leading-tight">{typeLabel}</p>
                {schoolPhone && (
                  <p className={`text-[9px] leading-none mt-0.5 font-mono ${frontTemplate ? "text-white/70" : "text-muted-foreground"}`} dir="ltr">
                    {schoolPhone}
                  </p>
                )}
              </div>
            </div>
            <span className={`text-[9px] font-mono ${frontTemplate ? "text-white/80" : "text-muted-foreground"}`} dir="ltr">
              {data.code}
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 flex gap-3 min-h-0">
            {/* Info column */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <User className={`w-3 h-3 shrink-0 ${labelClass}`} />
                  <span className={`text-[9px] ${labelClass}`}>نام و تخلص:</span>
                  <span className={`text-[11px] font-bold truncate ${valueClass}`}>{data.name}</span>
                </div>

                {data.fatherName && (
                  <div className="flex items-center gap-1">
                    <User className={`w-3 h-3 shrink-0 ${labelClass}`} />
                    <span className={`text-[9px] ${labelClass}`}>نام پدر:</span>
                    <span className={`text-[10px] truncate ${valueClass}`}>{data.fatherName}</span>
                  </div>
                )}

                {data.className && (
                  <div className="flex items-center gap-1">
                    <School className={`w-3 h-3 shrink-0 ${labelClass}`} />
                    <span className={`text-[9px] ${labelClass}`}>صنف:</span>
                    <span className={`text-[10px] truncate ${valueClass}`}>{data.className}</span>
                  </div>
                )}

                {data.hasTransport !== undefined && (
                  <div className="flex items-center gap-1">
                    <Bus className={`w-3 h-3 shrink-0 ${labelClass}`} />
                    <span className={`text-[9px] ${labelClass}`}>ترانسپورت:</span>
                    <span className={`text-[10px] truncate ${valueClass}`}>
                      {data.hasTransport ? "دارد" : "ندارد"}
                    </span>
                  </div>
                )}

                {data.parentPhone && (
                  <div className="flex items-center gap-1">
                    <Phone className={`w-3 h-3 shrink-0 ${labelClass}`} />
                    <span className={`text-[9px] ${labelClass}`}>تماس والدین:</span>
                    <span className={`text-[10px] truncate ${valueClass}`} dir="ltr">{data.parentPhone}</span>
                  </div>
                )}
              </div>

              {/* Dates footer */}
              <div className={`flex items-center gap-2 pt-1 border-t ${borderClass}`}>
                <Calendar className={`w-3 h-3 shrink-0 ${labelClass}`} />
                <div className="flex gap-2 text-[9px]">
                  {data.validFrom && (
                    <span>
                      <span className={labelClass}>اعتبار:</span>{" "}
                      <span className={valueClass} dir="ltr">{data.validFrom}</span>
                    </span>
                  )}
                  {data.validUntil && (
                    <span>
                      <span className={labelClass}>ختم:</span>{" "}
                      <span className={valueClass} dir="ltr">{data.validUntil}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="w-14 h-[72px] rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border self-center">
              {data.photo ? (
                <img
                  src={data.photo}
                  alt={data.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">عکس</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back */}
      <div
        className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-elegant relative overflow-hidden"
        style={{ aspectRatio: "1.6" }}
      >
        {backTemplate && (
          <img
            src={backTemplate}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}
        <div className={`relative z-10 ${backTemplate ? "text-white drop-shadow" : ""}`}>
          <p className={`text-xs font-bold border-b border-border/50 pb-2 mb-2 ${backTemplate ? "text-white" : "text-primary"}`}>
            اطلاعات تماس
          </p>
          <div className="space-y-1.5 text-xs">
            {data.phone && (
              <div className="flex justify-between">
                <span className={backTemplate ? "text-white/70" : "text-muted-foreground"}>تلفن:</span>
                <span dir="ltr">{data.phone}</span>
              </div>
            )}
            {data.blood && (
              <div className="flex justify-between">
                <span className={backTemplate ? "text-white/70" : "text-muted-foreground"}>گروه خون:</span>
                <span className="font-bold text-destructive">{data.blood}</span>
              </div>
            )}
            {data.emergency && (
              <div className="flex justify-between">
                <span className={backTemplate ? "text-white/70" : "text-muted-foreground"}>تماس اضطراری:</span>
                <span>{data.emergency}</span>
              </div>
            )}
            {data.address && (
              <div className="border-t border-border/30 pt-1.5 mt-1">
                <span className={`block text-[10px] mb-0.5 ${backTemplate ? "text-white/70" : "text-muted-foreground"}`}>آدرس:</span>
                <span className={`block text-[11px] leading-relaxed ${backTemplate ? "text-white" : ""}`}>{data.address}</span>
              </div>
            )}
          </div>
          <div className={`mt-3 pt-2 border-t border-border/50 text-[10px] text-center ${backTemplate ? "text-white/80" : "text-muted-foreground"}`}>
            در صورت پیدا شدن، لطفاً به مکتب بازگردانده شود.
          </div>
        </div>
      </div>
    </div>
  );
}
