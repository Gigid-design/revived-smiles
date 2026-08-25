"use client";

/**
 * Multi-series line chart, hand-rolled in SVG.
 *
 * The repo carries no charting library and this does not justify adding one:
 * a polyline per series, a shared y-scale and a hover readout is the whole
 * requirement. Series are toggled from the legend, and the y-axis rescales to
 * what is left visible.
 */

import { useMemo, useState } from "react";

import type { TagUsage } from "@/lib/api";
import { formatDay } from "../format";
import styles from "../page.module.css";

/* Distinguishable at 2px, and legible against the white card. Cobalt leads,
   because it is the portal's accent. */
const SERIES_COLORS = [
  "#1E66FF",
  "#E11D48",
  "#7C3AED",
  "#0EA5E9",
  "#F59E0B",
  "#059669",
  "#DB2777",
  "#64748B",
];

interface TrendChartProps {
  days: string[];
  series: TagUsage[];
}

const VIEW_W = 720;
const VIEW_H = 260;
const PAD = { top: 16, right: 16, bottom: 30, left: 38 };

/** A "nice" axis ceiling — 47 becomes 50, 133 becomes 150. */
function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  const found = steps.find((step) => step * magnitude >= value);
  return (found ?? 10) * magnitude;
}

export function TrendChart({ days, series }: TrendChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visible = series.filter((item) => !hidden.has(item.tag));

  const max = useMemo(() => {
    const peak = Math.max(0, ...visible.flatMap((item) => item.perDay));
    return niceMax(peak);
  }, [visible]);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  function x(index: number): number {
    if (days.length <= 1) return PAD.left + plotW / 2;
    return PAD.left + (index / (days.length - 1)) * plotW;
  }

  function y(value: number): number {
    return PAD.top + plotH - (value / max) * plotH;
  }

  function toggle(tag: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  /* Four gridlines plus the baseline reads as a chart without becoming a grid. */
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));

  /* Enough labels to orient, few enough to stay readable at any width. */
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Tag usage over time. ${visible.map((item) => item.tag).join(", ")}.`}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--admin-card-border)"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(tick) + 4} className={styles.axisText} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {days.map((day, index) =>
          index % labelEvery === 0 ? (
            <text
              key={day}
              x={x(index)}
              y={VIEW_H - 10}
              className={styles.axisText}
              textAnchor="middle"
            >
              {formatDay(day)}
            </text>
          ) : null,
        )}

        {hoverIndex !== null && (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--admin-text-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {visible.map((item) => {
          const color = SERIES_COLORS[series.indexOf(item) % SERIES_COLORS.length];
          const points = item.perDay.map((value, index) => `${x(index)},${y(value)}`).join(" ");
          return (
            <polyline
              key={item.tag}
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {hoverIndex !== null &&
          visible.map((item) => {
            const color = SERIES_COLORS[series.indexOf(item) % SERIES_COLORS.length];
            return (
              <circle
                key={item.tag}
                cx={x(hoverIndex)}
                cy={y(item.perDay[hoverIndex] ?? 0)}
                r="3.5"
                fill="#fff"
                stroke={color}
                strokeWidth="2"
              />
            );
          })}

        {/* Invisible hit targets — one column per bucket. */}
        {days.map((day, index) => (
          <rect
            key={day}
            x={x(index) - plotW / Math.max(1, days.length - 1) / 2}
            y={PAD.top}
            width={plotW / Math.max(1, days.length - 1)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(index)}
          />
        ))}
      </svg>

      {hoverIndex !== null && visible.length > 0 && (
        <div className={styles.chartReadout}>
          <span className={styles.chartReadoutDay}>{formatDay(days[hoverIndex])}</span>
          {visible.map((item) => (
            <span key={item.tag} className={styles.chartReadoutItem}>
              <i
                className={styles.legendSwatch}
                style={{
                  background: SERIES_COLORS[series.indexOf(item) % SERIES_COLORS.length],
                }}
              />
              {item.tag}
              <strong>{item.perDay[hoverIndex] ?? 0}</strong>
            </span>
          ))}
        </div>
      )}

      <div className={styles.legend}>
        {series.map((item, index) => {
          const off = hidden.has(item.tag);
          return (
            <button
              key={item.tag}
              type="button"
              className={`${styles.legendItem} ${off ? styles.legendItemOff : ""}`}
              onClick={() => toggle(item.tag)}
              aria-pressed={!off}
            >
              <i
                className={styles.legendSwatch}
                style={{ background: off ? "transparent" : SERIES_COLORS[index % SERIES_COLORS.length] }}
              />
              {item.tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
