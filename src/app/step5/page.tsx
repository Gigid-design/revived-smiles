"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import {
  DetailStop,
  getDetailStops,
  getOrderTotalSteps,
  nextFromStop,
  prevFromStop,
  productNeedsTeethChart,
} from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";
import { ToothChart } from "../components/ToothChart";
import { api } from "@/lib/api";

/**
 * The tooth-chart form for the whole order. Asked once — every appliance on the
 * order shares the same missing-teeth chart — so it reads from and writes to the
 * order's shared fields, not a single product's.
 */
function TeethForm({ stopIndex, stops }: { stopIndex: number; stops: DetailStop[] }) {
  const { data, saveSharedDetail } = useSubmission();
  const { cardRef, navigate } = usePageTransition();

  const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set(data.selectedTeeth ?? []));
  const [notSure, setNotSure] = useState(data.teethNotSure ?? false);
  const [notes, setNotes] = useState(data.notes ?? "");

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
        const total = getOrderTotalSteps(data.products);
        const current = Math.min(stopIndex + 2, total); // overview is step 1
        const pct = Math.min(100, Math.round((current / total) * 100));
        return (
          <IntakeHeader
            label="Your Details"
            pct={pct}
            counter={`Step ${current} of ${total}`}
            onBack={() => navigate(prevFromStop(stops, stopIndex), 'backward')}
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
          await saveSharedDetail(
            { selectedTeeth: [...selectedTeeth], teethNotSure: notSure, notes: notes.trim() || null },
            productNeedsTeethChart,
          );
          navigate(nextFromStop(stops, stopIndex), 'forward');
        }}
        >CONTINUE</button>
        <FlowSupport />
      </div>
    </main>
  );
}

/** Resolves which item this stop is for, loading the order if a refresh lost it. */
function Step5Loader() {
  const { data, update, ensureSubmissionId } = useSubmission();
  const searchParams = useSearchParams();
  const stopIndex = Math.max(0, parseInt(searchParams.get("stop") ?? "0", 10) || 0);

  useEffect(() => {
    if (data.products.length) return;
    let cancelled = false;
    (async () => {
      try {
        const id = await ensureSubmissionId();
        const s = await api.submissions.getById(id);
        if (!cancelled) update({ products: s.products, itemDetails: s.itemDetails ?? data.itemDetails });
      } catch (err) {
        console.error("Could not load your order:", err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const stops = useMemo(() => getDetailStops(data.products), [data.products]);

  if (!data.products.length) return <main className={styles.screen} />;
  return <TeethForm stopIndex={stopIndex} stops={stops} />;
}

export default function Step5Page() {
  return (
    <Suspense fallback={<main className={styles.screen} />}>
      <Step5Loader />
    </Suspense>
  );
}
