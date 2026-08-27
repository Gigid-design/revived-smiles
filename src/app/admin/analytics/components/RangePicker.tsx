"use client";

/**
 * The date range control: three presets and a custom window.
 *
 * The custom half was the Aug 25 ask — "are we going to be able to choose a
 * custom range as well?" It validates the same four rules the contract makes
 * the backend enforce (parseable dates, end on or after start, end not in the
 * future, no longer than the cap) so the user is told what is wrong while they
 * are still looking at the fields, rather than after a round trip. The backend
 * checking again is not redundancy; this half of it cannot be trusted.
 */

import { useEffect, useRef, useState } from "react";

import type { AnalyticsRange } from "@/lib/api";
import { ANALYTICS_RANGES, ANALYTICS_RANGE_LABELS, MAX_CUSTOM_RANGE_DAYS } from "@/lib/api";
import { describeRange, formatDate, toIsoDate, todayUtcMs } from "../format";
import styles from "../page.module.css";

interface RangePickerProps {
  range: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

/** The problem with a start/end pair, or null when there isn't one. */
function validate(start: string, end: string): string | null {
  if (!start || !end) return "Pick a start and an end date.";

  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "That isn't a date we can read.";

  if (endMs < startMs) return "The end date is before the start date.";
  if (endMs > todayUtcMs()) return "The end date is in the future.";

  const days = Math.round((endMs - startMs) / 86400000) + 1;
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    return `That's ${days.toLocaleString()} days. The most a range can cover is ${MAX_CUSTOM_RANGE_DAYS}.`;
  }

  return null;
}

export function RangePicker({ range, onChange }: RangePickerProps) {
  const custom = range.preset === "custom";
  const today = toIsoDate(todayUtcMs());

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(custom ? range.start : "");
  const [end, setEnd] = useState(custom ? range.end : today);

  const wrapRef = useRef<HTMLDivElement>(null);

  /* Escape and a click outside both close the panel without applying: opening
     the fields to look at them should not be able to change the numbers. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const error = open ? validate(start, end) : null;

  function apply() {
    if (validate(start, end)) return;
    onChange({ preset: "custom", start, end });
    setOpen(false);
  }

  return (
    <div className={styles.rangeGroup} role="group" aria-label="Date range">
      <span className={styles.rangeLabel}>Date</span>

      {ANALYTICS_RANGES.map((preset) => (
        <button
          key={preset}
          type="button"
          className={`${styles.rangeBtn} ${range.preset === preset ? styles.rangeBtnActive : ""}`}
          onClick={() => {
            setOpen(false);
            onChange({ preset });
          }}
          aria-pressed={range.preset === preset}
        >
          {ANALYTICS_RANGE_LABELS[preset]}
        </button>
      ))}

      <div className={styles.customWrap} ref={wrapRef}>
        <button
          type="button"
          className={`${styles.rangeBtn} ${custom ? styles.rangeBtnActive : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M2.25 6.5h11.5M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {custom ? describeRange(range) : "Custom"}
        </button>

        {open && (
          <div className={styles.customPanel} role="dialog" aria-label="Custom date range">
            <div className={styles.customFields}>
              <label className={styles.customField}>
                <span className={styles.customFieldLabel}>Start</span>
                <input
                  type="date"
                  className={styles.customInput}
                  value={start}
                  max={end || today}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>

              <label className={styles.customField}>
                <span className={styles.customFieldLabel}>End</span>
                <input
                  type="date"
                  className={styles.customInput}
                  value={end}
                  min={start || undefined}
                  max={today}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
            </div>

            <p className={error ? styles.customError : styles.customHint}>
              {error ?? `${formatDate(start)} – ${formatDate(end)}, inclusive.`}
            </p>

            <div className={styles.customActions}>
              <button type="button" className={styles.customCancel} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.customApply}
                onClick={apply}
                disabled={Boolean(error)}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
