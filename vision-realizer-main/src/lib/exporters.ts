import type { Person } from "./types";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

function csvEscape(v: string) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = ["Name", "FatherName", "ClassName", "Transport", "Phone", "Issue", "Expiry", "Photo"];

function rowFor(p: Person): string[] {
  return [
    p.name || "",
    p.fatherName || "",
    p.className || "",
    p.transport || "",
    p.parentPhone || "",
    p.issueDate || "",
    p.expiryDate || "",
    p.photo || "",
  ];
}

export function exportCsvForPhotoshop(people: Person[]) {
  const lines = [HEADERS.join(",")];
  for (const p of people) lines.push(rowFor(p).map(csvEscape).join(","));
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "photoshop-data.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function exportPhotoshopJsx(people: Person[]) {
  const data = people.map(rowFor);
  const script = `// Lovable - Photoshop ID Card Generator
#target photoshop
var headers = ${JSON.stringify(HEADERS)};
var rows = ${JSON.stringify(data)};
if (!app.documents.length) { alert("Open your card .psd first."); } else {
  var doc = app.activeDocument;
  var folder = Folder.selectDialog("Select output folder for cards");
  if (folder) {
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      for (var j = 0; j < headers.length - 1; j++) {
        try {
          var layer = doc.artLayers.getByName(headers[j]);
          if (layer && layer.kind == LayerKind.TEXT) {
            layer.textItem.contents = row[j] || "";
          }
        } catch(e) {}
      }
      var file = new File(folder + "/" + (row[0] || ("card_" + (i+1))) + ".png");
      var opts = new PNGSaveOptions();
      doc.saveAs(file, opts, true, Extension.LOWERCASE);
    }
    alert("Done: " + rows.length + " cards exported.");
  }
}
`;
  const blob = new Blob([script], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "photoshop-cards.jsx"; a.click();
  URL.revokeObjectURL(url);
}

export async function exportTemplateCsv(category: "students" | "staff" | "drivers" = "students") {
  let headers: string[] = [];
  let sample: (string | number)[] = [];
  if (category === "students") {
    headers = ["name", "fatherName", "className", "transport", "parentPhone", "issueDate", "expiryDate", "photo"];
    sample = ["احمد", "محمد", "صنف ۱۰ الف", "بس شماره ۲", "0700000000", "1403/07/01", "1404/07/01", ""];
  } else if (category === "staff") {
    headers = ["idNumber", "name", "surname", "fatherName", "position", "issueDate", "expiryDate", "photo"];
    sample = ["STF-0001", "علی", "احمدی", "حسن", "معلم", "1403/07/01", "1404/07/01", ""];
  } else {
    headers = ["idNumber", "name", "surname", "fatherName", "position", "issueDate", "expiryDate", "photo"];
    sample = ["DRV-0001", "کریم", "رحیمی", "رحیم", "راننده", "1403/07/01", "1404/07/01", ""];
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Lovable";
  const ws = wb.addWorksheet("Data", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });

  // Header row
  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    const isPhoto = headers[colNumber - 1] === "photo";
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isPhoto ? "FF2563EB" : "FF334155" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  });

  // Sample row
  ws.addRow(sample);

  // Empty rows
  for (let i = 0; i < 30; i++) ws.addRow(headers.map(() => ""));

  // Column widths
  const photoIdx = headers.indexOf("photo");
  ws.columns = headers.map((h) => {
    if (h === "photo") return { width: 20 };
    if (h === "name" || h === "fatherName") return { width: 20 };
    return { width: 16 };
  });

  // Tall rows for photos
  for (let r = 2; r <= 32; r++) {
    ws.getRow(r).height = 90;
    ws.getRow(r).alignment = { vertical: "middle", horizontal: "center" };
  }

  // 🎯 KEY FEATURE: Add Data Validation with input prompt on every photo cell
  // When user clicks a photo cell, a popup will appear telling them how to insert a picture.
  const photoCol = String.fromCharCode(65 + photoIdx); // A, B, C...
  for (let r = 2; r <= 32; r++) {
    const cell = ws.getCell(`${photoCol}${r}`);
    cell.dataValidation = {
      type: "textLength",
      operator: "greaterThanOrEqual",
      formulae: [0],
      showInputMessage: true,
      promptTitle: "📷 افزودن عکس شاگرد",
      prompt:
        "برای افزودن عکس:\n" +
        "۱) روی همین سلول کلیک راست کنید\n" +
        "۲) Insert → Picture → Place in Cell را انتخاب کنید\n" +
        "۳) عکس را از کامپیوتر خود انتخاب کنید\n\n" +
        "عکس به‌صورت خودکار در اندازهٔ سلول قرار می‌گیرد.\n\n" +
        "یا لینک URL عکس را در همین سلول بنویسید.",
    } as any;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
    cell.border = {
      top: { style: "dashed", color: { argb: "FF2563EB" } },
      bottom: { style: "dashed", color: { argb: "FF2563EB" } },
      left: { style: "dashed", color: { argb: "FF2563EB" } },
      right: { style: "dashed", color: { argb: "FF2563EB" } },
    };
    if (r > 2) {
      cell.value = { text: "📷 کلیک کنید", hyperlink: "" } as any;
      cell.value = "📷 کلیک کنید برای آپلود";
      cell.font = { color: { argb: "FF2563EB" }, italic: true, size: 10 };
    }
  }

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: 1, rightToLeft: true }];

  // Help sheet
  const help = wb.addWorksheet("راهنما", { views: [{ rightToLeft: true }] });
  const helpRows = [
    ["📘 راهنمای استفاده از این قالب"],
    [""],
    ["برای افزودن عکس شاگردان به دو روش می‌توانید عمل کنید:"],
    [""],
    ["🖼️ روش ۱ — درج عکس مستقیم (پیشنهادی):"],
    ["   ۱) روی سلول ستون photo همان ردیف کلیک کنید."],
    ["   ۲) راهنمای آبی‌رنگ ظاهر می‌شود."],
    ["   ۳) کلیک راست کنید → Insert → Picture → «Place in Cell»"],
    ["   ۴) عکس را از کامپیوتر انتخاب کنید."],
    ["   ✅ عکس خودکار در اندازهٔ سلول جا می‌گیرد."],
    [""],
    ["🌐 روش ۲ — استفاده از URL:"],
    ["   لینک مستقیم عکس را در سلول photo بنویسید."],
    [""],
    ["⚠️ نکته: ویژگی «Place in Cell» در Excel 365 و نسخه‌های جدید موجود است."],
    ["   اگر این گزینه را ندارید، از روش URL استفاده کنید."],
  ];
  helpRows.forEach((r) => help.addRow(r));
  help.getColumn(1).width = 80;
  help.getRow(1).font = { bold: true, size: 16, color: { argb: "FF2563EB" } };
  help.getRow(1).height = 30;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${category}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Keep XLSX import to avoid breaking other files that may reference it
void XLSX;
