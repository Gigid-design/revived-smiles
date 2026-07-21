"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/* Customer ↔ care team messaging, organised as separate threads.

   Every question the customer asks and every supplies request they raise opens
   its OWN thread, so a materials request doesn't get buried inside a general
   conversation. A request thread carries its status (pending / accepted /
   rejected) alongside the messages.

   NOTE: this is UI state only. Persisting threads to the backend — and whether
   an accepted request writes through to Shopify — is a separate scope. */

export type RequestKind = "material" | "trays";
export type RequestStatus = "pending" | "accepted" | "rejected";

export const REQUEST_LABELS: Record<RequestKind, string> = {
  material: "More impression material",
  trays: "Different tray size",
};

/** What support sends when it accepts each kind of request. */
const OUTCOMES: Record<RequestKind, string> = {
  material: "New impression material sent",
  trays: "New trays sent",
};

export interface ThreadMessage {
  id: string;
  role: "patient" | "care";
  body: string;
  createdAt: string;
}

export interface ThreadRequest {
  kind: RequestKind;
  /** Reason picked in the form, e.g. "Trays too big". Empty for material requests. */
  detail: string;
  note: string;
  status: RequestStatus;
  /** What the customer sees once accepted, e.g. "New trays sent". */
  outcome: string | null;
  tracking: string | null;
}

export interface Thread {
  id: string;
  subject: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
  /** True when the care team has replied and the customer hasn't opened it. */
  unread: boolean;
  /** Present when this thread was opened by a supplies request. */
  request?: ThreadRequest;
}

const STORAGE_KEY = "rs_message_threads";
const DESIGN_MODE = process.env.NEXT_PUBLIC_DESIGN_MODE === "1";

const CARE = "Revived Smiles Care";
export const CARE_NAME = CARE;

/** Trim a free-text question down to a thread title. */
function toSubject(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

/* Design mode: seed a couple of threads so the inbox and the accepted-request
   tracking are visible without having to create them first. */
function seedThreads(): Thread[] {
  const now = Date.now();
  const iso = (agoMin: number) => new Date(now - agoMin * 60_000).toISOString();
  return [
    {
      id: "demo-thread-1",
      subject: REQUEST_LABELS.trays,
      createdAt: iso(2880),
      updatedAt: iso(2820),
      unread: false,
      request: {
        kind: "trays",
        detail: "Trays too small",
        note: "The upper tray doesn't reach my back teeth.",
        status: "accepted",
        outcome: OUTCOMES.trays,
        tracking: "1Z999AA10123456784",
      },
      messages: [
        { id: "m1", role: "patient", body: "The trays I received are too small — the upper one doesn't reach my back teeth.", createdAt: iso(2880) },
        { id: "m2", role: "care", body: "Thanks for letting us know! We've approved a replacement — a larger set is on its way to you.", createdAt: iso(2820) },
      ],
    },
    {
      id: "demo-thread-2",
      subject: "Where is my order?",
      createdAt: iso(300),
      updatedAt: iso(295),
      unread: true,
      messages: [
        { id: "m3", role: "patient", body: "Where is my order?", createdAt: iso(300) },
        { id: "m4", role: "care", body: "Your impressions arrived safely and are with our review team now. We'll update you as soon as they're approved — usually within two business days.", createdAt: iso(295) },
      ],
    },
  ];
}

interface MessagesContextValue {
  threads: Thread[];
  /** False until threads are restored from storage — stops "not found" flashing. */
  ready: boolean;
  /** Threads with an unopened reply from the care team. */
  unreadCount: number;
  getThread: (id: string) => Thread | undefined;
  /** Ask a new question — opens its own thread. Returns the new thread id. */
  startQuestion: (text: string) => string;
  /** Raise a supplies request — opens its own thread. Returns the new thread id. */
  startRequest: (kind: RequestKind, detail: string, note: string) => string;
  reply: (threadId: string, body: string) => void;
  markRead: (threadId: string) => void;
  /** Support's decision on a request thread. */
  setRequestStatus: (threadId: string, status: RequestStatus) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Restore from sessionStorage so threads survive moving between tabs. */
  useEffect(() => {
    let initial: Thread[] = [];
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
      else if (DESIGN_MODE) initial = seedThreads();
    } catch {
      if (DESIGN_MODE) initial = seedThreads();
    }
    setThreads(initial); // eslint-disable-line react-hooks/set-state-in-effect -- one-time restore on mount
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(threads)); } catch {}
  }, [threads, hydrated]);

  const getThread = useCallback(
    (id: string) => threads.find((t) => t.id === id),
    [threads]
  );

  const startQuestion = useCallback((text: string) => {
    const body = text.trim();
    const id = `thread-${Date.now()}`;
    const at = new Date().toISOString();
    const thread: Thread = {
      id,
      subject: toSubject(body),
      createdAt: at,
      updatedAt: at,
      unread: false,
      messages: [{ id: `${id}-m1`, role: "patient", body, createdAt: at }],
    };
    setThreads((prev) => [thread, ...prev]);
    return id;
  }, []);

  const startRequest = useCallback((kind: RequestKind, detail: string, note: string) => {
    const id = `thread-${Date.now()}`;
    const at = new Date().toISOString();
    const opener = detail
      ? `I need a different tray size — ${detail.toLowerCase()}.`
      : "I need more impression material.";
    const thread: Thread = {
      id,
      subject: REQUEST_LABELS[kind],
      createdAt: at,
      updatedAt: at,
      unread: false,
      request: { kind, detail, note, status: "pending", outcome: null, tracking: null },
      messages: [
        { id: `${id}-m1`, role: "patient", body: note ? `${opener}\n\n${note}` : opener, createdAt: at },
      ],
    };
    setThreads((prev) => [thread, ...prev]);
    return id;
  }, []);

  const reply = useCallback((threadId: string, body: string) => {
    const text = body.trim();
    if (!text) return;
    const at = new Date().toISOString();
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              updatedAt: at,
              messages: [...t.messages, { id: `${threadId}-m${t.messages.length + 1}`, role: "patient" as const, body: text, createdAt: at }],
            }
          : t
      )
    );
  }, []);

  const markRead = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId && t.unread ? { ...t, unread: false } : t))
    );
  }, []);

  const setRequestStatus = useCallback((threadId: string, status: RequestStatus) => {
    const at = new Date().toISOString();
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId || !t.request) return t;
        const outcome = status === "accepted" ? OUTCOMES[t.request.kind] : null;
        const reply: ThreadMessage = {
          id: `${threadId}-m${t.messages.length + 1}`,
          role: "care",
          body:
            status === "accepted"
              ? `Good news — your request is approved. ${outcome}.`
              : "We weren't able to approve this request. We'll follow up here with the details.",
          createdAt: at,
        };
        return {
          ...t,
          updatedAt: at,
          unread: true,
          messages: [...t.messages, reply],
          request: {
            ...t.request,
            status,
            outcome,
            tracking: status === "accepted" ? "1Z999AA10123456784" : null,
          },
        };
      })
    );
  }, []);

  const unreadCount = threads.filter((t) => t.unread).length;

  return (
    <MessagesContext.Provider
      value={{ threads, ready: hydrated, unreadCount, getThread, startQuestion, startRequest, reply, markRead, setRequestStatus }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used inside MessagesProvider");
  return ctx;
}
