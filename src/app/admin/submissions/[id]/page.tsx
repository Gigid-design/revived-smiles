"use client";

import { useEffect, useState } from "react";
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

function resolveProduct(id: string): ProductConfig | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [activeTab, setActiveTab] = useState<"review" | "chat">("review");
  const [reviewDrawer, setReviewDrawer] = useState<{
    photoUrl: string;
    photoLabel: string;
    photoType: string;
  } | null>(null);
  const { unreadCount } = useChat(id, "admin", adminUser?.name ?? "Admin");

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

  async function handleStatusUpdate(newStatus: string) {
    if (!submission || saving) return;

    if ((newStatus === "rejected" || newStatus === "changes_requested") && !reviewNotes.trim()) {
      showToast("Please provide review notes before " + (newStatus === "rejected" ? "rejecting" : "requesting changes") + ".", "error");
      return;
    }

    if (newStatus === "rejected") {
      const confirmed = window.confirm("Are you sure you want to reject this submission? This action can be reversed later.");
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
    };
    showToast(`Submission ${statusLabels[newStatus] ?? "updated"} successfully.`);
  }

  function openLightbox(photos: { url: string; label: string }[], index: number) {
    setLightbox({ photos, index });
  }

  if (loading) return <div className={styles.loading}>Loading submission…</div>;
  if (error || !submission) return <div className={styles.error}>{error || "Not found."}</div>;

  /* Resolve product configs */
  const productConfigs = (submission.products ?? []).map(resolveProduct).filter(Boolean) as ProductConfig[];
  const needsShade = productConfigs.some((c) => c.needsShade);
  const needsTeethChart = productConfigs.some((c) => c.needsTeethChart);

  /* Build photo arrays for display */
  const closeBitePhotos = (submission.close_bite_photos ?? []).map((url, i) => ({
    url,
    label: CLOSE_BITE_LABELS[i] || `Close Bite ${i + 1}`,
  }));

  const openBitePhotos = (submission.open_bite_photos ?? []).map((url, i) => ({
    url,
    label: OPEN_BITE_LABELS[i] || `Open Bite ${i + 1}`,
  }));

  const impressionPhotos = (submission.impression_photos ?? []).map((url, i) => ({
    url,
    label: IMPRESSION_LABELS[i] || `Impression ${i + 1}`,
  }));

  const allTeethPhotos = [...closeBitePhotos, ...openBitePhotos];

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {/* Back link */}
      <Link href="/admin/submissions" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Submissions
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.patientName}>{submission.name || submission.email}</h1>
          <StatusBadge status={(submission.status || "pending") as "pending"} />
        </div>
      </div>

      {/* Status Timeline */}
      <div className={styles.timeline}>
        <div className={styles.timelineItem}>
          <span className={`${styles.timelineDot} ${styles.timelineDotActive}`} />
          <span className={styles.timelineText}>
            Submitted {submission.created_at ? formatDateTime(submission.created_at) : "—"}
          </span>
        </div>
        {submission.reviewed_at && (
          <div className={styles.timelineItem}>
            <span className={`${styles.timelineDot} ${styles.timelineDotActive}`} />
            <span className={styles.timelineText}>
              Reviewed {formatDateTime(submission.reviewed_at)} by {submission.reviewed_by || "Admin"}
            </span>
          </div>
        )}
        <div className={styles.timelineItem}>
          <span className={`${styles.timelineDot} ${submission.status !== "pending" ? styles.timelineDotActive : ""}`} />
          <span className={styles.timelineText}>
            {submission.status === "pending" ? "Awaiting review" : `Status: ${submission.status.replace("_", " ")}`}
          </span>
        </div>
      </div>

      {/* Completeness Check */}
      <CompletenessCheck
        submission={submission}
        defaultOpen={submission.status === "pending"}
      />

      {/* AI Photo Analysis */}
      {submission.photo_analyses && Object.keys(submission.photo_analyses).length > 0 && (
        <AnalysisResults
          photoAnalyses={submission.photo_analyses}
          closeBitePhotos={closeBitePhotos}
          openBitePhotos={openBitePhotos}
          defaultOpen={submission.status === "pending"}
          onReviewCriteria={(photoUrl, photoLabel, photoType) =>
            setReviewDrawer({ photoUrl, photoLabel, photoType })
          }
        />
      )}

      {/* Two-column layout */}
      <div className={styles.columns}>
        {/* Left: Patient Information */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Patient Information</div>
            <div className={styles.cardBody}>
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
                      ? new Date(submission.created_at).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>

                {/* Products with category badges */}
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
                        ? submission.products.map((p) => (
                            <span key={p} className={styles.productPill}>{p}</span>
                          ))
                        : <span className={styles.infoValue}>—</span>
                    }
                  </div>
                </div>

                {/* Conditional: Shade fields */}
                {needsShade && (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>White Shade</span>
                      <div className={styles.swatchRow}>
                        <span className={styles.infoValue}>
                          {submission.white_shade || <span className={styles.missingField}>Not provided ⚠</span>}
                        </span>
                      </div>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Gum Shade</span>
                      <div className={styles.swatchRow}>
                        <span className={styles.infoValue}>
                          {submission.gum_shade || <span className={styles.missingField}>Not provided ⚠</span>}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Conditional: Teeth chart */}
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
                        {submission.teeth_not_sure
                          ? "Not sure (requested help)"
                          : <span className={styles.missingField}>Not provided ⚠</span>
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review + Chat Tabs */}
          <div className={styles.actionsCard}>
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "review" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("review")}
              >
                Review Actions
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "chat" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("chat")}
              >
                Chat
                {unreadCount > 0 && (
                  <span className={styles.tabBadge}>{unreadCount}</span>
                )}
              </button>
            </div>

            {activeTab === "review" && (
            <div className={styles.actionsBody}>
              {/* Existing notes display */}
              {submission.review_notes && (
                <div>
                  <div className={styles.existingNotesLabel}>Previous Review Notes</div>
                  <div className={styles.existingNotes}>
                    {submission.review_notes}
                  </div>
                  {submission.reviewed_by && (
                    <div className={styles.reviewMeta}>
                      Reviewed by {submission.reviewed_by}
                      {submission.reviewed_at && (
                        <> on {formatDateTime(submission.reviewed_at)}</>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Note templates */}
              <div>
                <label className={styles.infoLabel} style={{ marginBottom: "0.5rem", display: "block" }}>
                  Quick Notes
                </label>
                <div className={styles.noteTemplates}>
                  {NOTE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      className={styles.noteTemplateBtn}
                      onClick={() => setReviewNotes(tpl)}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={styles.infoLabel} htmlFor="review-notes" style={{ marginBottom: "0.5rem", display: "block" }}>
                  Review Notes
                </label>
                <textarea
                  id="review-notes"
                  className={styles.notesTextarea}
                  placeholder="Add notes about this submission…"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div className={styles.actionBtns}>
                <button
                  className={styles.btnApprove}
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={saving}
                >
                  ✓ Approve
                </button>
                <button
                  className={styles.btnChanges}
                  onClick={() => handleStatusUpdate("changes_requested")}
                  disabled={saving}
                >
                  ↻ Request Changes
                </button>
                <button
                  className={styles.btnReject}
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={saving}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
            )}

            {activeTab === "chat" && (
              <div className={styles.chatTabBody}>
                <ChatPanel
                  submissionId={submission?.id ?? null}
                  currentRole="admin"
                  currentName={adminUser?.name ?? "Admin"}
                />
              </div>
            )}

          </div>
        </div>

        {/* Right: Photos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Teeth Photos */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Teeth Photos</div>
            <div className={styles.cardBody}>
              {allTeethPhotos.length === 0 ? (
                <div className={styles.noPhotos}>No teeth photos submitted.</div>
              ) : (
                <>
                  {closeBitePhotos.length > 0 && (
                    <div className={styles.photoSection}>
                      <div className={styles.photoSectionTitle}>Close Bite</div>
                      <div className={styles.photoGrid}>
                        {closeBitePhotos.map((photo, idx) => {
                          const pType = idx === 0 ? "close-bite-front" : "close-bite-side";
                          const hasAnalysis = !!submission.photo_analyses?.[pType];
                          return (
                            <div
                              key={photo.url}
                              className={styles.photoThumb}
                              onClick={() => openLightbox(allTeethPhotos, idx)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={photo.label} />
                              {hasAnalysis && (
                                <span
                                  className={`${styles.photoBadge} ${submission.photo_analyses[pType].pass ? styles.photoBadgePass : styles.photoBadgeFail}`}
                                >
                                  {submission.photo_analyses[pType].pass ? "PASS" : "FAIL"}
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
                          const hasAnalysis = !!submission.photo_analyses?.[pType];
                          return (
                            <div
                              key={photo.url}
                              className={styles.photoThumb}
                              onClick={() => openLightbox(allTeethPhotos, closeBitePhotos.length + idx)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={photo.label} />
                              {hasAnalysis && (
                                <span
                                  className={`${styles.photoBadge} ${submission.photo_analyses[pType].pass ? styles.photoBadgePass : styles.photoBadgeFail}`}
                                >
                                  {submission.photo_analyses[pType].pass ? "PASS" : "FAIL"}
                                </span>
                              )}
                              <div className={styles.photoThumbLabel}>{photo.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Impression Photos */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Impression Kit Photos</div>
            <div className={styles.cardBody}>
              {impressionPhotos.length === 0 ? (
                <div className={styles.noPhotos}>No impression photos submitted.</div>
              ) : (
                <div className={styles.photoGrid}>
                  {impressionPhotos.map((photo, idx) => (
                    <div
                      key={photo.url}
                      className={styles.photoThumb}
                      onClick={() => openLightbox(impressionPhotos, idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.label} />
                      <div className={styles.photoThumbLabel}>{photo.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
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
