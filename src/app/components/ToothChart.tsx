"use client";

/**
 * Tooth chart, tap-to-select.
 *
 * Uses the exact order-form artwork (two arches, Upper ∪ above, Lower ∩ below)
 * rendered as transparent line-art images, with an invisible tap target over
 * each tooth and a yellow highlight that sits *behind* the art — so a selected
 * tooth glows through the transparent crown while the black outline stays crisp.
 *
 * Tooth positions are normalised (0–1) to each arch image; flip DEBUG on to see
 * the hit boxes while tuning them.
 */

import styles from "./ToothChart.module.css";

const DEBUG = false;

type ToothKind = "molar" | "premolar" | "canine" | "incisor";
interface Tooth {
  num: number;
  x: number;
  y: number;
  kind: ToothKind;
}

/** Tap targets are scaled up past the tooth so adjacent crowns leave no gap. */
const HIT_SCALE = 1.3;

/** Highlight / base size per tooth kind, as a fraction of the arch box. */
const SIZE: Record<ToothKind, { w: number; h: number }> = {
  molar: { w: 0.115, h: 0.2 },
  premolar: { w: 0.095, h: 0.17 },
  canine: { w: 0.085, h: 0.18 },
  incisor: { w: 0.08, h: 0.17 },
};

/* Upper arch (∪) — molars at the top corners, incisors at the bottom. */
const UPPER: Tooth[] = [
  { num: 2,  x: 0.065, y: 0.13, kind: "molar" },
  { num: 3,  x: 0.095, y: 0.34, kind: "molar" },
  { num: 4,  x: 0.15,  y: 0.53, kind: "premolar" },
  { num: 5,  x: 0.205, y: 0.67, kind: "premolar" },
  { num: 6,  x: 0.275, y: 0.79, kind: "canine" },
  { num: 7,  x: 0.355, y: 0.86, kind: "incisor" },
  { num: 8,  x: 0.44,  y: 0.9,  kind: "incisor" },
  { num: 9,  x: 0.55,  y: 0.9,  kind: "incisor" },
  { num: 10, x: 0.635, y: 0.86, kind: "incisor" },
  { num: 11, x: 0.715, y: 0.79, kind: "canine" },
  { num: 12, x: 0.785, y: 0.67, kind: "premolar" },
  { num: 13, x: 0.84,  y: 0.53, kind: "premolar" },
  { num: 14, x: 0.9,   y: 0.34, kind: "molar" },
  { num: 15, x: 0.93,  y: 0.13, kind: "molar" },
];

/* Lower arch (∩) — incisors at the top, molars at the bottom corners. */
const LOWER: Tooth[] = [
  { num: 18, x: 0.1,   y: 0.8,  kind: "molar" },
  { num: 19, x: 0.135, y: 0.57, kind: "molar" },
  { num: 20, x: 0.18,  y: 0.4,  kind: "premolar" },
  { num: 21, x: 0.235, y: 0.27, kind: "premolar" },
  { num: 22, x: 0.305, y: 0.16, kind: "canine" },
  { num: 23, x: 0.39,  y: 0.09, kind: "incisor" },
  { num: 24, x: 0.47,  y: 0.06, kind: "incisor" },
  { num: 25, x: 0.55,  y: 0.06, kind: "incisor" },
  { num: 26, x: 0.63,  y: 0.09, kind: "incisor" },
  { num: 27, x: 0.7,   y: 0.16, kind: "canine" },
  { num: 28, x: 0.775, y: 0.27, kind: "premolar" },
  { num: 29, x: 0.825, y: 0.4,  kind: "premolar" },
  { num: 30, x: 0.87,  y: 0.57, kind: "molar" },
  { num: 31, x: 0.905, y: 0.8,  kind: "molar" },
];

function Arch({
  src,
  alt,
  teeth,
  jaw,
  selected,
  onToggle,
}: {
  src: string;
  alt: string;
  teeth: Tooth[];
  jaw: "upper" | "lower";
  selected: Set<number>;
  onToggle: (n: number) => void;
}) {
  return (
    <div className={styles.arch}>
      {/* Highlights behind the art — show through the transparent crowns. */}
      {teeth.map((t) =>
        selected.has(t.num) ? (
          <span
            key={`h${t.num}`}
            className={styles.highlight}
            style={{
              left: `${t.x * 100}%`,
              top: `${t.y * 100}%`,
              width: `${SIZE[t.kind].w * 100}%`,
              height: `${SIZE[t.kind].h * 100}%`,
            }}
          />
        ) : null,
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.archImg} src={src} alt={alt} draggable={false} />

      {/* Captions */}
      <span className={`${styles.archLabel} ${jaw === "upper" ? styles.archLabelUpper : styles.archLabelLower}`}>
        {jaw === "upper" ? "Upper" : "Lower"}
      </span>
      <span className={`${styles.corner} ${jaw === "upper" ? styles.cornerTL : styles.cornerBL}`}>Left</span>
      <span className={`${styles.corner} ${jaw === "upper" ? styles.cornerTR : styles.cornerBR}`}>Right</span>

      {/* Transparent tap targets on top — enlarged past the tooth so there are
          no dead gaps between adjacent crowns. */}
      {teeth.map((t) => (
        <button
          key={t.num}
          type="button"
          aria-label={`Tooth ${t.num}${selected.has(t.num) ? " (selected)" : ""}`}
          aria-pressed={selected.has(t.num)}
          className={`${styles.hit} ${DEBUG ? styles.hitDebug : ""}`}
          style={{
            left: `${t.x * 100}%`,
            top: `${t.y * 100}%`,
            width: `${SIZE[t.kind].w * HIT_SCALE * 100}%`,
            height: `${SIZE[t.kind].h * HIT_SCALE * 100}%`,
          }}
          onClick={() => onToggle(t.num)}
        />
      ))}
    </div>
  );
}

export function ToothChart({
  selected,
  onToggle,
}: {
  selected: Set<number>;
  onToggle: (n: number) => void;
}) {
  return (
    <div className={styles.chartWrap} aria-label="Tooth chart">
      <Arch
        src="/assets/images/tooth-arch-upper.png"
        alt="Upper arch"
        teeth={UPPER}
        jaw="upper"
        selected={selected}
        onToggle={onToggle}
      />
      <Arch
        src="/assets/images/tooth-arch-lower.png"
        alt="Lower arch"
        teeth={LOWER}
        jaw="lower"
        selected={selected}
        onToggle={onToggle}
      />
    </div>
  );
}
