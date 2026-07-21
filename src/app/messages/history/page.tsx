"use client";

import Link from "next/link";
import styles from "../messages.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { useMessages, Thread, RequestStatus } from "@/app/context/MessagesContext";

/** Past messages — every question and every supplies request is its own thread. */

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

function lastLine(thread: Thread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "";
  return `${last.role === "care" ? "Care team: " : "You: "}${last.body}`;
}

export default function MessageHistory() {
  const { threads, unreadCount, ready } = useMessages();

  const STATUS_CLASS: Record<RequestStatus, string> = {
    pending: styles.statusPending,
    accepted: styles.statusAccepted,
    rejected: styles.statusRejected,
  };

  /* Newest activity first */
  const sorted = [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        <div className={styles.topBar}>
          <Link href="/messages" className={styles.backBtn}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.5 15L7.5 10L12.5 5" />
            </svg>
            New message
          </Link>
        </div>

        <h1 className={styles.heading}>Past messages</h1>

        {!ready ? (
          /* Threads restore from storage on the client — hold the frame until then */
          <div className={styles.emptyCard} aria-busy="true" />
        ) : sorted.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 4h14v10H5.5L3 16.5V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>No messages yet</p>
            <p className={styles.emptyBody}>
              When you ask a question or request materials, the conversation will show up here.
            </p>
            <Link href="/messages" className={styles.emptyAction}>Start a message</Link>
          </div>
        ) : (
          <ul className={styles.threadList}>
            {sorted.map((thread) => (
              <li key={thread.id} className={styles.threadItem}>
                <Link href={`/messages/${thread.id}`} className={styles.threadLink}>
                  <div className={styles.threadHead}>
                    <h2 className={styles.threadSubject}>{thread.subject}</h2>
                    {thread.request && (
                      <span className={`${styles.statusBadge} ${STATUS_CLASS[thread.request.status]}`}>
                        {STATUS_COPY[thread.request.status]}
                      </span>
                    )}
                  </div>

                  <p className={styles.threadPreview}>{lastLine(thread)}</p>

                  <div className={styles.threadFoot}>
                    {thread.unread && <span className={styles.unreadDot} aria-label="Unread reply" />}
                    <span className={styles.threadTime}>{formatWhen(thread.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
