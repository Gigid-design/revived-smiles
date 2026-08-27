"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { StatsCard } from "./components/StatsCard";
import { StatusBadge } from "./components/StatusBadge";
import { api, canAccess } from "@/lib/api";
import type { Submission, SubmissionStats } from "@/lib/api";
import { productLabel, productLabels } from "@/app/context/productConfig";
import { useAdminUser } from "./components/AdminAuthGuard";
import { SuggestionBox } from "./components/SuggestionBox";
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
  /* The dashboard is home for every role, but the queue on it is patient work
     that opens into chat. A role that cannot reach chat has no business
     browsing it — Gitai on the shipping team: "we don't need them to have
     access to everything else." Their own Tasks queue is not built yet, so
     they get the box and a note rather than someone else's inbox. */
  const seesQueue = adminUser ? canAccess(adminUser.role, "chat") : false;
  const { lastEvent } = useRealtimeContext();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!seesQueue) {
      setLoading(false);
      return;
    }
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
  }, [seesQueue]);

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
            {/* Never "all caught up" to a role whose counters were never
                fetched — that reads as a cleared queue, not an absent one. */}
            {!seesQueue
              ? "Signed in — there's nothing waiting on you here."
              : stats.pending > 0
                ? `You have ${stats.pending} submission${stats.pending !== 1 ? "s" : ""} awaiting review.`
                : "All caught up — no pending reviews right now."}
          </p>
        </div>
      </section>

      {!seesQueue && (
        <section className={styles.roleNote}>
          <h2 className={styles.roleNoteTitle}>Your queue isn&apos;t here yet</h2>
          <p className={styles.roleNoteBody}>
            The shipping task list — what to send, for which order, and who packed it — is still
            being built. Until it lands there&apos;s nothing here for your role: the patient queue
            belongs to the support team, so it isn&apos;t shown. The suggestion box below is yours.
          </p>
        </section>
      )}

      {seesQueue && (
      <>
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
          title="Awaiting Review"
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

      {/* Latest impressions — expand for a quick look, or open the conversation */}
      <section className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <div>
            <h2 className={styles.recentTitle}>Latest Impressions</h2>
            <p className={styles.recentSubtitle}>The most recent submissions — expand for a quick look, or open one to handle it in chat.</p>
          </div>
          <Link href="/admin/chat" className={styles.viewAllLink}>
            Open chat →
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span>No orders yet. They&apos;ll appear here as patients complete their intake.</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.expandHead}></th>
                <th>Patient</th>
                <th>Order</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Msgs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const open = expandedId === sub.id;
                const photoCount =
                  (sub.closeBitePhotos?.length ?? 0) +
                  (sub.openBitePhotos?.length ?? 0) +
                  (sub.impressionPhotos?.length ?? 0);
                const teeth = sub.teethNotSure
                  ? "Not sure"
                  : sub.selectedTeeth?.length
                    ? `${sub.selectedTeeth.length} selected`
                    : "—";

                return (
                  <Fragment key={sub.id}>
                    <tr
                      className={styles.orderRow}
                      data-open={open || undefined}
                      onClick={() => setExpandedId(open ? null : sub.id)}
                    >
                      <td className={styles.expandCell}>
                        <span className={styles.expandChevron} data-open={open || undefined} aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/chat?id=${sub.id}`}
                          className={styles.nameCell}
                          style={{ textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className={styles.nameText}>{sub.name || "—"}</span>
                          <span className={styles.emailText}>{sub.email}</span>
                        </Link>
                      </td>
                      <td>
                        {sub.products?.length ? (
                          <span className={styles.orderCell}>
                            {sub.products.map((p) => (
                              <span key={p} className={styles.productPill}>{productLabel(p)}</span>
                            ))}
                          </span>
                        ) : (
                          "—"
                        )}
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
                          <span className={styles.msgBadge}>{unreadCounts[sub.id]}</span>
                        ) : (
                          <span className={styles.msgDash}>—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/chat?id=${sub.id}`}
                          className={styles.viewBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
                      </td>
                    </tr>

                    {open && (
                      <tr className={styles.detailRow}>
                        <td colSpan={7}>
                          <div className={styles.detailPanel}>
                            <div className={styles.detailGrid}>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Order #</span>
                                <span className={styles.detailValue}>{sub.orderNumber || "—"}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Products</span>
                                <span className={styles.detailValue}>{productLabels(sub.products ?? []) || "—"}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>State</span>
                                <span className={styles.detailValue}>{sub.state || "—"}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Tooth shade</span>
                                <span className={styles.detailValue}>{sub.whiteShade || "—"}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Gum shade</span>
                                <span className={styles.detailValue}>{sub.gumShade || "—"}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Teeth</span>
                                <span className={styles.detailValue}>{teeth}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Photos</span>
                                <span className={styles.detailValue}>{photoCount || 0} uploaded</span>
                              </div>
                            </div>

                            {sub.notes && (
                              <p className={styles.detailNotes}>
                                <span className={styles.detailLabel}>Patient note</span>
                                {sub.notes}
                              </p>
                            )}

                            {sub.reviewedAt && sub.reviewNotes && (
                              <p className={styles.reviewedNote}>
                                <span className={styles.detailLabel}>
                                  Review notes{sub.reviewedBy ? ` · ${sub.reviewedBy}` : ""}
                                </span>
                                {sub.reviewNotes}
                              </p>
                            )}

                            <div className={styles.detailFooter}>
                              <Link href={`/admin/submissions/${sub.id}`} className={styles.detailRecordLink}>
                                Full record
                              </Link>
                              <Link href={`/admin/chat?id=${sub.id}`} className={styles.detailViewLink}>
                                Open in chat →
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      </>
      )}

      {/* Staff idea box — everyone writes, managers read (Aug 25). */}
      <SuggestionBox />
    </div>
  );
}
