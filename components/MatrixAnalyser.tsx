"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseMatrixFile, parseMatrixUrl } from "@/lib/parseMatrix";
import { useChatHistory } from "@/lib/useChatHistory";
import { saveMatrixFile, loadMatrixFile } from "@/lib/matrixStorage";
import MatrixPanel from "@/components/MatrixPanel";
import type { ParsedMatrix, Message } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────

const DEFAULT_MATRIX_URL = "/matrix.xlsx";

// Google Sheets URLs — set NEXT_PUBLIC_SHEETS_EMBED_URL in your .env.local / Vercel env vars
// See README for how to get the embed URL from Google Sheets
const SHEETS_EMBED_URL = process.env.NEXT_PUBLIC_SHEETS_EMBED_URL ?? "YOUR_PUBLISHED_EMBED_URL_HERE";
const SHEETS_DIRECT_URL = "https://docs.google.com/spreadsheets/d/1VHFzVEX5aW-4Ow_rLsHGk3YDZ19YYD5X1tCVI4UYDBs/edit?usp=sharing";

const SUGGESTED_QUESTIONS = [
  {
    category: "Typology",
    questions: [
      "How do motherships differ from embedded expressions on clinical depth?",
      "Which comparators are the closest analogue to Tulah Kerala in sanctuary / mothership form?",
      "What does the matrix suggest about programme duration across embedded expressions?",
    ],
  },
  {
    category: "Commercial logic",
    questions: [
      "Which operators rely on medical partnerships rather than full in-house infrastructure?",
      "Which operators combine memberships, treatments, and hotel integration most effectively?",
      "What patterns emerge in how embeddeds compress the mothership model commercially?",
    ],
  },
  {
    category: "Dubai & regional",
    questions: [
      "What patterns emerge across Dubai comparators in the matrix?",
      "Which Dubai examples are treatment-led versus programme-led?",
      "How do Dubai-based embeddeds compare to their global mothership equivalents?",
    ],
  },
  {
    category: "Strategy",
    questions: [
      "Which insights from the matrix remain relevant after the scope shift away from Dubai?",
      "What does the dataset suggest about sanctuary-led expansion versus urban / embedded expressions?",
      "What revenue models are most common among standalone / mothership operators?",
    ],
  },
];

const FILTERS = [
  { label: "All comparators", value: "" },
  { label: "Motherships (A)", value: "A — Mothership" },
  { label: "Urban Hubs (B)", value: "B — Urban Hub" },
  { label: "Embedded (C)", value: "C — Embedded / Partner" },
  { label: "Local / Standalone", value: "Local" },
  { label: "Dubai / UAE", value: "Dubai" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StatusBadge({ matrix, loading }: { matrix: ParsedMatrix | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-stone-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block animate-pulse" />
        Loading matrix…
      </div>
    );
  }
  if (!matrix) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-stone-400">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block" />
        No matrix loaded
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-500">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      <span className="font-medium text-stone-700">{matrix.rowCount - 2}</span> comparators ·{" "}
      <span className="text-stone-400 truncate max-w-[140px]">{matrix.fileName}</span>
    </div>
  );
}

