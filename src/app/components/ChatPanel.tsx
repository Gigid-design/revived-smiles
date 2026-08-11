"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import type { FormKind } from "./ChatRequestForm";
import { MacroPicker, type Macro } from "./MacroPicker";
import { ChatPhotoLightbox } from "./ChatPhotoLightbox";
import styles from "./ChatPanel.module.css";
import {
  api,
  REQUEST_LABELS,
  requiresReviewNotes,
  SUBMISSION_STATUS_LABELS,
  type ChatMessage,
  type MessagePhoto,
  type RequestStatus,
} from "@/lib/api";

const REQUEST_STATUS_COPY: Record<RequestStatus, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

/** The free-text the patient typed, which follows the headline in the body. */
function requestNote(body: string): string {
  const [, ...rest] = body.split("\n\n");
  return rest.join("\n\n").trim();
}

/* Same shortcuts as the full /messages chat. The question sends inline; the
   materials/trays shortcuts open the matching form in place via onOpenForm;
   adjusting an appliance is its own multi-screen flow, so that shortcut
   navigates there. */
const QUICK_QUESTIONS = ["Where is my order?"];
const QUICK_FORMS: { label: string; kind: FormKind }[] = [
  { label: "Need more materials?", kind: "material" },
  { label: "Need different trays?", kind: "trays" },
];

/** Admin ↔ patient conversation, used by the admin submission console.
 *  The patient-facing experience lives in /messages (threaded). */

