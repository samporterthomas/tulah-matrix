import * as XLSX from "xlsx";
import type { ParsedMatrix, MatrixRecord } from "./types";

/**
 * Parses an XLSX ArrayBuffer into a structured ParsedMatrix.
 *
 * Sheet priority: "Comparator Matrix" → "Benchmark Matrix" → first sheet
 * Row layout: Row 0 = section header (skipped), Row 1 = column headers, Rows 2+ = data
 *
 * Section-label rows (non-data rows whose col 0 is a group label like
 * "Mothership-led", "Urban Hub-led", "Embedded (No Mothership)", etc.) are filtered out.
 */
function parseBuffer(buffer: ArrayBuffer, fileName: string): ParsedMatrix {
  const workbook = XLSX.read(buffer, { type: "array" });

  const PREFERRED_SHEETS = ["Comparator Matrix", "Benchmark Matrix"];
  const sheetName =
    PREFERRED_SHEETS.find((n) => workbook.SheetNames.includes(n)) ??
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as (string | number | null)[][];

  const rawHeaders = raw[1] ?? [];
  const headers: string[] = rawHeaders.map((h) =>
    h != null ? String(h).replace(/\n/g, " ").trim() : ""
  );

  const records: MatrixRecord[] = [];

  for (let i = 2; i < raw.length; i++) {
    const row = raw[i];
    const brand = row?.[0];
    const category = row?.[2]; // "Level / Category" column

    // Skip blank rows
    if (brand == null || String(brand).trim() === "") continue;

    // Skip section-label rows: they have no category value and are not data
    if (category == null || String(category).trim() === "") continue;

    // Skip legacy section headers just in case
    if (/^(LOCAL|SECTION)/i.test(String(brand).trim())) continue;

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
  if (!res.ok)
    throw new Error(`Failed to load matrix: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  const fileName = url.split("/").pop() ?? "matrix.xlsx";
  return parseBuffer(buffer, fileName);
}
