"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { StatusBadge } from "../../components/StatusBadge";
import { PhotoViewer } from "../../components/PhotoViewer";
import { CompletenessCheck } from "../../components/CompletenessCheck";
import { AnalysisResults } from "../../components/AnalysisResults";
import { useAdminUser } from "../../components/AdminAuthGuard";
import { api, ApiError } from "@/lib/api";
import type { PhotoType, Submission, SubmissionStatus } from "@/lib/api";
import { PRODUCTS, CATEGORY_LABELS, productLabel, productLabels, productsSubtotalCents, formatUsd, type ProductConfig } from "@/app/context/productConfig";
import { useChat } from "@/app/hooks/useChat";
import { ReviewCriteriaDrawer } from "../../components/ReviewCriteriaDrawer";

/* ═══════════════════════════════════════════════════════════════════════════
   SVG Icons — minimal, consistent stroke weight
   ═══════════════════════════════════════════════════════════════════════════ */

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8a5.5 5.5 0 019.3-3.96" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.5 8a5.5 5.5 0 01-9.3 3.96" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

interface LightboxState {
  photos: { url: string; label: string }[];
  index: number;
}

type DetailTab = "patient" | "chat" | "photos";

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const CLOSE_BITE_LABELS = ["Close Bite — Front", "Close Bite — Left", "Close Bite — Right"];
const OPEN_BITE_LABELS = ["Open Bite — Front", "Open Bite — Left"];
const IMPRESSION_LABELS = ["Upper Impression 1", "Upper Impression 2", "Lower Impression 1", "Lower Impression 2"];

const NOTE_TEMPLATES = [
  "Impression photos are blurry — please retake",
  "Missing teeth selection — please update",
  "Upper impression not visible — please retake",
  "Photos are too dark — please retake in better lighting",
  "Bite photos do not show all required angles",
];

const WORKFLOW_STEPS = [
  { key: "pending",        label: "Pending" },
  { key: "in_review",      label: "Review" },
  { key: "approved",       label: "Approved" },
  { key: "in_fabrication", label: "Fabrication" },
  { key: "shipped",        label: "Shipped" },
  { key: "completed",      label: "Complete" },
];

