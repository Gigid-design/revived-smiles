"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

/* ── Tooth shade swatches ── */
const WHITE_SHADES = [
  { id: "A1", label: "Very Light", color: "#f8f6f3" },
  { id: "A2", label: "Light",      color: "#f7f6f3" },
  { id: "A3", label: "Medium",     color: "#f1f1f0" },
];

/* ── Gum shade swatches ── */
const GUM_SHADES = [
  { id: "G1", label: "Very Light", color: "#f9e0e0" },
  { id: "G2", label: "Light",      color: "#f0b7b7" },
  { id: "G3", label: "Medium",     color: "#e08484" },
  { id: "G4", label: "Dark",       color: "#c34e4e" },
];

export default function Step4() {
  const [whiteShade, setWhiteShade] = useState<string | null>(null);
  const [gumShade,   setGumShade]   = useState<string | null>(null);
  const { cardRef, navigate } = usePageTransition();

  const selectedWhite = WHITE_SHADES.find(s => s.id === whiteShade);
  const selectedGum   = GUM_SHADES.find(s => s.id === gumShade);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Backgrounds — same as intake/step2/step3 */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Step 3 of 3" role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={3}>
        <rect x="4" width="298" height="5" rx="2.5" fill="white"/>
        <rect width="254" height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="310" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23" height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/step3', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Tooth &amp; Gum shade</h1>

        {/* Live preview — White */}
        <div className={styles.preview} aria-label="Selected white shade preview">
          <div className={styles.previewSwatch} style={{ background: selectedWhite ? `linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.5)), ${selectedWhite.color}` : "linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.5)), #f0ede9" }} />
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
                <span className={styles.swatchChip} style={{ background: shade.color }} />
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
          <div className={styles.previewSwatch} style={{ background: selectedGum ? `linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.5)), ${selectedGum.color}` : "linear-gradient(rgba(255,255,255,0.5),rgba(255,255,255,0.5)), #f0ede9" }} />
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
                <span className={styles.swatchChip} style={{ background: shade.color }} />
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
          onClick={() => navigate('/step5', 'forward')}>
          CONTINUE
        </button>
      </div>
    </main>
  );
}
