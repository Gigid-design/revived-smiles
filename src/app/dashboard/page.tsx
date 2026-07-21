"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import styles from "./page.module.css";
import { api, ApiError } from "@/lib/api";
import type { Submission, Subscription } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { ImpressionStepsModal } from "@/app/components/ImpressionStepsModal";
import { useMessages } from "@/app/context/MessagesContext";

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

/* A row on the "Your Progress" timeline. */
type StageState = "done" | "current" | "upcoming";

interface ProgressStep {
  label: string;
  state: StageState;
  action: { href: string; text: string } | null;
}

/* Routes for the "Start Here" actions. */
const ROUTE_VIDEO = "/impression-photos";  // impression how-to (examples + tips live here)
const ROUTE_UPLOAD = "/impression-photos";  // impression photo upload page
const ROUTE_INTAKE = "/intake";            // resume intake form
const REORDER_URL = "https://revivedsmiles.com";

const DAY_MS = 86_400_000;

/** "Tue, Aug 12" — enough to plan around without reading like a receipt. */
function deliveryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** How far off it is, in the units a person would actually say it in. */
function deliveryRelative(iso: string): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);

  const days = Math.round((then.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return "Overdue";
  if (days === 0) return "Arriving today";
  if (days === 1) return "Arriving tomorrow";
  if (days < 14) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks < 8 ? `in ${weeks} weeks` : `in ${Math.round(days / 30)} months`;
}

function money(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minorUnits / 100,
  );
}

/** yyyy-mm-dd in local time, which is what <input type="date"> expects. */
function dateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

