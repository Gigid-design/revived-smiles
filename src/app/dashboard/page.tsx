"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/app/components/BottomNav";

interface SubmissionData {
  id: string;
  name: string;
  email: string;
  products: string[];
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

const STATUS_MESSAGES: Record<string, { title: string; message: string; color: string }> = {
  pending: {
    title: "Next step: Ship back\nyour impression kit",
    message: "Your submission is being reviewed by our team. We'll update you soon.",
    color: "#f59e0b",
  },
  in_review: {
    title: "Under review",
    message: "Our team is currently reviewing your submission. We'll be in touch shortly.",
    color: "#3b82f6",
  },
  approved: {
    title: "Submission approved!",
    message: "Your submission has been approved! We're preparing your order.",
    color: "#22c55e",
  },
  changes_requested: {
    title: "Updates needed",
    message: "Our team needs some updates. Please review the notes below.",
    color: "#f97316",
  },
  rejected: {
    title: "Submission not accepted",
    message: "Unfortunately we can't process this submission. Please see the notes below.",
    color: "#ef4444",
  },
};

const STEP_MAP: Record<string, number> = {
  pending: 3,
  in_review: 4,
  approved: 5,
  changes_requested: 3,
  rejected: 3,
};

const REVIEW_BANNER_STYLES: Record<string, { bg: string; color: string }> = {
  changes_requested: { bg: "#fef3c7", color: "#92400e" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
  approved: { bg: "#dcfce7", color: "#166534" },
  in_review: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#f0f3ff", color: "#0d2260" },
};

export default function Dashboard() {
  const [firstName, setFirstName] = useState("there");
  const [productLabel, setProductLabel] = useState("Acrylic partial denture");
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Try user_id first, fall back to email for pre-migration submissions
        let { data } = await supabase
          .from("submissions")
          .select("id, name, email, products, status, review_notes, reviewed_at, created_at")
          .eq("user_id", user.id)
          .neq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!data && user.email) {
          const fallback = await supabase
            .from("submissions")
            .select("id, name, email, products, status, review_notes, reviewed_at, created_at")
            .eq("email", user.email)
            .neq("status", "draft")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          data = fallback.data;
        }

        if (data) {
          setSubmission(data as SubmissionData);
          if (data.name) setFirstName(data.name.trim().split(" ")[0]);
          if (data.products?.length) setProductLabel(data.products.join(", "));
        }

        // Fetch unread notifications count
        try {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("email", user.email)
            .eq("read", false);
          setUnreadCount(count || 0);
        } catch {
          // Notifications table may not exist yet — silently ignore
        }
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        setError("Unable to load your submission. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmission();
  }, []);

  async function handleShippingLabel() {
    if (!submission) return;
    setGeneratingLabel(true);
    try {
      const res = await fetch("/api/shipping-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          patientName: submission.name,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate label");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipping-label-${submission.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Shipping label error:", err);
      alert("Unable to generate shipping label. Please try again.");
    } finally {
      setGeneratingLabel(false);
    }
  }

  const status = submission?.status || "pending";
  const statusInfo = STATUS_MESSAGES[status] || STATUS_MESSAGES.pending;
  const activeStep = STEP_MAP[status] || 3;

  const steps = [
    { label: "Ordered", idx: 1 },
    { label: "Intake Form", idx: 2 },
    { label: "Ship Kit", idx: 3 },
    { label: "Team Review", idx: 4 },
    { label: "Treatment", idx: 5 },
  ];

  const reviewBannerStyle = REVIEW_BANNER_STYLES[status] || REVIEW_BANNER_STYLES.pending;

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">

        {/* Top bar: logo + notification */}
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
              <Image
                src="/assets/images/icon-notification-btn.svg"
                alt=""
                width={42}
                height={42}
                unoptimized
              />
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Greeting */}
        <h1 className={styles.greeting}>Welcome back,<br />{firstName}</h1>

