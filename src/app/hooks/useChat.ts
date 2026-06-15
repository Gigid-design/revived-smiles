"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

export interface ChatMessage {
  id: string;
  submission_id: string;
  sender_role: "admin" | "patient";
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (body: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  unreadCount: number;
  loading: boolean;
}

export function useChat(
  submissionId: string | null,
  currentRole: "admin" | "patient",
  currentName: string
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const idRef = useRef(submissionId);
  idRef.current = submissionId;

  /* Fetch messages on mount */
  useEffect(() => {
    if (!submissionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/messages?submissionId=${submissionId}`);
        const data = await res.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    /* Subscribe to realtime inserts — unique channel name per effect to avoid
       Supabase reuse collision in React Strict Mode double-mount */
    const supabase = getSupabase();
    const channelName = `chat:${submissionId}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `submission_id=eq.${submissionId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [submissionId]);

  /* Send a message */
  const sendMessage = useCallback(
    async (body: string) => {
      const id = idRef.current;
      if (!id || !body.trim()) return;

      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: id,
            body: body.trim(),
            senderRole: currentRole,
            senderName: currentName,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
    [currentRole, currentName]
  );

  /* Mark messages from the other party as read */
  const markAsRead = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;

    const otherRole = currentRole === "admin" ? "patient" : "admin";
    const hasUnread = messages.some(
      (m) => m.sender_role === otherRole && !m.read_at
    );
    if (!hasUnread) return;

    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, markRole: otherRole }),
      });

      // Optimistically mark as read locally
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_role === otherRole && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }, [currentRole, messages]);

  /* Count unread messages from the other party */
  const otherRole = currentRole === "admin" ? "patient" : "admin";
  const unreadCount = messages.filter(
    (m) => m.sender_role === otherRole && !m.read_at
  ).length;

  return { messages, sendMessage, markAsRead, unreadCount, loading };
}
