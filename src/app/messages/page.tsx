"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./messages.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { ToothChart } from "@/app/components/ToothChart";
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
  "How do I take my impressions?",
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
    send,
    sendRequest,
    markRead,
    setRequestStatus,
  } = useMessages();

  const { canClaim } = useInsurance();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPhotos, setAdjustPhotos] = useState<string[]>([]);
  const [markedTeeth, setMarkedTeeth] = useState<Set<number>>(new Set());
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const adjustFileRef = useRef<HTMLInputElement>(null);
  const hasScrolled = useRef(false);

  /* Opening the conversation clears the care team's unread replies. */
  useEffect(() => {
    if (unreadCount > 0) void markRead();
  }, [unreadCount, markRead]);

  /* Deep link: /messages?compose=material|trays|adjust opens that form on
     arrival — used by the in-flow Care Team drawer's shortcut bubbles, which
     route here because those forms (photos, tooth chart) need the full page. */
  useEffect(() => {
    const compose = new URLSearchParams(window.location.search).get("compose");
    if (compose === "adjust") openAdjust();
    else if (compose === "material" || compose === "trays") openForm(compose);
    // Runs once on mount; openForm/openAdjust are stable declarations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setAdjustOpen(false);
    setFormOpen(true);
    setKind(presetKind);
    setReason("");
    setNote("");
  }

  function openAdjust() {
    setFormOpen(false);
    setAdjustOpen(true);
    setNote("");
    setAdjustPhotos([]);
    setMarkedTeeth(new Set());
  }

  function toggleMarked(num: number) {
    setMarkedTeeth((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  function addAdjustPhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setAdjustPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  /* An appliance-adjustment request is a plain message summarising what the
     patient gathered (photos + marked teeth + description), not a supplies
     request — the chat has no attachment model yet. */
  async function submitAdjust() {
    const desc = note.trim();
    if (!desc || sending) return;
    setSending(true);
    try {
      const teeth = [...markedTeeth].sort((a, b) => a - b);
      await send(
        `I need to adjust my appliance.\n\n${desc}\n\n` +
          `Uncomfortable teeth: ${teeth.length ? teeth.join(", ") : "none marked"}.\n` +
          `Photos ready to share: ${adjustPhotos.length}.`
      );
      setAdjustOpen(false);
      setNote("");
      setAdjustPhotos([]);
      setMarkedTeeth(new Set());
    } catch (err) {
      console.error("Could not send the request:", err);
    }
    setSending(false);
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

            {/* Stands in for the support console until an admin decides these
                — see MessagesApi.setRequestStatus. */}
            {status === "pending" && (
              <div className={styles.simulateRow}>
                <span className={styles.simulateLabel}>Preview:</span>
                <button type="button" className={styles.simulateBtn} onClick={() => void setRequestStatus(msg.id, "accepted")}>
                  Accept
                </button>
                <button type="button" className={styles.simulateBtn} onClick={() => void setRequestStatus(msg.id, "rejected")}>
                  Decline
                </button>
              </div>
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
        {adjustOpen ? (
          <div className={`${styles.requestForm} ${styles.adjustForm}`}>
            <div className={styles.requestFormHead}>
              <span className={styles.requestFormTitle}>Adjust my appliance</span>
              <button type="button" className={styles.cancelBtn} onClick={() => setAdjustOpen(false)}>
                Cancel
              </button>
            </div>

            <span className={styles.fieldLabel}>Please include all of the following:</span>
            <ul className={styles.checklist}>
              <li>Photos of the partial denture in your mouth</li>
              <li>Photos of the partial denture on the models we sent you</li>
              <li>Mark any uncomfortable areas on the chart below (if applicable)</li>
              <li>A detailed description of the issue</li>
            </ul>

            {/* Photos */}
            <span className={styles.fieldLabel}>Photos</span>
            <input
              ref={adjustFileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { addAdjustPhotos(e.target.files); e.target.value = ""; }}
            />
            <div className={styles.photoGrid}>
              {adjustPhotos.map((src, i) => (
                <div key={i} className={styles.photoTile}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Adjustment photo ${i + 1}`} />
                  <button
                    type="button"
                    className={styles.photoRemove}
                    aria-label="Remove photo"
                    onClick={() => setAdjustPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className={styles.photoAdd} onClick={() => adjustFileRef.current?.click()}>
                <span aria-hidden="true">＋</span>
                Add photos
              </button>
            </div>

            {/* Mark discomfort */}
            <span className={styles.fieldLabel}>
              Mark uncomfortable areas <span className={styles.optional}>if applicable</span>
            </span>
            <ToothChart selected={markedTeeth} onToggle={toggleMarked} />

            {/* Description */}
            <span className={styles.fieldLabel}>Describe the issue</span>
            <textarea
              className={styles.note}
              rows={3}
              placeholder="Tell us what's uncomfortable or not fitting right…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              type="button"
              className={`${styles.submitBtn} ${!note.trim() || sending ? styles.submitBtnDisabled : ""}`}
              disabled={!note.trim() || sending}
              onClick={() => void submitAdjust()}
            >
              {sending ? "Sending…" : "Send to care team"}
            </button>
          </div>
        ) : formOpen ? (
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
              Materials
            </button>
            <button type="button" className={styles.chip} onClick={() => openForm("trays")}>
              Trays
            </button>
            <button type="button" className={styles.chip} onClick={openAdjust}>
              Need to adjust my appliance
            </button>
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
