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

interface SubmissionRow {
  name: string;
  state: string;
  products: string[];
  white_shade: string | null;
  gum_shade: string | null;
  status: string;
  review_notes: string | null;
  close_bite_photos: string[];
  open_bite_photos: string[];
}

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
    async function fetchSubmission() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cols = "name, state, products, white_shade, gum_shade, status, review_notes, close_bite_photos, open_bite_photos";

        // Try user_id first, fall back to email for pre-migration submissions
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
          const row = data as SubmissionRow;
          if (row.name) setFullName(row.name.trim());
          if (row.state) setUserState(row.state);
          if (row.products?.length) setOrderedProduct(row.products.join(", "));
          if (row.white_shade) setToothShade(row.white_shade);
          if (row.gum_shade) setGumShade(row.gum_shade);
          setStatus(row.status || "pending");
          setReviewNotes(row.review_notes || "");
          setCloseBitePhotos(row.close_bite_photos || []);
          setOpenBitePhotos(row.open_bite_photos || []);
        }
      } catch {}
    }

    fetchSubmission();
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
