"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";

/* ── Tooth shape colors ── */
const DEFAULT = { fill1: "#DCE4F0", fill2: "#E8EEF6", stroke1: "#C8D4E4", stroke2: "#B8C8DC" };
const SELECTED = { fill1: "#1a2a4a", fill2: "#1a2a4a", stroke1: "#0e1530", stroke2: "transparent" };

/* ── Inline SVG tooth shapes ── */
function UpperMolar({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="20" height="30" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M12.5 0H7.5C5.84315 0 4.5 1.34315 4.5 3V5C4.5 6.65685 5.84315 8 7.5 8H12.5C14.1569 8 15.5 6.65685 15.5 5V3C15.5 1.34315 14.1569 0 12.5 0Z" fill={c.fill1}/>
      <path d="M15 8H5C2.23858 8 0 10.2386 0 13V25C0 27.7614 2.23858 30 5 30H15C17.7614 30 20 27.7614 20 25V13C20 10.2386 17.7614 8 15 8Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
      <path d="M10 10V27" stroke={c.stroke2} strokeLinecap="round"/>
    </svg>
  );
}

function UpperPremolar({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="16" height="29" viewBox="0 0 16 29" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M9 0H7C5.34315 0 4 1.34315 4 3V7C4 8.65685 5.34315 10 7 10H9C10.6569 10 12 8.65685 12 7V3C12 1.34315 10.6569 0 9 0Z" fill={c.fill1}/>
      <path d="M11 10H5C2.23858 10 0 12.2386 0 15V24C0 26.7614 2.23858 29 5 29H11C13.7614 29 16 26.7614 16 24V15C16 12.2386 13.7614 10 11 10Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
      <path d="M8 12V26" stroke={c.stroke2} strokeLinecap="round"/>
    </svg>
  );
}

function UpperCanine({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="13" height="33" viewBox="0 0 13 33" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M6.75 0H6.25C4.59315 0 3.25 1.34315 3.25 3V9C3.25 10.6569 4.59315 12 6.25 12H6.75C8.40685 12 9.75 10.6569 9.75 9V3C9.75 1.34315 8.40685 0 6.75 0Z" fill={c.fill1}/>
      <path d="M7 12H6C2.68629 12 0 14.6863 0 18V27C0 30.3137 2.68629 33 6 33H7C10.3137 33 13 30.3137 13 27V18C13 14.6863 10.3137 12 7 12Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
    </svg>
  );
}

function UpperIncisor({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="13" height="30" viewBox="0 0 13 30" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M6.75 0H6.25C4.59315 0 3.25 1.34315 3.25 3V9C3.25 10.6569 4.59315 12 6.25 12H6.75C8.40685 12 9.75 10.6569 9.75 9V3C9.75 1.34315 8.40685 0 6.75 0Z" fill={c.fill1}/>
      <path d="M7 12H6C2.68629 12 0 14.6863 0 18V24C0 27.3137 2.68629 30 6 30H7C10.3137 30 13 27.3137 13 24V18C13 14.6863 10.3137 12 7 12Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
    </svg>
  );
}

function LowerMolar({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="20" height="30" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M12.5 22H7.5C5.84315 22 4.5 23.3431 4.5 25V27C4.5 28.6569 5.84315 30 7.5 30H12.5C14.1569 30 15.5 28.6569 15.5 27V25C15.5 23.3431 14.1569 22 12.5 22Z" fill={c.fill1}/>
      <path d="M15 0H5C2.23858 0 0 2.23858 0 5V17C0 19.7614 2.23858 22 5 22H15C17.7614 22 20 19.7614 20 17V5C20 2.23858 17.7614 0 15 0Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
      <path d="M10 2V19" stroke={c.stroke2} strokeLinecap="round"/>
    </svg>
  );
}

function LowerPremolar({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="16" height="29" viewBox="0 0 16 29" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M9 19H7C5.34315 19 4 20.3431 4 22V26C4 27.6569 5.34315 29 7 29H9C10.6569 29 12 27.6569 12 26V22C12 20.3431 10.6569 19 9 19Z" fill={c.fill1}/>
      <path d="M11 0H5C2.23858 0 0 2.23858 0 5V14C0 16.7614 2.23858 19 5 19H11C13.7614 19 16 16.7614 16 14V5C16 2.23858 13.7614 0 11 0Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
      <path d="M8 2V16" stroke={c.stroke2} strokeLinecap="round"/>
    </svg>
  );
}

function LowerCanine({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="13" height="33" viewBox="0 0 13 33" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M6.75 21H6.25C4.59315 21 3.25 22.3431 3.25 24V30C3.25 31.6569 4.59315 33 6.25 33H6.75C8.40685 33 9.75 31.6569 9.75 30V24C9.75 22.3431 8.40685 21 6.75 21Z" fill={c.fill1}/>
      <path d="M7 0H6C2.68629 0 0 2.68629 0 6V15C0 18.3137 2.68629 21 6 21H7C10.3137 21 13 18.3137 13 15V6C13 2.68629 10.3137 0 7 0Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
    </svg>
  );
}

