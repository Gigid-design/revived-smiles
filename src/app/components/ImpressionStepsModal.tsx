"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./ImpressionStepsModal.module.css";

interface ImpressionStepsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Written step-by-step guide shown when the user taps "Read steps".
 *  Renders over an iOS-style frosted-glass backdrop so the card reads clearly. */
const STEPS: { title: string; body: string }[] = [
  {
    title: "1. Prepare the impression putty",
    body: "Take one catalyst and one base putty. Mix them together thoroughly, following the timing in your printed guide or instructional video.",
  },
  {
    title: "2. Fill the tray",
    body: "Roll the mixed putty into an even shape and place it inside the tray. Spread it evenly from end to end.",
  },
  {
    title: "3. Take your impression",
    body: "Center the tray over your teeth, then press it firmly and evenly into place. Do not bite down or move the tray while the putty sets.",
  },
  {
    title: "4. Remove and check it",
    body: "Carefully remove the tray in one firm motion. Make sure the impression clearly captures your teeth, gumline, and the full shape of your mouth.",
  },
  {
    title: "5. Take clear photos",
    body: "Place the impression in bright, even lighting. Follow each on-screen example and photograph all required angles. Make sure the entire impression is visible, sharp, and not cropped.",
  },
  {
    title: "6. Submit for review",
    body: "Upload your photos and send them to the Revived Smiles team.",
  },
];

export function ImpressionStepsModal({ open, onClose }: ImpressionStepsModalProps) {
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

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="steps-modal-title"
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close steps">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="steps-modal-title" className={styles.title}>
          How To Take Your Impression
        </h2>

        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <p className={styles.stepTitle}>{step.title}</p>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body
  );
}
