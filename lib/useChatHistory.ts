import { useState, useEffect, useCallback } from "react";
import type { Message } from "./types";

const STORAGE_KEY = "tulah_chat_history";
const MAX_SESSIONS = 50;

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

function load(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    const trimmed = sessions.slice(-Math.floor(MAX_SESSIONS / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

function generateTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const text = first.content.trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const stored = load();
    setSessions(stored);
  }, []);

  useEffect(() => {
    if (sessions.length > 0) save(sessions);
  }, [sessions]);

  const newSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => {
      const updated = [session, ...prev].slice(0, MAX_SESSIONS);
      save(updated);
      return updated;
    });
    setActiveId(id);
    return id;
  }, []);

  const updateMessages = useCallback((id: string, messages: Message[]) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? { ...s, messages, title: generateTitle(messages), updatedAt: new Date().toISOString() }
          : s
      );
      save(updated);
      return updated;
    });
  }, []);

  /** Explicitly set a custom title (overrides auto-generated one) */
  const renameSession = useCallback((id: string, title: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, title: title.trim() || "Untitled" } : s
      );
      save(updated);
      return updated;
    });
  }, []);

  /** Set a short AI-generated title on a session */
  const setSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, title } : s
      );
      save(updated);
      return updated;
    });
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (updated.length === 0) localStorage.removeItem(STORAGE_KEY);
      else save(updated);
      return updated;
    });
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const clearAll = useCallback(() => {
    setSessions([]);
    setActiveId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  return {
    sessions,
    activeId,
    activeSession,
    newSession,
    updateMessages,
    renameSession,
    setSessionTitle,
    selectSession,
    deleteSession,
    clearAll,
  };
}
