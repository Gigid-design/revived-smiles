"use client";

/**
 * The table every analytics tab is built from.
 *
 * Sorting, the pinned average row, the heatmap tint and the header hints all
 * live here so the three tabs cannot drift apart visually. Callers describe
 * their columns; they do not lay out cells.
 */

import { useMemo, useState, type ReactNode } from "react";

import type { MetricUnit } from "@/lib/api";
import { EMPTY, formatMetric } from "../format";
import styles from "../page.module.css";

export interface Column<Row> {
  key: string;
  label: string;
  /** Shown in the ⓘ tooltip. Say what the metric counts, not what it is called. */
  hint?: string;
  unit?: MetricUnit;
  /** The sortable, heat-mappable number behind the cell. Null when absent. */
  value?: (row: Row) => number | null;
  /** Overrides the default formatted-number cell. */
  render?: (row: Row) => ReactNode;
  /**
   * The leading identity column — left aligned, never tinted, and the tiebreak
   * for sorting. Exactly one column should set it.
   */
  identity?: boolean;
  /** Flips the heatmap: for response times, small is good. */
  lowerIsBetter?: boolean;
}

interface MetricTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** The pinned summary row. Keyed by column key; omit to hide the row. */
  averages?: Record<string, number | null>;
  averageLabel?: string;
  averageHint?: string;
  heatmap?: boolean;
  /** Column key to sort by on first render. Defaults to the first metric column. */
  initialSort?: string;
  emptyMessage?: string;
}

type Direction = "asc" | "desc";

/**
 * Where `value` sits between the column's smallest and largest, 0–1.
 * Returns null when the column has no spread, so a uniform column stays white
 * instead of turning solid.
 */
function intensity(value: number, values: number[], lowerIsBetter: boolean): number | null {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return null;

  const position = (value - min) / (max - min);
  return lowerIsBetter ? 1 - position : position;
}

export function MetricTable<Row>({
  columns,
  rows,
  rowKey,
  averages,
  averageLabel = "Average",
  averageHint,
  heatmap = false,
  initialSort,
  emptyMessage = "Nothing to report for this range.",
}: MetricTableProps<Row>) {
  const identityKey = columns.find((column) => column.identity)?.key ?? columns[0]?.key;
  const firstMetric = columns.find((column) => !column.identity && column.value)?.key;

  const [sortKey, setSortKey] = useState<string>(initialSort ?? firstMetric ?? identityKey);
  const [direction, setDirection] = useState<Direction>("desc");

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.value) return rows;

    const read = column.value;
    return [...rows].sort((a, b) => {
      const left = read(a);
      const right = read(b);

      /* Rows without a value sink to the bottom in both directions — an agent
         with no CSAT is not "the worst", it is unranked. */
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;

      return direction === "desc" ? right - left : left - right;
    });
  }, [columns, rows, sortKey, direction]);

  /* One pass per column so the heatmap scale is per-column, not per-table:
     "closed tickets" and "CSAT" share no scale worth comparing. */
  const columnValues = useMemo(() => {
    const map: Record<string, number[]> = {};
    columns.forEach((column) => {
      if (!column.value || column.identity) return;
      const read = column.value;
      map[column.key] = rows
        .map(read)
        .filter((value): value is number => value !== null);
    });
    return map;
  }, [columns, rows]);

  function toggleSort(column: Column<Row>) {
    if (!column.value) return;
    if (column.key === sortKey) {
      setDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(column.key);
    setDirection("desc");
  }

  function cellContent(column: Column<Row>, row: Row): ReactNode {
    if (column.render) return column.render(row);
    if (!column.value) return EMPTY;
    return formatMetric(column.value(row), column.unit ?? "count");
  }

  if (rows.length === 0) {
    return <p className={styles.tableEmpty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = Boolean(column.value);
              const active = column.key === sortKey;
              return (
                <th
                  key={column.key}
                  className={column.identity ? styles.thIdentity : styles.thMetric}
                  aria-sort={active ? (direction === "desc" ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    className={`${styles.thButton} ${active ? styles.thButtonActive : ""}`}
                    onClick={() => toggleSort(column)}
                    disabled={!sortable}
                  >
                    <span>{column.label}</span>
                    {column.hint && (
                      <span className={styles.hint} title={column.hint} aria-label={column.hint}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M8 7.25v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
                        </svg>
                      </span>
                    )}
                    {active && (
                      <span className={styles.sortArrow} aria-hidden="true">
                        {direction === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {averages && (
            <tr className={styles.averageRow}>
              {columns.map((column) => {
                if (column.identity) {
                  return (
                    <td key={column.key} className={styles.tdIdentity}>
                      <span className={styles.averageLabel}>
                        {averageLabel}
                        {averageHint && (
                          <span className={styles.hint} title={averageHint} aria-label={averageHint}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
                              <path d="M8 7.25v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
                            </svg>
                          </span>
                        )}
                      </span>
                    </td>
                  );
                }
                return (
                  <td key={column.key} className={styles.tdMetric}>
                    {formatMetric(averages[column.key] ?? null, column.unit ?? "count")}
                  </td>
                );
              })}
            </tr>
          )}

          {sorted.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => {
                if (column.identity) {
                  return (
                    <td key={column.key} className={styles.tdIdentity}>
                      {cellContent(column, row)}
                    </td>
                  );
                }

                const raw = column.value ? column.value(row) : null;
                const values = columnValues[column.key] ?? [];
                const heat =
                  heatmap && raw !== null && values.length > 1
                    ? intensity(raw, values, Boolean(column.lowerIsBetter))
                    : null;

                return (
                  <td
                    key={column.key}
                    className={styles.tdMetric}
                    style={
                      heat === null
                        ? undefined
                        : { background: `rgba(30, 102, 255, ${(heat * 0.16).toFixed(3)})` }
                    }
                  >
                    {cellContent(column, row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
