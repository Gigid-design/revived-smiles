"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/app/components/BottomNav";
import { ChatPanel } from "@/app/components/ChatPanel";
import { useChat } from "@/app/hooks/useChat";
import { PRODUCTS } from "@/app/context/productConfig";

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

/** Map product slugs to human-readable display names */
function formatProductLabel(products: string[]): string {
  if (!products?.length) return "Dental product";
  return products
    .map((slug) => {
      const found = PRODUCTS.find((p) => p.id === slug);
      return found ? found.label : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .join(", ");
}

const STATUS_CONFIG: Record<string, {
  title: string;
  message: string;
  color: string;
  bannerBg: string;
  bannerColor: string;
}> = {
  pending: {
    title: "Ship back your impression kit",
    message: "Print your shipping label and send your impression kit to our lab.",
    color: "#f59e0b",
    bannerBg: "#f0f3ff",
    bannerColor: "#0d2260",
  },
  in_review: {
    title: "Under review",
    message: "Our team is reviewing your submission. We'll be in touch shortly.",
    color: "#3b82f6",
    bannerBg: "#dbeafe",
    bannerColor: "#1e40af",
  },
  approved: {
    title: "Approved!",
    message: "Your submission has been approved. We're preparing your order.",
    color: "#22c55e",
    bannerBg: "#dcfce7",
    bannerColor: "#166534",
  },
  changes_requested: {
    title: "Updates needed",
    message: "Our team needs some updates. Please review the notes below.",
    color: "#f97316",
    bannerBg: "#fef3c7",
    bannerColor: "#92400e",
  },
  rejected: {
    title: "Not accepted",
    message: "Unfortunately we can't process this submission.",
    color: "#ef4444",
    bannerBg: "#fee2e2",
    bannerColor: "#991b1b",
  },
};

const STEP_MAP: Record<string, number> = {
  pending: 3,
  in_review: 4,
  approved: 5,
  changes_requested: 3,
  rejected: 3,
};

export default function Dashboard() {
  const [firstName, setFirstName] = useState("there");
  const [productLabel, setProductLabel] = useState("Dental product");
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const patientName = submission?.name || firstName;
  const { unreadCount: chatUnreadCount } = useChat(submission?.id ?? null, "patient", patientName);

  useEffect(() => {
    async function fetchSubmission() {
      try {
        setLoading(true);
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

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
          if (data.products?.length) setProductLabel(formatProductLabel(data.products));
        }

        try {
          const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("email", user.email)
            .eq("read", false);
          setUnreadCount(count || 0);
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

  async function handleShippingLabel() {
    if (!submission) return;
    setGeneratingLabel(true);
    try {
      const res = await fetch("/api/shipping-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, patientName: submission.name }),
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
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const activeStep = STEP_MAP[status] || 3;

  const steps = [
    { label: "Ordered", idx: 1 },
    { label: "Intake", idx: 2 },
    { label: "Ship Kit", idx: 3 },
    { label: "Review", idx: 4 },
    { label: "Treatment", idx: 5 },
  ];

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        {/* Top bar */}
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
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </div>
          </Link>
        </div>

        {/* Greeting */}
        <h1 className={styles.greeting}>Welcome back,<br />{firstName}</h1>

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

        {/* ── Order Status Card (flex layout) ── */}
        {!loading && !error && submission && (
          <div className={styles.card}>
            {/* Card header: title + product image */}
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderText}>
                <h2 className={styles.cardTitle}>{cfg.title}</h2>
                <p className={styles.cardSub}>{productLabel}</p>
              </div>
              <div className={styles.productImgWrap}>
                <Image
                  src="/assets/images/hero-product-v2.png"
                  alt="Impression kit"
                  fill
                  style={{ objectFit: "contain" }}
                  sizes="80px"
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className={styles.progressSection}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${(activeStep / 5) * 100}%` }} />
              </div>
              <div className={styles.stepLabels}>
                {steps.map((step) => (
                  <span
                    key={step.label}
                    className={`${styles.stepLabel} ${
                      step.idx < activeStep ? styles.stepDone :
                      step.idx === activeStep ? styles.stepActive :
                      styles.stepMuted
                    }`}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Status banner */}
            <div className={styles.statusBanner} style={{ background: cfg.bannerBg }}>
              <span className={styles.statusDot} style={{ background: cfg.color }} />
              <p className={styles.statusMsg} style={{ color: cfg.bannerColor }}>{cfg.message}</p>
            </div>

            {/* Review notes */}
            {submission.review_notes && (
              <div className={styles.reviewNotes} style={{ background: cfg.bannerBg, color: cfg.bannerColor }}>
                <strong>Review Notes:</strong>
                <span>{submission.review_notes}</span>
              </div>
            )}

            {/* CTA buttons */}
            <div className={styles.cardBtns}>
              {status === "changes_requested" ? (
                <Link href="/camera" className={styles.primaryBtn}>UPDATE PHOTOS</Link>
              ) : status === "in_review" ? (
                <button className={styles.primaryBtn} disabled>UNDER REVIEW</button>
              ) : status === "approved" ? (
                <Link href="/order-detail" className={styles.primaryBtn}>VIEW ORDER</Link>
              ) : status === "rejected" ? (
                <a href="mailto:support@revivedsmiles.com" className={styles.primaryBtn}>CONTACT SUPPORT</a>
              ) : (
                <button className={styles.primaryBtn} onClick={handleShippingLabel} disabled={generatingLabel}>
                  {generatingLabel ? "GENERATING…" : "GET SHIPPING LABEL"}
                </button>
              )}
              <Link href="/order-detail" className={styles.secondaryBtn}>DETAILS</Link>
            </div>
          </div>
        )}

        {/* ── Messages section ── */}
        <h2 className={styles.sectionTitle}>Messages</h2>

        <button
          type="button"
          className={styles.chatToggle}
          onClick={() => setChatOpen(!chatOpen)}
          aria-expanded={chatOpen}
        >
          <div className={styles.chatToggleIcon}>💬</div>
          <div className={styles.chatToggleText}>
            <span className={styles.chatToggleLabel}>Care Team Chat</span>
            <span className={styles.chatToggleHint}>
              {chatUnreadCount > 0
                ? `${chatUnreadCount} new message${chatUnreadCount > 1 ? "s" : ""}`
                : "Tap to open"}
            </span>
          </div>
          <div className={styles.chatToggleRight}>
            {chatUnreadCount > 0 && (
              <span className={styles.chatBadge}>{chatUnreadCount}</span>
            )}
            <svg
              width="8" height="14" viewBox="0 0 8 14" fill="none"
              className={`${styles.chatChevron} ${chatOpen ? styles.chatChevronOpen : ""}`}
            >
              <path d="M1 1l6 6-6 6" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {chatOpen && submission && (
          <div className={styles.chatPanelWrap}>
            <ChatPanel
              submissionId={submission.id}
              currentRole="patient"
              currentName={patientName}
            />
          </div>
        )}

        {/* ── Support fallback ── */}
        <div className={styles.supportRow}>
          <span className={styles.supportText}>Need more help?</span>
          <a href="mailto:support@revivedsmiles.com" className={styles.supportLink}>
            Email support
          </a>
        </div>

      </div>

      <BottomNav />
    </main>
  );
}
