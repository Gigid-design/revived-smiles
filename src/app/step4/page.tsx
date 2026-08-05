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
  productNeedsShade,
} from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";
import { api } from "@/lib/api";

interface Shade {
  id: string;
  label: string;
  color: string;
  /** What the user sees, when it differs from the stored `id` (gum drops "G"). */
  code?: string;
  /** Rendered as transparency rather than a colour — see `.chipClear`. */
  clear?: boolean;
}

/* ── Tooth shade swatches — the VITA A range, lightest to darkest ──
   The previous three sat within one or two values of each other
   (#f8f6f3 / #f7f6f3 / #f1f1f0), so the picker showed no visible difference
   between the options it was asking her to choose between. */
const WHITE_SHADES: Shade[] = [
  { id: "A1",   label: "Very Light",  color: "#f2ede3" },
  { id: "A2",   label: "Light",       color: "#eae0ce" },
  { id: "A3",   label: "Medium",      color: "#ddcdb2" },
  { id: "A3.5", label: "Med-Dark",    color: "#d3c0a2" },
  { id: "A4",   label: "Dark",        color: "#c9b392" },
];

/* ── Gum shade swatches ──
   Clear isn't a point on the light-to-dark scale — it's the translucent
   material used where no gum colour should show — so it gets its own
   treatment rather than a colour chip. */
const GUM_SHADES: Shade[] = [
  { id: "G2", code: "1", label: "Pink",  color: "#e39c9c" },
  { id: "G1", code: "2", label: "Dark",  color: "#8f5350" },
  { id: "G3", code: "3", label: "Clear", color: "transparent", clear: true },
];

/**
 * The fill for a swatch or preview chip.
 *
 * A clear shade has no colour to paint, so it returns nothing and the caller
 * applies `.chipClear` instead. Both the previews and the swatch rows need
 * that rule, so it lives in one place.
 */
function swatchStyle(shade: Shade | undefined, tinted: boolean) {
  if (shade?.clear) return undefined;
  const colour = shade?.color ?? "#f0ede9";
  return {
    background: tinted
      ? `linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.5)), ${colour}`
      : colour,
  };
}

/** The extra class a clear shade needs, or nothing. */
function clearClass(shade: Shade | undefined, css: string): string {
  return shade?.clear ? ` ${css}` : "";
}

/**
 * The shade form for the whole order. Asked once — every appliance on the order
 * shares the same shade — so it reads from and writes to the order's shared
 * fields, not a single product's.
 */
function ShadeForm({ stopIndex, stops }: { stopIndex: number; stops: DetailStop[] }) {
  const { data, saveSharedDetail } = useSubmission();
  const [whiteShade, setWhiteShade] = useState<string | null>(data.whiteShade ?? null);
  const [gumShade,   setGumShade]   = useState<string | null>(data.gumShade ?? null);
  const { cardRef, navigate } = usePageTransition();

  const selectedWhite = WHITE_SHADES.find(s => s.id === whiteShade);
  const selectedGum   = GUM_SHADES.find(s => s.id === gumShade);

  const total = getOrderTotalSteps(data.products);
  const current = Math.min(stopIndex + 2, total); // overview is step 1

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={Math.min(100, Math.round((current / total) * 100))}
        counter={`Step ${current} of ${total}`}
        onBack={() => navigate(prevFromStop(stops, stopIndex), 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Tooth &amp; Gum shade</h1>
        <p className={styles.disclaimer}>
          Colors shown here are a guide only. Please refer to your order form for the
          accurate coloring and confirm your selection matches it.
        </p>

        {/* Live preview — White */}
        <div className={styles.preview} aria-label="Selected white shade preview">
          <div
            className={`${styles.previewSwatch}${clearClass(selectedWhite, styles.chipClear)}`}
            style={swatchStyle(selectedWhite, true)}
          />
          <div className={styles.previewText}>
            <span className={styles.previewCode}>{selectedWhite?.id ?? "—"}</span>
            <span className={styles.previewLabel}>{selectedWhite?.label ?? "—"}</span>
          </div>
        </div>

        {/* WHITE SHADE */}
        <p className={styles.sectionLabel}>White Shade</p>
        <div className={styles.swatchRow} role="radiogroup" aria-label="White shade">
          {WHITE_SHADES.map((shade) => {
            const active = whiteShade === shade.id;
            return (
              <button
                key={shade.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.swatchCard} ${active ? styles.swatchCardActive : ""}`}
                onClick={() => setWhiteShade(shade.id)}
              >
                <span
                  className={`${styles.swatchChip}${clearClass(shade, styles.chipClear)}`}
                  style={swatchStyle(shade, false)}
                />
                <span className={styles.swatchCode}>{shade.code ?? shade.id}</span>
                <span className={styles.swatchName}>{shade.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className={styles.divider} aria-hidden="true" />

        {/* Live preview — Gum */}
        <div className={styles.preview} aria-label="Selected gum shade preview">
          <div
            className={`${styles.previewSwatch}${clearClass(selectedGum, styles.chipClear)}`}
            style={swatchStyle(selectedGum, true)}
          />
          <div className={styles.previewText}>
            <span className={styles.previewCode}>{selectedGum?.code ?? selectedGum?.id ?? "—"}</span>
            <span className={styles.previewLabel}>{selectedGum?.label ?? "—"}</span>
          </div>
        </div>

        {/* GUM SHADE */}
        <p className={styles.sectionLabel}>Gum Shade</p>
        <div className={styles.swatchRow} role="radiogroup" aria-label="Gum shade">
          {GUM_SHADES.map((shade) => {
            const active = gumShade === shade.id;
            return (
              <button
                key={shade.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.swatchCard} ${active ? styles.swatchCardActive : ""}`}
                onClick={() => setGumShade(shade.id)}
              >
                <span
                  className={`${styles.swatchChip}${clearClass(shade, styles.chipClear)}`}
                  style={swatchStyle(shade, false)}
                />
                <span className={styles.swatchCode}>{shade.code ?? shade.id}</span>
                <span className={styles.swatchName}>{shade.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* CONTINUE — always active navy on this screen */}
      <div className={styles.buttonWrapper}>
        <button type="button" className={`${styles.btn} ${styles.btnActive}`}
          onClick={async () => {
            await saveSharedDetail({ whiteShade, gumShade }, productNeedsShade);
            navigate(nextFromStop(stops, stopIndex), 'forward');
          }}>
          CONTINUE
        </button>
        <FlowSupport />
      </div>
    </main>
  );
}

/** Resolves which item this stop is for, loading the order if a refresh lost it. */
function Step4Loader() {
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
  return <ShadeForm stopIndex={stopIndex} stops={stops} />;
}

export default function Step4Page() {
  return (
    <Suspense fallback={<main className={styles.screen} />}>
      <Step4Loader />
    </Suspense>
  );
}