function LowerIncisor({ sel }: { sel: boolean }) {
  const c = sel ? SELECTED : DEFAULT;
  return (
    <svg width="13" height="30" viewBox="0 0 13 30" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <path opacity="0.7" d="M6.75 18H6.25C4.59315 18 3.25 19.3431 3.25 21V27C3.25 28.6569 4.59315 30 6.25 30H6.75C8.40685 30 9.75 28.6569 9.75 27V21C9.75 19.3431 8.40685 18 6.75 18Z" fill={c.fill1}/>
      <path d="M7 0H6C2.68629 0 0 2.68629 0 6V12C0 15.3137 2.68629 18 6 18H7C10.3137 18 13 15.3137 13 12V6C13 2.68629 10.3137 0 7 0Z" fill={c.fill2} stroke={c.stroke1} strokeWidth="1.5"/>
    </svg>
  );
}

/* ── Tooth definitions ── */
type ToothShape = "molar" | "premolar" | "canine" | "incisor";
interface ToothDef { num: number; shape: ToothShape; w: number; h: number; cx: number; }

const UPPER: ToothDef[] = [
  { num: 1,  shape: "molar",    w: 20, h: 30, cx: -151 },
  { num: 2,  shape: "molar",    w: 20, h: 30, cx: -127 },
  { num: 3,  shape: "molar",    w: 20, h: 30, cx: -103 },
  { num: 4,  shape: "premolar", w: 16, h: 29, cx: -81  },
  { num: 5,  shape: "premolar", w: 16, h: 29, cx: -61  },
  { num: 6,  shape: "canine",   w: 13, h: 33, cx: -42.5},
  { num: 7,  shape: "incisor",  w: 13, h: 30, cx: -25.5},
  { num: 8,  shape: "incisor",  w: 13, h: 30, cx: -8.5 },
  { num: 9,  shape: "incisor",  w: 13, h: 30, cx:  8.5 },
  { num: 10, shape: "incisor",  w: 13, h: 30, cx:  25.5},
  { num: 11, shape: "canine",   w: 13, h: 33, cx:  42.5},
  { num: 12, shape: "premolar", w: 16, h: 29, cx:  61  },
  { num: 13, shape: "premolar", w: 16, h: 29, cx:  81  },
  { num: 14, shape: "molar",    w: 20, h: 30, cx:  103 },
  { num: 15, shape: "molar",    w: 20, h: 30, cx:  127 },
  { num: 16, shape: "molar",    w: 20, h: 30, cx:  151 },
];

const LOWER: ToothDef[] = [
  { num: 17, shape: "molar",    w: 20, h: 30, cx: -151 },
  { num: 18, shape: "molar",    w: 20, h: 30, cx: -127 },
  { num: 19, shape: "molar",    w: 20, h: 30, cx: -103 },
  { num: 20, shape: "premolar", w: 16, h: 29, cx: -81  },
  { num: 21, shape: "premolar", w: 16, h: 29, cx: -61  },
  { num: 22, shape: "canine",   w: 13, h: 33, cx: -42.5},
  { num: 23, shape: "incisor",  w: 13, h: 30, cx: -25.5},
  { num: 24, shape: "incisor",  w: 13, h: 30, cx: -8.5 },
  { num: 25, shape: "incisor",  w: 13, h: 30, cx:  8.5 },
  { num: 26, shape: "incisor",  w: 13, h: 30, cx:  25.5},
  { num: 27, shape: "canine",   w: 13, h: 33, cx:  42.5},
  { num: 28, shape: "premolar", w: 16, h: 29, cx:  61  },
  { num: 29, shape: "premolar", w: 16, h: 29, cx:  81  },
  { num: 30, shape: "molar",    w: 20, h: 30, cx:  103 },
  { num: 31, shape: "molar",    w: 20, h: 30, cx:  127 },
  { num: 32, shape: "molar",    w: 20, h: 30, cx:  151 },
];

const UPPER_SVG: Record<ToothShape, (s: boolean) => React.ReactElement> = {
  molar:    (s) => <UpperMolar    sel={s} />,
  premolar: (s) => <UpperPremolar sel={s} />,
  canine:   (s) => <UpperCanine   sel={s} />,
  incisor:  (s) => <UpperIncisor  sel={s} />,
};
const LOWER_SVG: Record<ToothShape, (s: boolean) => React.ReactElement> = {
  molar:    (s) => <LowerMolar    sel={s} />,
  premolar: (s) => <LowerPremolar sel={s} />,
  canine:   (s) => <LowerCanine   sel={s} />,
  incisor:  (s) => <LowerIncisor  sel={s} />,
};

