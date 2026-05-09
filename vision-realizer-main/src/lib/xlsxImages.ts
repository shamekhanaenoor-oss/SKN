import JSZip from "jszip";

/**
 * Extract embedded images from an .xlsx file and map each image to the
 * 0-based row index it is anchored to in the first worksheet.
 * Returns: array of { rowIndex, dataUrl } (rowIndex is 0-based, header excluded → use row-1).
 */
export async function extractXlsxImages(file: File): Promise<{ rowIndex: number; dataUrl: string }[]> {
  const buf = await file.arrayBuffer();
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buf); } catch { return []; }

  // load all media files as data urls
  const media: Record<string, string> = {};
  const mediaFolder = zip.folder("xl/media");
  if (!mediaFolder) return [];
  const entries = Object.keys(zip.files).filter(p => p.startsWith("xl/media/"));
  for (const path of entries) {
    const f = zip.file(path);
    if (!f) continue;
    const blob = await f.async("blob");
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : `image/${ext}`;
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(new Blob([blob], { type: mime }));
    });
    media[path.split("/").pop()!] = dataUrl;
  }

  // find drawings file(s)
  const drawingPaths = Object.keys(zip.files).filter(p => /^xl\/drawings\/drawing\d+\.xml$/.test(p));
  const result: { rowIndex: number; dataUrl: string }[] = [];

  for (const dpath of drawingPaths) {
    const xml = await zip.file(dpath)!.async("string");
    // load relationships for this drawing → r:id → media file
    const relsPath = dpath.replace("xl/drawings/", "xl/drawings/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath)!.async("string") : "";
    const relMap: Record<string, string> = {};
    const relRe = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let rm: RegExpExecArray | null;
    while ((rm = relRe.exec(relsXml))) {
      const target = rm[2].replace(/^\.\.\//, ""); // e.g. media/image1.png
      relMap[rm[1]] = target.split("/").pop()!;
    }

    // parse anchors: <xdr:twoCellAnchor> or <xdr:oneCellAnchor>
    const anchorRe = /<xdr:(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/g;
    let am: RegExpExecArray | null;
    while ((am = anchorRe.exec(xml))) {
      const block = am[2];
      const rowMatch = block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
      const embedMatch = block.match(/r:embed="([^"]+)"/);
      if (!rowMatch || !embedMatch) continue;
      const fromRow = parseInt(rowMatch[1], 10); // 0-based row in sheet
      const filename = relMap[embedMatch[1]];
      const dataUrl = filename ? media[filename] : undefined;
      if (!dataUrl) continue;
      // Excel header is row 0 → data rows start at row 1; convert to 0-based data index
      const dataIdx = fromRow - 1;
      if (dataIdx >= 0) result.push({ rowIndex: dataIdx, dataUrl });
    }
  }
  return result;
}