const STATUS_META: Record<string, { title: string; desc: string }> = {
  pending:            { title: "Review Needed",          desc: "New submission awaiting review" },
  in_review:          { title: "Under Review",           desc: "Review photos and patient info" },
  approved:           { title: "Ready for Fabrication",  desc: "Send this order to production" },
  changes_requested:  { title: "Changes Requested",      desc: "Waiting for patient to update" },
  rejected:           { title: "Rejected",               desc: "No further actions" },
  in_fabrication:     { title: "In Production",          desc: "Add tracking when ready" },
  shipped:            { title: "In Transit",             desc: "Confirm delivery when received" },
  completed:          { title: "Order Delivered",        desc: "Complete" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function resolveProduct(id: string): ProductConfig | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function stepIndex(status: string): number {
  return WORKFLOW_STEPS.findIndex((s) => s.key === status);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SubmissionDetailPage() {
  const params = useParams();
  const adminUser = useAdminUser();
  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("patient");
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [reviewDrawer, setReviewDrawer] = useState<{
    photoUrl: string;
    photoLabel: string;
    photoType: PhotoType;
  } | null>(null);

  const { unreadCount, messages } = useChat(id, "admin", adminUser?.name ?? "Admin");

  /* ── Data fetch ── */
  useEffect(() => {
    async function fetchSubmission() {
      try {
        const data = await api.submissions.getById(id);
        setSubmission(data);
        setReviewNotes(data.reviewNotes || "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmission();
  }, [id]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Status update (unchanged business logic) ── */
  async function handleStatusUpdate(newStatus: SubmissionStatus) {
    if (!submission || saving) return;

    if ((newStatus === "rejected" || newStatus === "changes_requested") && !reviewNotes.trim()) {
      showToast(
        "Please provide review notes before " +
          (newStatus === "rejected" ? "rejecting" : "requesting changes") + ".",
        "error",
      );
      return;
    }

    if (newStatus === "rejected") {
      const confirmed = window.confirm(
        "Are you sure you want to reject this submission? This action can be reversed later.",
      );
      if (!confirmed) return;
    }

    setSaving(true);
    const reviewerName = adminUser?.name ?? "Admin User";

    let updated: Submission;
    try {
      updated = await api.submissions.updateStatus(submission.id, {
        status: newStatus,
        reviewedBy: reviewerName,
        reviewNotes: reviewNotes.trim() || undefined,
        trackingNumber:
          newStatus === "shipped" && trackingNumber.trim() ? trackingNumber.trim() : undefined,
      });
    } catch (err) {
      console.error("Update failed:", err);
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
      setSaving(false);
      return;
    }

    setSubmission(updated);
    setSaving(false);

    const statusLabels: Record<string, string> = {
      approved: "approved",
      rejected: "rejected",
      changes_requested: "marked for changes",
      in_fabrication: "moved to fabrication",
      shipped: "marked as shipped",
      completed: "marked as complete",
    };
    showToast(`Submission ${statusLabels[newStatus] ?? "updated"} successfully.`);
  }

  function openLightbox(photos: { url: string; label: string }[], index: number) {
    setLightbox({ photos, index });
  }

  if (loading) return <div className={styles.loading}>Loading submission…</div>;
  if (error || !submission) return <div className={styles.error}>{error || "Not found."}</div>;

  /* ── Derived data ── */
  const status = submission.status || "pending";
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const currentStepIdx = stepIndex(status);
  const isBranchStatus = status === "changes_requested" || status === "rejected";
  const isReviewable = status === "pending" || status === "in_review" || status === "changes_requested";

  const productConfigs = (submission.products ?? []).map(resolveProduct).filter(Boolean) as ProductConfig[];
  const needsShade = productConfigs.some((c) => c.needsShade);
  const needsTeethChart = productConfigs.some((c) => c.needsTeethChart);
  const primaryProductLabel = productLabels(submission.products ?? []) || "—";

  const closeBitePhotos = (submission.closeBitePhotos ?? []).map((url, i) => ({
    url, label: CLOSE_BITE_LABELS[i] || `Close Bite ${i + 1}`,
  }));

  const openBitePhotos = (submission.openBitePhotos ?? []).map((url, i) => ({
    url, label: OPEN_BITE_LABELS[i] || `Open Bite ${i + 1}`,
  }));

  const impressionPhotos = (submission.impressionPhotos ?? []).map((url, i) => ({
    url, label: IMPRESSION_LABELS[i] || `Impression ${i + 1}`,
  }));

  const allTeethPhotos = [...closeBitePhotos, ...openBitePhotos];
  const hasAnalysis = submission.photoAnalyses && Object.keys(submission.photoAnalyses).length > 0;

  function isStepCompleted(idx: number): boolean {
    if (isBranchStatus) return idx <= 1;
    return currentStepIdx > idx;
  }

  function isStepActive(idx: number): boolean {
    if (isBranchStatus) return false;
    return currentStepIdx === idx;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={styles.page}>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {/* Back Link */}
      <Link href="/admin/submissions" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Submissions
      </Link>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.patientName}>{submission.name || submission.email}</h1>
          <StatusBadge status={status} />
        </div>
        <div className={styles.headerSubline}>
          {submission.email} · {primaryProductLabel}
          {submission.createdAt && <> · {formatDateShort(submission.createdAt)}</>}
        </div>
      </div>

      {/* ── Workflow ── */}
      <div className={styles.workflowCard}>

        {/* Stepper — minimal dots */}
        <div className={styles.stepper}>
          {WORKFLOW_STEPS.map((step, i) => (
            <Fragment key={step.key}>
              {i > 0 && (
                <div className={`${styles.stepConnector} ${isStepCompleted(i) ? styles.stepConnectorCompleted : ""}`} />
              )}
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepDot} ${
                    isStepCompleted(i) ? styles.stepDotCompleted
                      : isStepActive(i) ? styles.stepDotActive : ""
                  }`}
                />
                <span className={`${styles.stepLabel} ${
                  isStepActive(i) ? styles.stepLabelActive
                    : isStepCompleted(i) ? styles.stepLabelCompleted : ""
                }`}>
                  {step.label}
                </span>
              </div>
            </Fragment>
          ))}
        </div>

        {/* Branch banner */}
        {isBranchStatus && (
          <div className={styles.branchBanner}>
            {status === "rejected" ? <IconX size={14} /> : <IconRefresh size={14} />}
            <div>
              <span className={styles.branchBannerLabel}>{meta.title}</span>
              {submission.reviewedAt && (
                <span className={styles.branchBannerMeta}>
                  {" "}— {formatDateTime(submission.reviewedAt)} by {submission.reviewedBy || "Admin"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Action Card ── */}
        {status === "completed" ? (
          <div className={styles.terminalCardSuccess}>
            <span className={styles.terminalIconSuccess}><IconCheck size={12} /></span>
            <div className={styles.terminalText}>
              <span className={styles.terminalTitle}>Order Delivered</span>
              <span className={styles.terminalSub}>
                {submission.completedAt ? `Completed ${formatDateTime(submission.completedAt)}` : "This order has been fulfilled."}
              </span>
            </div>
          </div>
        ) : status === "rejected" ? (
          <div className={styles.terminalCardRejected}>
            <span className={styles.terminalIconRejected}><IconX size={12} /></span>
            <div className={styles.terminalText}>
              <span className={styles.terminalTitle}>Submission Rejected</span>
              <span className={styles.terminalSub}>No further actions required.</span>
            </div>
          </div>
        ) : (
          <div className={styles.actionCard}>
            <div className={styles.actionCardHeader}>
              <span className={styles.actionCardTitle}>{meta.title}</span>
              <span className={styles.actionCardDesc}>{meta.desc}</span>
            </div>
            <div className={styles.actionCardBody}>

              {submission.reviewNotes && (
                <div className={styles.previousNotesBanner}>
                  <span className={styles.previousNotesLabel}>Previous Notes</span>
                  <span className={styles.previousNotesText}>{submission.reviewNotes}</span>
                  {submission.reviewedBy && (
                    <span className={styles.previousNotesMeta}>
                      by {submission.reviewedBy}
                      {submission.reviewedAt && <> · {formatDateTime(submission.reviewedAt)}</>}
                    </span>
                  )}
                </div>
              )}

              {isReviewable && (
                <>
                  <div className={styles.noteTemplates}>
                    {NOTE_TEMPLATES.map((tpl) => (
                      <button key={tpl} type="button" className={styles.noteTemplateBtn} onClick={() => setReviewNotes(tpl)}>
                        {tpl}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className={styles.notesTextarea}
                    placeholder="Add notes about this submission…"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />

                  <div className={styles.actionBtns}>
                    <button className={styles.btnApprove} onClick={() => handleStatusUpdate("approved")} disabled={saving}>
                      <IconCheck size={13} /> Approve
                    </button>
                    <button className={styles.btnChanges} onClick={() => handleStatusUpdate("changes_requested")} disabled={saving}>
                      <IconRefresh size={13} /> Request Changes
                    </button>
                    <button className={styles.btnReject} onClick={() => handleStatusUpdate("rejected")} disabled={saving}>
                      <IconX size={12} /> Reject
                    </button>
                  </div>
                </>
              )}

              {status === "approved" && (
                <button className={styles.btnApprove} onClick={() => handleStatusUpdate("in_fabrication")} disabled={saving}>
                  Start Fabrication
                </button>
              )}

              {status === "in_fabrication" && (
                <>
                  <div>
                    <label className={styles.infoLabel} htmlFor="tracking-number" style={{ marginBottom: "0.375rem", display: "block" }}>
                      Tracking Number
                    </label>
                    <input
                      id="tracking-number" type="text"
                      placeholder="Enter tracking number…"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className={styles.trackingInput}
                    />
                  </div>
                  <button className={styles.btnApprove} onClick={() => handleStatusUpdate("shipped")} disabled={saving}>
                    Confirm Shipment
                  </button>
                </>
              )}

              {status === "shipped" && (
                <button className={styles.btnApprove} onClick={() => handleStatusUpdate("completed")} disabled={saving}>
                  Confirm Delivery
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs: Patient Info | Chat | Photos & Analysis ── */}
      <div className={styles.detailTabBar}>
        {([
          { key: "patient" as const, label: "Patient Info" },
          { key: "chat" as const, label: "Chat History" },
          { key: "photos" as const, label: "Photos & Analysis" },
        ]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.detailTab} ${activeDetailTab === tab.key ? styles.detailTabActive : ""}`}
            onClick={() => setActiveDetailTab(tab.key)}
          >
            {tab.label}
            {tab.key === "chat" && unreadCount > 0 && (
              <span className={styles.tabBadge}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.detailTabContent}>

        {/* Tab: Patient Info (with completeness banner) */}
        {activeDetailTab === "patient" && (
          <div className={styles.detailTabInner}>
            {/* Completeness summary at top */}
            <CompletenessCheck submission={submission} defaultOpen={false} />

            <div className={styles.sectionDivider} />

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Full Name</span>
                <span className={styles.infoValue}>{submission.name || "—"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{submission.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>State</span>
                <span className={styles.infoValue}>{submission.state || "—"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Submitted</span>
                <span className={styles.infoValue}>
                  {submission.createdAt
                    ? new Date(submission.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "—"}
                </span>
              </div>

              <div className={styles.infoItemFull}>
                <span className={styles.infoLabel}>Products</span>
                <div className={styles.productList}>
                  {productConfigs.length > 0
                    ? productConfigs.map((c) => (
                        <span key={c.id} className={styles.productPill}>
                          {c.label}
                          <span className={styles.categoryTag}>{CATEGORY_LABELS[c.category]}</span>
                        </span>
                      ))
                    : (submission.products ?? []).length > 0
                      ? submission.products.map((p) => <span key={p} className={styles.productPill}>{productLabel(p)}</span>)
                      : <span className={styles.infoValue}>—</span>
                  }
                </div>
              </div>

              {needsShade && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>White Shade</span>
                    <span className={styles.infoValue}>
                      {submission.whiteShade || <span className={styles.missingField}>Not provided</span>}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Gum Shade</span>
                    <span className={styles.infoValue}>
                      {submission.gumShade || <span className={styles.missingField}>Not provided</span>}
                    </span>
                  </div>
                </>
              )}

              {needsTeethChart && (
                <div className={styles.infoItemFull}>
                  <span className={styles.infoLabel}>Selected Teeth</span>
                  {submission.selectedTeeth?.length ? (
                    <div className={styles.teethList}>
                      {submission.selectedTeeth.map((tooth) => (
                        <span key={tooth} className={styles.toothBadge}>{tooth}</span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.infoValue}>
                      {submission.teethNotSure ? "Not sure (requested help)" : <span className={styles.missingField}>Not provided</span>}
                    </span>
                  )}
                </div>
              )}

              {submission.trackingNumber && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Tracking Number</span>
                  <span className={styles.infoValue}>{submission.trackingNumber}</span>
                </div>
              )}
              {submission.shippedAt && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Shipped</span>
                  <span className={styles.infoValue}>{formatDateTime(submission.shippedAt)}</span>
                </div>
              )}
              {submission.completedAt && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Completed</span>
                  <span className={styles.infoValue}>{formatDateTime(submission.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Chat History — threads for this order, each expands to detail */}
        {activeDetailTab === "chat" && (() => {
          const agentName = submission.reviewedBy || adminUser?.name || "Admin";
          const orderLabel = submission.orderNumber || submission.id;
          const ticketStatus = isReviewable ? "Open" : "Closed";
          const amount = formatUsd(productsSubtotalCents(submission.products ?? []));
          const created = formatDateShort(submission.createdAt);
          const photoCount = impressionPhotos.length;

          type HistoryItem = {
            id: string;
            kind: "chat" | "order";
            title: string;
            count: string;
            product?: string;
          };
          const historyItems: HistoryItem[] = [
            {
              id: "chat",
              kind: "chat",
              title: `Chat with ${submission.name || submission.email}`,
              count: `${messages.length} message${messages.length === 1 ? "" : "s"}`,
            },
            ...(submission.products ?? []).map((p, i) => ({
              id: `order-${i}`,
              kind: "order" as const,
              product: p,
              title: `Order ${orderLabel} — ${productLabel(p)}`,
              count: `${photoCount} photo${photoCount === 1 ? "" : "s"}`,
            })),
          ];

          return (
            <div className={styles.detailTabInner}>
              <div className={styles.historyList}>
                {historyItems.map((item) => {
                  const open = openHistory === item.id;
                  return (
                    <div key={item.id} className={`${styles.historyCard} ${open ? styles.historyCardOpen : ""}`}>
                      <button
                        type="button"
                        className={styles.historyRow}
                        aria-expanded={open}
                        onClick={() => setOpenHistory(open ? null : item.id)}
                      >
                        <span className={styles.historyIcon} aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M3 6l7 5 7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className={styles.historyMain}>
                          <span className={styles.historyTitle}>{item.title}</span>
                          <span className={styles.historyMetaRow}>
                            <span className={styles.historyStatus}>{ticketStatus}</span>
                            <span className={styles.historyAgent}>
                              <span className={styles.historyAgentChip} aria-hidden>{initialsOf(agentName)}</span>
                              {agentName}
                            </span>
                            <span className={styles.historyCount}>{item.count}</span>
                          </span>
                        </span>
                        <span className={styles.historyDate}>{created}</span>
                      </button>

                      {open && (
                        <div className={styles.historyDetail}>
                          {item.kind === "chat" ? (
                            /* Read-only transcript — history only, no composer. */
                            <div className={styles.transcript}>
                              {messages.length === 0 ? (
                                <p className={styles.transcriptEmpty}>No messages in this conversation.</p>
                              ) : (
                                messages.map((m) => {
                                  const isAdmin = m.senderRole === "admin";
                                  return (
                                    <div
                                      key={m.id}
                                      className={`${styles.msgWrap} ${isAdmin ? styles.msgWrapOwn : styles.msgWrapOther}`}
                                    >
                                      <span className={styles.msgSender}>
                                        {m.senderName || (isAdmin ? "Care Team" : "Patient")}
                                      </span>
                                      <div className={`${styles.msgBubble} ${isAdmin ? styles.msgBubbleOwn : styles.msgBubbleOther}`}>
                                        {m.body}
                                      </div>
                                      <span className={styles.msgTime}>{formatDateTime(m.createdAt)}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : (
                            <>
                              <div className={styles.historyDetailHead}>
                                <span className={styles.historyAgentChip} aria-hidden>{initialsOf(agentName)}</span>
                                <span className={styles.historyDetailAgent}>{agentName}</span>
                                <span className={styles.historyDetailDate}>{created}</span>
                              </div>
                              <h4 className={styles.historyDetailTitle}>Impression Kit Review</h4>
                              <dl className={styles.historyFields}>
                                <div className={styles.historyField}>
                                  <dt>Order ID</dt>
                                  <dd>{orderLabel}</dd>
                                </div>
                                <div className={styles.historyField}>
                                  <dt>Product</dt>
                                  <dd>{item.product ? productLabel(item.product) : "—"}</dd>
                                </div>
                                <div className={styles.historyField}>
                                  <dt>Status</dt>
                                  <dd><StatusBadge status={submission.status} /></dd>
                                </div>
                                <div className={styles.historyField}>
                                  <dt>Amount</dt>
                                  <dd>{amount}</dd>
                                </div>
                                <div className={styles.historyField}>
                                  <dt>Created</dt>
                                  <dd>{created}</dd>
                                </div>
                              </dl>

                              {impressionPhotos.length > 0 && (
                                <div className={styles.historyPhotos}>
                                  <div className={styles.photoSectionTitle}>Impression Photos</div>
                                  <div className={styles.photoGrid}>
                                    {impressionPhotos.map((photo, idx) => (
                                      <div
                                        key={`${photo.url}-${idx}`}
                                        className={styles.photoThumb}
                                        onClick={() => openLightbox(impressionPhotos, idx)}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo.url} alt={photo.label} />
                                        <div className={styles.photoThumbLabel}>{photo.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tab: Photos & Analysis */}
        {activeDetailTab === "photos" && (
          <div className={styles.detailTabInner}>
            {closeBitePhotos.length > 0 && (
              <div className={styles.photoSection}>
                <div className={styles.photoSectionTitle}>Close Bite</div>
                <div className={styles.photoGrid}>
                  {closeBitePhotos.map((photo, idx) => {
                    const pType: PhotoType = idx === 0 ? "close-bite-front" : "close-bite-side";
                    const analysis = submission.photoAnalyses?.[pType];
                    return (
                      <div key={photo.url} className={styles.photoThumb} onClick={() => openLightbox(allTeethPhotos, idx)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.label} />
                        {analysis && (
                          <span className={`${styles.photoBadge} ${analysis.pass ? styles.photoBadgePass : styles.photoBadgeFail}`}>
                            {analysis.pass ? "PASS" : "FAIL"}
                          </span>
                        )}
                        <div className={styles.photoThumbLabel}>{photo.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {openBitePhotos.length > 0 && (
              <div className={styles.photoSection}>
                <div className={styles.photoSectionTitle}>Open Bite</div>
                <div className={styles.photoGrid}>
                  {openBitePhotos.map((photo, idx) => {
                    const pType: PhotoType = idx === 0 ? "open-bite-front" : "open-bite-side";
                    const analysis = submission.photoAnalyses?.[pType];
                    return (
                      <div key={photo.url} className={styles.photoThumb} onClick={() => openLightbox(allTeethPhotos, closeBitePhotos.length + idx)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.label} />
                        {analysis && (
                          <span className={`${styles.photoBadge} ${analysis.pass ? styles.photoBadgePass : styles.photoBadgeFail}`}>
                            {analysis.pass ? "PASS" : "FAIL"}
                          </span>
                        )}
                        <div className={styles.photoThumbLabel}>{photo.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {impressionPhotos.length > 0 && (
              <div className={styles.photoSection}>
                <div className={styles.photoSectionTitle}>Impression Kit</div>
                <div className={styles.photoGrid}>
                  {impressionPhotos.map((photo, idx) => (
                    <div key={photo.url} className={styles.photoThumb} onClick={() => openLightbox(impressionPhotos, idx)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.label} />
                      <div className={styles.photoThumbLabel}>{photo.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTeethPhotos.length === 0 && impressionPhotos.length === 0 && (
              <div className={styles.noPhotos}>No photos submitted.</div>
            )}

            {hasAnalysis && (
              <>
                <div className={styles.sectionDivider} />
                <div className={styles.sectionHeading}>AI Quality Analysis</div>
                <AnalysisResults
                  photoAnalyses={submission.photoAnalyses}
                  closeBitePhotos={closeBitePhotos}
                  openBitePhotos={openBitePhotos}
                  defaultOpen={true}
                  onReviewCriteria={(photoUrl, photoLabel, photoType) =>
                    setReviewDrawer({ photoUrl, photoLabel, photoType })
                  }
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Review Criteria Drawer */}
      <ReviewCriteriaDrawer
        open={!!reviewDrawer}
        onClose={() => setReviewDrawer(null)}
        photoUrl={reviewDrawer?.photoUrl ?? ""}
        photoLabel={reviewDrawer?.photoLabel ?? ""}
        photoType={reviewDrawer?.photoType ?? ""}
        analysis={reviewDrawer ? (submission.photoAnalyses?.[reviewDrawer.photoType] ?? null) : null}
      />

      {/* Lightbox */}
      {lightbox && (
        <PhotoViewer
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
