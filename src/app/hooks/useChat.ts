"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { ChatMessage, MessageRole } from "@/lib/api";

export type { ChatMessage } from "@/lib/api";

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (body: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  unreadCount: number;
  loading: boolean;
}

/** The chat between a patient and the care team for one submission. */
export function useChat(
  submissionId: string | null,
  currentRole: MessageRole,
  currentName: string,
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const idRef = useRef(submissionId);
  useEffect(() => {
    idRef.current = submissionId;
  }, [submissionId]);

  useEffect(() => {
    if (!submissionId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- nothing to load without an id
      return;
    }

    let cancelled = false;

    api.messages
      .list(submissionId)
      .then((loaded) => {
        if (!cancelled) setMessages(loaded);
      })
      .catch((err) => {
        console.error("Could not load messages:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = api.messages.subscribe(submissionId, (incoming) => {
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [submissionId]);

  const sendMessage = useCallback(
    async (body: string) => {
      const id = idRef.current;
      if (!id || !body.trim()) return;

      try {
        const sent = await api.messages.send(id, body, currentRole, currentName);
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      } catch (err) {
        console.error("Could not send message:", err);
      }
    },
    [currentRole, currentName],
  );

  const otherRole: MessageRole = currentRole === "admin" ? "patient" : "admin";

  const markAsRead = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    if (!messages.some((m) => m.senderRole === otherRole && !m.readAt)) return;

    try {
      await api.messages.markRead(id, otherRole);
      const at = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.senderRole === otherRole && !m.readAt ? { ...m, readAt: at } : m)),
      );
    } catch (err) {
      console.error("Could not mark messages as read:", err);
    }
  }, [messages, otherRole]);

  const unreadCount = messages.filter((m) => m.senderRole === otherRole && !m.readAt).length;

  return { messages, sendMessage, markAsRead, unreadCount, loading };
}
