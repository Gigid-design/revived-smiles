/**
 * Number formatting for the analytics tables.
 *
 * One rule runs through all of it: a metric with nothing behind it renders as
 * an em dash, never as zero. "0.0 CSAT" and "no CSAT responses yet" are very
 * different facts about an agent, and the table must not conflate them.
 */

import type { AnalyticsRange, MetricUnit } from "@/lib/api";
import { ANALYTICS_RANGE_LABELS, analyticsRangeDays } from "@/lib/api";

export const EMPTY = "—";

/**
 * Durations, in the units a support lead reads them in: seconds under a
 * minute, minutes under an hour, hours and minutes above.
 */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || Number.isNaN(minutes)) return EMPTY;
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;

  if (minutes < 60) {
    const whole = Math.floor(minutes);
    const seconds = Math.round((minutes - whole) * 60);
    return seconds === 0 ? `${whole}m` : `${whole}m ${String(seconds).padStart(2, "0")}s`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes - hours * 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatCount(value: number | null): string {
  if (value === null || Number.isNaN(value)) return EMPTY;
  return Math.round(value).toLocaleString();
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return EMPTY;
  return `${value.toFixed(2)}%`;
}

export function formatCsat(value: number | null): string {
  if (value === null || Number.isNaN(value)) return EMPTY;
  return value.toFixed(1);
}

/** A plain one-decimal rate, e.g. tickets per online hour. */
export function formatDecimal(value: number | null): string {
  if (value === null || Number.isNaN(value)) return EMPTY;
  return value.toFixed(1);
}

export function formatMetric(value: number | null, unit: MetricUnit): string {
  if (unit === "minutes") return formatMinutes(value);
  if (unit === "percent") return formatPercent(value);
  if (unit === "csat") return formatCsat(value);
  if (unit === "decimal") return formatDecimal(value);
  return formatCount(value);
}

/** Short axis label for a bucket start date — "14 Aug". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** The range caption under the date picker — "14 Aug – 20 Aug 2026". */
export function formatDayRange(days: string[]): string {
  if (days.length === 0) return "";

  const first = new Date(days[0]);
  const last = new Date(days[days.length - 1]);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };

  return `${first.toLocaleDateString("en-GB", opts)} – ${last.toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  })}`;
}

/** A calendar date in the form `<input type="date">` and the contract both use. */
export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today at UTC midnight — the last day any range may include. */
export function todayUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** "14 Aug 2026", for the endpoints of a custom range. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * What the picker's active pill reads.
 *
 * A preset keeps its name; a custom window shows the dates the user picked
 * rather than a day count, because "1 Aug – 25 Aug" is the thing they chose and
 * "25 days" is only a consequence of it.
 */
export function describeRange(range: AnalyticsRange): string {
  if (range.preset !== "custom") return ANALYTICS_RANGE_LABELS[range.preset];
  return `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

/** "vs previous 7 days" — the comparison the company band's deltas are against. */
export function describePreviousWindow(range: AnalyticsRange): string {
  const days = analyticsRangeDays(range);
  return days === null ? "vs the previous window" : `vs previous ${days} days`;
}

/** A change against the previous window, ready to render. */
export interface Delta {
  /** Signed percentage, e.g. "+12.4%". */
  text: string;
  direction: "up" | "down" | "flat";
  /** Whether the move is the good one for this metric. Null when flat. */
  good: boolean | null;
}

/**
 * The change from `previous` to `value`.
 *
 * Returns null when there is nothing honest to show: no previous figure, or a
 * previous of zero, where every percentage is infinite. `lowerIsBetter` decides
 * only the colour — the arrow always follows the number, so a response time
 * that fell shows a down arrow in green rather than an up arrow that would read
 * as "worse".
 */
export function formatDelta(
  value: number | null,
  previous: number | null,
  lowerIsBetter: boolean,
): Delta | null {
  if (value === null || previous === null || previous === 0) return null;

  const pct = ((value - previous) / Math.abs(previous)) * 100;

  /* Under half a percent is noise, and an arrow on noise invites a meeting. */
  if (Math.abs(pct) < 0.5) return { text: "no change", direction: "flat", good: null };

  const rose = pct > 0;
  return {
    text: `${rose ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`,
    direction: rose ? "up" : "down",
    good: lowerIsBetter ? !rose : rose,
  };
}

/**
 * Escapes one CSV field. Quotes anything holding a comma, quote or newline,
 * and doubles embedded quotes — the rules from RFC 4180.
 */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Builds a CSV document from a header row and body rows. */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(csvField).join(",")).join("\n");
}

/**
 * Hands the browser a file.
 *
 * The download is built entirely in the page from data already on screen —
 * nothing is sent anywhere to produce it.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
