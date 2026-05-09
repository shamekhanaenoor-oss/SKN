import type { CardTemplate, Person } from "@/lib/types";

interface Props {
  template: CardTemplate;
  person: Partial<Person>;
  scale?: number;
}

export function CardPreview({ template, person, scale = 0.5 }: Props) {
  const w = template.width * scale;
  const h = template.height * scale;
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border shadow-md bg-white"
      style={{
        width: w,
        height: h,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {template.background && (
        <img
          src={template.background}
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        />
      )}
      {!template.background && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-sm">
          (پس‌زمینه کارت بارگذاری نشده)
        </div>
      )}
      {template.fields.map((f) => {
        const left = (f.x / 100) * w;
        const top = (f.y / 100) * h;
        if (f.key === "photo") {
          const fw = ((f.width || 22) / 100) * w;
          const fh = ((f.height || 50) / 100) * h;
          const isCircle = f.photoShape === "circle";
          return (
            <div
              key={f.id}
              className="absolute flex items-center justify-center text-[10px] text-slate-400 overflow-hidden"
              style={{
                left,
                top,
                width: fw,
                height: fh,
                borderRadius: isCircle ? "50%" : 0,
                border: person.photo ? "none" : "2px dashed #cbd5e1",
                background: person.photo ? "transparent" : "#f8fafc",
              }}
            >
              {person.photo ? (
                <img
                  src={person.photo}
                  alt=""
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  style={{
                    borderRadius: isCircle ? "50%" : 0,
                    printColorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                  }}
                />
              ) : (
                "Photo"
              )}
            </div>
          );
        }
        const value = (person as any)[f.key] || "";
        return (
          <div
            key={f.id}
            className="absolute whitespace-nowrap"
            style={{
              left, top,
              fontSize: f.fontSize * scale,
              color: f.color,
              fontWeight: f.fontWeight,
              textAlign: f.align,
              transform: f.align === "center" ? "translateX(-50%)" : f.align === "right" ? "translateX(-100%)" : undefined,
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}