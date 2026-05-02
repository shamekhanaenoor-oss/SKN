import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import {
  isoToShamsi, shamsiToIso, todayShamsi,
  getShamsiMonths, shamsiMonthDays,
} from "@/lib/shamsi";
import { cn } from "@/lib/utils";

interface DatePickerShamsiProps {
  value?: string;
  onChange: (iso: string) => void;
  required?: boolean;
  id?: string;
}

const WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export default function DatePickerShamsi({ value, onChange, required, id }: DatePickerShamsiProps) {
  const today = todayShamsi();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);
  // yearInput فقط متن داخل input سال است — جدا از viewYear
  const [yearDraft, setYearDraft] = useState(String(today.year));

  const wrapperRef = useRef<HTMLDivElement>(null);
  // نگه داشتن آخرین value برای تشخیص تغییر واقعی از بیرون
  const prevValueRef = useRef<string | undefined>(undefined);

  // وقتی تقویم باز می‌شود، view را از value جاری بخوان
  function openCalendar() {
    const p = value ? isoToShamsi(value) : null;
    const y = p?.year ?? today.year;
    const m = p?.month ?? today.month;
    setViewYear(y);
    setViewMonth(m);
    setYearDraft(String(y));
    setOpen(true);
  }

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const months = getShamsiMonths();
  const daysInMonth = shamsiMonthDays(viewYear, viewMonth);

  function firstDayOfWeek(year: number, month: number): number {
    const iso = shamsiToIso(year, month, 1);
    return (new Date(iso).getDay() + 1) % 7;
  }

  const firstDay = firstDayOfWeek(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function selectDay(day: number) {
    const iso = shamsiToIso(viewYear, viewMonth, day);
    prevValueRef.current = iso; // ثبت کن که این تغییر از داخل است
    onChange(iso);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 1) {
      const ny = viewYear - 1;
      setViewMonth(12);
      setViewYear(ny);
      setYearDraft(String(ny));
    } else {
      setViewMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      const ny = viewYear + 1;
      setViewMonth(1);
      setViewYear(ny);
      setYearDraft(String(ny));
    } else {
      setViewMonth(m => m + 1);
    }
  }

  // اعمال سال تایپ‌شده
  function commitYear() {
    const y = Number(yearDraft);
    if (y > 1200 && y < 1500) {
      setViewYear(y);
    } else {
      setYearDraft(String(viewYear));
    }
  }

  // تایپ مستقیم در input اصلی
  function handleTextInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!v.trim()) { onChange(""); return; }
    const parts = v.split(/[\/\-]/);
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (y > 1200 && y < 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        try {
          const iso = shamsiToIso(y, m, d);
          prevValueRef.current = iso;
          onChange(iso);
        } catch {}
      }
    }
  }

  // متن نمایشی input — مستقیم از value
  const displayText = (() => {
    if (!value) return "";
    const p = isoToShamsi(value);
    if (!p) return "";
    return `${p.year}/${String(p.month).padStart(2, "0")}/${String(p.day).padStart(2, "0")}`;
  })();

  const selectedShamsi = value ? isoToShamsi(value) : null;

  return (
    <div ref={wrapperRef} className="relative" style={{ isolation: "isolate" }} dir="rtl">
      {/* Input اصلی */}
      <div className="relative">
        <Input
          id={id}
          value={displayText}
          onChange={handleTextInput}
          placeholder={`${today.year}/ماه/روز`}
          required={required}
          className="pl-10"
          onFocus={openCalendar}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => {
            e.preventDefault();
            if (open) setOpen(false);
            else openCalendar();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* تقویم */}
      {open && (
        <div
          dir="rtl"
          className="absolute right-0 mt-1 bg-card border rounded-xl shadow-2xl p-3 w-72"
          style={{ zIndex: 9999 }}
          onMouseDown={e => e.preventDefault()}
        >
          {/* هدر */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-muted rounded">
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* ماه */}
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-sm font-medium bg-background border border-input rounded px-1 py-0.5 outline-none cursor-pointer focus:border-primary"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* سال — input جداگانه با draft state */}
              <input
                type="number"
                value={yearDraft}
                onChange={e => {
                  const val = e.target.value;
                  setYearDraft(val);
                  // بلافاصله viewYear را هم آپدیت کن تا کلیک روی روز درست کار کند
                  const y = Number(val);
                  if (y > 1200 && y < 1500) {
                    setViewYear(y);
                  }
                }}
                onBlur={commitYear}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); commitYear(); }
                }}
                onMouseDown={e => e.stopPropagation()}
                className="text-sm font-medium w-[4.5rem] bg-background border border-input rounded px-1 py-0.5 outline-none text-center focus:border-primary"
              />
            </div>

            <button type="button" onClick={nextMonth} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* روزهای هفته */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* روزها */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isSelected =
                selectedShamsi?.year === viewYear &&
                selectedShamsi?.month === viewMonth &&
                selectedShamsi?.day === day;
              const isToday =
                today.year === viewYear && today.month === viewMonth && today.day === day;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "text-sm rounded-lg py-1.5 text-center transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : isToday
                      ? "bg-primary/15 text-primary font-semibold"
                      : "hover:bg-muted"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* امروز */}
          <div className="mt-2 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setViewYear(today.year);
                setViewMonth(today.month);
                setYearDraft(String(today.year));
                selectDay(today.day);
              }}
            >
              امروز — {today.year}/{String(today.month).padStart(2, "0")}/{String(today.day).padStart(2, "0")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
