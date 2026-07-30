"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { getBackForTeethChart, getTotalSteps, getStepNumber } from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";

/* ── Tooth shape colors — outlined crowns, yellow when selected ── */
type Palette = { fill: string; stroke: string; groove: string };
const DEFAULT: Palette  = { fill: "#ffffff", stroke: "#b3bcca", groove: "#c8d0dc" };
const SELECTED: Palette = { fill: "#FDD33B", stroke: "#E1A70C", groove: "#c1900a" };

/* ── Inline SVG tooth shapes ── */
/* Occlusal-view crowns traced from the order-form art. The distinctive
   textures — branching molar grooves, a crescent premolar groove, a canine
   ridge, and the incisor's double incisal edge — sit toward the crown's
   biting side (SVG bottom). Lower-arch teeth pass `flip` so that side faces
   the occlusal plane rather than the gum. */
function Molar({ c, flip }: { c: Palette; flip?: boolean }) {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M10 1.6C6.3 1.4 2.5 2.6 2 6.4C1.7 9 1.7 13 2 15.6C2.5 19.4 6.3 20.6 10 20.4C13.7 20.6 17.5 19.4 18 15.6C18.3 13 18.3 9 18 6.4C17.5 2.6 13.7 1.4 10 1.6Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M10 5.6C9.4 8 10.6 9.4 10 11.4M10 8.4C8 8 6.1 6.9 5.1 5.9M10 8.4C12 8 13.9 6.9 14.9 5.9M10 11.4C8 12.4 6.4 14.3 5.6 16M10 11.4C12 12.4 13.6 14.3 14.4 16" stroke={c.groove} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Premolar({ c, flip }: { c: Palette; flip?: boolean }) {
  return (
    <svg width="16" height="22" viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M8 1.6C4.7 1.4 2.1 2.8 1.8 6.2C1.6 9 1.6 13 1.8 15.8C2.1 19.2 4.7 20.6 8 20.4C11.3 20.6 13.9 19.2 14.2 15.8C14.4 13 14.4 9 14.2 6.2C13.9 2.8 11.3 1.4 8 1.6Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M4.6 9C6.1 11.6 9.9 11.6 11.4 9M8 10.8V13.8" stroke={c.groove} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function Canine({ c, flip }: { c: Palette; flip?: boolean }) {
  return (
    <svg width="13" height="24" viewBox="0 0 13 24" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M6.5 1.3C8.9 1.5 10.6 4.2 10.9 8C11.2 11 11 13.6 10.3 16.2C9.6 19.6 8.2 22.6 6.5 23.4C4.8 22.6 3.4 19.6 2.7 16.2C2 13.6 1.8 11 2.1 8C2.4 4.2 4.1 1.5 6.5 1.3Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M6.5 4.5V17.5" stroke={c.groove} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function Incisor({ c, flip }: { c: Palette; flip?: boolean }) {
  return (
    <svg width="13" height="22" viewBox="0 0 13 22" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <path d="M6.5 1.4C4 1.4 2.4 3 2 6C1.6 9 1.6 12.6 2.3 15.6C2.9 18.4 4.4 20.4 6.5 20.4C8.6 20.4 10.1 18.4 10.7 15.6C11.4 12.6 11.4 9 11 6C10.6 3 9 1.4 6.5 1.4Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M3.3 16.2C5.1 18.6 7.9 18.6 9.7 16.2M3.9 17.9C5.4 19.8 7.6 19.8 9.1 17.9" stroke={c.groove} strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Tooth definitions ── */
type ToothShape = "molar" | "premolar" | "canine" | "incisor";
interface ToothDef { num: number; shape: ToothShape; w: number; }

/* Universal numbering. Upper runs 1–16 left to right across the screen, lower
   runs 17–32 the same way — the mapping the flat chart already used, kept
   unchanged so a given tooth still means the same tooth. */
const UPPER: ToothDef[] = [
  { num: 2,  shape: "molar",    w: 20 },
  { num: 3,  shape: "molar",    w: 20 },
  { num: 4,  shape: "premolar", w: 16 },
  { num: 5,  shape: "premolar", w: 16 },
  { num: 6,  shape: "canine",   w: 13 },
  { num: 7,  shape: "incisor",  w: 13 },
  { num: 8,  shape: "incisor",  w: 13 },
  { num: 9,  shape: "incisor",  w: 13 },
  { num: 10, shape: "incisor",  w: 13 },
  { num: 11, shape: "canine",   w: 13 },
  { num: 12, shape: "premolar", w: 16 },
  { num: 13, shape: "premolar", w: 16 },
  { num: 14, shape: "molar",    w: 20 },
  { num: 15, shape: "molar",    w: 20 },
];

const LOWER: ToothDef[] = UPPER.map((t) => ({ ...t, num: t.num + 16 }));

/* ── Arch geometry ──
   A real dental arch is a horseshoe, not a shallow bow: it is about as deep
   front-to-back as it is wide, the incisors run almost flat across the front,
   the curve turns hard at the canines, and the molars run back in near-parallel
   rows. A half-ellipse gets none of that.

   So the curve is a superellipse, |x/a|^n + |y/b|^n = 1. At n = 2 it is the old
   ellipse; above 2 the front flattens and the sides straighten, which is what
   turns a bow into a horseshoe. */
const ARCH_POWER = 2.6;
/** Depth as a multiple of half-width. Real arches are deeper than they are wide. */
const ARCH_DEPTH_RATIO = 1.15;
/** Teeth touch in a real mouth; this is just enough to read them apart. */
const TOOTH_GAP = 3;
/** How far past a tooth its number sits, before scaling. */
const NUMBER_OFFSET = 21;
/** Half-width of the arch. As wide as the 430px screen allows. */
const ARCH_HALF_WIDTH = 108;
/** Gap between the two arches, where the molars face each other. */
const ARCH_SEPARATION = 30;

/** A point on the arch, with the direction that points out of the mouth. */
interface ArchPoint { x: number; y: number; nx: number; ny: number; }

/** The superellipse, traversed left to right over t ∈ [π, 0]. */
function archPoint(t: number, halfWidth: number, depth: number, sign: number): { x: number; y: number } {
  const c = Math.cos(t);
  const p = 2 / ARCH_POWER;
  return {
    x: halfWidth * Math.sign(c) * Math.abs(c) ** p,
    y: sign * depth * Math.abs(Math.sin(t)) ** p,
  };
}

/**
 * Samples the curve into an arc-length table.
 *
 * Teeth are spaced by distance *along* the curve, never by angle. Even angles
 * look right across the front and crush the back, because the curve covers far
 * less distance per degree near its ends — exactly where the widest teeth are.
 */
function sampleArch(halfWidth: number, depth: number, sign: number) {
  const STEPS = 900;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    pts.push(archPoint(Math.PI * (1 - i / STEPS), halfWidth, depth, sign));
  }

  const walked: number[] = [0];
  for (let i = 1; i <= STEPS; i++) {
    walked.push(walked[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }

  /** The point at a given distance along the curve, plus its outward normal. */
  function at(distance: number): ArchPoint {
    let k = 1;
    while (k < STEPS && walked[k] < distance) k++;
    const span = walked[k] - walked[k - 1] || 1;
    const f = (distance - walked[k - 1]) / span;

    const a = pts[k - 1];
    const b = pts[k];
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;

    /* Perpendicular to the local tangent, turned so it points away from the
       inside of the arch. Taken from the curve itself rather than assumed to
       be radial, which is only true of a circle. */
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return { x, y, nx: (-sign * ty) / len, ny: (sign * tx) / len };
  }

  return { total: walked[STEPS], at };
}

interface PlacedTooth extends ToothDef {
  /** Centre, in px from the chart's horizontal centre / top. */
  x: number;
  y: number;
  /** Degrees, so the root points out of the arch rather than always up. */
  rot: number;
  /** Where the number label goes — further out along the same direction. */
  labelX: number;
  labelY: number;
}

const ARCH_DEPTH = ARCH_HALF_WIDTH * ARCH_DEPTH_RATIO;

/** The run the teeth need at their drawn size. */
const BASE_RUN = UPPER.reduce((sum, t) => sum + t.w + TOOTH_GAP, 0);

/**
 * How much to scale the teeth so sixteen of them exactly fill the arch.
 *
 * The arch and the teeth can't be sized independently — sixteen teeth have to
 * sit on the curve, so fixing one fixes the other. Taking the widest arch the
 * screen allows and sizing the teeth to it, rather than the reverse, means the
 * chart fills its panel and the teeth come out bigger (and easier to hit) than
 * the drawn artwork.
 */
const TOOTH_SCALE = sampleArch(ARCH_HALF_WIDTH, ARCH_DEPTH, -1).total / BASE_RUN;

/** Room above and below for the outermost teeth, turned on their side, plus their numbers. */
const ARCH_MARGIN = Math.round((17 + NUMBER_OFFSET) * TOOTH_SCALE + 10);

const UPPER_CENTRE_Y = ARCH_MARGIN + ARCH_DEPTH;
const LOWER_CENTRE_Y = UPPER_CENTRE_Y + ARCH_SEPARATION;
export const CHART_HEIGHT = Math.round(LOWER_CENTRE_Y + ARCH_DEPTH + ARCH_MARGIN);

function layOutArch(defs: ToothDef[], jaw: "upper" | "lower"): PlacedTooth[] {
  const sign = jaw === "upper" ? -1 : 1;
  const centreY = jaw === "upper" ? UPPER_CENTRE_Y : LOWER_CENTRE_Y;
  const curve = sampleArch(ARCH_HALF_WIDTH, ARCH_DEPTH, sign);

  const spans = defs.map((d) => (d.w + TOOTH_GAP) * TOOTH_SCALE);
  /* Centre the run on the curve if it doesn't quite fill it. */
  let along = (curve.total - spans.reduce((a, b) => a + b, 0)) / 2;

  return defs.map((def, i) => {
    const point = curve.at(along + spans[i] / 2);
    along += spans[i];

    /* Turn the tooth so its root follows the outward normal. Upper teeth are
       drawn root-up, lower teeth root-down, hence the two forms. */
    const rot =
      jaw === "upper"
        ? Math.atan2(point.nx, -point.ny)
        : Math.atan2(-point.nx, point.ny);

    return {
      ...def,
      x: point.x,
      y: centreY + point.y,
      rot: (rot * 180) / Math.PI,
      labelX: point.x + point.nx * NUMBER_OFFSET * TOOTH_SCALE,
      labelY: centreY + point.y + point.ny * NUMBER_OFFSET * TOOTH_SCALE,
    };
  });
}

/* Pure geometry, so it's worked out once rather than on every render. */
const UPPER_ARCH = layOutArch(UPPER, "upper");
const LOWER_ARCH = layOutArch(LOWER, "lower");

const UPPER_SVG: Record<ToothShape, (c: Palette) => React.ReactElement> = {
  molar:    (c) => <Molar    c={c} />,
  premolar: (c) => <Premolar c={c} />,
  canine:   (c) => <Canine   c={c} />,
  incisor:  (c) => <Incisor  c={c} />,
};
/* Lower teeth are the same crowns flipped, so their biting side faces up. */
const LOWER_SVG: Record<ToothShape, (c: Palette) => React.ReactElement> = {
  molar:    (c) => <Molar    c={c} flip />,
  premolar: (c) => <Premolar c={c} flip />,
  canine:   (c) => <Canine   c={c} flip />,
  incisor:  (c) => <Incisor  c={c} flip />,
};

function ToothButton({ tooth, jaw, selected, onToggle }: {
  tooth: PlacedTooth; jaw: "upper" | "lower"; selected: boolean; onToggle: (n: number) => void;
}) {
  const svgFn = jaw === "upper" ? UPPER_SVG[tooth.shape] : LOWER_SVG[tooth.shape];

  return (
    <>
      <button
        type="button"
        aria-label={`Tooth ${tooth.num}${selected ? " (selected)" : ""}`}
        aria-pressed={selected}
        className={styles.tooth}
        style={{
          left: `calc(50% + ${tooth.x}px)`,
          top: `${tooth.y}px`,
          transform: `translate(-50%, -50%) rotate(${tooth.rot}deg) scale(${TOOTH_SCALE})`,
        }}
        onClick={() => onToggle(tooth.num)}
      >
        {svgFn(selected ? SELECTED : DEFAULT)}
      </button>

      {/* Outside the button and never rotated, so the numbers stay upright and
          readable all the way round the arch. */}
      <span
        className={styles.toothNum}
        style={{ left: `calc(50% + ${tooth.labelX}px)`, top: `${tooth.labelY}px` }}
        aria-hidden="true"
      >
        {tooth.num}
      </span>
    </>
  );
}

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
    const numbers = [...selectedTeeth].sort((a, b) => a - b).join(", ");
    return `${count === 1 ? "Tooth" : "Teeth"} ${numbers}`;
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

        {/* Tooth chart */}
        <div className={styles.chartWrap} aria-label="Tooth chart">
          <div className={styles.chartLabels}>
            <span className={styles.chartLabel}>Left</span>
            <span className={styles.chartLabel}>Right</span>
          </div>
          <div className={styles.chart} style={{ height: CHART_HEIGHT }}>
            <span className={styles.upperLabel}>Upper Jaw</span>
            {UPPER_ARCH.map(t => <ToothButton key={t.num} tooth={t} jaw="upper" selected={selectedTeeth.has(t.num)} onToggle={toggleTooth} />)}
            <div className={styles.chartDivider} />
            {LOWER_ARCH.map(t => <ToothButton key={t.num} tooth={t} jaw="lower" selected={selectedTeeth.has(t.num)} onToggle={toggleTooth} />)}
            <span className={styles.lowerLabel}>Lower Jaw</span>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendDot} style={{ background: "#ffffff", border: "1px solid #b3bcca" }} />
            <span className={styles.legendText}>Healthy</span>
            <span className={styles.legendDot} style={{ background: "#FDD33B", border: "1px solid #E1A70C" }} />
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