        {/* Loading state */}
        {loading && (
          <div className={styles.card}>
            <div className={styles.skeleton}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", marginTop: 12 }} />
              <div className={styles.skeletonBlock} />
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Something went wrong</p>
              <p className={styles.emptyMsg}>{error}</p>
              <button className={styles.retryBtn} onClick={() => window.location.reload()}>
                TRY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !submission && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No submission found</p>
              <p className={styles.emptyMsg}>Start your intake to get started with your custom dental solution.</p>
              <Link href="/intake" className={styles.shippingBtn} style={{ textDecoration: "none", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                START INTAKE
              </Link>
            </div>
          </div>
        )}

        {/* Order status card */}
        {!loading && !error && submission && (
          <div className={styles.card}>
            {/* Title — status aware */}
            <h2 className={styles.cardTitle} style={{ whiteSpace: "pre-line" }}>{statusInfo.title}</h2>

            {/* Subtitle — mapped from ordered product selection */}
            <p className={styles.cardSub}>{productLabel}</p>

            {/* Product image */}
            <div className={styles.productImgWrap}>
              <Image
                src="/assets/images/hero-product-v2.png"
                alt="Impression kit"
                fill
                style={{ objectFit: "contain" }}
                sizes="99px"
              />
            </div>

            {/* Progress track */}
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${(activeStep / 5) * 100}%` }} />
            </div>

            {/* Step labels */}
            <div className={styles.stepLabels}>
              {steps.map((step) => (
                <span
                  key={step.label}
                  className={`${styles.stepLabel} ${
                    step.idx < activeStep ? styles.stepGreen :
                    step.idx === activeStep ? styles.stepActive :
                    styles.stepMuted
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>

            {/* Status message */}
            <div className={styles.infoBanner}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: statusInfo.color,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div className={styles.infoText}>
                <p className={styles.infoTitle} style={{ color: statusInfo.color }}>{statusInfo.message}</p>
              </div>
            </div>

            {/* Review notes banner — show for ALL statuses when notes exist */}
            {submission.review_notes && (
              <div style={{
                margin: "0 1.25rem 1rem",
                padding: "0.75rem 1rem",
                background: reviewBannerStyle.bg,
                borderRadius: "0.625rem",
                fontSize: "0.8125rem",
                color: reviewBannerStyle.color,
                lineHeight: 1.5,
              }}>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>Review Notes:</strong>
                {submission.review_notes}
              </div>
            )}

            {/* Status-aware CTA buttons */}
            <div className={styles.cardBtns}>
              {status === "changes_requested" ? (
                <Link href="/camera" className={styles.shippingBtn} style={{ textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  UPDATE PHOTOS
                </Link>
              ) : status === "in_review" ? (
                <button className={styles.shippingBtn} disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                  UNDER REVIEW
                </button>
              ) : status === "approved" ? (
                <Link href="/order-detail" className={styles.shippingBtn} style={{ textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  VIEW ORDER
                </Link>
              ) : status === "rejected" ? (
                <a href="mailto:support@revivedsmiles.com" className={styles.shippingBtn} style={{ textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  CONTACT SUPPORT
                </a>
              ) : (
                <button className={styles.shippingBtn} onClick={handleShippingLabel} disabled={generatingLabel}>
                  {generatingLabel ? "GENERATING…" : "GET SHIPPING LABEL"}
                </button>
              )}
              <Link href="/order-detail" className={styles.detailsBtn}>DETAILS</Link>
            </div>
          </div>
        )}

        {/* Need Help section (replaces fake Care Team) */}
        <h2 className={styles.sectionTitle}>Need Help?</h2>
        <div className={styles.helpCard}>
          <div className={styles.helpContent}>
            <p className={styles.helpText}>
              Questions about your order or impressions? Our team is here to help.
            </p>
            <a href="mailto:support@revivedsmiles.com" className={styles.helpBtn}>
              CONTACT SUPPORT
            </a>
          </div>
          <div className={styles.helpIconWrap}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0e1b4d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

      </div>

      {/* Bottom nav */}
      <BottomNav />
    </main>
  );
}
