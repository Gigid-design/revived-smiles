"use client";

/* The flow's end states: routed to customer service, closed out after the
   hot-water reset, or successfully submitted. One layout, three messages. */

import styles from "../adjust.module.css";

interface MessageScreenProps {
  variant: "info" | "success";
  title: string;
  body: string;
  /** e.g. the adjustment request number on the submitted screen. */
  number?: string;
  /** Primary action (e.g. "Back to dashboard"). */
  ctaLabel: string;
  onCta: () => void;
  /** Optional secondary action (e.g. open the chat). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function Glyph({ variant }: { variant: "info" | "success" }) {
  if (variant === "success") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12.5L10 17.5L19 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function MessageScreen({
  variant,
  title,
  body,
  number,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: MessageScreenProps) {
  return (
    <>
      <div className={styles.messageScreen}>
        <span
          className={`${styles.messageIcon} ${
            variant === "success" ? styles.messageIconSuccess : styles.messageIconInfo
          }`}
        >
          <Glyph variant={variant} />
        </span>
        <h1 className={styles.messageTitle}>{title}</h1>
        <p className={styles.messageBody}>{body}</p>
        {number && <span className={styles.messageNumber}>Request {number}</span>}
      </div>

      <div className={styles.ctaWrap}>
        <button type="button" className={styles.cta} onClick={onCta}>
          {ctaLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" className={styles.secondaryBtn} onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </>
  );
}
