/**
 * Number formatting for the analytics tables.
 *
 * One rule runs through all of it: a metric with nothing behind it renders as
 * an em dash, never as zero. "0.0 CSAT" and "no CSAT responses yet" are very
 * different facts about an agent, and the table must not conflate them.
 */

import type { MetricUnit } from "@/lib/api";

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
