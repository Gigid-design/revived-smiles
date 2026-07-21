"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { StatsCard } from "./components/StatsCard";
import { StatusBadge } from "./components/StatusBadge";
import { api } from "@/lib/api";
import type { Submission, SubmissionStats } from "@/lib/api";
import { productLabel } from "@/app/context/productConfig";
import { useAdminUser } from "./components/AdminAuthGuard";
import { useRealtimeContext } from "./AdminShell";

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({ total: 0, pending: 0, approved: 0, changesRequested: 0 });
  const [loading, setLoading] = useState(true);
  const adminUser = useAdminUser();
  const { lastEvent } = useRealtimeContext();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    try {
      const [counters, recent] = await Promise.all([
        api.submissions.stats(),
        api.submissions.list({ page: 0, pageSize: 10 }),
      ]);
      setStats(counters);
      setSubmissions(recent.rows);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch on mount
  }, [fetchData, lastEvent]);

  /* Fetch unread message counts */
  useEffect(() => {
    async function fetchUnreadCounts() {
      if (submissions.length === 0) return;
      try {
        const counts = await api.messages.unreadCounts(submissions.map((s) => s.id));
        setUnreadCounts(counts);
      } catch {}
    }
    fetchUnreadCounts();
  }, [submissions]);

  if (loading) {
    return <div className={styles.loading}>Loading dashboard…</div>;
  }

  return (
    <div className={styles.dashboard}>
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Welcome back{adminUser?.name ? `, ${adminUser.name.split(" ")[0]}` : ""}</h2>
          <p className={styles.welcomeSubtitle}>
            {stats.pending > 0
              ? `You have ${stats.pending} submission${stats.pending !== 1 ? "s" : ""} awaiting review.`
              : "All caught up — no pending reviews right now."}
          </p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className={styles.statsGrid}>
        <StatsCard
          title="Total Submissions"
          value={stats.total}
          color="var(--admin-primary)"
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 3h14a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8h8M7 11h8M7 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          }
        />
        <StatsCard
          title="Pending Review"
          value={stats.pending}
          color="var(--admin-warning)"
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          }
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          color="var(--admin-success)"
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        />
        <StatsCard
          title="Needs Changes"
          value={stats.changesRequested}
          color="#f97316"
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M11 8v4M11 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          }
        />
      </section>

      {/* Recent Submissions */}
      <section className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <h2 className={styles.recentTitle}>Recent Submissions</h2>
          <Link href="/admin/submissions" className={styles.viewAllLink}>
            View all →
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span>No submissions yet. They&apos;ll appear here as patients complete their intake.</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Patient</th>
                <th>State</th>
                <th>Products</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Msgs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <Link href={`/admin/submissions/${sub.id}`} className={styles.nameCell} style={{ textDecoration: "none" }}>
                      <span className={styles.nameText}>{sub.name || "—"}</span>
                      <span className={styles.emailText}>{sub.email}</span>
                    </Link>
                  </td>
                  <td>{sub.state || "—"}</td>
                  <td>
                    {sub.products?.length
                      ? sub.products.map((p) => (
                          <span key={p} style={{ display: 'inline-block', padding: '0.125rem 0.5rem', background: 'var(--admin-bg)', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500, marginRight: '0.25rem', marginBottom: '0.125rem' }}>{productLabel(p)}</span>
                        ))
                      : "—"}
                  </td>
                  <td>
                    <StatusBadge status={sub.status} />
                  </td>
                  <td>
                    <span className={styles.dateText}>
                      {sub.createdAt ? formatRelativeDate(sub.createdAt) : "—"}
                    </span>
                  </td>
                  <td>
                    {unreadCounts[sub.id] ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        minWidth: "1.25rem", height: "1.25rem", borderRadius: "9999px",
                        background: "#ef4444", color: "#fff", fontSize: "0.625rem",
                        fontWeight: 700, padding: "0 0.25rem",
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
        )}
      </section>
    </div>
  );
}
