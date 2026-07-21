"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChat } from "../hooks/useChat";
import { useRequests, REQUEST_LABELS, SupportRequest } from "../context/RequestsContext";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  submissionId: string | null;
  currentRole: "admin" | "patient";
  currentName: string;
  /** Opens the "request materials" form. Patient side only. */
  onOpenRequest?: () => void;
}

/* Design mode: lets us preview the accepted/rejected states without a support
   console on the other end. Auto-off in real environments. */
const DESIGN_MODE = process.env.NEXT_PUBLIC_DESIGN_MODE === "1";

/** Pre-filled prompts so the customer can ask common questions in one tap. */
const QUICK_PROMPTS = [
  "What's the latest?",
  "Where is my order?",
  "How do I take my impressions?",
];

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

const STATUS_COPY: Record<SupportRequest["status"], string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

const STATUS_CLASS: Record<SupportRequest["status"], string> = {
  pending: styles.statusPending,
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
};

export function ChatPanel({ submissionId, currentRole, currentName, onOpenRequest }: ChatPanelProps) {
  const { messages, sendMessage, markAsRead, loading } = useChat(
    submissionId,
    currentRole,
    currentName
  );
  const { requests, setStatus } = useRequests();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isPatient = currentRole === "patient";

  /* Auto-scroll to bottom on new messages or requests */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, requests.length]);

  /* Mark messages as read when panel is visible */
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  async function handleSend(text?: string) {
    const body = (text ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    if (!text) setDraft("");
    await sendMessage(body);
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

  const isEmpty = messages.length === 0 && requests.length === 0;

  return (
    <div className={styles.chatPanel}>
      {/* Messages */}
      <div className={styles.messageList} ref={listRef}>
        {isEmpty ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 4h14v10H5.5L3 16.5V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.emptyText}>How can we help?</p>
            <p className={styles.emptyHint}>
              {currentRole === "admin"
                ? "Send a message to the patient about their submission."
                : "Ask us anything about your impressions or your order — we typically reply within a few hours."}
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

        {/* ── Request cards — raised from the form, resolved by support ── */}
        {requests.map((req) => (
          <div key={req.id} className={styles.requestCard}>
            <div className={styles.requestHead}>
              <span className={styles.requestKind}>{REQUEST_LABELS[req.kind]}</span>
              <span className={`${styles.statusBadge} ${STATUS_CLASS[req.status]}`}>
                {STATUS_COPY[req.status]}
              </span>
            </div>

            {req.detail && <p className={styles.requestDetail}>{req.detail}</p>}
            {req.note && <p className={styles.requestNote}>“{req.note}”</p>}

            {req.status === "accepted" && (
              <div className={styles.outcomeRow}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12.5L9.5 18L20 6.5" />
                </svg>
                <span>{req.outcome}</span>
              </div>
            )}
            {req.status === "rejected" && (
              <p className={styles.rejectedNote}>
                Your care team will follow up with why in a message.
              </p>
            )}

            <div className={styles.requestFoot}>
              <span className={styles.requestTime}>{formatTime(req.createdAt)}</span>
              {req.status === "accepted" && isPatient && (
                <Link href="/my-order" className={styles.trackLink}>
                  Track in My Order →
                </Link>
              )}
            </div>

            {/* Design-mode only: stand in for the support console so every state
                is reviewable. Never rendered in real environments. */}
            {DESIGN_MODE && req.status === "pending" && (
              <div className={styles.simulateRow}>
                <span className={styles.simulateLabel}>Preview:</span>
                <button type="button" className={styles.simulateBtn} onClick={() => setStatus(req.id, "accepted")}>
                  Accept
                </button>
                <button type="button" className={styles.simulateBtn} onClick={() => setStatus(req.id, "rejected")}>
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts + request templates (patient side) ── */}
      {isPatient && (
        <div className={styles.promptBar}>
          {onOpenRequest && (
            <button type="button" className={styles.requestChip} onClick={onOpenRequest}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Request materials
            </button>
          )}
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={styles.promptChip}
              onClick={() => handleSend(prompt)}
              disabled={sending}
            >
              {prompt}
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
          onClick={() => handleSend()}
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
