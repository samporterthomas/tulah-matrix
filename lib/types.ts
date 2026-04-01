export interface MatrixRecord {
  [key: string]: string | number | null;
}

export interface ParsedMatrix {
  records: MatrixRecord[];
  headers: string[];
  rowCount: number;
  fileName: string;
  parsedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  attachments?: string[]; // file names attached to this message
}

export interface AnalyseRequest {
  question: string;
  matrixData: ParsedMatrix;
  history: { role: "user" | "assistant"; content: string }[];
}

export interface AnalyseResponse {
  answer: string;
  error?: string;
}
