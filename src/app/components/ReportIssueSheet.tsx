"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

import styles from "./WrongOrderSheet.module.css";

/** The three things that can go wrong once an order has shipped. */
type IssueId = "not-received" | "damaged" | "adjustment";

const OPTIONS: { id: IssueId; label: string }[] = [
  { id: "not-received", label: "I didn't receive my shipment" },
  { id: "damaged", label: "My shipment arrived damaged" },
  { id: "adjustment", label: "I need an adjustment" },
];

interface ReportIssueSheetProps {
  open: boolean;
  /** The order the issue is about; used to deep-link the adjustment flow. */
  orderId: string;
  onClose: () => void;
  /** Files a not-received / damaged report with the care team. */
  onReport: (kind: "not-received" | "damaged", note: string, photos?: string[]) => Promise<void>;
}

/**
 * Reports a problem with a shipped/delivered order.
 *
 * "Didn't receive" and "arrived damaged" send a flag to the care team with the
 * patient's explanation. "I need an adjustment" is its own multi-screen flow,
 * so that option hands off to /adjust rather than posting a message.
 */
export function ReportIssueSheet({ open, orderId, onClose, onReport }: ReportIssueSheetProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<IssueId | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Damaged-shipment reports must carry a photo of the damage (Aug 21 client
     review) — the team can't action "it arrived damaged" without seeing it. */
  const [photo, setPhoto] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const close = useCallback(() => {
    setChoice(null);
    setNote("");
    setError(null);
    setSending(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const needsNote = choice === "not-received" || choice === "damaged";
  const needsPhoto = choice === "damaged";
  /* The report options need an explanation; damage also needs a photo; the
     adjustment option just links on. */
  const valid =
    choice === "adjustment" ||
    (needsNote && note.trim().length > 0 && (!needsPhoto || !!photo));

  async function attachPhoto(file?: File) {
    setUploading(true);
    setError(null);
    try {
      const stored = api.photos.usesStandInPhotos || !file
        ? await api.photos.standInPhoto("issue")
        : await api.photos.upload(file, "issue");
      setPhoto({ url: stored.url, preview: file ? URL.createObjectURL(file) : stored.url });
    } catch (err) {
      console.error("Could not attach the photo:", err);
      setError("We couldn't attach that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!valid || sending || !choice) return;
    if (choice === "adjustment") {
      close();
      router.push(`/adjust?order=${orderId}`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onReport(choice, note.trim(), photo ? [photo.url] : undefined);
      close();
    } catch (err) {
      console.error("Could not report the issue:", err);
      setError("We couldn't send that just now. Try again, or message your care team.");
      setSending(false);
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
    >
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={close} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="report-issue-title" className={styles.title}>What&apos;s the problem?</h2>
        <p className={styles.blurb}>
          Tell us what happened with this order and your care team will take it from here.
        </p>

        <div className={styles.optionList} role="radiogroup" aria-label="What's the problem">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={choice === opt.id}
              className={`${styles.option} ${choice === opt.id ? styles.optionSelected : ""}`}
              onClick={() => setChoice(opt.id)}
            >
              <span className={styles.optionRadio} aria-hidden />
              <span className={styles.optionLabel}>{opt.label}</span>
            </button>
          ))}
        </div>

        {needsNote && (
          <>
            <label className={styles.fieldLabel} htmlFor="report-issue-note">
              Please explain
            </label>
            <textarea
              id="report-issue-note"
              className={styles.note}
              rows={3}
              placeholder={
                choice === "not-received"
                  ? "Tell us what you expected and when…"
                  : "Tell us what arrived damaged…"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {needsPhoto && (
              <div className={styles.photoField}>
                <span className={styles.fieldLabel}>Photo of the damage <em className={styles.required}>required</em></span>
                {photo ? (
                  <div className={styles.photoPreviewRow}>
                    <img src={photo.preview} alt="Damage" className={styles.photoPreview} />
                    <button type="button" className={styles.photoRemove} onClick={() => setPhoto(null)}>Remove</button>
                  </div>
                ) : (
                  <label className={styles.photoBtn}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className={styles.hiddenInput}
                      onChange={(e) => { void attachPhoto(e.target.files?.[0]); }}
                      disabled={uploading}
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    {uploading ? "Attaching…" : "Add a photo"}
                  </label>
                )}
              </div>
            )}
          </>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button
          type="button"
          className={`${styles.submitBtn} ${!valid || sending ? styles.submitBtnDisabled : ""}`}
          disabled={!valid || sending}
          onClick={() => void submit()}
        >
          {sending
            ? "Sending…"
            : choice === "adjustment"
              ? "CONTINUE"
              : "TELL THE TEAM"}
        </button>

        <button
          type="button"
          className={styles.supportLink}
          onClick={() => router.push("/messages")}
        >
          Or message support instead
        </button>
      </div>
    </div>,
    document.body,
  );
}
