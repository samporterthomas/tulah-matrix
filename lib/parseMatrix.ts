import * as XLSX from "xlsx";
import type { ParsedMatrix, MatrixRecord } from "./types";

function parseBuffer(buffer: ArrayBuffer, fileName: string): ParsedMatrix {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName =
    workbook.SheetNames.find((n) => ["Comparator Matrix", "Benchmark Matrix"].includes(n)) ??
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as (string | number | null)[][];

  // Find the header row — the row that contains "Brand / Expression"
  let headerRowIndex = 1;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    if (raw[i]?.some((v) => String(v || "").includes("Brand"))) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = raw[headerRowIndex] ?? [];
  const headers: string[] = rawHeaders.map((h) =>
    h != null ? String(h).replace(/\n/g, " ").trim() : ""
  );

  const records: MatrixRecord[] = [];

  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const row = raw[i];
    const brand = row?.[0];
    const category = row?.[2];

    // Skip blank rows and section-label rows (no category value)
    if (brand == null || String(brand).trim() === "") continue;
    if (category == null || String(category).trim() === "") continue;

    const record: MatrixRecord = {};
    headers.forEach((header, colIdx) => {
      if (!header) return;
      const val = row?.[colIdx] ?? null;
      record[header] = val != null ? String(val).trim() || null : null;
    });

    records.push(record);
  }

  return {
    records,
    headers: headers.filter(Boolean),
    rowCount: records.length,
    fileName,
    parsedAt: new Date().toISOString(),
  };
}

export async function parseMatrixFile(file: File): Promise<ParsedMatrix> {
  const buffer = await file.arrayBuffer();
  return parseBuffer(buffer, file.name);
}

export async function parseMatrixUrl(url: string): Promise<ParsedMatrix> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load matrix: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return parseBuffer(buffer, url.split("/").pop() ?? "matrix.xlsx");
}
