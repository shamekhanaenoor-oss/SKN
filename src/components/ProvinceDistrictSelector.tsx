import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/afghanistan-data";
import { LOCATION_COUNTRY_KEY } from "./LocationSettingsPanel";

interface ProvinceDistrictSelectorProps {
  province: string;
  district: string;
  onProvinceChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
}

export default function ProvinceDistrictSelector({
  province, district, onProvinceChange, onDistrictChange,
}: ProvinceDistrictSelectorProps) {
  const countryName = localStorage.getItem(LOCATION_COUNTRY_KEY) ?? "افغانستان";
  const country = COUNTRIES.find(c => c.name === countryName);
  const provinces = country?.provinces ?? [];
  const selectedProv = provinces.find(p => p.name === province);
  const districts = selectedProv?.districts ?? [];

  function handleProvinceChange(v: string) {
    onProvinceChange(v);
    onDistrictChange(""); // reset district
  }

  return (
    <div className="contents">
      {/* ولایت */}
      <div>
        <div className="text-sm font-medium mb-1.5">ولایت</div>
        <Select value={province ?? ""} onValueChange={handleProvinceChange}>
          <SelectTrigger>
            <SelectValue placeholder="انتخاب ولایت" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map(p => (
              <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ولسوالی */}
      <div>
        <div className="text-sm font-medium mb-1.5">ولسوالی</div>
        <Select
          value={district ?? ""}
          onValueChange={onDistrictChange}
          disabled={!province || districts.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={province ? "انتخاب ولسوالی" : "ابتدا ولایت را انتخاب کنید"} />
          </SelectTrigger>
          <SelectContent>
            {districts.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