/** Quick choices, so the common cases don't need the date picker. */
const RESCHEDULE_PRESETS = [
  { label: "In a week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
];

/* Maps a step's state to its row styling (avoids a nested template literal). */
const STAGE_CLASS: Record<StageState, string> = {
  done: styles.stageDone,
  current: styles.stageCurrent,
  upcoming: "",
};

/* ══════════════════════════════════════
   Landing (dashboard) — "Start Here" design
   ══════════════════════════════════════ */
function Landing() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [subBusy, setSubBusy] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  const patientName = submission?.name?.trim().split(" ")[0] || "there";

  /* Unread replies power the bottom-nav Messages badge. */
  const { unreadCount } = useMessages();

  useEffect(() => {
    let cancelled = false;

    api.subscriptions
      .list()
      .then((subs) => {
        if (!cancelled) setSubscription(subs[0] ?? null);
      })
      .catch((err) => console.error("Could not load subscriptions:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  /** Wraps a subscription action so every one reports failure the same way. */
  async function runSubAction(action: () => Promise<Subscription>) {
    if (subBusy) return;
    setSubBusy(true);
    setSubError(null);
    try {
      setSubscription(await action());
      setRescheduleOpen(false);
    } catch (err) {
      setSubError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubBusy(false);
    }
  }

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

  /* Each task is an action card until it's done, then it converts into a
     completed step on the progress timeline below. */
  const intakeComplete = done === INTAKE_TOTAL_STEPS;
  const impressionsComplete = (submission?.impressionPhotos?.length ?? 0) > 0;
  const allSubmitted = intakeComplete && impressionsComplete;
  const showTimeline = intakeComplete || impressionsComplete;

  const steps: ProgressStep[] = [];
  if (intakeComplete) {
    steps.push({ label: "Intake complete", state: "done", action: { href: ROUTE_INTAKE, text: "Review" } });
  }
  if (impressionsComplete) {
    steps.push({ label: "Impression photos submitted", state: "done", action: { href: ROUTE_UPLOAD, text: "Replace" } });
  }
  /* Downstream stages only make sense once everything is in */
  if (allSubmitted) {
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

            {/* ══ My Subscription ══ */}
            {subscription && (
            <section className={styles.subCard}>
              <div className={styles.subHead}>
                <h2 className={styles.cardTitle}>My Subscription</h2>
                <span
                  className={`${styles.subStatus} ${
                    subscription.status === "paused" ? styles.subStatusPaused : styles.subStatusActive
                  }`}
                >
                  {subscription.status === "paused" ? "Paused" : "Active"}
                </span>
              </div>

              <div className={styles.subRow}>
                <div className={styles.subThumb}>
                  <Image src={subscription.imageUrl} alt="" width={40} height={48} style={{ objectFit: "contain" }} sizes="40px" />
                </div>
                <div className={styles.subInfo}>
                  <p className={styles.subName}>{subscription.productName}</p>
                  <p className={styles.subDesc}>
                    Every {subscription.intervalWeeks} weeks ·{" "}
                    {money(subscription.pricePerDelivery, subscription.currency)}
                  </p>
                </div>
              </div>

              {/* The thing she actually opened the card to find out. */}
              <div className={styles.nextDelivery}>
                <div className={styles.nextInfo}>
                  <p className={styles.nextLabel}>
                    {subscription.status === "paused" ? "Next delivery when resumed" : "Next delivery"}
                  </p>
                  <p className={styles.nextDate}>{deliveryDate(subscription.nextDeliveryAt)}</p>
                  <p className={styles.nextRelative}>{deliveryRelative(subscription.nextDeliveryAt)}</p>
                </div>
                {subscription.status === "active" && (
                  <button
                    type="button"
                    className={styles.skipBtn}
                    disabled={subBusy}
                    onClick={() => void runSubAction(() => api.subscriptions.skipNext(subscription.id))}
                  >
                    Skip this one
                  </button>
                )}
              </div>

              {subscription.lastSkippedAt && !rescheduleOpen && (
                <p className={styles.subNote}>You skipped the last delivery.</p>
              )}

              {rescheduleOpen && (
                <div className={styles.reschedulePanel}>
                  <span className={styles.subFieldLabel}>Move it to</span>
                  <div className={styles.dateChips}>
                    {RESCHEDULE_PRESETS.map((preset) => {
                      const value = dateInputValue(plusDays(preset.days));
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          className={`${styles.dateChip} ${newDate === value ? styles.dateChipSelected : ""}`}
                          aria-pressed={newDate === value}
                          onClick={() => setNewDate(value)}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className={styles.subFieldLabel} htmlFor="reschedule-date">
                    Or pick a date
                  </label>
                  <input
                    id="reschedule-date"
                    type="date"
                    className={styles.dateInput}
                    value={newDate}
                    min={dateInputValue(new Date().toISOString())}
                    max={dateInputValue(plusDays(90))}
                    onChange={(e) => setNewDate(e.target.value)}
                  />

                  {subError && <p className={styles.subError}>{subError}</p>}

                  <div className={styles.subActions}>
                    <button
                      type="button"
                      className={styles.rescheduleBtn}
                      disabled={!newDate || subBusy}
                      onClick={() =>
                        void runSubAction(() =>
                          /* Midday avoids a timezone shift landing it a day early. */
                          api.subscriptions.reschedule(subscription.id, new Date(`${newDate}T12:00:00`).toISOString()),
                        )
                      }
                    >
                      {subBusy ? "Saving…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      className={styles.manageBtn}
                      onClick={() => { setRescheduleOpen(false); setSubError(null); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {subError && !rescheduleOpen && <p className={styles.subError}>{subError}</p>}

              {!rescheduleOpen && (
                <div className={styles.subActions}>
                  <button
                    type="button"
                    className={styles.rescheduleBtn}
                    disabled={subscription.status === "paused" || subBusy}
                    onClick={() => {
                      setNewDate(dateInputValue(subscription.nextDeliveryAt));
                      setSubError(null);
                      setRescheduleOpen(true);
                    }}
                  >
                    Reschedule
                  </button>
                  <Link href="/my-order" className={styles.manageBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#121723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Manage
                  </Link>
                </div>
              )}
            </section>
            )}
          </>
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
