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

/* Design mode (local design sessions): show a realistic support thread so the
   Messages UI is viewable/refinable without a live backend. Auto-off in real envs. */
const DESIGN_MODE = process.env.NEXT_PUBLIC_DESIGN_MODE === "1";

function buildDemoThread(patientName: string): ChatMessage[] {
  const now = Date.now();
  const min = 60_000;
  const CARE = "Revived Smiles Care";
  const mk = (
    i: number,
    role: "admin" | "patient",
    name: string,
    body: string,
    agoMin: number
  ): ChatMessage => ({
    id: `demo-msg-${i}`,
    submission_id: "demo-1",
    sender_role: role,
    sender_name: name,
    body,
    created_at: new Date(now - agoMin * min).toISOString(),
    read_at: new Date(now - Math.max(agoMin - 2, 0) * min).toISOString(),
  });
  return [
    mk(1, "admin", CARE, `Hi ${patientName.split(" ")[0] || "there"}! 👋 This is your Revived Smiles care team. We're here if you have any questions about your impressions or your order.`, 180),
    mk(2, "patient", patientName, "Hi! I'm not sure my upper impression came out clearly — there's a small bubble on one side.", 174),
    mk(3, "admin", CARE, "Thanks for flagging that! A small bubble is usually fine as long as the edges of your teeth are still visible. Go ahead and upload it and we'll take a look.", 171),
    mk(4, "patient", patientName, "Perfect, just uploaded it. Thank you!", 165),
    mk(5, "admin", CARE, "Got it — we'll review your photos and follow up within a few hours. 😊", 162),
  ];
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
  useEffect(() => { idRef.current = submissionId; }, [submissionId]);

  /* Fetch messages on mount */
  useEffect(() => {
    if (!submissionId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- early return for missing ID
      return;
    }

    if (DESIGN_MODE) {
      // Seed a sample support thread; no fetch, no realtime subscription.
      setMessages(buildDemoThread(currentName)); // eslint-disable-line react-hooks/set-state-in-effect -- one-time demo seed
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

      if (DESIGN_MODE) {
        // Append locally so the composer feels live without a backend.
        setMessages((prev) => [
          ...prev,
          {
            id: `demo-sent-${prev.length}`,
            submission_id: id,
            sender_role: currentRole,
            sender_name: currentName,
            body: body.trim(),
            created_at: new Date().toISOString(),
            read_at: null,
          },
        ]);
        return;
      }

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
