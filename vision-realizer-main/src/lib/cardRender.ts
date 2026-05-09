import type { CardSide, CardTemplate, Person } from "./types";
import type { Category } from "./types";

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderSide(
  side: { background?: string; fields: CardTemplate["fields"] },
  width: number,
  height: number,
  person: Person,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  if (side.background) {
    try {
      const bg = await loadImg(side.background);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }

  for (const f of side.fields) {
    const x = (f.x / 100) * width;
    const y = (f.y / 100) * height;
    if (f.key === "photo") {
      if (person.photo) {
        try {
          const ph = await loadImg(person.photo);
          const fw = ((f.width || 22) / 100) * width;
          const fh = ((f.height || 50) / 100) * height;
          if (f.photoShape === "circle") {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(x + fw / 2, y + fh / 2, fw / 2, fh / 2, 0, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(ph, x, y, fw, fh);
            ctx.restore();
          } else {
            ctx.drawImage(ph, x, y, fw, fh);
          }
        } catch {}
      }
      continue;
    }
    const value = String((person as any)[f.key] || "");
    if (!value) continue;
    ctx.font = `${f.fontWeight} ${f.fontSize}px Vazirmatn, Inter, sans-serif`;
    ctx.fillStyle = f.color;
    ctx.textAlign = f.align;
    ctx.textBaseline = "top";
    ctx.fillText(value, x, y);
  }
  return canvas;
}

export async function renderCardToCanvas(template: CardTemplate, person: Person): Promise<HTMLCanvasElement> {
  return renderSide(
    { background: template.background, fields: template.fields },
    template.width,
    template.height,
    person,
  );
}

export async function renderCardBackToCanvas(
  template: CardTemplate,
  person: Person,
): Promise<HTMLCanvasElement | null> {
  if (!template.back) return null;
  return renderSide(template.back as CardSide, template.width, template.height, person);
}

function saveCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

export async function downloadCardPng(template: CardTemplate, person: Person) {
  const front = await renderCardToCanvas(template, person);
  const baseName = (person.name || "card").replace(/[\\/:*?"<>|]/g, "_");
  const back = await renderCardBackToCanvas(template, person);
  if (back) {
    saveCanvas(front, `${baseName}-front.png`);
    await new Promise((r) => setTimeout(r, 120));
    saveCanvas(back, `${baseName}-back.png`);
  } else {
    saveCanvas(front, `${baseName}.png`);
  }
}

export async function downloadAllPng(template: CardTemplate, people: Person[]) {
  for (const p of people) {
    await downloadCardPng(template, p);
    await new Promise((r) => setTimeout(r, 200));
  }
}

export async function downloadAllPngZip(
  template: CardTemplate,
  people: Person[],
  zipName = "cards.zip",
  onProgress?: (done: number, total: number) => void,
  groupBy?: keyof Person,
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Map<string, number>();
  const hasBack = !!template.back;

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const front = await renderCardToCanvas(template, p);
    const frontBlob: Blob = await new Promise((res) => front.toBlob((b) => res(b!), "image/png"));

    let base = (p.name || `card-${i + 1}`).replace(/[\\/:*?"<>|]/g, "_");
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    const baseUnique = n === 1 ? base : `${base}-${n}`;

    const folder = groupBy
      ? String((p as any)[groupBy] || "بدون-گروه").replace(/[\\/:*?"<>|]/g, "_")
      : "";
    const prefix = folder ? `${folder}/` : "";

    if (hasBack) {
      zip.file(`${prefix}${baseUnique}-front.png`, frontBlob);
      const back = await renderCardBackToCanvas(template, p);
      if (back) {
        const backBlob: Blob = await new Promise((res) => back.toBlob((b) => res(b!), "image/png"));
        zip.file(`${prefix}${baseUnique}-back.png`, backBlob);
      }
    } else {
      zip.file(`${prefix}${baseUnique}.png`, frontBlob);
    }
    onProgress?.(i + 1, people.length);
  }

  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A4 sheet PDF: mirrors the print layout (5 horizontal cards or 3 vertical cards per page),
// flipped horizontally like the print view.
export async function downloadCardsPdf(
  template: CardTemplate,
  people: Person[],
  category: Category,
  filename = "cards.pdf",
  onProgress?: (done: number, total: number) => void,
) {
  if (!people.length) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, margin = 6, gap = 3;

  const isVertical = category !== "students";
  const BOX_W = isVertical ? 60 : 85.6;
  const BOX_H = isVertical ? 90 : 54;
  const perPage = isVertical ? 3 : 5;

  const ratio = template.width / template.height;
  const boxRatio = BOX_W / BOX_H;
  let cardW = BOX_W, cardH = BOX_H;
  if (ratio > boxRatio) cardH = BOX_W / ratio;
  else cardW = BOX_H * ratio;

  const hasBack = !!template.back;
  const rowW = hasBack ? cardW * 2 + gap : cardW;
  const startX = (pageW - rowW) / 2;

  let cursor = 0;
  for (let i = 0; i < people.length; i++) {
    if (cursor === perPage) {
      doc.addPage();
      cursor = 0;
    }
    const p = people[i];
    const front = await renderCardToCanvas(template, p);
    const back = hasBack ? await renderCardBackToCanvas(template, p) : null;

    const y = margin + cursor * (cardH + gap);

    // Mirror horizontally to match print preview (transform: scaleX(-1))
    const addMirrored = (canvas: HTMLCanvasElement, x: number) => {
      const m = document.createElement("canvas");
      m.width = canvas.width;
      m.height = canvas.height;
      const ctx = m.getContext("2d")!;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, 0, 0);
      doc.addImage(m.toDataURL("image/jpeg", 0.92), "JPEG", x, y, cardW, cardH);
    };

    addMirrored(front, startX);
    if (back) addMirrored(back, startX + cardW + gap);

    cursor++;
    onProgress?.(i + 1, people.length);
  }
  doc.save(filename);
}

// PDF grouped by a key (e.g. className): each group starts on a new page.
export async function downloadCardsPdfGrouped(
  template: CardTemplate,
  people: Person[],
  category: Category,
  groupBy: keyof Person,
  filename = "cards-grouped.pdf",
  onProgress?: (done: number, total: number) => void,
) {
  if (!people.length) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, margin = 6, gap = 3;

  const isVertical = category !== "students";
  const BOX_W = isVertical ? 60 : 85.6;
  const BOX_H = isVertical ? 90 : 54;
  const perPage = isVertical ? 3 : 5;

  const ratio = template.width / template.height;
  const boxRatio = BOX_W / BOX_H;
  let cardW = BOX_W, cardH = BOX_H;
  if (ratio > boxRatio) cardH = BOX_W / ratio;
  else cardW = BOX_H * ratio;

  const hasBack = !!template.back;
  const rowW = hasBack ? cardW * 2 + gap : cardW;
  const startX = (pageW - rowW) / 2;

  // Group
  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const k = String((p as any)[groupBy] || "بدون-گروه");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const entries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const addMirrored = (canvas: HTMLCanvasElement, x: number, y: number) => {
    const m = document.createElement("canvas");
    m.width = canvas.width;
    m.height = canvas.height;
    const ctx = m.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    doc.addImage(m.toDataURL("image/jpeg", 0.92), "JPEG", x, y, cardW, cardH);
  };

  let firstPage = true;
  let done = 0;
  for (const [, list] of entries) {
    if (!firstPage) doc.addPage();
    firstPage = false;
    let cursor = 0;
    for (let i = 0; i < list.length; i++) {
      if (cursor === perPage) {
        doc.addPage();
        cursor = 0;
      }
      const p = list[i];
      const front = await renderCardToCanvas(template, p);
      const back = hasBack ? await renderCardBackToCanvas(template, p) : null;
      const y = margin + cursor * (cardH + gap);
      addMirrored(front, startX, y);
      if (back) addMirrored(back, startX + cardW + gap, y);
      cursor++;
      done++;
      onProgress?.(done, people.length);
    }
  }
  doc.save(filename);
}
