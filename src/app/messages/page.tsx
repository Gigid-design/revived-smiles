"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./messages.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { useMessages, RequestKind, REQUEST_LABELS } from "@/app/context/MessagesContext";

/** New message — the Messages tab opens here. Template questions and the
 *  request form are the fast paths; free text is always available. Past
 *  conversations live one tap away under "Past messages". */

const QUICK_PROMPTS = [
  "What's the latest?",
  "Where is my order?",
  "How do I take my impressions?",
];

const KINDS: { kind: RequestKind; blurb: string }[] = [
  { kind: "material", blurb: "Ran out, or your putty set before you finished." },
  { kind: "trays", blurb: "The trays you received don't fit comfortably." },
];

const TRAY_REASONS = ["Trays too big", "Trays too small"];

export default function NewMessage() {
  const router = useRouter();
  const { threads, unreadCount, startQuestion, startRequest } = useMessages();

  const [draft, setDraft] = useState("");
  /* The request form expands inline on this screen — no modal over a modal. */
  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function ask(text: string) {
    const id = startQuestion(text);
    router.push(`/messages/${id}`);
  }

  function openForm() {
    setFormOpen(true);
    setKind(null);
    setReason("");
    setNote("");
  }

  /* Tray requests need a reason; material requests don't. */
  const formValid = kind === "material" || (kind === "trays" && !!reason);

  function submitRequest() {
    if (!kind || !formValid) return;
    const id = startRequest(kind, kind === "trays" ? reason : "", note.trim());
    router.push(`/messages/${id}`);
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <h1 className={styles.heading}>New message</h1>
          {threads.length > 0 && (
            <Link href="/messages/history" className={styles.pastLink}>
              Past messages
              {unreadCount > 0 && <span className={styles.pastLinkBadge}>{unreadCount}</span>}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>

        <p className={styles.subheading}>
          Your care team typically replies within a few hours.
        </p>

        {/* ── Template questions ── */}
        <p className={styles.sectionLabel}>What can we help with?</p>
        <div className={styles.promptList}>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={styles.promptBtn}
              onClick={() => ask(prompt)}
            >
              {prompt}
              <svg className={styles.promptArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* ── Request materials — inline form ── */}
        <p className={styles.sectionLabel}>Need something sent to you?</p>

        {!formOpen ? (
          <button type="button" className={styles.requestBtn} onClick={openForm}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Request materials
          </button>
        ) : (
          <div className={styles.requestForm}>
            <div className={styles.requestFormHead}>
              <h2 className={styles.requestFormTitle}>Request materials</h2>
              <button type="button" className={styles.cancelBtn} onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>

            <p className={styles.fieldLabel}>What do you need?</p>
            <div className={styles.optionList}>
              {KINDS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  className={`${styles.option} ${kind === opt.kind ? styles.optionSelected : ""}`}
                  onClick={() => { setKind(opt.kind); setReason(""); }}
                  aria-pressed={kind === opt.kind}
                >
                  <span className={styles.optionRadio} aria-hidden="true" />
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>{REQUEST_LABELS[opt.kind]}</span>
                    <span className={styles.optionBlurb}>{opt.blurb}</span>
                  </span>
                </button>
              ))}
            </div>

            {kind === "trays" && (
              <>
                <p className={styles.fieldLabel}>What&apos;s wrong with the fit?</p>
                <div className={styles.chipRow}>
                  {TRAY_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`${styles.chip} ${reason === r ? styles.chipSelected : ""}`}
                      onClick={() => setReason(r)}
                      aria-pressed={reason === r}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className={styles.fieldLabel} htmlFor="request-note">
              Anything else? <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="request-note"
              className={styles.note}
              rows={3}
              placeholder="Add any detail that would help us…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              type="button"
              className={`${styles.submitBtn} ${formValid ? "" : styles.submitBtnDisabled}`}
              disabled={!formValid}
              onClick={submitRequest}
            >
              SEND REQUEST
            </button>
          </div>
        )}

        {/* ── Free text ── */}
        <p className={styles.sectionLabel}>Or write your own</p>
        <div className={styles.composer}>
          <textarea
            className={styles.composerInput}
            placeholder="Type your message…"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) ask(draft);
              }
            }}
          />
          <button
            type="button"
            className={styles.sendBtn}
            disabled={!draft.trim()}
            onClick={() => draft.trim() && ask(draft)}
            aria-label="Send message"
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
      </div>

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
