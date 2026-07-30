"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "../hooks/useChat";
import styles from "./ChatPanel.module.css";

/* Same shortcuts as the full /messages chat. The two questions send inline;
   the form actions route to /messages, which opens the matching form (they
   need photo upload + the tooth chart, which don't fit this small drawer). */
const QUICK_QUESTIONS = ["Where is my order?", "How do I take my impressions?"];
const QUICK_FORMS: { label: string; compose: string }[] = [
  { label: "Materials", compose: "material" },
  { label: "Trays", compose: "trays" },
  { label: "Need to adjust my appliance", compose: "adjust" },
];

/** Admin ↔ patient conversation, used by the admin submission console.
 *  The patient-facing experience lives in /messages (threaded). */

interface ChatPanelProps {
  submissionId: string | null;
  currentRole: "admin" | "patient";
  currentName: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatPanel({ submissionId, currentRole, currentName }: ChatPanelProps) {
  const { messages, sendMessage, markAsRead, loading } = useChat(
    submissionId,
    currentRole,
    currentName
  );
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  /* Keep the newest message in view. The message list is the scroll
     container (bubbles + composer are docked), so scroll it directly. */
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  /* Mark messages as read when panel is visible */
  useEffect(() => {
    void markAsRead();
  }, [markAsRead]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    await sendMessage(text);
    setSending(false);
  }

  async function quickSend(text: string) {
    if (sending) return;
    setSending(true);
    await sendMessage(text);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!submissionId) {
    return (
      <div className={styles.empty}>
        <p>No submission selected.</p>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loading}>Loading messages…</div>;
  }

  return (
    <div className={styles.chatPanel}>
      {/* Messages */}
      <div className={styles.messageList} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 4h14v10H5.5L3 16.5V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.emptyText}>No messages yet</p>
            <p className={styles.emptyHint}>
              {currentRole === "admin"
                ? "Send a message to the patient about their submission."
                : "Have a question? Send a message to your care team."}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderRole === currentRole;
            return (
              <div
                key={msg.id}
                className={`${styles.messageBubbleWrap} ${
                  isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
                }`}
              >
                {!isOwn && (
                  <div className={styles.senderRow}>
                    <div className={styles.avatar}>
                      {getInitials(msg.senderName || "?")}
                    </div>
                    <div className={styles.senderName}>{msg.senderName}</div>
                  </div>
                )}
                <div
                  className={`${styles.bubble} ${
                    isOwn ? styles.bubbleOwn : styles.bubbleOther
                  }`}
                >
                  {msg.body}
                </div>
                <div className={styles.timestamp}>
                  {formatTime(msg.createdAt)}
                  {isOwn && msg.readAt && (
                    <span className={styles.readIndicator}> · Read</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick shortcuts — patient only (kept out of the admin console). */}
      {currentRole === "patient" && (
        <div className={styles.quickRow}>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className={styles.quickChip}
              disabled={sending}
              onClick={() => void quickSend(q)}
            >
              {q}
            </button>
          ))}
          {QUICK_FORMS.map((f) => (
            <button
              key={f.compose}
              type="button"
              className={styles.quickChip}
              onClick={() => router.push(`/messages?compose=${f.compose}`)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputBar}>
        <textarea
          className={styles.input}
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M18.5 1.5L9 11M18.5 1.5L12.5 18.5L9 11M18.5 1.5L1.5 7.5L9 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