function ToothButton({ tooth, jaw, selected, onToggle }: {
  tooth: ToothDef; jaw: "upper" | "lower"; selected: boolean; onToggle: (n: number) => void;
}) {
  const svgFn = jaw === "upper" ? UPPER_SVG[tooth.shape] : LOWER_SVG[tooth.shape];
  const toothTop = jaw === "upper" ? 35 : 108;

  return (
    <button
      type="button"
      aria-label={`Tooth ${tooth.num}${selected ? " (selected)" : ""}`}
      aria-pressed={selected}
      className={styles.tooth}
      style={{ left: `calc(50% + ${tooth.cx}px)`, top: `${toothTop}px` }}
      onClick={() => onToggle(tooth.num)}
    >
      {/* Number above for lower, below for upper */}
      {jaw === "lower" && (
        <span className={styles.toothNum} style={{ bottom: "100%", marginBottom: 2 }}>
          {tooth.num}
        </span>
      )}
      {svgFn(selected)}
      {jaw === "upper" && (
        <span className={styles.toothNum} style={{ top: "100%", marginTop: 2 }}>
          {tooth.num}
        </span>
      )}
    </button>
  );
}

export default function Step5() {
  const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
  const [notSure, setNotSure] = useState(false);
  const { cardRef, navigate } = usePageTransition();
  const { update } = useSubmission();

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
  const summaryTitle = notSure ? "Not sure" : count === 0 ? "No teeth selected" : `${count} tooth${count > 1 ? " teeth" : ""} marked`;
  const summarySubtitle = notSure ? "We'll follow up with you" : count === 0 ? "Tap a tooth to mark it" : `Tooth ${[...selectedTeeth].sort((a, b) => a - b).join(", ")}`;

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Step 3 of 3" role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={3}>
        <rect x="4" width="298" height="5" rx="2.5" fill="white"/>
        <rect width="302" height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="310" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23" height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/step4', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Tooth Chart</h1>
        <p className={styles.cardSubtitle}>
          Tap teeth that need attention or have existing work (crowns, implants, missing)
        </p>

        {/* Selected summary */}
        <div className={styles.summary}>
          <div className={styles.summaryIcon}>🦷</div>
          <div className={styles.summaryText}>
            <span className={styles.summaryTitle}>{summaryTitle}</span>
            <span className={styles.summarySubtitle}>{summarySubtitle}</span>
          </div>
        </div>

        {/* Tooth chart */}
        <div className={styles.chartWrap} aria-label="Tooth chart">
          <div className={styles.chartLabels}>
            <span className={styles.chartLabel}>Upper jaw</span>
            <span className={styles.chartLabel}>Right ←</span>
          </div>
          <div className={styles.chart}>
            {UPPER.map(t => <ToothButton key={t.num} tooth={t} jaw="upper" selected={selectedTeeth.has(t.num)} onToggle={toggleTooth} />)}
            <div className={styles.chartDivider} />
            {LOWER.map(t => <ToothButton key={t.num} tooth={t} jaw="lower" selected={selectedTeeth.has(t.num)} onToggle={toggleTooth} />)}
            <span className={styles.lowerLabel}>Lower jaw</span>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendDot} style={{ background: "#e8eef6", border: "1px solid #c8d4e4" }} />
            <span className={styles.legendText}>Healthy</span>
            <span className={styles.legendDot} style={{ background: "#1a2a4a" }} />
            <span className={styles.legendText}>Selected</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* I'm not sure */}
        <button type="button" className={`${styles.item} ${notSure ? styles.itemActive : ""}`} onClick={toggleNotSure} aria-pressed={notSure}>
          <span className={styles.itemLabel}>I&apos;m not sure</span>
          <span className={styles.itemCheck}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0H3C1.34961 0 0 1.3501 0 3V17C0 18.6499 1.34961 20 3 20H17C18.6504 20 20 18.6499 20 17V3C20 1.3501 18.6504 0 17 0ZM14.46 8.20996L9.45996 13.21C9.25977 13.3999 9.00977 13.5 8.75 13.5C8.49023 13.5 8.24023 13.3999 8.04004 13.21L5.54004 10.71C5.15039 10.3198 5.15039 9.68018 5.54004 9.29004C5.92969 8.8999 6.57031 8.8999 6.95996 9.29004L8.75 11.0898L13.04 6.79004C13.4297 6.3999 14.0703 6.3999 14.46 6.79004C14.8496 7.18018 14.8496 7.81982 14.46 8.20996Z"
                fill={notSure ? "#0e1b4d" : "#E8E8E4"} />
            </svg>
          </span>
        </button>

      </div>

      <div className={styles.buttonWrapper}>
        <button type="button" className={`${styles.btn} ${styles.btnActive}`}
          onClick={() => {
          update({ selectedTeeth: [...selectedTeeth], teethNotSure: notSure });
          navigate('/photo-intro', 'forward');
        }}
        >CONTINUE</button>
      </div>
    </main>
  );
}
