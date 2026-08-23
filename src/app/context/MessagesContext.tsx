"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

import { api, CARE_TEAM_NAME } from "@/lib/api";
import type { ChatMessage, RequestKind, RequestStatus } from "@/lib/api";

/**
 * The patient's conversation with the care team.
 *
 * One conversation per order, shared with the back office — an admin reply
 * lands here. It replaces the old thread model, where the patient wrote into
 * one store and the admin read another, so neither side could hear the other.
 *
 * Supplies requests are messages in this conversation, carrying a `request`
 * payload, so an outcome shows up attached to the thing she asked for.
 */

export type { ChatMessage, MessageRequest, RequestKind, RequestStatus } from "@/lib/api";
export { REQUEST_LABELS, REQUEST_OUTCOMES, TRAY_REASONS } from "@/lib/api";
export const CARE_NAME = CARE_TEAM_NAME;

interface MessagesContextValue {
  messages: ChatMessage[];
  /** False until the first load finishes — stops an empty state flashing. */
  ready: boolean;
  /** Unread replies from the care team, for the nav badge. */
  unreadCount: number;
  /** Every supplies request she's raised, newest first. Drives /my-order. */
  requests: ChatMessage[];
  send: (body: string) => Promise<void>;
  sendRequest: (kind: RequestKind, detail: string, note: string, photos?: string[]) => Promise<void>;
  markRead: () => Promise<void>;
  /** Simulates the care team's decision. Admin-only once a backend lands. */
  setRequestStatus: (messageId: string, status: RequestStatus, reason?: string) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("You");

  /* Resolve the order this conversation belongs to, then load and subscribe. */
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function open() {
      try {
        const [mine, user] = await Promise.all([
          api.submissions.getMine(),
          api.auth.getUser(),
        ]);
        if (cancelled) return;

        if (user?.name) setPatientName(user.name);
        if (!mine) return;

        setSubmissionId(mine.id);
        const loaded = await api.messages.list(mine.id);
        if (cancelled) return;

        setMessages(loaded);
        unsubscribe = api.messages.subscribe(mine.id, (incoming) => {
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        });
      } catch (err) {
        console.error("Could not open the conversation:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    open();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  /** Replaces a message in place, keeping the conversation's order. */
  const applyMessage = useCallback((updated: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  const send = useCallback(
    async (body: string) => {
      if (!submissionId || !body.trim()) return;
      const sent = await api.messages.send(submissionId, body, "patient", patientName);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    },
    [submissionId, patientName],
  );

  const sendRequest = useCallback(
    async (kind: RequestKind, detail: string, note: string, photos?: string[]) => {
      if (!submissionId) return;
      const sent = await api.messages.sendRequest(submissionId, kind, detail, note, patientName, photos);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    },
    [submissionId, patientName],
  );

  const markRead = useCallback(async () => {
    if (!submissionId) return;
    if (!messages.some((m) => m.senderRole === "admin" && !m.readAt)) return;

    await api.messages.markRead(submissionId, "admin");
    const at = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.senderRole === "admin" && !m.readAt ? { ...m, readAt: at } : m)),
    );
  }, [submissionId, messages]);

  const setRequestStatus = useCallback(
    async (messageId: string, status: RequestStatus, reason?: string) => {
      applyMessage(await api.messages.setRequestStatus(messageId, status, reason));
    },
    [applyMessage],
  );

  const unreadCount = messages.filter((m) => m.senderRole === "admin" && !m.readAt).length;
  const requests = messages.filter((m) => m.request).reverse();

  return (
    <MessagesContext.Provider
      value={{
        messages,
        ready,
        unreadCount,
        requests,
        send,
        sendRequest,
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
