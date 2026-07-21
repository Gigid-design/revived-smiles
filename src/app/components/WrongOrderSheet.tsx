"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import styles from "./WrongOrderSheet.module.css";
import { PRODUCTS, productLabel } from "../context/productConfig";

interface WrongOrderSheetProps {
  open: boolean;
  /** The product slug currently on the order, so it isn't offered as the fix. */
  currentProduct: string;
  onClose: () => void;
  /** Raises the flag. `detail` names what she believes she ordered. */
  onFlag: (detail: string, note: string) => Promise<void>;
}

/** Offered when nothing in the catalogue matches what she remembers buying. */
const SOMETHING_ELSE = "Something else";

/**
 * Reports that the product carried over from the Shopify order is wrong.
 *
 * Deliberately not a product picker that writes to the order. The order is
 * what she paid for and what the lab builds, so this sends a flag to the care
 * team and leaves the record alone — the team resolves it. Anyone who would
 * rather just talk to a person can skip the form entirely.
 */
export function WrongOrderSheet({ open, currentProduct, onClose, onFlag }: WrongOrderSheetProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Closing clears the form, so reopening starts clean rather than showing
     the last attempt. The sheet stays mounted, so nothing resets on its own. */
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

  const options = [...PRODUCTS.filter((p) => p.id !== currentProduct).map((p) => p.label), SOMETHING_ELSE];

  /* "Something else" tells the team nothing on its own, so it needs the note. */
  const valid = choice !== null && (choice !== SOMETHING_ELSE || note.trim().length > 0);

  async function submit() {
    if (!valid || sending || !choice) return;
    setSending(true);
    setError(null);
    try {
      await onFlag(choice === SOMETHING_ELSE ? "" : `Should be: ${choice}`, note.trim());
      close();
    } catch (err) {
      console.error("Could not flag the order:", err);
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
      aria-labelledby="wrong-order-title"
    >
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={close} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="wrong-order-title" className={styles.title}>What did you order?</h2>
        <p className={styles.blurb}>
          Your order says <strong>{productLabel(currentProduct)}</strong>. Tell us what it should be
          and your care team will check it against your receipt — you don&apos;t need to change
          anything yourself.
        </p>

        <div className={styles.optionList} role="radiogroup" aria-label="What you ordered">
          {options.map((label) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={choice === label}
              className={`${styles.option} ${choice === label ? styles.optionSelected : ""}`}
              onClick={() => setChoice(label)}
            >
              <span className={styles.optionRadio} aria-hidden />
              <span className={styles.optionLabel}>{label}</span>
            </button>
          ))}
        </div>

        <label className={styles.fieldLabel} htmlFor="wrong-order-note">
          {choice === SOMETHING_ELSE ? "What did you order?" : "Anything else?"}
          {choice !== SOMETHING_ELSE && <span className={styles.optional}>optional</span>}
        </label>
        <textarea
          id="wrong-order-note"
          className={styles.note}
          rows={2}
          placeholder={
            choice === SOMETHING_ELSE
              ? "Tell us what you ordered…"
              : "Anything that would help us check…"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className={styles.error} role="alert">{error}</p>}

        <button
          type="button"
          className={`${styles.submitBtn} ${!valid || sending ? styles.submitBtnDisabled : ""}`}
          disabled={!valid || sending}
          onClick={() => void submit()}
        >
          {sending ? "Sending…" : "TELL THE TEAM"}
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
