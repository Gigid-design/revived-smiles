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

/**
 * Where the arch artwork actually sits inside its image, normalised 0–1.
 * Tooth coords/sizes below are expressed relative to the arch itself; this box
 * remaps them onto the image so artwork with baked-in labels / margins still
 * lines its tap targets up. Default (full image) leaves coords untouched.
 */
interface ContentBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const FULL_BOX: ContentBox = { x0: 0, y0: 0, x1: 1, y1: 1 };

function Arch({
  src,
  alt,
  teeth,
  jaw,
  selected,
  onToggle,
  contentBox = FULL_BOX,
  labels = true,
  highlights = true,
  selectedTile,
  offsetX = 0,
}: {
  src: string;
  alt: string;
  teeth: Tooth[];
  jaw: "upper" | "lower";
  selected: Set<number>;
  onToggle: (n: number) => void;
  /** Sub-rectangle of the image the arch occupies (for labelled/padded art). */
  contentBox?: ContentBox;
  /** Draw the CSS "Left/Right/Upper" captions (off when baked into the art). */
  labels?: boolean;
  /** Draw the solid yellow glow-through highlight. Ignored when `selectedTile`
      is set — an isolated selected-tooth image is painted instead. */
  highlights?: boolean;
  /** Returns the src of a single tooth's selected-state artwork (that tooth
      only, on a transparent canvas the same size/layout as `src`). When set,
      each selected tooth paints its own tile, so the fill is clean with no
      spread onto neighbours. */
  selectedTile?: (num: number) => string;
  /** Horizontal nudge (% of width) applied to art + targets, to centre the
      arch when the artwork's own centre is off — keeps upper/lower aligned. */
  offsetX?: number;
}) {
  const bw = contentBox.x1 - contentBox.x0;
  const bh = contentBox.y1 - contentBox.y0;
  // Map an arch-local coord/size onto the image via the content box.
  const px = (x: number) => (contentBox.x0 + x * bw) * 100 + offsetX;
  const py = (y: number) => (contentBox.y0 + y * bh) * 100;
  const pw = (w: number) => w * bw * 100;
  const ph = (h: number) => h * bh * 100;

  return (
    <div className={styles.arch}>
      {/* Solid glow-through highlight — behind the art. Skipped when isolated
          selected-tooth tiles are supplied (rendered on top, below). */}
      {!selectedTile && highlights && teeth.map((t) =>
        selected.has(t.num) ? (
          <span
            key={`h${t.num}`}
            className={styles.highlight}
            style={{
              left: `${px(t.x)}%`,
              top: `${py(t.y)}%`,
              width: `${pw(SIZE[t.kind].w)}%`,
              height: `${ph(SIZE[t.kind].h)}%`,
            }}
          />
        ) : null,
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.archImg}
        src={src}
        alt={alt}
        draggable={false}
        style={offsetX ? { transform: `translateX(${offsetX}%)` } : undefined}
      />

      {/* Selected-state art, one isolated tile per selected tooth. Each tile
          contains only its own tooth on a transparent canvas aligned to the
          base art, so the fill is clean with no spread onto neighbours. */}
      {selectedTile &&
        teeth.map((t) =>
          selected.has(t.num) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`s${t.num}`}
              className={styles.archImg}
              src={selectedTile(t.num)}
              alt=""
              aria-hidden
              draggable={false}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: 2,
                pointerEvents: "none",
                transform: offsetX ? `translateX(${offsetX}%)` : undefined,
              }}
            />
          ) : null,
        )}

      {/* Captions — skipped when the artwork already carries them. */}
      {labels && (
        <>
          <span className={`${styles.archLabel} ${jaw === "upper" ? styles.archLabelUpper : styles.archLabelLower}`}>
            {jaw === "upper" ? "Upper" : "Lower"}
          </span>
          <span className={`${styles.corner} ${jaw === "upper" ? styles.cornerTL : styles.cornerBL}`}>Left</span>
          <span className={`${styles.corner} ${jaw === "upper" ? styles.cornerTR : styles.cornerBR}`}>Right</span>
        </>
      )}

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
            left: `${px(t.x)}%`,
            top: `${py(t.y)}%`,
            width: `${pw(SIZE[t.kind].w * HIT_SCALE)}%`,
            height: `${ph(SIZE[t.kind].h * HIT_SCALE)}%`,
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
        /* Arch sits inside this sub-rect of the (now label-free) artwork. */
        contentBox={{ x0: 0.0944, y0: 0.1829, x1: 0.9205, y1: 0.9787 }}
        /* Per-tooth selected tiles (recoloured to #FDCD47) — one clean tooth
           each, so a tap fills only that tooth. */
        selectedTile={(n) => `/assets/images/upper-sel/${n}.png`}
        /* Arch centre sits at 0.508 in the art; nudge left to 0.5. */
        offsetX={-0.75}
      />
      <Arch
        src="/assets/images/tooth-arch-lower.png"
        alt="Lower arch"
        teeth={LOWER}
        jaw="lower"
        selected={selected}
        onToggle={onToggle}
        /* Arch sits inside this sub-rect of the (now label-free) artwork. */
        contentBox={{ x0: 0.0559, y0: 0.0354, x1: 0.9304, y1: 0.8287 }}
        /* Per-tooth selected tiles (#FDCD47) — one clean tooth each, no spread. */
        selectedTile={(n) => `/assets/images/lower-sel/${n}.png`}
        /* Arch centre sits at 0.493 in the art; nudge right to 0.5. */
        offsetX={0.68}
      />
    </div>
  );
}
