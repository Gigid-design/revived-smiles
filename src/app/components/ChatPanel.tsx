"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import styles from "./ChatPanel.module.css";

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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* Mark messages as read when panel is visible */
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    await sendMessage(text);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            const isOwn = msg.sender_role === currentRole;
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
                      {getInitials(msg.sender_name || "?")}
                    </div>
                    <div className={styles.senderName}>{msg.sender_name}</div>
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
                  {formatTime(msg.created_at)}
                  {isOwn && msg.read_at && (
                    <span className={styles.readIndicator}> · Read</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

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