function ReplaceDataPanel({
  onFile, isLoading, parseError, matrix,
}: {
  onFile: (f: File) => void;
  isLoading: boolean;
  parseError: string | null;
  matrix: ParsedMatrix | null;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="border-b border-stone-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Update Database
        </span>
        <svg className={`w-3 h-3 text-stone-300 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              dragging ? "border-stone-400 bg-stone-100" : "border-stone-200 hover:border-stone-300 bg-white"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              disabled={isLoading} />
            <div className="flex flex-col items-center gap-1.5">
              <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-xs text-stone-400">
                {isLoading ? "Parsing…" : "Drop new XLSX or click to browse"}
              </p>
            </div>
          </div>
          {parseError && <p className="text-xs text-red-500 mt-1.5">{parseError}</p>}
          {matrix && (
            <p className="text-[10px] text-stone-400 mt-1.5">
              Current: <span className="font-medium">{matrix.rowCount - 2}</span> comparators · {matrix.headers.length} fields
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end mb-1.5">
              {message.attachments.map((name, i) => (
                <div key={i} className="flex items-center gap-1 bg-stone-700 text-stone-300 text-[10px] px-2 py-1 rounded-lg">
                  <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <span className="truncate max-w-[160px]">{name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="bg-stone-900 text-stone-50 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        {message.isStreaming ? (
          <div className="flex items-center gap-2 h-6">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            <span className="text-xs text-stone-400">Analysing matrix…</span>
          </div>
        ) : (
          <div className="prose-answer text-stone-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content.replace(/~~([^~]+)~~/g, "$1")}</ReactMarkdown>
          </div>
        )}
        <p className="text-[10px] text-stone-300 mt-1.5">Based on matrix data</p>
      </div>
    </div>
  );
}

// ─── History panel ────────────────────────────────────────────────────────

function HistoryPanel({
  sessions, activeId, onSelect, onDelete, onClearAll, onNew, onRename, ready,
}: {
  sessions: ReturnType<typeof useChatHistory>["sessions"];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  ready: boolean;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) onRename(id, editValue.trim());
    setEditingId(null);
  };

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <svg className="w-6 h-6 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <p className="text-xs text-stone-400 leading-relaxed">
          No saved chats yet. Start a conversation and it will appear here.
        </p>
      </div>
    );
  }

  const groups: Record<string, typeof sessions> = {};
  sessions.forEach((s) => {
    const label = formatRelativeDate(s.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {Object.entries(groups).map(([label, group]) => (
          <div key={label} className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-300 px-2 py-1">
              {label}
            </p>
            {group.map((session) => (
              <div
                key={session.id}
                className={`group flex items-start gap-1 rounded-md px-2 py-2 cursor-pointer transition-colors ${
                  activeId === session.id ? "bg-stone-100 text-stone-900" : "hover:bg-stone-50 text-stone-600"
                }`}
                onClick={() => editingId !== session.id && onSelect(session.id)}
              >
                <svg className="w-3 h-3 text-stone-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(session.id);
                        if (e.key === "Escape") setEditingId(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[11.5px] bg-white border border-stone-300 rounded px-1.5 py-0.5 outline-none focus:border-stone-500 text-stone-800"
                    />
                  ) : (
                    <p className="text-[11.5px] leading-snug truncate">{session.title}</p>
                  )}
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    {session.messages.filter((m) => m.role === "user").length} question
                    {session.messages.filter((m) => m.role === "user").length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {/* Rename button */}
                  <button
                    onClick={(e) => startEdit(e, session.id, session.title)}
                    className="p-0.5 rounded hover:text-stone-600 text-stone-300 transition-colors"
                    title="Rename"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                    className="p-0.5 rounded hover:text-red-400 text-stone-300 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-stone-100 p-3 flex items-center gap-2">
        <button
          onClick={onNew}
          disabled={!ready}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-md py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New chat
        </button>
        {confirmClear ? (
          <div className="flex gap-1">
            <button onClick={() => { onClearAll(); setConfirmClear(false); }}
              className="text-[11px] px-2 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors">
              Clear all
            </button>
            <button onClick={() => setConfirmClear(false)}
              className="text-[11px] px-2 py-1.5 rounded-md hover:bg-stone-100 text-stone-400 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            className="text-[11px] text-stone-300 hover:text-red-400 px-2 py-1.5 rounded-md hover:bg-stone-50 transition-colors"
            title="Clear all history">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function MatrixAnalyser() {
  const [matrix, setMatrix] = useState<ParsedMatrix | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"questions" | "history">("questions");
  const [matrixPanelOpen, setMatrixPanelOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>("New chat");
  const [matrixPanelHeight, setMatrixPanelHeight] = useState(380);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const userScrolledUpRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    sessions, activeId, newSession, updateMessages, renameSession, setSessionTitle,
    selectSession, deleteSession, clearAll,
  } = useChatHistory();

  // ── Auto-load default matrix ─────────────────────────────────────────────
  useEffect(() => {
    async function loadDefault() {
      try {
        // Try persisted user upload first, fall back to default
        const savedFile = await loadMatrixFile();
        if (savedFile) {
          const parsed = await parseMatrixFile(savedFile);
          setMatrix(parsed);
        } else {
          const parsed = await parseMatrixUrl(DEFAULT_MATRIX_URL);
          setMatrix(parsed);
        }
      } catch (err) {
        console.warn("Could not auto-load matrix:", err);
        try {
          const parsed = await parseMatrixUrl(DEFAULT_MATRIX_URL);
          setMatrix(parsed);
        } catch { /* silent */ }
      } finally {
        setIsInitialising(false);
      }
    }
    loadDefault();
  }, []);

  // ── Sync messages ↔ active session ──────────────────────────────────────
  useEffect(() => {
    const session = sessions.find((s) => s.id === activeId);
    if (session) {
      setMessages(session.messages);
      // Show session title if it has messages, otherwise default
      setChatTitle(session.messages.length > 0 && session.title !== "New conversation"
        ? session.title
        : "New chat");
    } else {
      setChatTitle("New chat");
    }
  }, [activeId, sessions]);

  // ── Persist messages to localStorage whenever they change ────────────────
  useEffect(() => {
    if (activeId && messages.length > 0) {
      updateMessages(activeId, messages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Smart scroll: only auto-scroll on new messages, not while user is reading ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const newCount = messages.length;
    const isNewMessage = newCount > lastMessageCountRef.current;
    lastMessageCountRef.current = newCount;

    if (isNewMessage) {
      // New message added — scroll to bottom only if user hasn't scrolled up
      if (!userScrolledUpRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // ── Track whether user has manually scrolled up ───────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledUpRef.current = distFromBottom > 100;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [question]);

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setIsParsingFile(true);
    setParseError(null);
    try {
      const parsed = await parseMatrixFile(file);
      setMatrix(parsed);
      await saveMatrixFile(file);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file.");
    } finally {
      setIsParsingFile(false);
    }
  }, []);

  // ── Start a new chat ─────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    newSession();
    setMessages([]);
    setQuestion("");
    setChatTitle("New chat");
  }, [newSession]);

  // ── Load a historical chat ───────────────────────────────────────────────
  const handleSelectSession = useCallback((id: string) => {
    selectSession(id);
    setSidebarTab("questions");
  }, [selectSession, sessions]);

  // ── Filter context prefix ────────────────────────────────────────────────
  const buildFilteredQuestion = useCallback((q: string) => {
    if (activeFilters.length === 0) return q;
    const labels = activeFilters.join(", ");
    return `[Context: focus specifically on ${labels} comparators] ${q}`;
  }, [activeFilters]);

  // ── Submit question ──────────────────────────────────────────────────────
  const readFileAsText = async (file: File): Promise<string> => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      const XLSX = await import("xlsx");
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const lines: string[] = [];
            workbook.SheetNames.forEach((sheetName) => {
              const sheet = workbook.Sheets[sheetName];
              const csv = XLSX.utils.sheet_to_csv(sheet);
              if (csv.trim()) lines.push("[Sheet: " + sheetName + "]\n" + csv);
            });
            resolve(lines.join("\n\n"));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    }
    // Plain text / CSV / JSON / MD
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const submitQuestion = useCallback(async (q: string) => {
    if (!q.trim() || isLoading || !ready) return;

    // If no active session, create one now
    const sessionId = activeId ?? newSession();

    const finalQuestion = buildFilteredQuestion(q.trim());
    const attachmentNames = attachedFiles.map(f => f.name);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: q.trim(),
      timestamp: new Date().toISOString(),
      attachments: attachmentNames.length > 0 ? attachmentNames : undefined,
    };
    const placeholderMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    const nextMessages = [...messages, userMsg, placeholderMsg];
    setMessages(nextMessages);
    setQuestion("");
    setIsLoading(true);
    userScrolledUpRef.current = false; // reset so new answer scrolls into view

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      // Read any attached files and append as context
      let questionWithContext = finalQuestion;
      if (attachedFiles.length > 0) {
        const fileTexts = await Promise.all(
          attachedFiles.map(async (f) => {
            try {
              const text = await readFileAsText(f);
              return `

--- ATTACHED FILE: ${f.name} ---
${text}
--- END OF ${f.name} ---`;
            } catch { return ""; }
          })
        );
        questionWithContext = finalQuestion + fileTexts.join("");
      }
      setAttachedFiles([]);

      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionWithContext, history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed." }));
        throw new Error(errData.error || "Request failed.");
      }

      // Stream the response text chunk by chunk
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullAnswer += chunk;
          // Update the streaming message with accumulated text
          setMessages((prev) =>
            prev.map((m) =>
              m.isStreaming ? { ...m, content: fullAnswer } : m
            )
          );
        }
      }

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.isStreaming
            ? { ...m, content: fullAnswer || "No response.", isStreaming: false }
            : m
        );
        updateMessages(sessionId, updated);
        return updated;
      });

      // Generate a short AI title after the first question in a session
      if (messages.length === 0) {
        fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q.trim() }),
        })
          .then((r) => r.json())
          .then(({ title }) => {
            if (title && title !== "New conversation") {
              setSessionTitle(sessionId, title);
              setChatTitle(title);
            }
          })
          .catch(() => {});
      }
    } catch {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.isStreaming
            ? { ...m, content: "Request failed. Please check your connection and try again.", isStreaming: false }
            : m
        );
        updateMessages(sessionId, updated);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, matrix, messages, activeId, newSession, buildFilteredQuestion, updateMessages, setSessionTitle]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuestion(question);
    }
  };

  const isEmpty = messages.length === 0;
  const ready = !isInitialising && matrix != null;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 flex flex-col border-r border-stone-200 bg-white transition-all duration-200 ${sidebarOpen ? "w-72" : "w-0 overflow-hidden"}`}>

        {/* Header */}
        <div className="p-5 border-b border-stone-100">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img src="/tulah-logo.png" alt="Tulah" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-stone-900 leading-tight">Tulah Comparator Database</h1>
              <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">AI Interface by Luxury Partners</p>
            </div>
          </div>
          <StatusBadge matrix={matrix} loading={isInitialising} />
        </div>

        {/* Replace data */}
        <ReplaceDataPanel onFile={handleFile} isLoading={isParsingFile} parseError={parseError} matrix={matrix} />

        {/* Tab switcher */}
        <div className="flex border-b border-stone-100">
          {(["questions", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-2.5 text-[11px] font-medium transition-colors ${
                sidebarTab === tab
                  ? "text-stone-900 border-b-2 border-stone-900"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {tab === "questions" ? "Questions" : "History"}
              {tab === "history" && sessions.length > 0 && (
                <span className="ml-1.5 bg-stone-100 text-stone-500 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                  {sessions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {sidebarTab === "questions" ? (
          <>
            {/* Focus context filters — multi-select */}
            <div className="p-4 border-b border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Focus Context</p>
                {activeFilters.length > 0 && (
                  <button
                    onClick={() => setActiveFilters([])}
                    className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.filter((f) => f.value !== "").map((f) => {
                  const active = activeFilters.includes(f.value);
                  return (
                    <button
                      key={f.value}
                      onClick={() =>
                        setActiveFilters((prev) =>
                          active ? prev.filter((v) => v !== f.value) : [...prev, f.value]
                        )
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {activeFilters.length > 0 && (
                <p className="text-[10px] text-stone-400 mt-1.5">
                  Scoped to: {activeFilters.map((v) => FILTERS.find((f) => f.value === v)?.label ?? v).join(", ")}
                </p>
              )}
            </div>

            {/* Suggested questions */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">Example Questions</p>
              <div className="space-y-4">
                {SUGGESTED_QUESTIONS.map((group) => (
                  <div key={group.category}>
                    <p className="text-[10px] font-medium text-stone-400 mb-1.5">{group.category}</p>
                    <div className="space-y-1">
                      {group.questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => submitQuestion(q)}
                          disabled={!ready || isLoading}
                          className="w-full text-left text-[11.5px] text-stone-500 hover:text-stone-800 hover:bg-stone-50 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How to use */}
            <div className="p-4 border-t border-stone-100">
              <details className="text-xs text-stone-400">
                <summary className="cursor-pointer hover:text-stone-600 text-[11px] font-medium">How to use</summary>
                <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed">
                  <p>The matrix is preloaded. Ask questions immediately in the chat panel.</p>
                  <p>Use Focus Context to scope questions to a typology or region.</p>
                  <p>Answers are labelled [Fact], [Derived], or [Interpretation].</p>
                  <p>All conversations are saved automatically and accessible in the History tab.</p>
                </div>
              </details>
            </div>
          </>
        ) : (
          <HistoryPanel
            sessions={sessions}
            activeId={activeId}
            onSelect={handleSelectSession}
            onDelete={deleteSession}
            onClearAll={clearAll}
            onNew={handleNewChat}
            onRename={renameSession}
            ready={ready}
          />
        )}
      </aside>

      {/* ── Main panel ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">{chatTitle}</h2>
              {activeFilters.length > 0 && <p className="text-[10px] text-stone-400">Context: {activeFilters.length === 1 ? FILTERS.find(f => f.value === activeFilters[0])?.label : `${activeFilters.length} filters`}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!sidebarOpen && <StatusBadge matrix={matrix} loading={isInitialising} />}
            {/* Download database as Excel */}
            <a
              href="/Tulah_Comparator_Matrix.xlsx"
              download="Tulah_Comparator_Matrix.xlsx"
              className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-stone-100 border border-stone-200 hover:border-stone-300 transition-colors"
              title="Download database as Excel"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#217346"/>
                <path d="M14 2V8H20L14 2Z" fill="#185C37"/>
                <path d="M8 12.5L10.5 17H13.5L11 12.5L13.5 8H10.5L8 12.5Z" fill="white"/>
                <path d="M13 8H15.5L13.5 12.5L15.5 17H13L11 12.5L13 8Z" fill="white"/>
              </svg>
              Download database
            </a>
            <button
              onClick={handleNewChat}
              disabled={!ready}
              className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-stone-100 border border-stone-200 hover:border-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New chat
            </button>
          </div>
        </header>

        {/* Matrix panel */}
        <MatrixPanel
          embedUrl={SHEETS_EMBED_URL}
          directUrl={SHEETS_DIRECT_URL}
          isOpen={matrixPanelOpen}
          onToggle={() => setMatrixPanelOpen(false)}
          height={matrixPanelHeight}
          onHeightChange={setMatrixPanelHeight}
        />

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
          {isInitialising ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-stone-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-xs text-stone-400">Loading matrix…</p>
              </div>
            </div>
          ) : !matrix ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-700 mb-1">Matrix could not be loaded</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Use &quot;Update Database&quot; in the sidebar to upload the XLSX manually.
                </p>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center max-w-lg mx-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-700 mb-1">{matrix.rowCount - 2} comparators ready</h3>
                <p className="text-xs text-stone-400">Ask a question below, or select one from the sidebar.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md mt-2">
                {[
                  "How do motherships differ from embeddeds on clinical depth?",
                  "What patterns emerge across Dubai comparators?",
                  "Which operators have the strongest programme architecture?",
                  "What does the matrix suggest about sanctuary-led expansion?",
                ].map((q) => (
                  <button key={q} onClick={() => submitQuestion(q)} disabled={isLoading}
                    className="text-left text-[11.5px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 px-3 py-2.5 rounded-lg transition-colors leading-snug disabled:opacity-40">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-stone-200 bg-white px-5 py-4">
          <div className="max-w-3xl mx-auto">
            {/* Attached file chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] text-stone-600">
                    <svg className="w-3 h-3 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="text-stone-300 hover:text-red-400 transition-colors">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={attachInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx,.csv,.json,.md,.xlsx"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachedFiles(prev => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <div
              className={`flex gap-2 items-end bg-stone-50 border rounded-xl px-4 py-3 transition-colors ${
                !ready ? "opacity-50 pointer-events-none border-stone-200" : dragOver ? "border-stone-500 bg-stone-100" : "border-stone-200 focus-within:border-stone-400"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
              }}
            >
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isInitialising ? "Loading matrix…" : "Ask a question about the database…"}
                rows={1}
                disabled={!ready || isLoading}
                className="flex-1 bg-transparent text-sm text-stone-700 placeholder-stone-300 outline-none resize-none leading-relaxed"
              />
              <button
                onClick={() => attachInputRef.current?.click()}
                disabled={!ready || isLoading}
                title="Attach file for additional context"
                className="flex-shrink-0 w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <button
                onClick={() => submitQuestion(question)}
                disabled={!ready || isLoading || !question.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-stone-300 mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </div>
      </main>
    </div>
  );
}
