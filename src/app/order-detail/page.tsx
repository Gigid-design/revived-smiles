"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/app/components/BottomNav";
import { ShippingLabelModal } from "@/app/components/ShippingLabelModal";
import { PRODUCTS } from "@/app/context/productConfig";

const CLOSE_BITE_LABELS = [
  "Close bite front",
  "Close bite left side",
  "Close bite right side",
];

const OPEN_BITE_LABELS = [
  "Open bite front",
  "Open bite left side",
];

const IMPRESSION_LABELS = [
  "Upper impression",
  "Lower impression",
  "Bite registration (front)",
  "Bite registration (side)",
];

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending Review", bg: "#fef3c7", color: "#92400e" },
  in_review: { label: "In Review", bg: "#dbeafe", color: "#1e40af" },
  approved: { label: "Approved", bg: "#dcfce7", color: "#166534" },
  changes_requested: { label: "Changes Requested", bg: "#ffedd5", color: "#9a3412" },
  rejected: { label: "Rejected", bg: "#fee2e2", color: "#991b1b" },
};

const REVIEW_BANNER_STYLES: Record<string, { bg: string; color: string }> = {
  changes_requested: { bg: "#fef3c7", color: "#92400e" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  approved: { bg: "#dcfce7", color: "#166534" },
  in_review: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#f0f3ff", color: "#0d2260" },
};

interface SubmissionRow {
  id: string;
  name: string;
  state: string;
  products: string[];
  white_shade: string | null;
  gum_shade: string | null;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  close_bite_photos: string[];
  open_bite_photos: string[];
  impression_photos: string[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrderDetail() {
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);

  useEffect(() => {
    async function fetchSubmission() {
      try {
        setLoading(true);
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const cols = "id, name, state, products, white_shade, gum_shade, status, review_notes, reviewed_by, reviewed_at, created_at, close_bite_photos, open_bite_photos, impression_photos";

        let { data } = await supabase
          .from("submissions")
          .select(cols)
          .eq("user_id", user.id)
          .neq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!data && user.email) {
          const fallback = await supabase
            .from("submissions")
            .select(cols)
            .eq("email", user.email)
            .neq("status", "draft")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          data = fallback.data;
        }

        if (data) {
          setSubmission(data as SubmissionRow);
        }
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        setError("Unable to load your order details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmission();
  }, []);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  // Derived values
  const status = submission?.status || "pending";
  const statusConfig = STATUS_LABELS[status] || STATUS_LABELS.pending;
  const reviewBannerStyle = REVIEW_BANNER_STYLES[status] || REVIEW_BANNER_STYLES.pending;
  const fullName = submission?.name?.trim() || "—";
  const orderedProduct = submission?.products?.length
    ? submission.products.map((slug) => {
        const found = PRODUCTS.find((p) => p.id === slug);
        return found ? found.label : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }).join(", ")
    : "—";
  const userState = submission?.state || "—";
  const toothShade = submission?.white_shade || "—";
  const gumShade = submission?.gum_shade || "—";
  const closeBitePhotos = submission?.close_bite_photos || [];
  const openBitePhotos = submission?.open_bite_photos || [];
  const impressionPhotos = submission?.impression_photos || [];
  const reviewNotes = submission?.review_notes || "";

  const aboutRows: { label: string; value: string; underline?: boolean }[] = [
    { label: "Name",            value: fullName },
    { label: "State",           value: userState },
    { label: "Ordered Product", value: orderedProduct },
    { label: "Tooth Shade",     value: toothShade },
    { label: "Gum Shade",       value: gumShade },
  ];

  const headerTitle = orderedProduct !== "—" ? orderedProduct : "Acrylic Partial Denture";

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn} aria-label="Go back">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L1.5 7.5l6 6" stroke="#0e1b4d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <h1 className={styles.title}>{headerTitle}</h1>
      </header>

      {/* Scrollable content */}
      <div className={styles.content} id="main-content">

        {/* Loading state */}
        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
            <div className={styles.skeletonLine} style={{ width: "80%", marginTop: 12 }} />
            <div className={styles.skeletonBlock} />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Something went wrong</p>
            <p className={styles.emptyMsg}>{error}</p>
            <button className={styles.retryBtn} onClick={() => window.location.reload()}>
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !submission && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No order found</p>
            <p className={styles.emptyMsg}>Complete your intake to see order details here.</p>
          </div>
        )}

        {!loading && !error && submission && (
          <>
            {/* Status badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: statusConfig.bg,
              borderRadius: "0.75rem",
              margin: "0 1.25em 1rem",
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusConfig.color,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: statusConfig.color,
              }}>
                {statusConfig.label}
              </span>
            </div>

            {/* Submission timeline */}
            <div className={styles.timeline}>
              <div className={styles.timelineStep}>
                <span className={styles.timelineDotCompleted} />
                <span className={styles.timelineText}>
                  Submitted {formatDate(submission.created_at)}
                </span>
              </div>
              {submission.reviewed_at && (
                <div className={styles.timelineStep}>
                  <span className={styles.timelineDotCompleted} />
                  <span className={styles.timelineText}>
                    Reviewed by {submission.reviewed_by || "our team"} — {formatDate(submission.reviewed_at)}
                  </span>
                </div>
              )}
              <div className={styles.timelineStep}>
                <span
                  className={styles.timelineDot}
                  style={{ background: statusConfig.color }}
                />
                <span className={styles.timelineText} style={{ color: statusConfig.color, fontWeight: 600 }}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Review notes — show for ALL statuses when notes exist */}
            {reviewNotes && (
              <div style={{
                padding: "0.75rem 1rem",
                background: reviewBannerStyle.bg,
                borderRadius: "0.75rem",
                margin: "0 1.25em 1rem",
                fontSize: "0.8125rem",
                color: reviewBannerStyle.color,
                lineHeight: 1.5,
              }}>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Review Notes:</strong>
                {reviewNotes}
              </div>
            )}

            {/* Shipping Label */}
            {(status === "pending" || status === "changes_requested") && (
              <>
                <p className={styles.sectionLabel}>Shipping Label</p>
                <div className={styles.section}>
                  <div className={styles.shippingRow}>
                    <div className={styles.shippingInfo}>
                      <span className={styles.shippingTitle}>Return Shipping Label</span>
                      <span className={styles.shippingHint}>View and download your shipping label</span>
                    </div>
                    <button className={styles.shippingBtn} onClick={() => setLabelModalOpen(true)}>
                      VIEW LABEL
                    </button>
                  </div>
                </div>
                <div className={styles.divider} />
              </>
            )}

            {/* About you */}
            <p className={styles.sectionLabel}>About you</p>
            <div className={styles.section}>
              {aboutRows.map((row) => (
                <div key={row.label} className={styles.row}>
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={`${styles.rowValue} ${row.underline ? styles.rowValueUnderline : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.divider} />

            {/* Close bite photos */}
            <p className={styles.sectionLabel}>Close bite photos</p>
            <div className={styles.section}>
              {CLOSE_BITE_LABELS.map((label, i) => (
                <div key={label} className={styles.photoRow}>
                  <span className={styles.rowLabel}>{label}</span>
                  <div className={styles.thumbnail}>
                    {closeBitePhotos[i] ? (
                      <button className={styles.thumbnailBtn} onClick={() => setLightboxSrc(closeBitePhotos[i])}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={closeBitePhotos[i]} alt={label} className={styles.thumbnailImg} />
                      </button>
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M21 15.5V6a2 2 0 0 0-2-2H9.5" />
                          <path d="M3 9v10a2 2 0 0 0 2 2h10" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.divider} />

            {/* Open bite photos */}
            <p className={styles.sectionLabel}>Open bite photos</p>
            <div className={styles.section}>
              {OPEN_BITE_LABELS.map((label, i) => (
                <div key={label} className={styles.photoRow}>
                  <span className={styles.rowLabel}>{label}</span>
                  <div className={styles.thumbnail}>
                    {openBitePhotos[i] ? (
                      <button className={styles.thumbnailBtn} onClick={() => setLightboxSrc(openBitePhotos[i])}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={openBitePhotos[i]} alt={label} className={styles.thumbnailImg} />
                      </button>
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M21 15.5V6a2 2 0 0 0-2-2H9.5" />
                          <path d="M3 9v10a2 2 0 0 0 2 2h10" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Impression kit photos — only show when photos exist */}
            {impressionPhotos.length > 0 && (
              <>
                <div className={styles.divider} />
                <p className={styles.sectionLabel}>Impression kit photos</p>
                <div className={styles.section}>
                  {impressionPhotos.map((url, i) => (
                    <div key={i} className={styles.photoRow}>
                      <span className={styles.rowLabel}>{IMPRESSION_LABELS[i] || `Photo ${i + 1}`}</span>
                      <div className={styles.thumbnail}>
                        <button className={styles.thumbnailBtn} onClick={() => setLightboxSrc(url)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={IMPRESSION_LABELS[i] || `Photo ${i + 1}`} className={styles.thumbnailImg} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Shipping label modal */}
      {submission && (
        <ShippingLabelModal
          open={labelModalOpen}
          onClose={() => setLabelModalOpen(false)}
          submissionId={submission.id}
          patientName={submission.name}
        />
      )}

      {/* Lightbox overlay */}
      {lightboxSrc && (
        <div className={styles.lightbox} onClick={closeLightbox} role="dialog" aria-label="Photo viewer">
          <button className={styles.lightboxClose} onClick={closeLightbox} aria-label="Close photo viewer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Full size photo"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav />
    </main>
  );
}
