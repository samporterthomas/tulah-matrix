// Matrix data loaded via JSON import (bundled at build time)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matrixRecords = require("../../public/matrix-data.json");

export function getMatrixJson(): string {
  return JSON.stringify(matrixRecords);
}
