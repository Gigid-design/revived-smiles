"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";
import { BottomNav } from "@/app/components/BottomNav";
import { ChatPanel } from "@/app/components/ChatPanel";
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

/* Placeholder total until Nate confirms the per-product step count (to-do #10).
   The design shows "4 / 8"; step mapping will be wired to the product flag later. */
const INTAKE_TOTAL_STEPS = 8;

/* Rough completed-step count for the "Continue My Intake" progress. */
function intakeDone(sub: SubmissionData): number {
  let done = 1; // intake started
  if (sub.state) done++;
  if (sub.products?.length) done++;
  if (sub.white_shade || sub.gum_shade) done++;
  if (sub.close_bite_photos?.length) done++;
  if (sub.open_bite_photos?.length) done++;
  if (sub.impression_photos?.length) done += 2;
  return Math.min(done, INTAKE_TOTAL_STEPS);
}

/* Routes for the "Start Here" actions. */
const ROUTE_VIDEO = "/impression-photos";  // impression how-to (examples + tips live here)
const ROUTE_STEPS = "/impression-photos";  // written step-by-step
const ROUTE_TAKE_PHOTOS = "/photo-intro";  // impression photo capture flow
const ROUTE_INTAKE = "/intake";            // resume intake form
const REORDER_URL = "https://revivedsmiles.com";

/* Mock data for `?demo=1` design-preview mode. */
const DEMO_SUBMISSION: SubmissionData = {
  id: "demo-1",
  name: "Angela Carter",
  email: "angela@example.com",
  state: "California",
  products: ["acrylic-partial"],
  white_shade: "A2",
  gum_shade: null,
  status: "draft",
  review_notes: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
  tracking_number: null,
  close_bite_photos: [],
  open_bite_photos: [],
  impression_photos: [],
};

/* ══════════════════════════════════════
   Landing (dashboard) — "Start Here" design
   ══════════════════════════════════════ */
