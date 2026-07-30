"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { api, ApiError } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { ImpressionStepsModal } from "@/app/components/ImpressionStepsModal";
import { useMessages } from "@/app/context/MessagesContext";
import { useInsurance } from "@/app/hooks/useInsurance";

/* Intake ends once the teeth photos are taken — impression photos are a separate
   task from "Start Here", not an intake step. Total tracks the steps counted
   below; per-product step mapping is still to be wired (to-do #10). */
const INTAKE_TOTAL_STEPS = 5;

/* Rough completed-step count for the "Continue My Intake" progress. */
function intakeDone(sub: Submission): number {
  let done = 1; // intake started
  if (sub.products?.length) done++;
  if (sub.whiteShade || sub.gumShade) done++;
  if (sub.closeBitePhotos?.length) done++;  // teeth photos — bite closed
  if (sub.openBitePhotos?.length) done++;   // teeth photos — mouth open
  return Math.min(done, INTAKE_TOTAL_STEPS);
}

/* Stages after everything is submitted — mirrors the My Order tracker so the
   dashboard turns into a "where is my order" view once there's nothing to do. */
const POST_SUBMIT_STAGES = [
  "In review by your care team",
  "In production",
  "On its way to you",
];

/* A row on the "Your Progress" timeline. `attention` is the red state a step
   drops into when the care team kicks it back for a resubmit. */
type StageState = "done" | "current" | "upcoming" | "attention";

interface ProgressStep {
  label: string;
  state: StageState;
  action: { href: string; text: string } | null;
}

/* Sample review notes for the ?preview= demo, used only when the real order has
   no notes of its own — so the branch-state UI can be shown without an admin
   flipping the status first. Mirrors the tone of the seeded admin queue. */
const PREVIEW_NOTES: Record<"changes_requested" | "rejected", string> = {
  changes_requested:
    "The open-bite side photo is too dark to read the gum line. Could you retake it near a window, with the light facing you rather than behind you?",
  rejected:
    "The photos show active gum inflammation. Please see a dentist in person before we fit anything.",
};

/* Routes for the "Start Here" actions. */
const ROUTE_VIDEO = "/impression-photos";  // impression how-to (examples + tips live here)
const ROUTE_UPLOAD = "/impression-photos";  // impression photo upload page
const ROUTE_INTAKE = "/intake";            // resume intake form
const REORDER_URL = "https://revivedsmiles.com";

/* Maps a step's state to its row styling (avoids a nested template literal). */
const STAGE_CLASS: Record<StageState, string> = {
  done: styles.stageDone,
  current: styles.stageCurrent,
  upcoming: "",
  attention: styles.stageAttention,
};

/* ══════════════════════════════════════
   Landing (dashboard) — "Start Here" design
   ══════════════════════════════════════ */
