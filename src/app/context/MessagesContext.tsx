"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

import { api, CARE_TEAM_NAME } from "@/lib/api";
import type { RequestKind, RequestStatus, Thread } from "@/lib/api";

/**
 * Patient ↔ care team messaging, organised as separate threads.
 *
 * Every question the patient asks and every supplies request they raise opens
 * its OWN thread, so a materials request doesn't get buried inside a general
 * conversation. A request thread carries its status (pending / accepted /
 * rejected) alongside the messages.
 *
 * This context is now a thin cache over `api.threads` — it holds no data of
 * its own and invents nothing.
 */

/* Re-exported so screens keep importing their types from one place. */
export type { RequestKind, RequestStatus, Thread, ThreadMessage, ThreadRequest } from "@/lib/api";
export { REQUEST_LABELS } from "@/lib/api";
export const CARE_NAME = CARE_TEAM_NAME;

interface MessagesContextValue {
  threads: Thread[];
  /** False until the first load finishes — stops "not found" flashing. */
  ready: boolean;
  /** Threads with an unopened reply from the care team. */
  unreadCount: number;
  getThread: (id: string) => Thread | undefined;
  /** Ask a new question — opens its own thread. Resolves with the new id. */
  startQuestion: (text: string) => Promise<string>;
  /** Raise a supplies request — opens its own thread. Resolves with the new id. */
  startRequest: (kind: RequestKind, detail: string, note: string) => Promise<string>;
  reply: (threadId: string, body: string) => Promise<void>;
  markRead: (threadId: string) => Promise<void>;
  /** Support's decision on a request thread. Admin-only once a backend lands. */
  setRequestStatus: (threadId: string, status: RequestStatus) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setThreads(await api.threads.list());
    } catch (err) {
      console.error("Could not load conversations:", err);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const getThread = useCallback((id: string) => threads.find((t) => t.id === id), [threads]);

  const startQuestion = useCallback(
    async (text: string) => {
      const id = await api.threads.startQuestion(text);
      await refresh();
      return id;
    },
    [refresh],
  );

  const startRequest = useCallback(
    async (kind: RequestKind, detail: string, note: string) => {
      const id = await api.threads.startRequest(kind, detail, note);
      await refresh();
      return id;
    },
    [refresh],
  );

  const applyThread = useCallback((updated: Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const reply = useCallback(
    async (threadId: string, body: string) => {
      if (!body.trim()) return;
      applyThread(await api.threads.reply(threadId, body));
    },
    [applyThread],
  );

  const markRead = useCallback(async (threadId: string) => {
    await api.threads.markRead(threadId);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: false } : t)));
  }, []);

  const setRequestStatus = useCallback(
    async (threadId: string, status: RequestStatus) => {
      applyThread(await api.threads.setRequestStatus(threadId, status));
    },
    [applyThread],
  );

  const unreadCount = threads.filter((t) => t.unread).length;

  return (
    <MessagesContext.Provider
      value={{
        threads,
        ready,
        unreadCount,
        getThread,
        startQuestion,
        startRequest,
        reply,
        markRead,
        setRequestStatus,
      }}
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
