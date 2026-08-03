"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HOT_WATER } from "../context/adjustmentConfig";
import styles from "./HowToModal.module.css";

interface HowToModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The "How do I do this?" pop-up for the hot-water activation, shared by the
 * sore-spots and fit steps. The spec calls for a GIF showing the process plus
 * written steps; the GIF slot falls back to a still until the asset is dropped
 * in at /assets/images/hot-water-activation.gif.
 */
const STEPS = [
  "Boil a kettle or pot of water, then let it stop bubbling.",
  "Place your appliance in the hot water for 30 seconds.",
  "Lift it out and let it cool to a comfortable temperature.",
  "Seat it in your mouth so it conforms to your gums.",
];

export function HowToModal({ open, onClose }: HowToModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="How to complete the hot water activation"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.close} aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h2 className={styles.title}>Hot water activation</h2>

        <div className={styles.media} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/hot-water-activation.gif"
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className={styles.mediaFallback}>Demonstration</span>
        </div>

        <p className={styles.intro}>{HOT_WATER.instructions}</p>

        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        <button className={styles.done} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
