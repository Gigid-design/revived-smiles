"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { PhotoViewer } from "../../components/PhotoViewer";
import { useAdminUser } from "../../components/AdminAuthGuard";
import { api, ApiError, adjustmentRequiresNotes } from "@/lib/api";
import type { AdjustmentRequest, AdjustmentStatus, Submission } from "@/lib/api";
import { productLabel } from "@/app/context/productConfig";
import { ADJ_STATUS_META, answerRows, issueLabel, photoList } from "../format";
import { ADJUSTMENT_REASON_TAGS } from "@/lib/api";
import type { AdjustmentReasonTag } from "@/lib/api";

type Decision = Extract<AdjustmentStatus, "approved" | "changes_requested" | "rejected" | "received" | "delivered">;

const NOTE_TEMPLATES = [
  "The in-mouth photo is too dark to judge — please retake in daylight with your lips held back.",
  "We need a clearer photo of the appliance on your models.",
  "Please include a photo of the bite strip marks.",
  "This one's better handled by customer service — we'll follow up in chat.",
];

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdjustmentDetailPage() {
  const params = useParams();
  const adminUser = useAdminUser();
  const id = params.id as string;

  const [request, setRequest] = useState<AdjustmentRequest | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reasonTag, setReasonTag] = useState<AdjustmentReasonTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const req = await api.adjustments.getById(id);
        setRequest(req);
        setReviewNotes(req.reviewNotes ?? "");
        try {
          const sub = await api.submissions.getById(req.submissionId);
          setSubmission(sub);
        } catch {
          /* The order may be outside the admin's fetchable set; the request
             still stands on its own. */
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function decide(status: Decision) {
    if (!request || saving) return;

    if (adjustmentRequiresNotes(status) && !reviewNotes.trim()) {
      showToast(
        `Add a note explaining what the patient needs to do before ${
          status === "rejected" ? "rejecting" : "requesting changes"
        }.`,
        "error",
      );
      return;
    }

    if (status === "rejected" && !reasonTag) {
      showToast("Pick a reason tag before marking unable to adjust — it feeds the analytics.", "error");
      return;
    }
    if (status === "rejected") {
      const ok = window.confirm(
        "Mark this request as unable to adjust? The patient will see your reason and be routed to customer service.",
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const updated = await api.adjustments.decide(request.id, {
        status,
        reviewedBy: adminUser?.name ?? "Admin User",
        reviewNotes: reviewNotes.trim() || undefined,
        ...(status === "rejected" && reasonTag ? { reasonTag } : {}),
      });
      setRequest(updated);
      const label =
        status === "approved" ? "approved"
          : status === "rejected" ? "marked unable to adjust"
            : status === "received" ? "marked received at the lab"
              : status === "delivered" ? "marked delivered"
                : "sent back for changes";
      showToast(`Request ${label}.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading request…</div>;
  if (error || !request) return <div className={styles.error}>{error || "Not found."}</div>;

  const meta = ADJ_STATUS_META[request.status] ?? ADJ_STATUS_META.pending;
  const photos = photoList(request.photos);
  const answers = answerRows(request.answers);
  const patientName = submission?.name || null;
  const patientEmail = submission?.email || null;
  const isActionable = request.status === "pending" || request.status === "changes_requested";

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      <Link href="/admin/adjustments" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Adjustments
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{patientName || patientEmail || request.submissionId}</h1>
          <span className={styles.badge} style={{ background: meta.bg, color: meta.text }}>
            {meta.label}
          </span>
        </div>
        <div className={styles.subline}>
          <span className={styles.mono}>{request.requestNumber}</span>
          {" · "}
          {productLabel(request.product)}
          {request.orderNumber ? ` · Order ${request.orderNumber}` : ""}
          {" · "}
          {formatDateTime(request.submittedAt ?? request.createdAt)}
        </div>
        {submission && (
          <Link href={`/admin/submissions/${submission.id}`} className={styles.orderLink}>
            Open the original order →
          </Link>
        )}
      </div>

      <div className={styles.grid}>
        {/* Left: the request */}
        <div className={styles.main}>
          {/* Issues */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>What&apos;s wrong</h2>
            <div className={styles.issueTags}>
              {request.issues.map((i) => (
                <span key={i} className={styles.issueTag}>{issueLabel(i)}</span>
              ))}
            </div>
          </section>

          {/* Structured answers */}
          {answers.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Their answers</h2>
              <dl className={styles.answerList}>
                {answers.map((a) => (
                  <div key={a.label} className={styles.answerRow}>
                    <dt>{a.label}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Description */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>In their words</h2>
            <p className={styles.description}>{request.description}</p>
          </section>

          {/* Photos */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Photos</h2>
            {photos.length === 0 ? (
              <p className={styles.muted}>No photos attached.</p>
            ) : (
              <div className={styles.photoGrid}>
                {photos.map((photo, idx) => (
                  <button
                    key={`${photo.url}-${idx}`}
                    type="button"
                    className={styles.photoThumb}
                    onClick={() => setLightboxIdx(idx)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.label} />
                    <span className={styles.photoLabel}>{photo.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: the decision */}
        <aside className={styles.side}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Review</h2>

            {request.reviewedBy && request.reviewedAt && (
              <div className={styles.reviewedBanner}>
                <span className={styles.reviewedLabel}>
                  {meta.label} by {request.reviewedBy}
                  {request.reasonTag ? <> · <strong>{request.reasonTag}</strong></> : null}
                </span>
                <span className={styles.reviewedMeta}>{formatDateTime(request.reviewedAt)}</span>
                {request.reviewNotes && <p className={styles.reviewedNotes}>{request.reviewNotes}</p>}
              </div>
            )}

            {isActionable ? (
              <>
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

                <textarea
                  className={styles.notesTextarea}
                  placeholder="Add a note to the patient (required to request changes or reject)…"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />

                {/* Reason tags — structured "why", charted later; the note
                    stays the human words (Aug 21 analytics ask). */}
                <div className={styles.reasonTags} role="radiogroup" aria-label="Reason tag">
                  {ADJUSTMENT_REASON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      role="radio"
                      aria-checked={reasonTag === tag}
                      className={`${styles.reasonTagChip} ${reasonTag === tag ? styles.reasonTagChipOn : ""}`}
                      onClick={() => setReasonTag(reasonTag === tag ? null : tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className={styles.actions}>
                  <button className={styles.btnApprove} onClick={() => decide("approved")} disabled={saving}>
                    Approve
                  </button>
                  <button className={styles.btnChanges} onClick={() => decide("changes_requested")} disabled={saving}>
                    Request Changes
                  </button>
                  <button className={styles.btnReject} onClick={() => decide("rejected")} disabled={saving}>
                    Unable to adjust
                  </button>
                </div>
                <p className={styles.hint}>
                  Approving triggers the prepaid return label, the adjusted-product line item, and the
                  printable summary sheet in a later phase. Your note is posted into the order chat.
                </p>
              </>
            ) : (
              <p className={styles.muted}>
                This request is {meta.label.toLowerCase()} and needs no further action.
              </p>
            )}

            {request.status === "approved" && (
              <div className={styles.slipRow}>
                <p className={styles.slipDone}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  The customer received their prepaid return label and packing slip in chat.
                </p>
              </div>
            )}

            {/* Fulfilment after approval — each step advances the patient's
                tracker: Adjustment submitted → received → delivered (Aug 21). */}
            {(request.status === "approved" || request.status === "received") && (
              <div className={styles.actions} style={{ marginTop: "0.75rem" }}>
                {request.status === "approved" ? (
                  <button className={styles.btnApprove} onClick={() => decide("received")} disabled={saving}>
                    Mark received at lab
                  </button>
                ) : (
                  <button className={styles.btnApprove} onClick={() => decide("delivered")} disabled={saving}>
                    Mark adjusted &amp; delivered
                  </button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      {lightboxIdx !== null && (
        <PhotoViewer photos={photos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
