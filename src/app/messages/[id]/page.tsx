"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "../messages.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { useMessages, RequestStatus, REQUEST_LABELS, CARE_NAME } from "@/app/context/MessagesContext";

/** A single conversation. Request threads carry their status at the top so the
 *  customer can see where the request stands without hunting through messages. */

const STATUS_COPY: Record<RequestStatus, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 2880) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ThreadView() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const { getThread, reply, markRead, setRequestStatus, unreadCount, ready } = useMessages();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = getThread(id);
  const messageCount = thread?.messages.length ?? 0;

  /* Opening the thread clears its unread flag */
  useEffect(() => {
    if (thread?.unread) void markRead(id);
  }, [thread?.unread, id, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  const STATUS_CLASS: Record<RequestStatus, string> = {
    pending: styles.statusPending,
    accepted: styles.statusAccepted,
    rejected: styles.statusRejected,
  };

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await reply(id, body);
    } catch (err) {
      console.error("Could not send your reply:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        <div className={styles.topBar}>
          <Link href="/messages/history" className={styles.backBtn}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.5 15L7.5 10L12.5 5" />
            </svg>
            Past messages
          </Link>
        </div>

        {!ready ? (
          /* Threads restore from storage on the client — hold the frame until then */
          <div className={styles.emptyCard} aria-busy="true" />
        ) : !thread ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyTitle}>Conversation not found</p>
            <p className={styles.emptyBody}>This message may have been cleared.</p>
            <Link href="/messages" className={styles.emptyAction}>Start a message</Link>
          </div>
        ) : (
          <>
            <h1 className={styles.threadTitle}>{thread.subject}</h1>
            <p className={styles.threadMeta}>Started {formatWhen(thread.createdAt)}</p>

            {/* ── Request summary (request threads only) ── */}
            {thread.request && (
              <div className={styles.requestCard}>
                <div className={styles.requestHead}>
                  <span className={styles.requestKind}>{REQUEST_LABELS[thread.request.kind]}</span>
                  <span className={`${styles.statusBadge} ${STATUS_CLASS[thread.request.status]}`}>
                    {STATUS_COPY[thread.request.status]}
                  </span>
                </div>

                {thread.request.detail && (
                  <p className={styles.requestDetail}>{thread.request.detail}</p>
                )}

                {thread.request.status === "accepted" && (
                  <>
                    <div className={styles.outcomeRow}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 12.5L9.5 18L20 6.5" />
                      </svg>
                      <span>{thread.request.outcome}</span>
                    </div>
                    <Link href="/my-order" className={styles.trackLink}>
                      Track in My Order →
                    </Link>
                  </>
                )}

                {thread.request.status === "rejected" && (
                  <p className={styles.rejectedNote}>
                    Your care team has explained why below.
                  </p>
                )}

                {/* Stands in for the support console until an admin backend
                    decides these requests — see ThreadsApi.setRequestStatus. */}
                {thread.request.status === "pending" && (
                  <div className={styles.simulateRow}>
                    <span className={styles.simulateLabel}>Preview:</span>
                    <button type="button" className={styles.simulateBtn} onClick={() => void setRequestStatus(id, "accepted")}>
                      Accept
                    </button>
                    <button type="button" className={styles.simulateBtn} onClick={() => void setRequestStatus(id, "rejected")}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Messages ── */}
            <div className={styles.messageList}>
              {thread.messages.map((msg) => {
                const isOwn = msg.role === "patient";
                return (
                  <div
                    key={msg.id}
                    className={`${styles.bubbleWrap} ${isOwn ? styles.bubbleOwnWrap : styles.bubbleOtherWrap}`}
                  >
                    {!isOwn && (
                      <div className={styles.senderRow}>
                        <div className={styles.avatar}>RS</div>
                        <div className={styles.senderName}>{CARE_NAME}</div>
                      </div>
                    )}
                    <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
                      {msg.body}
                    </div>
                    <div className={styles.timestamp}>{formatWhen(msg.createdAt)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* ── Reply ── */}
            <div className={styles.composer}>
              <textarea
                className={styles.composerInput}
                placeholder="Reply…"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                className={styles.sendBtn}
                disabled={!draft.trim() || sending}
                onClick={() => void send()}
                aria-label="Send reply"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
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
          </>
        )}
      </div>

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
