"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";

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

export default function Dashboard() {
  const [firstName, setFirstName] = useState("there");
  const [productLabel, setProductLabel] = useState("Acrylic partial denture");
  const [submission, setSubmission] = useState<SubmissionData | null>(null);

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
      } catch {}
    }

    fetchSubmission();
  }, []);

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
          <Image
            src="/assets/images/icon-notification-btn.svg"
            alt="Notifications"
            width={42}
            height={42}
            unoptimized
          />
        </div>

        {/* Greeting */}
        <h1 className={styles.greeting}>Welcome back,<br />{firstName}</h1>

        {/* Order status card */}
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

          {/* Review notes banner */}
          {submission?.review_notes && (status === "changes_requested" || status === "rejected") && (
            <div style={{
              margin: "0 1.25rem 1rem",
              padding: "0.75rem 1rem",
              background: "#fef3c7",
              borderRadius: "0.625rem",
              fontSize: "0.8125rem",
              color: "#92400e",
              lineHeight: 1.5,
            }}>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>Review Notes:</strong>
              {submission.review_notes}
            </div>
          )}

          {/* Buttons */}
          <div className={styles.cardBtns}>
            {status === "changes_requested" ? (
              <Link href="/camera" className={styles.shippingBtn} style={{ textDecoration: "none", textAlign: "center" }}>
                UPDATE PHOTOS
              </Link>
            ) : (
              <button className={styles.shippingBtn}>GET SHIPPING LABEL</button>
            )}
            <Link href="/order-detail" className={styles.detailsBtn}>DETAILS</Link>
          </div>
        </div>

        {/* Care team section */}
        <h2 className={styles.sectionTitle}>My Care Team</h2>

        <div className={styles.teamCard}>
          <p className={styles.teamName}>Concierge</p>
          <p className={styles.teamAvail}>Available now</p>
          <p className={styles.teamAgent}>John Smith</p>

          <div className={styles.teamIconRow}>
            <Image src="/assets/images/icon-group.svg" alt="" width={22} height={22} unoptimized className={styles.teamIcon} />
            <p className={styles.teamOrders}>+2 others</p>
          </div>

          <div className={styles.teamAvatarWrap}>
            <Image
              src="/assets/images/concierge-photo.png"
              alt="John Smith"
              fill
              style={{ objectFit: "cover", objectPosition: "center top" }}
              sizes="88px"
            />
          </div>

          <button className={styles.chevronBtn} aria-label="View concierge">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
              <path d="M1 1l6 6-6 6" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

      {/* Bottom nav */}
      <div className={styles.bottomNav} aria-label="Main navigation">
        <Image src="/assets/images/nav-bar-home.svg" alt="Navigation bar" width={271} height={59} unoptimized />
      </div>
    </main>
  );
}
