"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { productLabels } from "@/app/context/productConfig";

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
            </div>

            {/* Actions */}
            <div className={styles.actionsSection}>
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