function Landing() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const searchParams = useSearchParams();

  const patientName = submission?.name?.trim().split(" ")[0] || "there";

  /* Unread replies power the bottom-nav Messages badge. */
  const { unreadCount } = useMessages();

  /* Insured appliances get a quiet entry point to file a protection claim. */
  const { canClaim } = useInsurance();

  /* ── Fetch submission (latest of any status, incl. draft) ──
     Also refetches whenever the tab becomes visible again, so finishing a task
     and coming back always shows it as done — and so a demo left open on
     another tab isn't showing stale progress when you switch back to it. */
  useEffect(() => {
    let cancelled = false;

    async function fetchSubmission() {
      try {
        const mine = await api.submissions.getMine();
        if (!cancelled) setSubmission(mine);
      } catch (err) {
        console.error("Failed to fetch submission:", err);
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Something went wrong.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubmission();

    function refetchIfVisible() {
      if (document.visibilityState === "visible") void fetchSubmission();
    }

    document.addEventListener("visibilitychange", refetchIfVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refetchIfVisible);
    };
  }, []);

  const done = submission ? intakeDone(submission) : 0;

  /* `?preview=changes_requested|rejected` overlays a branch status so the
     denial/resubmit UI can be demoed without an admin flipping the order. */
  const preview = searchParams.get("preview");
  const previewStatus =
    preview === "changes_requested" || preview === "rejected" ? preview : null;
  const status: SubmissionStatus | undefined = previewStatus ?? submission?.status;

  /* When the care team sends the order back, the impressions turn red and the
     patient resubmits — but the intake stays green, because that's a one-time
     thing we don't ask for again. */
  const changesRequested = status === "changes_requested";
  const rejected = status === "rejected";
  const branched = changesRequested || rejected;
  const reviewNotes = submission?.reviewNotes ?? (previewStatus ? PREVIEW_NOTES[previewStatus] : null);

  /* A branch status only happens after the order was fully submitted, so both
     prior steps read as complete (intake green, impressions red-for-resubmit). */
  const intakeComplete = branched || done === INTAKE_TOTAL_STEPS;
  const impressionsComplete = branched || (submission?.impressionPhotos?.length ?? 0) > 0;
  const onTrack = intakeComplete && impressionsComplete && !branched;
  const showTimeline = intakeComplete || impressionsComplete;

  const steps: ProgressStep[] = [];
  if (intakeComplete) {
    steps.push({ label: "Intake complete", state: "done", action: { href: ROUTE_INTAKE, text: "Review" } });
  }
  if (impressionsComplete) {
    if (changesRequested) {
      steps.push({ label: "Impression photos — resubmit needed", state: "attention", action: { href: ROUTE_UPLOAD, text: "Resubmit" } });
    } else if (rejected) {
      steps.push({ label: "Impressions not approved", state: "attention", action: { href: "/messages", text: "Details" } });
    } else {
      steps.push({ label: "Impression photos submitted", state: "done", action: { href: ROUTE_UPLOAD, text: "Replace" } });
    }
  }
  /* Downstream stages only make sense once everything is in and on the happy path */
  if (onTrack) {
    POST_SUBMIT_STAGES.forEach((label, i) => {
      steps.push({
        label,
        state: i === 0 ? "current" : "upcoming",
        action: i === 0 ? { href: "/my-order", text: "Track" } : null,
      });
    });
  }
  const doneCount = steps.filter((s) => s.state === "done").length;

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2.2c-4.4 0-8 2.6-8 5.8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.2-3.6-5.8-8-5.8z" />
            </svg>
            <span className={styles.profileLabel}>Profile</span>
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

        {/* ── Care-team sent it back: prominent action banner ── */}
        {!loading && !error && branched && (
          <section
            className={`${styles.reviewBanner} ${rejected ? styles.reviewBannerRejected : styles.reviewBannerChanges}`}
            role="alert"
          >
            <div className={styles.reviewBannerIcon} aria-hidden="true">
              {rejected ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.5 21 19H3L12 3.5Z" />
                  <path d="M12 9.5v4" />
                  <path d="M12 16.5h.01" />
                </svg>
              )}
            </div>
            <div className={styles.reviewBannerBody}>
              <h2 className={styles.reviewBannerTitle}>
                {rejected ? "We couldn't approve your impressions" : "Your impressions need another look"}
              </h2>
              {reviewNotes && <p className={styles.reviewBannerReason}>{reviewNotes}</p>}
              <p className={styles.reviewBannerHint}>
                {rejected ? "We've explained why in your messages." : "Full details are in your messages."}
              </p>
              <div className={styles.reviewBannerActions}>
                {changesRequested && (
                  <Link href={ROUTE_UPLOAD} className={styles.reviewBannerPrimary}>
                    Resubmit impression photos
                  </Link>
                )}
                <Link
                  href="/messages"
                  className={changesRequested ? styles.reviewBannerSecondary : styles.reviewBannerPrimary}
                >
                  Message the care team
                </Link>
              </div>
            </div>
          </section>
        )}

        {!loading && !error && (
          <div className={styles.grid}>
            <div className={styles.colMain}>
            {/* ══ Start Here — until impressions are in, then it becomes a
                   completed step on the timeline below ══ */}
            {!impressionsComplete && (
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
                <button type="button" onClick={() => setStepsOpen(true)} className={styles.toggleBtn}>
                  Read steps
                </button>
              </div>

              {/* Primary action */}
              <Link href={ROUTE_UPLOAD} className={styles.primaryBtn} aria-label="Upload my impression photos">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
                  <path d="M12 3l5.5 5.5-1.42 1.42L13 6.83V16h-2V6.83L7.92 9.92 6.5 8.5 12 3zM5 19h14v2H5v-2z" />
                </svg>
                Upload my impression photos
              </Link>
            </section>
            )}

            {/* ══ Continue My Intake — until it's done, then it becomes a
                   completed step on the timeline below ══ */}
            {!intakeComplete && (
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
            )}
            </div>

            <div className={styles.colSide}>
            {/* ══ Your Progress — completed tasks convert into steps here, and
                   once everything's submitted it extends into the review and
                   production stages (same tracker as My Order) ══ */}
            {showTimeline && (
              <section className={styles.progressCard}>
                <div className={styles.progressHead}>
                  <h2 className={styles.cardTitle}>Your Progress</h2>
                  <span className={styles.progressCount}>{doneCount} done</span>
                </div>

                <ol className={styles.timeline}>
                  {steps.map((step) => (
                    <li
                      key={step.label}
                      className={`${styles.stage} ${STAGE_CLASS[step.state]}`}
                    >
                      <span className={styles.stageDot} aria-hidden="true">
                        {step.state === "done" && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12.5L9.5 18L20 6.5" />
                          </svg>
                        )}
                        {step.state === "current" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="8.5" />
                            <path d="M12 7.5v5l3 1.8" />
                          </svg>
                        )}
                        {step.state === "attention" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 7.5v5" />
                            <path d="M12 16.5h.01" />
                          </svg>
                        )}
                      </span>

                      <div className={styles.stageBody}>
                        <span className={styles.stageLabel}>{step.label}</span>
                        <span className={styles.stageRight}>
                          {step.state === "done" && (
                            <span className={`${styles.stageChip} ${styles.chipDone}`}>Completed</span>
                          )}
                          {step.state === "current" && (
                            <span className={`${styles.stageChip} ${styles.chipCurrent}`}>In progress</span>
                          )}
                          {step.state === "attention" && (
                            <span className={`${styles.stageChip} ${styles.chipAttention}`}>
                              {rejected ? "Not approved" : "Action needed"}
                            </span>
                          )}
                          {step.action && (
                            <Link href={step.action.href} className={styles.stageAction}>
                              {step.action.text}
                            </Link>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ══ Protection claim — only for insured appliances without an
                   open claim; a quiet entry so it doesn't read as urgent ══ */}
            {canClaim && (
              <Link href="/insurance-claim" className={styles.claimEntry}>
                <span className={styles.claimEntryIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <span className={styles.claimEntryText}>File a protection claim</span>
                <svg className={styles.claimEntryChevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c4ce" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}

            {/* ══ Your Care Team — real care-team photos + chat CTA (Figma 475-20) ══ */}
            <section className={styles.supportCard} aria-labelledby="support-title">
              <div className={styles.supportCopy}>
                <h2 id="support-title" className={styles.supportTitle}>Your Care Team</h2>
                <p className={styles.supportSubtitle}>
                  Need assistance? Our care team is ready to help.
                </p>
                <Link href="/messages" className={styles.supportPrimary}>
                  Chat with us
                </Link>
              </div>

              {/* Staggered care-team photos with a yellow chat bubble, bleeding to
                  the card edges. Cropped to match the Figma frame. */}
              <div className={styles.supportVisual} aria-hidden="true">
                <span className={`${styles.carePhoto} ${styles.carePhotoTop}`} />
                <span className={`${styles.carePhoto} ${styles.carePhotoMain}`} />
                <span className={`${styles.carePhoto} ${styles.carePhotoBottom}`} />
                <span className={styles.chatBadge}>
                  <svg viewBox="0 0 48 40" width="42" height="35" aria-hidden="true">
                    <rect x="2" y="2" width="44" height="26" rx="10" fill="#FDD33B" />
                    <path d="M14 25 L9 37 L24 25 Z" fill="#FDD33B" />
                    <circle cx="16" cy="15" r="2.6" fill="#2b2b2b" />
                    <circle cx="24" cy="15" r="2.6" fill="#2b2b2b" />
                    <circle cx="32" cy="15" r="2.6" fill="#2b2b2b" />
                  </svg>
                </span>
              </div>
            </section>
            </div>
          </div>
        )}
      </div>

      <ImpressionStepsModal open={stepsOpen} onClose={() => setStepsOpen(false)} />

      <BottomNav messagesBadge={unreadCount} />
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
