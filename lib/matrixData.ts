import matrixRecords from "./matrix-data.json";

export function getMatrixJson(): string {
  return JSON.stringify(matrixRecords);
}
