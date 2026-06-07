"use client";

export interface AiLogEntry {
  id: string;
  stage: string;
  route: string;
  model: string;
  summary: string;
  durationMs?: number;
  tokensUsed?: number;
  status: "success" | "error" | "running";
  timestamp: number;
  detail?: string;
}

type Listener = () => void;

const MAX_ENTRIES = 20;

let entries: AiLogEntry[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const aiLogStore = {
  getEntries(): AiLogEntry[] {
    return entries;
  },

  addEntry(entry: Omit<AiLogEntry, "id" | "timestamp">): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEntry: AiLogEntry = { ...entry, id, timestamp: Date.now() };
    entries = [newEntry, ...entries].slice(0, MAX_ENTRIES);
    notify();
    return id;
  },

  updateEntry(id: string, updates: Partial<AiLogEntry>) {
    entries = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clear() {
    entries = [];
    notify();
  },
};
