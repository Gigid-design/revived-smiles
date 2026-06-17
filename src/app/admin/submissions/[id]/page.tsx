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
import { getSupabase } from "@/lib/supabase";
import { PRODUCTS, CATEGORY_LABELS, type ProductConfig } from "@/app/context/productConfig";
import { ChatPanel } from "@/app/components/ChatPanel";
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

interface SubmissionDetail {
  id: string;
  email: string;
  name: string;
  state: string;
  products: string[];
  white_shade: string;
  gum_shade: string;
  selected_teeth: number[];
  teeth_not_sure: boolean;
  impression_photos: string[];
  close_bite_photos: string[];
  open_bite_photos: string[];
  status: string;
  review_notes: string;
  reviewed_by: string;
  reviewed_at: string;
  tracking_number: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  photo_analyses: Record<string, {
    checks: { id: string; label: string; pass: boolean; detail: string; observation?: string }[];
    summary: string | null;
    teethCenter: { x: number; y: number } | null;
    pass: boolean;
  }>;
}

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

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("patient");
  const [reviewDrawer, setReviewDrawer] = useState<{
    photoUrl: string;
    photoLabel: string;
    photoType: string;
  } | null>(null);

  const { unreadCount } = useChat(id, "admin", adminUser?.name ?? "Admin");

  /* ── Data fetch ── */
  useEffect(() => {
    async function fetchSubmission() {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Submission not found.");
        setLoading(false);
        return;
      }

      setSubmission(data as SubmissionDetail);
      setReviewNotes(data.review_notes || "");
      setLoading(false);
    }

    fetchSubmission();
  }, [id]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Status update (unchanged business logic) ── */
  async function handleStatusUpdate(newStatus: string) {
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
    const supabase = getSupabase();
    const reviewerName = adminUser?.name ?? "Admin User";

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewNotes.trim()) {
      updatePayload.review_notes = reviewNotes.trim();
    }

    if (newStatus === "shipped" && trackingNumber.trim()) {
      updatePayload.tracking_number = trackingNumber.trim();
      updatePayload.shipped_at = new Date().toISOString();
    }

    if (newStatus === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("submissions")
      .update(updatePayload)
      .eq("id", submission.id);

    if (updateError) {
      console.error("Update failed:", updateError);
      showToast("Failed to update status. Please try again.", "error");
      setSaving(false);
      return;
    }

    setSubmission({
      ...submission,
      status: newStatus,
      review_notes: reviewNotes.trim() || submission.review_notes,
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
    });
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
  const primaryProductLabel = productConfigs.length > 0
    ? productConfigs.map((c) => c.label).join(", ")
    : (submission.products ?? []).join(", ") || "—";

  const closeBitePhotos = (submission.close_bite_photos ?? []).map((url, i) => ({
    url, label: CLOSE_BITE_LABELS[i] || `Close Bite ${i + 1}`,
  }));

  const openBitePhotos = (submission.open_bite_photos ?? []).map((url, i) => ({
    url, label: OPEN_BITE_LABELS[i] || `Open Bite ${i + 1}`,
  }));

  const impressionPhotos = (submission.impression_photos ?? []).map((url, i) => ({
    url, label: IMPRESSION_LABELS[i] || `Impression ${i + 1}`,
  }));

  const allTeethPhotos = [...closeBitePhotos, ...openBitePhotos];
  const hasAnalysis = submission.photo_analyses && Object.keys(submission.photo_analyses).length > 0;

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
          <StatusBadge status={status as "pending"} />
        </div>
        <div className={styles.headerSubline}>
          {submission.email} · {primaryProductLabel}
          {submission.created_at && <> · {formatDateShort(submission.created_at)}</>}
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
              {submission.reviewed_at && (
                <span className={styles.branchBannerMeta}>
                  {" "}— {formatDateTime(submission.reviewed_at)} by {submission.reviewed_by || "Admin"}
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
                {submission.completed_at ? `Completed ${formatDateTime(submission.completed_at)}` : "This order has been fulfilled."}
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

              {submission.review_notes && (
                <div className={styles.previousNotesBanner}>
                  <span className={styles.previousNotesLabel}>Previous Notes</span>
                  <span className={styles.previousNotesText}>{submission.review_notes}</span>
                  {submission.reviewed_by && (
                    <span className={styles.previousNotesMeta}>
                      by {submission.reviewed_by}
                      {submission.reviewed_at && <> · {formatDateTime(submission.reviewed_at)}</>}
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
          { key: "chat" as const, label: "Chat" },
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
                  {submission.created_at
                    ? new Date(submission.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
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
                      ? submission.products.map((p) => <span key={p} className={styles.productPill}>{p}</span>)
                      : <span className={styles.infoValue}>—</span>
                  }
                </div>
              </div>

              {needsShade && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>White Shade</span>
                    <span className={styles.infoValue}>
                      {submission.white_shade || <span className={styles.missingField}>Not provided</span>}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Gum Shade</span>
                    <span className={styles.infoValue}>
                      {submission.gum_shade || <span className={styles.missingField}>Not provided</span>}
                    </span>
                  </div>
                </>
              )}

              {needsTeethChart && (
                <div className={styles.infoItemFull}>
                  <span className={styles.infoLabel}>Selected Teeth</span>
                  {submission.selected_teeth?.length ? (
                    <div className={styles.teethList}>
                      {submission.selected_teeth.map((tooth) => (
                        <span key={tooth} className={styles.toothBadge}>{tooth}</span>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.infoValue}>
                      {submission.teeth_not_sure ? "Not sure (requested help)" : <span className={styles.missingField}>Not provided</span>}
                    </span>
                  )}
                </div>
              )}

              {submission.tracking_number && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Tracking Number</span>
                  <span className={styles.infoValue}>{submission.tracking_number}</span>
                </div>
              )}
              {submission.shipped_at && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Shipped</span>
                  <span className={styles.infoValue}>{formatDateTime(submission.shipped_at)}</span>
                </div>
              )}
              {submission.completed_at && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Completed</span>
                  <span className={styles.infoValue}>{formatDateTime(submission.completed_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Chat */}
        {activeDetailTab === "chat" && (
          <div className={styles.chatTabBody}>
            <ChatPanel
              submissionId={submission.id}
              currentRole="admin"
              currentName={adminUser?.name ?? "Admin"}
            />
          </div>
        )}

        {/* Tab: Photos & Analysis */}
        {activeDetailTab === "photos" && (
          <div className={styles.detailTabInner}>
            {closeBitePhotos.length > 0 && (
              <div className={styles.photoSection}>
                <div className={styles.photoSectionTitle}>Close Bite</div>
                <div className={styles.photoGrid}>
                  {closeBitePhotos.map((photo, idx) => {
                    const pType = idx === 0 ? "close-bite-front" : "close-bite-side";
                    const analysis = submission.photo_analyses?.[pType];
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
                    const pType = idx === 0 ? "open-bite-front" : "open-bite-side";
                    const analysis = submission.photo_analyses?.[pType];
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
                  photoAnalyses={submission.photo_analyses}
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
        analysis={reviewDrawer ? (submission.photo_analyses?.[reviewDrawer.photoType] ?? null) : null}
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
