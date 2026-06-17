"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/app/components/BottomNav";
import { ChatPanel } from "@/app/components/ChatPanel";
import { ShippingLabelModal } from "@/app/components/ShippingLabelModal";
import { useChat } from "@/app/hooks/useChat";
import { PRODUCTS } from "@/app/context/productConfig";

/* ── Types ── */
interface SubmissionData {
  id: string;
  name: string;
  email: string;
  state: string;
  products: string[];
  white_shade: string | null;
  gum_shade: string | null;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  tracking_number: string | null;
  close_bite_photos: string[];
  open_bite_photos: string[];
  impression_photos: string[];
}

type DashboardTab = "actions" | "messages" | "order";

/* ── Helpers ── */
function formatProductLabel(products: string[]): string {
  if (!products?.length) return "Dental product";
  return products
    .map((slug) => {
      const found = PRODUCTS.find((p) => p.id === slug);
      return found ? found.label : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(", ");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Status Configuration ── */
const STATUS_CONFIG: Record<string, {
  title: string;
  message: string;
  icon: string;
  cta: string | null;
  ctaAction: "shipping" | "update-photos" | "track" | "contact" | null;
  color: string;
  progressStep: number;
}> = {
  pending: {
    title: "Ship your impression kit",
    message: "Print your shipping label and send your impression kit to our lab for processing.",
    icon: "📦",
    cta: "GET SHIPPING LABEL",
    ctaAction: "shipping",
    color: "#f59e0b",
    progressStep: 3,
  },
  in_review: {
    title: "Under review",
    message: "Our team is carefully reviewing your submission. We'll be in touch shortly.",
    icon: "🔍",
    cta: null,
    ctaAction: null,
    color: "#3b82f6",
    progressStep: 4,
  },
  approved: {
    title: "Approved!",
    message: "Great news — your submission has been approved. We're preparing your order.",
    icon: "✅",
    cta: null,
    ctaAction: null,
    color: "#22c55e",
    progressStep: 4,
  },
  changes_requested: {
    title: "Updates needed",
    message: "Our team needs a few updates. Please review the notes and resubmit.",
    icon: "📝",
    cta: "UPDATE PHOTOS",
    ctaAction: "update-photos",
    color: "#f97316",
    progressStep: 3,
  },
  rejected: {
    title: "Not accepted",
    message: "Unfortunately we're unable to process this submission at this time.",
    icon: "❌",
    cta: "CONTACT SUPPORT",
    ctaAction: "contact",
    color: "#ef4444",
    progressStep: 3,
  },
  in_fabrication: {
    title: "Being crafted",
    message: "Your custom dental product is being fabricated by our lab technicians.",
    icon: "🏭",
    cta: null,
    ctaAction: null,
    color: "#6366f1",
    progressStep: 5,
  },
  shipped: {
    title: "On its way!",
    message: "Your order has been shipped and is on its way to you.",
    icon: "🚚",
    cta: "TRACK ORDER",
    ctaAction: "track",
    color: "#0891b2",
    progressStep: 6,
  },
  completed: {
    title: "Delivered",
    message: "Your order has been delivered. We hope you love your new smile!",
    icon: "🎉",
    cta: null,
    ctaAction: null,
    color: "#16a34a",
    progressStep: 6,
  },
};

const PROGRESS_STEPS = [
  { label: "Ordered", idx: 1 },
  { label: "Intake", idx: 2 },
  { label: "Ship Kit", idx: 3 },
  { label: "Review", idx: 4 },
  { label: "Fabrication", idx: 5 },
  { label: "Delivered", idx: 6 },
];

const CLOSE_BITE_LABELS = ["Close bite — Front", "Close bite — Left", "Close bite — Right"];
const OPEN_BITE_LABELS = ["Open bite — Front", "Open bite — Left"];
const IMPRESSION_LABELS = ["Upper impression", "Lower impression", "Bite registration (front)", "Bite registration (side)"];

/* ══════════════════════════════════════
   Dashboard Page
   ══════════════════════════════════════ */
export default function Dashboard() {
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("actions");
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const patientName = submission?.name?.trim().split(" ")[0] || "there";
  const fullName = submission?.name?.trim() || "—";

  /* Chat hook */
  const { unreadCount: chatUnread } = useChat(
    submission?.id ?? null,
    "patient",
    submission?.name || "Patient"
  );

  /* ── Fetch submission ── */
  useEffect(() => {
    async function fetchSubmission() {
      try {
        setLoading(true);
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const cols = "id, name, email, state, products, white_shade, gum_shade, status, review_notes, reviewed_at, created_at, tracking_number, close_bite_photos, open_bite_photos, impression_photos";

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
          setSubmission(data as SubmissionData);
        }

        try {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("email", user.email)
            .eq("read", false);
          setUnreadNotifCount(count || 0);
        } catch { /* table may not exist */ }
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        setError("Unable to load your submission. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmission();
  }, []);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  /* ── Derived state ── */
  const status = submission?.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const productLabel = submission?.products?.length
    ? formatProductLabel(submission.products)
    : "Dental product";

  /* ── CTA handler ── */
  function handleCTA() {
    switch (cfg.ctaAction) {
      case "shipping":
        setLabelModalOpen(true);
        break;
      case "update-photos":
        window.location.href = "/camera";
        break;
      case "track":
        if (submission?.tracking_number) {
          window.open(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${submission.tracking_number}`, "_blank");
        }
        break;
      case "contact":
        window.location.href = "mailto:support@revivedsmiles.com";
        break;
    }
  }

  /* ── Photo arrays ── */
  const closeBitePhotos = submission?.close_bite_photos || [];
  const openBitePhotos = submission?.open_bite_photos || [];
  const impressionPhotos = submission?.impression_photos || [];

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <Image
            src="/assets/images/logo-revived-smiles.png"
            alt="Revived Smiles"
            width={120}
            height={40}
            style={{ objectFit: "contain", objectPosition: "left center" }}
            sizes="120px"
          />
          <Link href="/notifications" className={styles.notifBtn} aria-label="Notifications">
            <div className={styles.notifWrap}>
              <Image src="/assets/images/icon-notification-btn.svg" alt="" width={42} height={42} unoptimized />
              {unreadNotifCount > 0 && (
                <span className={styles.notifBadge}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
              )}
            </div>
          </Link>
        </div>

        {/* ── Greeting + product ── */}
        <h1 className={styles.greeting}>Welcome back,<br />{patientName}</h1>

        {/* Loading skeleton */}
        {loading && (
          <div className={styles.card}>
            <div className={styles.skeleton}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", marginTop: 12 }} />
              <div className={styles.skeletonBlock} />
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Something went wrong</p>
              <p className={styles.emptyMsg}>{error}</p>
              <button className={styles.retryBtn} onClick={() => window.location.reload()}>TRY AGAIN</button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && !submission && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No submission found</p>
              <p className={styles.emptyMsg}>Start your intake to get started with your custom dental solution.</p>
              <Link href="/intake" className={styles.primaryBtn}>START INTAKE</Link>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
           Main Dashboard Content (when submission exists)
           ══════════════════════════════════════ */}
        {!loading && !error && submission && (
          <>
            {/* ── Product + Status pill ── */}
            <div className={styles.productRow}>
              <span className={styles.productLabel}>{productLabel}</span>
              <span className={styles.statusPill} style={{ background: cfg.color }}>
                {cfg.title}
              </span>
            </div>

            {/* ── Tab Bar ── */}
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "actions" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("actions")}
              >
                Action Items
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "messages" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("messages")}
              >
                Messages
                {chatUnread > 0 && (
                  <span className={styles.tabBadge}>{chatUnread}</span>
                )}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "order" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("order")}
              >
                My Order
              </button>
            </div>

            {/* ── Tab Content ── */}
            <div className={styles.tabContent}>

              {/* ════ ACTION ITEMS TAB ════ */}
              {activeTab === "actions" && (
                <div className={styles.actionsTab}>
                  {/* CTA Card */}
                  <div className={styles.ctaCard}>
                    <div className={styles.ctaIcon}>{cfg.icon}</div>
                    <div className={styles.ctaBody}>
                      <h2 className={styles.ctaTitle}>{cfg.title}</h2>
                      <p className={styles.ctaDesc}>{cfg.message}</p>
                      {cfg.cta && (
                        <button className={styles.ctaBtn} onClick={handleCTA}>
                          {cfg.cta}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Review notes */}
                  {submission.review_notes && (
                    <div className={styles.reviewBanner}>
                      <strong>Review Notes</strong>
                      <span>{submission.review_notes}</span>
                    </div>
                  )}

                  {/* Tracking number */}
                  {submission.tracking_number && (status === "shipped" || status === "completed") && (
                    <div className={styles.trackingBanner}>
                      <span className={styles.trackingLabel}>Tracking #</span>
                      <span className={styles.trackingNumber}>{submission.tracking_number}</span>
                    </div>
                  )}

                  {/* Progress Tracker */}
                  <div className={styles.progressTracker}>
                    <h3 className={styles.progressHeading}>Progress</h3>
                    <div className={styles.progressSteps}>
                      {PROGRESS_STEPS.map((step) => {
                        const isDone = step.idx < cfg.progressStep;
                        const isCurrent = step.idx === cfg.progressStep;
                        return (
                          <div key={step.label} className={styles.progressStep}>
                            <div className={`${styles.progressDot} ${
                              isDone ? styles.progressDotDone :
                              isCurrent ? styles.progressDotCurrent :
                              styles.progressDotPending
                            }`}>
                              {isDone ? (
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                  <path d="M3 8.5l3.5 3.5L13 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <span className={styles.progressDotInner} />
                              )}
                            </div>
                            {step.idx < PROGRESS_STEPS.length && (
                              <div className={`${styles.progressLine} ${isDone ? styles.progressLineDone : ""}`} />
                            )}
                            <span className={`${styles.progressLabel} ${
                              isDone ? styles.progressLabelDone :
                              isCurrent ? styles.progressLabelCurrent :
                              ""
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ════ MESSAGES TAB ════ */}
              {activeTab === "messages" && (
                <div className={styles.messagesTab}>
                  <ChatPanel
                    submissionId={submission.id}
                    currentRole="patient"
                    currentName={submission.name || "Patient"}
                  />
                </div>
              )}

              {/* ════ MY ORDER TAB ════ */}
              {activeTab === "order" && (
                <div className={styles.orderTab}>
                  {/* About You */}
                  <div className={styles.orderSection}>
                    <h3 className={styles.orderSectionTitle}>About you</h3>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Name</span>
                      <span className={styles.infoValue}>{fullName}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>State</span>
                      <span className={styles.infoValue}>{submission.state || "—"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Product</span>
                      <span className={styles.infoValue}>{productLabel}</span>
                    </div>
                    {submission.white_shade && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Tooth Shade</span>
                        <span className={styles.infoValue}>{submission.white_shade}</span>
                      </div>
                    )}
                    {submission.gum_shade && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Gum Shade</span>
                        <span className={styles.infoValue}>{submission.gum_shade}</span>
                      </div>
                    )}
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Submitted</span>
                      <span className={styles.infoValue}>{formatDate(submission.created_at)}</span>
                    </div>
                  </div>

                  {/* Close bite photos */}
                  {closeBitePhotos.length > 0 && (
                    <div className={styles.orderSection}>
                      <h3 className={styles.orderSectionTitle}>Close bite photos</h3>
                      <div className={styles.photoGrid}>
                        {closeBitePhotos.map((url, i) => (
                          <button
                            key={url}
                            className={styles.photoThumb}
                            onClick={() => setLightboxSrc(url)}
                            aria-label={CLOSE_BITE_LABELS[i] || `Close bite ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={CLOSE_BITE_LABELS[i] || `Close bite ${i + 1}`} />
                            <span className={styles.photoLabel}>{CLOSE_BITE_LABELS[i] || `Photo ${i + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open bite photos */}
                  {openBitePhotos.length > 0 && (
                    <div className={styles.orderSection}>
                      <h3 className={styles.orderSectionTitle}>Open bite photos</h3>
                      <div className={styles.photoGrid}>
                        {openBitePhotos.map((url, i) => (
                          <button
                            key={url}
                            className={styles.photoThumb}
                            onClick={() => setLightboxSrc(url)}
                            aria-label={OPEN_BITE_LABELS[i] || `Open bite ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={OPEN_BITE_LABELS[i] || `Open bite ${i + 1}`} />
                            <span className={styles.photoLabel}>{OPEN_BITE_LABELS[i] || `Photo ${i + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Impression photos */}
                  {impressionPhotos.length > 0 && (
                    <div className={styles.orderSection}>
                      <h3 className={styles.orderSectionTitle}>Impression kit photos</h3>
                      <div className={styles.photoGrid}>
                        {impressionPhotos.map((url, i) => (
                          <button
                            key={url}
                            className={styles.photoThumb}
                            onClick={() => setLightboxSrc(url)}
                            aria-label={IMPRESSION_LABELS[i] || `Impression ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={IMPRESSION_LABELS[i] || `Impression ${i + 1}`} />
                            <span className={styles.photoLabel}>{IMPRESSION_LABELS[i] || `Photo ${i + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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

      <BottomNav />
    </main>
  );
}
