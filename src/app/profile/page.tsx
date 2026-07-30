"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { productLabels } from "@/app/context/productConfig";

/* An order has an issuable invoice + prescription once it's been reviewed. */
const REVIEWED_STATUSES: SubmissionStatus[] = ["approved", "in_fabrication", "shipped", "completed"];

function formatProductLabel(products: string[]): string {
  if (!products?.length) return "—";
  return productLabels(products);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Submission | null>(null);
  const [docOrder, setDocOrder] = useState<Submission | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const user = await api.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setLoading(false);
          return;
        }
        setUserEmail(user.email);

        const mine = await api.submissions.getMine();
        if (!cancelled && mine) setProfile(mine);

        /* Invoice + prescription are issued against the most recent reviewed
           order, so the downloads always point at a real, finalized record. */
        const all = await api.submissions.listMine();
        if (!cancelled) {
          setDocOrder(all.find((o) => REVIEWED_STATUSES.includes(o.status)) ?? null);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await api.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    // Clear any leftover session data
    try { sessionStorage.clear(); } catch {}
    window.location.href = "/";
  }

  const displayName = profile?.name?.trim() || "Patient";
  const displayEmail = profile?.email || userEmail || "—";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">
        {/* Header */}
        <div className={styles.topBar}>
          <Link href="/dashboard" className={styles.backBtn} aria-label="Go back">
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
              <path d="M7.5 1.5L1.5 7.5l6 6" stroke="#0e1b4d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className={styles.pageTitle}>Profile</h1>
          <div style={{ width: 24 }} />
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.card}>
            <div className={styles.skeleton}>
              <div className={styles.skeletonCircle} />
              <div className={styles.skeletonLine} style={{ width: "50%" }} />
              <div className={styles.skeletonLine} style={{ width: "70%", marginTop: 8 }} />
            </div>
          </div>
        )}

        {/* Profile Content */}
        {!loading && (
          <>
            {/* Avatar + Name */}
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                <span className={styles.avatarInitials}>{initials}</span>
              </div>
              <h2 className={styles.userName}>{displayName}</h2>
              <p className={styles.userEmail}>{displayEmail}</p>
            </div>

            {/* Info Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Account Details</h3>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{profile?.name || "—"}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{displayEmail}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>State</span>
                <span className={styles.infoValue}>{profile?.state || "—"}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Product</span>
                <span className={styles.infoValue}>{formatProductLabel(profile?.products || [])}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Member since</span>
                <span className={styles.infoValue}>{formatDate(profile?.createdAt ?? null)}</span>
              </div>

              {/* Downloadable documents for HSA / FSA / insurance reimbursement. */}
              <div className={styles.docDownloads}>
                <p className={styles.docDownloadsTitle}>Documents for HSA, FSA &amp; insurance</p>
                {docOrder ? (
                  <>
                    <Link href={`/documents?id=${docOrder.id}&type=invoice`} className={styles.downloadRow}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
                      </svg>
                      <span>Download invoice</span>
                      <span className={styles.downloadHint}>PDF</span>
                    </Link>
                    <Link href={`/documents?id=${docOrder.id}&type=prescription`} className={styles.downloadRow}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
                      </svg>
                      <span>Download prescription</span>
                      <span className={styles.downloadHint}>PDF</span>
                    </Link>
                  </>
                ) : (
                  <p className={styles.docDownloadsEmpty}>
                    Available once your order has been reviewed.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actionsSection}>
              <Link href="/my-documents" className={styles.actionRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
                <span>My Documents</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={styles.chevron}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <a href="mailto:support@revivedsmiles.com" className={styles.actionRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Contact Support</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={styles.chevron}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>

              <button
                className={styles.signOutBtn}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
