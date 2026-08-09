"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { AdjustmentRequest, AdjustmentStatus, Submission } from "@/lib/api";
import { productLabel } from "@/app/context/productConfig";
import { ADJ_STATUS_META, issueLabel, photoList } from "./format";
import { useRealtimeContext } from "../AdminShell";

const STATUS_OPTIONS: { value: AdjustmentStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** Patient identity, joined from the submission the request is raised against. */
interface Patient {
  name: string | null;
  email: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdjStatusBadge({ status }: { status: AdjustmentStatus }) {
  const meta = ADJ_STATUS_META[status] ?? ADJ_STATUS_META.pending;
  return (
    <span className={styles.badge} style={{ background: meta.bg, color: meta.text }}>
      {meta.label}
    </span>
  );
}

export default function AdjustmentsListPage() {
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AdjustmentStatus | "">("");
  const [search, setSearch] = useState("");
  const { lastEvent } = useRealtimeContext();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      /* The queue, plus the submissions it points at so each row can name its
         patient — the request record itself is denormalised only to the order,
         not the person. */
      const [rows, subs] = await Promise.all([
        api.adjustments.list(statusFilter),
        api.submissions.list({ page: 0, pageSize: 100 }),
      ]);
      const map: Record<string, Patient> = {};
      for (const s of subs.rows as Submission[]) {
        map[s.id] = { name: s.name, email: s.email };
      }
      setRequests(rows);
      setPatients(map);
    } catch (err) {
      console.error("Failed to load adjustment requests:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch
  }, [load, lastEvent]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const p = patients[r.submissionId];
      return (
        (p?.name ?? "").toLowerCase().includes(q) ||
        (p?.email ?? "").toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q) ||
        productLabel(r.product).toLowerCase().includes(q)
      );
    });
  }, [requests, patients, search]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className={styles.page}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdjustmentStatus | "")}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className={styles.searchInput}>
          <span className={styles.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search patient, request no. or product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search adjustment requests"
          />
        </div>

        <span className={styles.resultCount}>
          {pendingCount} awaiting review · {requests.length} total
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Loading adjustment requests…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {search || statusFilter
              ? "No adjustment requests match your filters."
              : "No adjustment requests yet."}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Request</th>
                <th>Product</th>
                <th>Issues</th>
                <th>Photos</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = patients[r.submissionId];
                const photos = photoList(r.photos).length;
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/admin/adjustments/${r.id}`} className={styles.nameCell}>
                        <span className={styles.nameText}>{p?.name || "—"}</span>
                        <span className={styles.emailText}>{p?.email || r.submissionId}</span>
                      </Link>
                    </td>
                    <td>
                      <span className={styles.mono}>{r.requestNumber}</span>
                    </td>
                    <td>
                      <span className={styles.productBadge}>{productLabel(r.product)}</span>
                    </td>
                    <td>
                      <div className={styles.issueTags}>
                        {r.issues.map((i) => (
                          <span key={i} className={styles.issueTag}>
                            {issueLabel(i)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={styles.photoCount}>{photos}</span>
                    </td>
                    <td>
                      <AdjStatusBadge status={r.status} />
                    </td>
                    <td>
                      <span className={styles.dateText}>
                        {r.submittedAt ? formatDate(r.submittedAt) : formatDate(r.createdAt)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/adjustments/${r.id}`} className={styles.viewBtn}>
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
