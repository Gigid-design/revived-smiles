"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { productLabel } from "@/app/context/productConfig";
import { useRealtimeContext } from "../AdminShell";

const PAGE_SIZE = 25;
const STATUS_OPTIONS: { value: SubmissionStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Can't Proceed" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "in_fabrication", label: "In Fabrication" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubmissionsListPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const { lastEvent } = useRealtimeContext();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total } = await api.submissions.list({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
        search: searchQuery.trim(),
      });
      setSubmissions(rows);
      setTotalCount(total);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSubmissions(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch on mount
  }, [fetchSubmissions, lastEvent]);

  /* Fetch unread message counts for visible submissions */
  useEffect(() => {
    async function fetchUnreadCounts() {
      if (submissions.length === 0) return;
      try {
        const counts = await api.messages.unreadCounts(submissions.map((s) => s.id));
        setUnreadCounts(counts);
      } catch {}
    }
    fetchUnreadCounts();
  }, [submissions, lastEvent]);


  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const startIdx = page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className={styles.page}>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as SubmissionStatus | ""); setPage(0); }}
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
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            aria-label="Search submissions"
          />
        </div>

        <span className={styles.resultCount}>
          {totalCount} submission{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Loading submissions…</div>
        ) : submissions.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery || statusFilter
              ? "No submissions match your filters."
              : "No submissions yet."}
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className={styles.checkbox} disabled title="Bulk actions coming soon" />
                  </th>
                  <th>Patient</th>
                  <th>Order</th>
                  <th>State</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Messages</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <input type="checkbox" className={styles.checkbox} aria-label={`Select ${sub.name || sub.email}`} />
                    </td>
                    <td>
                      <Link href={`/admin/submissions/${sub.id}`} className={styles.nameCell} style={{ textDecoration: "none" }}>
                        <span className={styles.nameText}>{sub.name || "—"}</span>
                        <span className={styles.emailText}>{sub.email}</span>
                      </Link>
                    </td>
                    <td><span className={styles.dateText}>{sub.orderNumber || "—"}</span></td>
                    <td>{sub.state || "—"}</td>
                    <td>
                      {sub.products?.length
                        ? sub.products.map((p) => (
                            <span key={p} className={styles.productBadge}>{productLabel(p)}</span>
                          ))
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td>
                      <span className={styles.dateText}>
                        {sub.createdAt ? formatDate(sub.createdAt) : "—"}
                      </span>
                    </td>
                    <td>
                      {unreadCounts[sub.id] ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: "1.375rem", height: "1.375rem", borderRadius: "9999px",
                          background: "#ef4444", color: "#fff", fontSize: "0.6875rem",
                          fontWeight: 700, padding: "0 0.375rem",
                        }}>{unreadCounts[sub.id]}</span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/submissions/${sub.id}`} className={styles.viewBtn}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>
                  Showing {startIdx}–{endIdx} of {totalCount}
                </span>
                <div className={styles.paginationBtns}>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
