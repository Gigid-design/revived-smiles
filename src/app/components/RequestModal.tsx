"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./RequestModal.module.css";
import { useRequests, RequestKind, REQUEST_LABELS } from "../context/RequestsContext";

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
}

/** Short form for requesting supplies from support (more impression material or
 *  a different tray size). Submitting raises a request that support accepts or
 *  rejects; the customer tracks the outcome in My Order. */

const KINDS: { kind: RequestKind; blurb: string }[] = [
  { kind: "material", blurb: "Ran out, or your putty set before you finished." },
  { kind: "trays", blurb: "The trays you received don't fit comfortably." },
];

const TRAY_REASONS = ["Trays too big", "Trays too small"];

export function RequestModal({ open, onClose }: RequestModalProps) {
  const { addRequest } = useRequests();
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  /* Reset the form each time the modal opens */
  useEffect(() => {
    if (!open) return;
    setKind(null); // eslint-disable-line react-hooks/set-state-in-effect -- resetting form on open
    setReason("");
    setNote("");
    setDone(false);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  /* Tray requests need a reason; material requests don't. */
  const valid = kind === "material" || (kind === "trays" && !!reason);

  function handleSubmit() {
    if (!kind || !valid) return;
    addRequest(kind, kind === "trays" ? reason : "", note.trim());
    setDone(true);
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-modal-title"
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close request form">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {done ? (
          /* ── Confirmation ── */
          <div className={styles.doneState}>
            <div className={styles.doneIcon} aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5L9.5 18L20 6.5" />
              </svg>
            </div>
            <h2 id="request-modal-title" className={styles.doneTitle}>Request sent</h2>
            <p className={styles.doneBody}>
              Your care team will review this and let you know. You can track it in{" "}
              <strong>My Order</strong>.
            </p>
            <button type="button" className={styles.submitBtn} onClick={onClose}>
              DONE
            </button>
          </div>
        ) : (
          <>
            <h2 id="request-modal-title" className={styles.title}>Request materials</h2>
            <p className={styles.subtitle}>
              Tell us what you need and we&apos;ll get it out to you.
            </p>

            {/* What do you need? */}
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

            {/* Tray size needs a reason */}
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

            {/* Optional note */}
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
              className={`${styles.submitBtn} ${valid ? "" : styles.submitBtnDisabled}`}
              disabled={!valid}
              onClick={handleSubmit}
            >
              SEND REQUEST
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
