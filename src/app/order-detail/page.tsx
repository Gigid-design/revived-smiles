"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";

const CLOSE_BITE_PHOTOS = [
  { label: "Close bite front",       mockup: null },
  { label: "Close bite left side",   mockup: "/assets/images/mockup-close-bite-left.png" },
  { label: "Close bite right side",  mockup: "/assets/images/mockup-close-bite-right.png" },
];

const OPEN_BITE_PHOTOS = [
  { label: "Open bite front",      mockup: null },
  { label: "Open bite left side",  mockup: "/assets/images/mockup-open-bite-left.png" },
];

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending Review", bg: "#fef3c7", color: "#92400e" },
  in_review: { label: "In Review", bg: "#dbeafe", color: "#1e40af" },
  approved: { label: "Approved", bg: "#dcfce7", color: "#166534" },
  changes_requested: { label: "Changes Requested", bg: "#ffedd5", color: "#9a3412" },
  rejected: { label: "Rejected", bg: "#fee2e2", color: "#991b1b" },
};

export default function OrderDetail() {
  const [closeBitePhotos, setCloseBitePhotos] = useState<string[]>([]);
  const [openBitePhotos, setOpenBitePhotos] = useState<string[]>([]);
  const [fullName, setFullName] = useState("—");
  const [orderedProduct, setOrderedProduct] = useState("—");
  const [userState, setUserState] = useState("—");
  const [toothShade, setToothShade] = useState("—");
  const [gumShade, setGumShade] = useState("—");
  const [status, setStatus] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState("");

  const aboutRows = [
    { label: "Name",            value: fullName },
    { label: "State",           value: userState },
    { label: "Ordered Product", value: orderedProduct, underline: true },
    { label: "Tooth Shade",     value: toothShade },
    { label: "Gum Shade",       value: gumShade },
  ];

  useEffect(() => {
    try {
      const close = JSON.parse(localStorage.getItem('rs_closeBitePhotos') || '[]');
      setCloseBitePhotos(close);
      const open = JSON.parse(localStorage.getItem('rs_openBitePhotos') || '[]');
      setOpenBitePhotos(open);
      const name = localStorage.getItem('rs_name');
      if (name) setFullName(name.trim());

      const products = JSON.parse(localStorage.getItem('rs_products') || '[]') as string[];
      if (products.length > 0) setOrderedProduct(products.join(", "));

      const state = localStorage.getItem('rs_state');
      if (state) setUserState(state);

      const white = localStorage.getItem('rs_whiteShade');
      if (white) setToothShade(white);

      const gum = localStorage.getItem('rs_gumShade');
      if (gum) setGumShade(gum);
    } catch {}

    /* Fetch latest submission status */
    async function fetchStatus() {
      try {
        const email = localStorage.getItem('rs_email');
        if (!email) return;

        const supabase = getSupabase();
        const { data } = await supabase
          .from("submissions")
          .select("status, review_notes")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          setStatus(data.status || "pending");
          setReviewNotes(data.review_notes || "");
        }
      } catch {}
    }

    fetchStatus();
  }, []);

  const statusConfig = STATUS_LABELS[status] || STATUS_LABELS.pending;

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
        <h1 className={styles.title}>{orderedProduct !== "—" ? orderedProduct : "Acrylic Partial Denture"}</h1>
      </header>

      {/* Scrollable content */}
      <div className={styles.content} id="main-content">

        {/* Status badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          background: statusConfig.bg,
          borderRadius: "0.75rem",
          marginBottom: "1rem",
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

        {/* Review notes */}
        {reviewNotes && (status === "changes_requested" || status === "rejected") && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "#fef3c7",
            borderRadius: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.8125rem",
            color: "#92400e",
            lineHeight: 1.5,
          }}>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>Review Notes:</strong>
            {reviewNotes}
          </div>
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
          {CLOSE_BITE_PHOTOS.map((photo, i) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                {closeBitePhotos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={closeBitePhotos[i]} alt={photo.label} className={styles.thumbnailImg} />
                ) : photo.mockup ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.mockup} alt={photo.label} className={styles.thumbnailImg} />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Open bite photos */}
        <p className={styles.sectionLabel}>Open bite photos</p>
        <div className={styles.section}>
          {OPEN_BITE_PHOTOS.map((photo, i) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                {openBitePhotos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={openBitePhotos[i]} alt={photo.label} className={styles.thumbnailImg} />
                ) : photo.mockup ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.mockup} alt={photo.label} className={styles.thumbnailImg} />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div className={styles.bottomNav} aria-label="Main navigation">
        <Image
          src="/assets/images/nav-bar.svg"
          alt="Navigation bar"
          width={271}
          height={59}
          unoptimized
        />
      </div>
    </main>
  );
}
