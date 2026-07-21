"use client";

import styles from "./IntakeHeader.module.css";

interface IntakeHeaderProps {
  /** Progress fill, 0–100 */
  pct: number;
  /** Right-side step counter, e.g. "Step 2 of 3" or "1 of 4 photos" */
  counter: string;
  /** Called when the Back button is tapped */
  onBack: () => void;
  /** Called when the Close (✕) button is tapped */
  onClose: () => void;
  /** Top-left label — defaults to the brand name */
  label?: string;
}

/**
 * Shared intake progress header — brand label + live %, gradient bar,
 * a comfortable Back button, and a step counter. Matches the Impression
 * Photos header so every intake-flow screen reads as one system.
 */
export function IntakeHeader({ pct, counter, onBack, onClose, label = "Revived Smiles" }: IntakeHeaderProps) {
  return (
    <header className={styles.progressHeader}>
      <div className={styles.progressTop}>
        <span className={styles.progressLabel}>{label}</span>
        <div className={styles.progressTopRight}>
          <span className={styles.progressPct}>{pct}%</span>
          <button className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={counter}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.progressBottom}>
        <button className={styles.backBtn} aria-label="Go back" onClick={onBack}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <span className={styles.stepCount}>{counter}</span>
      </div>
    </header>
  );
}
