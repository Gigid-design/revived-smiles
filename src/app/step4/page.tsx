"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { getNextAfterShade, getStepNumber, getTotalSteps } from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";

interface Shade {
  id: string;
  label: string;
  color: string;
  /** Rendered as transparency rather than a colour — see `.chipClear`. */
  clear?: boolean;
}

/* ── Tooth shade swatches — the VITA A range, lightest to darkest ──
   The previous three sat within one or two values of each other
   (#f8f6f3 / #f7f6f3 / #f1f1f0), so the picker showed no visible difference
   between the options it was asking her to choose between. */
const WHITE_SHADES: Shade[] = [
  { id: "A1", label: "Very Light", color: "#f2ede3" },
  { id: "A2", label: "Light",      color: "#eae0ce" },
  { id: "A3", label: "Medium",     color: "#ddcdb2" },
  { id: "A4", label: "Dark",       color: "#c9b392" },
];

/* ── Gum shade swatches ──
   Clear isn't a point on the light-to-dark scale — it's the translucent
   material used where no gum colour should show — so it gets its own
   treatment rather than a colour chip. */
const GUM_SHADES: Shade[] = [
  { id: "G1", label: "Dark",  color: "#8f5350" },
  { id: "G2", label: "Pink",  color: "#e39c9c" },
  { id: "G3", label: "Clear", color: "transparent", clear: true },
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

export default function Step4() {
  const { data, saveDraft } = useSubmission();
  const [whiteShade, setWhiteShade] = useState<string | null>(data.whiteShade);
  const [gumShade,   setGumShade]   = useState<string | null>(data.gumShade);
  const { cardRef, navigate } = usePageTransition();

  const selectedWhite = WHITE_SHADES.find(s => s.id === whiteShade);
  const selectedGum   = GUM_SHADES.find(s => s.id === gumShade);


  const productId = data.products[0] || '';
  const total = getTotalSteps(productId);
  const current = Math.min(getStepNumber('shade', productId), total);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={Math.min(100, Math.round((current / total) * 100))}
        counter={`Step ${current} of ${total}`}
        onBack={() => navigate('/intake', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Tooth &amp; Gum shade</h1>

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
                <span className={styles.swatchCode}>{shade.id}</span>
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
            <span className={styles.previewCode}>{selectedGum?.id ?? "—"}</span>
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
                <span className={styles.swatchCode}>{shade.id}</span>
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
            await saveDraft({ whiteShade, gumShade });
            navigate(getNextAfterShade(productId), 'forward');
          }}>
          CONTINUE
        </button>
      </div>
    </main>
  );
}
