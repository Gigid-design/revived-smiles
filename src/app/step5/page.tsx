"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { getBackForTeethChart, getTotalSteps, getStepNumber } from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";
import { ToothChart } from "../components/ToothChart";

export default function Step5() {
  const { data, saveDraft } = useSubmission();
  const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set(data.selectedTeeth));
  const [notSure, setNotSure] = useState(data.teethNotSure);
  const [notes, setNotes] = useState(data.notes ?? "");
  const { cardRef, navigate } = usePageTransition();

  const NOTES_MAX = 300;

  function toggleTooth(num: number) {
    setNotSure(false);
    setSelectedTeeth(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  }

  function toggleNotSure() {
    setNotSure(prev => !prev);
    setSelectedTeeth(new Set());
  }

  const count = selectedTeeth.size;

  /* Read as sentences rather than as a template: the old one-liner produced
     "2 tooth teeth marked" for any count above one. */
  function summaryTitle(): string {
    if (notSure) return "Not sure";
    if (count === 0) return "No teeth selected";
    return `${count} ${count === 1 ? "tooth" : "teeth"} marked`;
  }

  function summarySubtitle(): string {
    if (notSure) return "We'll follow up with you";
    if (count === 0) return "Tap a tooth to mark it";
    return "Tap a tooth again to remove it";
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {(() => {
        const productId = data.products[0] || '';
        const total = getTotalSteps(productId);
        // Teeth chart is always the last step; guard against direct navigation
        // with no product selected (where the raw step number can exceed total).
        const current = Math.min(getStepNumber('teeth-chart', productId), total);
        const pct = Math.min(100, Math.round((current / total) * 100));
        return (
          <IntakeHeader
            label="Your Details"
            pct={pct}
            counter={`Step ${current} of ${total}`}
            onBack={() => navigate(getBackForTeethChart(productId), 'backward')}
            onClose={() => navigate('/dashboard', 'backward')}
          />
        );
      })()}

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Tooth Chart</h1>
        <p className={styles.cardSubtitle}>
          Select missing teeth you would like to replace.
        </p>

        {/* Selected summary */}
        <div className={styles.summary}>
          <div className={styles.summaryText}>
            <span className={styles.summaryTitle}>{summaryTitle()}</span>
            <span className={styles.summarySubtitle}>{summarySubtitle()}</span>
          </div>
        </div>

        {/* Tooth chart — mirrors the paper order form (two separate arches). */}
        <ToothChart selected={selectedTeeth} onToggle={toggleTooth} />

        <div className={styles.divider} />

        {/* I'm not sure */}
        <button type="button" className={`${styles.item} ${notSure ? styles.itemActive : ""}`} onClick={toggleNotSure} aria-pressed={notSure}>
          <span className={styles.itemLabel}>I&apos;m not sure</span>
          <span className={styles.itemCheck}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0H3C1.34961 0 0 1.3501 0 3V17C0 18.6499 1.34961 20 3 20H17C18.6504 20 20 18.6499 20 17V3C20 1.3501 18.6504 0 17 0ZM14.46 8.20996L9.45996 13.21C9.25977 13.3999 9.00977 13.5 8.75 13.5C8.49023 13.5 8.24023 13.3999 8.04004 13.21L5.54004 10.71C5.15039 10.3198 5.15039 9.68018 5.54004 9.29004C5.92969 8.8999 6.57031 8.8999 6.95996 9.29004L8.75 11.0898L13.04 6.79004C13.4297 6.3999 14.0703 6.3999 14.46 6.79004C14.8496 7.18018 14.8496 7.81982 14.46 8.20996Z"
                fill={notSure ? "#121723" : "#E8E8E4"} />
            </svg>
          </span>
        </button>

        {/* Optional free-text notes — captures the clarifications patients used
            to scribble on paper order forms (e.g. "only replace 2 of my 6"). */}
        <div className={styles.notes}>
          <label htmlFor="intake-notes" className={styles.notesLabel}>
            Anything else we should know? <span className={styles.notesOptional}>(optional)</span>
          </label>
          <textarea
            id="intake-notes"
            className={styles.notesInput}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
            maxLength={NOTES_MAX}
            rows={3}
            placeholder="e.g. I only want to replace 2 of my missing teeth, or a note about my order."
          />
          <span className={styles.notesCount}>{notes.length}/{NOTES_MAX}</span>
        </div>

      </div>

      <div className={styles.buttonWrapper}>
        <button type="button" className={`${styles.btn} ${styles.btnActive}`}
          onClick={async () => {
          await saveDraft({ selectedTeeth: [...selectedTeeth], teethNotSure: notSure, notes: notes.trim() || null });
          navigate('/photo-intro', 'forward');
        }}
        >CONTINUE</button>
        <FlowSupport />
      </div>
    </main>
  );
}
