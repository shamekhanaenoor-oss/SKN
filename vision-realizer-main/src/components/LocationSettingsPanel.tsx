import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { COUNTRIES } from "@/lib/afghanistan-data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const LOCATION_COUNTRY_KEY = "app_selected_country";

export default function LocationSettingsPanel() {
  const [selectedCountry, setSelectedCountry] = useState(
    () => localStorage.getItem(LOCATION_COUNTRY_KEY) ?? "افغانستان"
  );
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const country = COUNTRIES.find(c => c.name === selectedCountry);
  const province = country?.provinces.find(p => p.name === selectedProvince);

  function handleCountryChange(v: string) {
    setSelectedCountry(v);
    setSelectedProvince(null);
  }

  function saveCountry() {
    localStorage.setItem(LOCATION_COUNTRY_KEY, selectedCountry);
    toast.success(`کشور "${selectedCountry}" ذخیره شد`);
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          ثبت ولایت‌ها و ولسوالی‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5" dir="rtl">

        {/* انتخاب کشور */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">کشور پیش‌فرض</label>
          <div className="flex gap-2 items-center">
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="انتخاب کشور" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={saveCountry}>ذخیره</Button>
          </div>
          <p className="text-xs text-muted-foreground">این کشور در فرم ثبت شاگردان به عنوان پیش‌فرض استفاده می‌شود.</p>
        </div>

        {/* ولایت‌ها */}
        {country && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">ولایت‌ها ({country.provinces.length} ولایت)</label>
              {selectedProvince && (
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  بستن
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {country.provinces.map(p => (
                <button
                  key={p.name}
                  onClick={() => setSelectedProvince(prev => prev === p.name ? null : p.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedProvince === p.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 hover:bg-muted border-transparent"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ولسوالی‌های ولایت انتخاب‌شده */}
        {province && (
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">ولسوالی‌های {province.name}</span>
              <Badge variant="secondary" className="text-xs">{province.districts.length} ولسوالی</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {province.districts.map(d => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded-lg text-xs bg-background border"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* خلاصه */}
        {country && !selectedProvince && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            روی هر ولایت کلیک کنید تا ولسوالی‌های آن را ببینید.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