interface ChatPanelProps {
  submissionId: string | null;
  currentRole: "admin" | "patient";
  currentName: string;
  /** Patient drawer only: open a Materials/Trays form in the host. */
  onOpenForm?: (kind: FormKind) => void;
  /** Patient drawer only: leave the chat for the adjustment flow. */
  onAdjust?: () => void;
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

export function ChatPanel({ submissionId, currentRole, currentName, onOpenForm, onAdjust }: ChatPanelProps) {
  const { messages, sendMessage, setRequestStatus, markAsRead, loading } = useChat(
    submissionId,
    currentRole,
    currentName
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  /* The expanded photo attachment, if any — a set of photos plus the one in view. */
  const [lightbox, setLightbox] = useState<{ photos: MessagePhoto[]; index: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Keep the newest message in view. The message list is the scroll
     container (bubbles + composer are docked), so scroll it directly. */
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  /* Grow the composer with its content (up to the CSS max-height), so
     multi-line drafts stay fully visible instead of scrolling in one line. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

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

  /** Apply a macro. A plain reply drops into the composer to edit before
      sending; a macro that carries an action moves the order along — the same
      `updateStatus` path as the review buttons — and sends its reply, so an
      agent can approve or reject a submission without leaving the chat. The
      status change posts its own event into the thread automatically. */
  async function applyMacro(macro: Macro) {
    if (!macro.action) {
      setDraft((prev) => (prev.trim() ? `${prev}\n${macro.body}` : macro.body));
      return;
    }
    if (!submissionId) return;
    await api.submissions.updateStatus(submissionId, {
      status: macro.action.status,
      reviewedBy: currentName,
      /* `changes_requested` / `rejected` require a note — the macro body is it. */
      ...(requiresReviewNotes(macro.action.status) ? { reviewNotes: macro.body } : {}),
    });
    await sendMessage(macro.body);
  }

  async function decideRequest(messageId: string, status: RequestStatus) {
    if (deciding) return;
    setDeciding(messageId);
    await setRequestStatus(messageId, status);
    setDeciding(null);
  }

  /** A supplies request renders as a status card the care team can action,
      rather than a plain bubble — so its outcome sits on what was asked. */
  function renderRequestCard(msg: ChatMessage) {
    const request = msg.request!;
    const { kind, detail, status, outcome, trackingNumber } = request;
    const typed = requestNote(msg.body);
    const isAdmin = currentRole === "admin";
    const busy = deciding === msg.id;

    return (
      <div
        key={msg.id}
        className={`${styles.messageBubbleWrap} ${styles.messageBubbleOther}`}
        style={{ maxWidth: "100%", alignSelf: "stretch" }}
      >
        <div className={styles.requestCard}>
          <div className={styles.requestHead}>
            <span className={styles.requestKind}>{REQUEST_LABELS[kind]}</span>
            <span
              className={`${styles.statusBadge} ${
                status === "accepted"
                  ? styles.statusAccepted
                  : status === "rejected"
                    ? styles.statusRejected
                    : styles.statusPending
              }`}
            >
              {REQUEST_STATUS_COPY[status]}
            </span>
          </div>

          {detail && <p className={styles.requestDetail}>{detail}</p>}
          {typed && <p className={styles.requestNote}>{typed}</p>}

          {status === "accepted" && outcome && (
            <div className={styles.outcomeRow}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5L9.5 18L20 6.5" />
              </svg>
              <span>{outcome}</span>
            </div>
          )}
          {status === "accepted" && trackingNumber && (
            <p className={styles.requestDetail}>Tracking: {trackingNumber}</p>
          )}
          {status === "rejected" && (
            <p className={styles.rejectedNote}>
              Declined — the care team&apos;s reply explains why below.
            </p>
          )}

          {/* The care team decides a pending request right here. */}
          {isAdmin && status === "pending" && (
            <div className={styles.decisionRow}>
              <button
                type="button"
                className={styles.acceptBtn}
                disabled={busy}
                onClick={() => void decideRequest(msg.id, "accepted")}
              >
                {busy ? "Saving…" : "Accept & send"}
              </button>
              <button
                type="button"
                className={styles.declineBtn}
                disabled={busy}
                onClick={() => void decideRequest(msg.id, "rejected")}
              >
                Decline
              </button>
            </div>
          )}
        </div>
        <div className={styles.timestamp}>{formatTime(msg.createdAt)}</div>
      </div>
    );
  }

  /** A tap-to-expand thumbnail strip for the photos carried by a message. */
  function renderAttachments(photos: MessagePhoto[]) {
    return (
      <div className={styles.attachGrid}>
        {photos.map((photo, i) => (
          <button
            key={`${photo.url}-${i}`}
            type="button"
            className={styles.attachThumb}
            onClick={() => setLightbox({ photos, index: i })}
            title={photo.label ? `${photo.label} — click to expand` : "Click to expand"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- stand-in demo asset */}
            <img src={photo.url} alt={photo.label ?? "Attached photo"} className={styles.attachImg} />
            {photo.label && <span className={styles.attachLabel}>{photo.label}</span>}
          </button>
        ))}
      </div>
    );
  }

  /** A form submission or a status change, drawn as a centred timeline event
      rather than a chat bubble — so the care team reads the order's history
      inline with the conversation. */
  function renderEventMessage(msg: ChatMessage) {
    const event = msg.event!;

    if (event.kind === "status_change") {
      const to = event.toStatus ? SUBMISSION_STATUS_LABELS[event.toStatus] : "updated";
      const from = event.fromStatus ? SUBMISSION_STATUS_LABELS[event.fromStatus] : null;
      return (
        <div key={msg.id} className={styles.eventStatusRow}>
          <span className={styles.eventStatusPill}>
            <span className={styles.eventStatusDot} aria-hidden />
            {from ? (
              <>Status: <b>{from}</b> → <b>{to}</b></>
            ) : (
              <>Status changed to <b>{to}</b></>
            )}
            {event.actor && <span className={styles.eventStatusActor}>· {event.actor}</span>}
            <span className={styles.eventStatusTime}>· {formatTime(msg.createdAt)}</span>
          </span>
        </div>
      );
    }

    /* Submission event — the recap card with facts + an expandable photo strip. */
    const photos = msg.attachments ?? [];
    return (
      <div key={msg.id} className={styles.eventCardWrap}>
        <div className={styles.eventCard}>
          <div className={styles.eventHead}>
            <span className={styles.eventIcon} aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <path d="M7.5 3.5h9a1.5 1.5 0 011.5 1.5v14a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19V5a1.5 1.5 0 011.5-1.5z" />
              </svg>
            </span>
            <span className={styles.eventTitle}>{event.title}</span>
            <span className={styles.eventTime}>{formatTime(msg.createdAt)}</span>
          </div>

          {event.facts && event.facts.length > 0 && (
            <dl className={styles.eventFacts}>
              {event.facts.map((fact) => (
                <div key={fact.label} className={styles.eventFactRow}>
                  <dt className={styles.eventFactLabel}>{fact.label}</dt>
                  <dd className={styles.eventFactValue}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {photos.length > 0 && (
            <div className={styles.eventPhotos}>
              <span className={styles.eventPhotosLabel}>
                {photos.length} photo{photos.length === 1 ? "" : "s"} attached
              </span>
              {renderAttachments(photos)}
            </div>
          )}
        </div>
      </div>
    );
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
            if (msg.event) return renderEventMessage(msg);
            if (msg.request) return renderRequestCard(msg);
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
                {msg.attachments && msg.attachments.length > 0 && renderAttachments(msg.attachments)}
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
              key={f.kind}
              type="button"
              className={styles.quickChip}
              onClick={() => onOpenForm?.(f.kind)}
            >
              {f.label}
            </button>
          ))}
          {onAdjust && (
            <button type="button" className={styles.quickChip} onClick={onAdjust}>
              Need to adjust my appliance
            </button>
          )}
        </div>
      )}

      {/* Macros — admin only: search → select → apply a canned reply */}
      {currentRole === "admin" && (
        <MacroPicker onApply={applyMacro} />
      )}

      {/* Input */}
      <div className={styles.inputBar}>
        <textarea
          ref={inputRef}
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

      {lightbox && (
        <ChatPhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
