"use client";

/**
 * Standalone tooth chart, tap-to-select.
 *
 * A self-contained copy of the intake (step 5) chart so other flows — e.g. the
 * messages "adjust my appliance" form — can reuse it without importing from or
 * modifying the intake page. Selection is fully controlled: pass a `selected`
 * set and an `onToggle` handler.
 */

import React from "react";
import styles from "./ToothChart.module.css";

/* ── Tooth shape colors — outlined crowns, yellow when selected ── */
type Palette = { fill: string; stroke: string; groove: string };
const DEFAULT: Palette  = { fill: "#ffffff", stroke: "#b3bcca", groove: "#c8d0dc" };
const SELECTED: Palette = { fill: "#FDD33B", stroke: "#E1A70C", groove: "#c1900a" };

/* ── Inline SVG tooth shapes ── */
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

/* ── Tooth definitions ── (wisdom teeth removed; upper 2–15, lower 18–31) */
type ToothShape = "molar" | "premolar" | "canine" | "incisor";
interface ToothDef { num: number; shape: ToothShape; w: number; }

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

/* ── Arch geometry (superellipse horseshoe) ── */
const ARCH_POWER = 2.6;
const ARCH_DEPTH_RATIO = 1.15;
const TOOTH_GAP = 3;
const NUMBER_OFFSET = 21;
const ARCH_HALF_WIDTH = 108;
const ARCH_SEPARATION = 30;

interface ArchPoint { x: number; y: number; nx: number; ny: number; }

function archPoint(t: number, halfWidth: number, depth: number, sign: number): { x: number; y: number } {
  const c = Math.cos(t);
  const p = 2 / ARCH_POWER;
  return {
    x: halfWidth * Math.sign(c) * Math.abs(c) ** p,
    y: sign * depth * Math.abs(Math.sin(t)) ** p,
  };
}

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

  function at(distance: number): ArchPoint {
    let k = 1;
    while (k < STEPS && walked[k] < distance) k++;
    const span = walked[k] - walked[k - 1] || 1;
    const f = (distance - walked[k - 1]) / span;

    const a = pts[k - 1];
    const b = pts[k];
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;

    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return { x, y, nx: (-sign * ty) / len, ny: (sign * tx) / len };
  }

  return { total: walked[STEPS], at };
}

interface PlacedTooth extends ToothDef {
  x: number;
  y: number;
  rot: number;
  labelX: number;
  labelY: number;
}

const ARCH_DEPTH = ARCH_HALF_WIDTH * ARCH_DEPTH_RATIO;
const BASE_RUN = UPPER.reduce((sum, t) => sum + t.w + TOOTH_GAP, 0);
const TOOTH_SCALE = sampleArch(ARCH_HALF_WIDTH, ARCH_DEPTH, -1).total / BASE_RUN;
const ARCH_MARGIN = Math.round((17 + NUMBER_OFFSET) * TOOTH_SCALE + 10);
const UPPER_CENTRE_Y = ARCH_MARGIN + ARCH_DEPTH;
const LOWER_CENTRE_Y = UPPER_CENTRE_Y + ARCH_SEPARATION;
export const CHART_HEIGHT = Math.round(LOWER_CENTRE_Y + ARCH_DEPTH + ARCH_MARGIN);

function layOutArch(defs: ToothDef[], jaw: "upper" | "lower"): PlacedTooth[] {
  const sign = jaw === "upper" ? -1 : 1;
  const centreY = jaw === "upper" ? UPPER_CENTRE_Y : LOWER_CENTRE_Y;
  const curve = sampleArch(ARCH_HALF_WIDTH, ARCH_DEPTH, sign);

  const spans = defs.map((d) => (d.w + TOOTH_GAP) * TOOTH_SCALE);
  let along = (curve.total - spans.reduce((a, b) => a + b, 0)) / 2;

  return defs.map((def, i) => {
    const point = curve.at(along + spans[i] / 2);
    along += spans[i];

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

const UPPER_ARCH = layOutArch(UPPER, "upper");
const LOWER_ARCH = layOutArch(LOWER, "lower");

const UPPER_SVG: Record<ToothShape, (c: Palette) => React.ReactElement> = {
  molar:    (c) => <Molar    c={c} />,
  premolar: (c) => <Premolar c={c} />,
  canine:   (c) => <Canine   c={c} />,
  incisor:  (c) => <Incisor  c={c} />,
};
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

export function ToothChart({ selected, onToggle }: {
  selected: Set<number>;
  onToggle: (n: number) => void;
}) {
  return (
    <div className={styles.chartWrap} aria-label="Tooth chart">
      <div className={styles.chartLabels}>
        <span className={styles.chartLabel}>Left</span>
        <span className={styles.chartLabel}>Right</span>
      </div>
      <div className={styles.chart} style={{ height: CHART_HEIGHT }}>
        <span className={styles.upperLabel}>Upper Jaw</span>
        {UPPER_ARCH.map((t) => (
          <ToothButton key={t.num} tooth={t} jaw="upper" selected={selected.has(t.num)} onToggle={onToggle} />
        ))}
        <div className={styles.chartDivider} />
        {LOWER_ARCH.map((t) => (
          <ToothButton key={t.num} tooth={t} jaw="lower" selected={selected.has(t.num)} onToggle={onToggle} />
        ))}
        <span className={styles.lowerLabel}>Lower Jaw</span>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendDot} style={{ background: "#ffffff", border: "1px solid #b3bcca" }} />
        <span className={styles.legendText}>Healthy</span>
        <span className={styles.legendDot} style={{ background: "#FDD33B", border: "1px solid #E1A70C" }} />
        <span className={styles.legendText}>Selected</span>
      </div>
    </div>
  );
}
