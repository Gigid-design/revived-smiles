"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./messages.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { ChatDocuments } from "@/app/components/ChatDocuments";
import { OrderSwitcher } from "@/app/components/OrderSwitcher";
import { useInsurance } from "@/app/hooks/useInsurance";
import {
  useMessages,
  CARE_NAME,
  REQUEST_LABELS,
  TRAY_REASONS,
  type ChatMessage,
  type RequestKind,
  type RequestStatus,
} from "@/app/context/MessagesContext";

/**
 * Messages — one conversation with the care team.
 *
 * Replaces the old thread list. Patients think in conversations, not folders,
 * and the care team writes into this same conversation, so a reply reaches
 * her here. Supplies requests are messages with a status attached rather than
 * a separate place to check.
 */

const STATUS_COPY: Record<RequestStatus, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

/* Fast paths, kept from the old "New message" screen. */
const QUICK_PROMPTS = [
  "Where is my order?",
];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 2880) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The note the patient typed, which follows the headline in the body. */
function noteFrom(body: string): string {
  const [, ...rest] = body.split("\n\n");
  return rest.join("\n\n").trim();
}

export default function Messages() {
  const {
    messages,
    ready,
    unreadCount,
    orders,
    activeOrderId,
    setActiveOrder,
    send,
    sendRequest,
    markRead,
  } = useMessages();

  const { canClaim } = useInsurance();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  /* Opening the conversation clears the care team's unread replies. */
  useEffect(() => {
    if (unreadCount > 0) void markRead();
  }, [unreadCount, markRead]);

  /* The conversation is its own scroll container now, so "go to the bottom"
     is a property of that element rather than of the document — which is why
     scrolling the page never reached the newest message. Instant on open,
     smooth for messages that arrive afterwards. */
  useEffect(() => {
    if (!ready) return;
    const list = listRef.current;
    if (!list) return;

    const frame = requestAnimationFrame(() => {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: hasScrolled.current ? "smooth" : "auto",
      });
      hasScrolled.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [ready, messages.length]);

  async function submitDraft(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await send(body);
    } catch (err) {
      console.error("Could not send your message:", err);
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  function openForm(presetKind: RequestKind = "material") {
    setFormOpen(true);
    setKind(presetKind);
    setReason("");
    setNote("");
  }

  /* Tray requests need a reason; material requests don't. */
  const formValid = kind === "material" || (kind === "trays" && !!reason);

  async function submitRequest() {
    if (!kind || !formValid || sending) return;
    setSending(true);
    try {
      await sendRequest(kind, kind === "trays" ? reason : "", note.trim());
      setFormOpen(false);
    } catch (err) {
      console.error("Could not send the request:", err);
    } finally {
      setSending(false);
    }
  }

  function renderMessage(msg: ChatMessage) {
    const isOwn = msg.senderRole === "patient";

    /* A supplies request renders as a status card rather than a plain bubble,
       so its outcome sits on the thing she actually asked for. */
    if (msg.request) {
      const { kind: reqKind, detail, status, outcome, trackingNumber } = msg.request;
      const typed = noteFrom(msg.body);

      return (
        <div key={msg.id} className={`${styles.bubbleWrap} ${styles.bubbleOwnWrap}`}>
          <div className={styles.requestCard}>
            <div className={styles.requestHead}>
              <span className={styles.requestKind}>{REQUEST_LABELS[reqKind]}</span>
              <span className={`${styles.statusBadge} ${styles[`status${status[0].toUpperCase()}${status.slice(1)}`]}`}>
                {STATUS_COPY[status]}
              </span>
            </div>

            {detail && <p className={styles.requestDetail}>{detail}</p>}
            {typed && <p className={styles.note}>{typed}</p>}

            {status === "accepted" && (
              <>
                <div className={styles.outcomeRow}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5L9.5 18L20 6.5" />
                  </svg>
                  <span>{outcome}</span>
                </div>
                {trackingNumber && (
                  <Link href="/my-order" className={styles.trackLink}>
                    Track in My Order →
                  </Link>
                )}
              </>
            )}

            {status === "rejected" && (
              <p className={styles.rejectedNote}>Your care team has explained why below.</p>
            )}
          </div>
          <div className={styles.timestamp}>{formatWhen(msg.createdAt)}</div>
        </div>
      );
    }

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
        {msg.documents && <ChatDocuments submissionId={msg.submissionId} documents={msg.documents} />}
        <div className={styles.timestamp}>{formatWhen(msg.createdAt)}</div>
      </div>
    );
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        <div className={styles.topBar}>
          <h1 className={styles.heading}>Messages</h1>
        </div>

        {/* Which order this conversation is about — the same switcher the order
            screen uses, rather than a second answer to the same question. Was
            a row of chips (Aug 24); three orders filled the row and a fourth
            wrapped, and a patient had two controls to learn instead of one. */}
        {orders.length > 0 && (
          <div className={styles.orderPicker}>
            <OrderSwitcher
              orders={orders}
              selectedId={activeOrderId ?? orders[0].id}
              onSelect={setActiveOrder}
              framed
            />
          </div>
        )}

        {/* The one scrolling region — loading, empty and full states all live
            inside it so the composer below never moves. */}
        <div className={styles.messageList} ref={listRef}>
          {!ready ? (
            <div className={styles.emptyCard} aria-busy="true" />
          ) : messages.length === 0 ? (
            <div className={styles.emptyCard}>
              <p className={styles.emptyTitle}>No messages yet</p>
              <p className={styles.emptyBody}>
                Ask us anything about your impressions or your order — we usually reply the same day.
              </p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
        </div>

        {/* ── Docked: prompts and composer rest just above the nav pill ── */}
        <div className={styles.dock}>
        {formOpen ? (
          <div className={styles.requestForm}>
            <div className={styles.requestFormHead}>
              <span className={styles.requestFormTitle}>
                {kind === "trays" ? "Request trays" : "Request materials"}
              </span>
              <button type="button" className={styles.cancelBtn} onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>

            {kind === "trays" && (
              <>
                <span className={styles.fieldLabel}>What&apos;s wrong with them?</span>
                <div className={styles.chipRow}>
                  {TRAY_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`${styles.chip} ${reason === r ? styles.chipSelected : ""}`}
                      aria-pressed={reason === r}
                      onClick={() => setReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}

            <span className={styles.fieldLabel}>
              Anything else? <span className={styles.optional}>optional</span>
            </span>
            <textarea
              className={styles.note}
              rows={2}
              placeholder="Tell us a bit more…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              type="button"
              className={`${styles.submitBtn} ${!formValid || sending ? styles.submitBtnDisabled : ""}`}
              disabled={!formValid || sending}
              onClick={() => void submitRequest()}
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        ) : (
          /* ── Fast paths, always within reach above the composer ── */
          <div className={styles.chipRow}>
            {QUICK_PROMPTS.map((text) => (
              <button
                key={text}
                type="button"
                className={styles.chip}
                disabled={sending}
                onClick={() => void submitDraft(text)}
              >
                {text}
              </button>
            ))}
            <button type="button" className={styles.chip} onClick={() => openForm("material")}>
              Need more materials?
            </button>
            <button type="button" className={styles.chip} onClick={() => openForm("trays")}>
              Need different sized trays?
            </button>
            <Link href="/adjust" className={styles.chip}>
              Need to adjust my appliance
            </Link>
            {canClaim && (
              <Link href="/insurance-claim" className={styles.chip}>
                File a protection claim
              </Link>
            )}
          </div>
        )}

        {/* ── Composer ── */}
        <div className={styles.composer}>
          <textarea
            className={styles.composerInput}
            placeholder="Message your care team…"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitDraft(draft);
              }
            }}
          />
          <button
            type="button"
            className={styles.sendBtn}
            aria-label="Send message"
            disabled={!draft.trim() || sending}
            onClick={() => void submitDraft(draft)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        </div>
      </div>

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