function Landing() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const patientName = submission?.name?.trim().split(" ")[0] || "there";

  /* Chat hook (unread count powers the bottom-nav Messages badge). */
  const { unreadCount: chatUnread } = useChat(
    submission?.id ?? null,
    "patient",
    submission?.name || "Patient"
  );

  /* Open the chat drawer when arriving via the bottom-nav Messages item (?chat=1). */
  useEffect(() => {
    setChatOpen(searchParams.get("chat") === "1");
  }, [searchParams]);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    if (searchParams.get("chat") === "1") router.replace("/dashboard");
  }, [router, searchParams]);

  /* ── Fetch submission (latest of any status, incl. draft) ── */
  useEffect(() => {
    async function fetchSubmission() {
      // Design-preview mode: `?demo=1` renders with mock data (no backend needed).
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1") {
        setSubmission(DEMO_SUBMISSION);
        setLoading(false);
        return;
      }
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
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!data && user.email) {
          const fallback = await supabase
            .from("submissions")
            .select(cols)
            .eq("email", user.email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          data = fallback.data;
        }

        if (data) setSubmission(data as SubmissionData);
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        setError("Unable to load your details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmission();
  }, []);

  const productLabel = submission?.products?.length
    ? formatProductLabel(submission.products)
    : "Acrylic partial denture";
  const done = submission ? intakeDone(submission) : 0;

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
            priority
            style={{ objectFit: "contain", objectPosition: "left center" }}
            sizes="120px"
          />
          <Link href="/profile" className={styles.profileBtn} aria-label="Your profile">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#121723" aria-hidden>
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2.2c-4.4 0-8 2.6-8 5.8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.2-3.6-5.8-8-5.8z" />
            </svg>
          </Link>
        </div>

        {/* ── Greeting ── */}
        <h1 className={styles.greeting}>Welcome back,<br />{patientName}</h1>

        {loading && (
          <div className={styles.card}><div className={styles.skeleton}>
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
            <div className={styles.skeletonBlock} />
          </div></div>
        )}

        {!loading && error && (
          <div className={styles.card}><div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Something went wrong</p>
            <p className={styles.emptyMsg}>{error}</p>
            <button className={styles.retryBtn} onClick={() => window.location.reload()}>TRY AGAIN</button>
          </div></div>
        )}

        {!loading && !error && (
          <>
            {/* ══ Start Here ══ */}
            <section className={styles.startCard}>
              <h2 className={styles.startLabel}>Start Here</h2>

              {/* Video (clickable → impression how-to) */}
              <Link href={ROUTE_VIDEO} className={styles.video} aria-label="Watch: How to take your impression">
                <Image
                  src="/assets/images/impression-video-thumb.png"
                  alt=""
                  fill
                  priority
                  sizes="358px"
                  style={{ objectFit: "cover", objectPosition: "50% 32%" }}
                />
                <span className={styles.videoScrim} />
                <span className={styles.playBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" aria-hidden style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className={styles.videoCaption}>How to take your impression</span>
              </Link>

              {/* Watch / Read segmented toggle */}
              <div className={styles.toggle}>
                <Link href={ROUTE_VIDEO} className={`${styles.toggleBtn} ${styles.toggleActive}`}>
                  Watch the video
                </Link>
                <Link href={ROUTE_STEPS} className={styles.toggleBtn}>
                  Read steps
                </Link>
              </div>

              {/* Primary action */}
              <Link href={ROUTE_TAKE_PHOTOS} className={styles.primaryBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
                  <path d="M9 3l-1.7 2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.3L15 3H9zm3 4.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                </svg>
                Take my impression photos
              </Link>
            </section>

            {/* ══ Continue My Intake ══ */}
            <Link href={ROUTE_INTAKE} className={styles.intakeCard} aria-label={`Continue your intake, ${done} of ${INTAKE_TOTAL_STEPS} steps done`}>
              <div className={styles.intakeHead}>
                <h2 className={styles.cardTitle}>Continue My Intake</h2>
                <svg className={styles.chevron} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c0c4ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <span className={styles.intakeCount}>{done}/{INTAKE_TOTAL_STEPS}</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${(done / INTAKE_TOTAL_STEPS) * 100}%` }} />
              </div>
            </Link>

            {/* ══ My Subscriptions ══ */}
            <section className={styles.subCard}>
              <h2 className={styles.cardTitle}>My Subscriptions</h2>
              <div className={styles.subRow}>
                <div className={styles.subThumb}>
                  <Image src="/assets/images/subscription-product.png" alt="" width={40} height={48} style={{ objectFit: "contain" }} sizes="40px" />
                </div>
                <div className={styles.subInfo}>
                  <p className={styles.subName}>{productLabel}</p>
                  <p className={styles.subDesc}>Description about the reorder</p>
                </div>
              </div>
              <div className={styles.subActions}>
                <a href={REORDER_URL} target="_blank" rel="noopener noreferrer" className={styles.reorderBtn}>Reorder</a>
                <Link href="/profile" className={styles.manageBtn}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#121723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Manage
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Chat drawer (Messages) ── */}
      {chatOpen && (
        <div className={styles.chatOverlay} onClick={closeChat}>
          <div className={styles.chatDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <div className={styles.chatAvatar}>
                  <Image src="/assets/images/concierge-avatar.png" alt="" width={36} height={36} style={{ objectFit: "cover" }} sizes="36px" />
                </div>
                <div>
                  <p className={styles.chatTitle}>Your Care Team</p>
                  <p className={styles.chatSubtitle}>We typically reply within a few hours</p>
                </div>
              </div>
              <button className={styles.chatClose} onClick={closeChat} aria-label="Close messages">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.chatBody}>
              <ChatPanel submissionId={submission?.id ?? null} currentRole="patient" currentName={submission?.name || "Patient"} />
            </div>
          </div>
        </div>
      )}

      <BottomNav messagesBadge={chatUnread} />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className={styles.screen} />}>
      <Landing />
    </Suspense>
  );
}
