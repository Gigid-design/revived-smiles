"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { AdjustmentRequest, AdjustmentStatus, Submission, SubmissionStatus } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { SubscriptionCard } from "@/app/components/SubscriptionCard";
import { InsuranceCard } from "@/app/components/InsuranceCard";
import { ReportIssueSheet } from "@/app/components/ReportIssueSheet";
import {
  productLabel,
  productImage,
  productHasArch,
  archFromTeeth,
  ARCH_LABELS,
} from "@/app/context/productConfig";
import { OrderSwitcher } from "@/app/components/OrderSwitcher";

/* The arch label ("Upper" / "Lower") for one appliance on an order, or null
   when it doesn't apply (a nightguard) or isn't known yet (teeth not chosen,
   or "not sure"). Per-item answers live in `itemDetails`; older single-item
   orders mirror them on the top-level fields, so fall back to those. */
function productArch(order: Submission, slug: string): string | null {
  if (!productHasArch(slug)) return null;
  const detail = order.itemDetails?.[slug];
  const teeth = detail?.selectedTeeth ?? order.selectedTeeth;
  const notSure = detail?.teethNotSure ?? order.teethNotSure;
  if (notSure) return null;
  const arch = archFromTeeth(teeth ?? []);
  return arch ? ARCH_LABELS[arch] : null;
}
import { useMessages, REQUEST_LABELS, RequestStatus } from "@/app/context/MessagesContext";

/* Fulfilment stages shown in the tracker, in order. "Review completed" sits
   between the care-team review and production: it's the gate the primary
   action waits on — the patient can open the full order once review is done. */
/* Order per the Aug 21 client review: the care team reviews the *photos*
   first; the physical impressions arrive at the lab only after approval and
   the return label. So "Impressions received" sits after "Review completed". */
const STAGE_LABELS = [
  "Order placed",
  "Impression kit shipped",
  "In review by your care team",
  "Review completed",
  "Impressions received",
  "In production",
  "On its way to you",
  "Delivered",
];

/* The index of the stage the "View order" button unlocks on. */
const REVIEW_COMPLETE_INDEX = STAGE_LABELS.indexOf("Review completed");

/* How far along the tracker each order status sits — the count of stages above
   that are complete. The last completed stage is the one highlighted.
   `approved` is the moment review is complete, so it clears that new stage. */
const STAGES_COMPLETE: Record<SubmissionStatus, number> = {
  draft: 2,
  /* Photos submitted, waiting on the care team — "In review" is current. */
  pending: 3,
  in_review: 3,
  changes_requested: 3,
  rejected: 3,
  approved: 4,
  /* Retake found at the lab: the impressions *were* received — that stage is
     exactly where the stop belongs, with review still green above it. */
  lab_retake: 5,
  in_fabrication: 6,
  shipped: 7,
  completed: 8,
};

/* The progress gradient — the same ramp as the dashboard "Continue My Intake"
   bar. Sampled per completed dot so the circles match the rail at their point. */
const GRADIENT_STOPS: { t: number; rgb: [number, number, number] }[] = [
  { t: 0, rgb: [253, 211, 59] },    // #fdd33b
  { t: 0.49, rgb: [198, 220, 254] }, // #c6dcfe
  { t: 1, rgb: [18, 23, 35] },       // #121723
];

/** The gradient colour at position `t` (0–1) along the ramp. */
function gradientColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    const a = GRADIENT_STOPS[i - 1];
    const b = GRADIENT_STOPS[i];
    if (x <= b.t) {
      const f = (x - a.t) / (b.t - a.t || 1);
      const [r, g, bl] = a.rgb.map((av, k) => Math.round(av + (b.rgb[k] - av) * f));
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const [r, g, bl] = GRADIENT_STOPS[GRADIENT_STOPS.length - 1].rgb;
  return `rgb(${r}, ${g}, ${bl})`;
}

/** The single impression area a resubmission note points at, so the retake can
 *  target just that one. Null when it names none or several (retake all). */
function resubmitAreaFromNotes(notes: string | null | undefined): "upper" | "lower" | "bite" | null {
  const n = (notes ?? "").toLowerCase();
  const hits = [
    ["upper", n.includes("upper")],
    ["lower", n.includes("lower")],
    ["bite", n.includes("bite")],
  ].filter(([, hit]) => hit) as [string, boolean][];
  return hits.length === 1 ? (hits[0][0] as "upper" | "lower" | "bite") : null;
}

const STATUS_COPY: Record<RequestStatus, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPlaced(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* A patient-facing "arrives by" estimate. Firm once shipped (a few days from
   the ship date); a rough window while in production; nothing before that. */
function estimatedArrival(order: Submission): string | null {
  if (order.shippedAt) {
    const d = new Date(order.shippedAt);
    d.setDate(d.getDate() + 3);
    return formatPlaced(d.toISOString());
  }
  if (order.status === "in_fabrication" || order.status === "approved") {
    const d = new Date(order.createdAt);
    d.setDate(d.getDate() + 14);
    return formatPlaced(d.toISOString());
  }
  return null;
}

export default function MyOrder() {
  const { requests, unreadCount, sendRequest } = useMessages();

  const [orders, setOrders] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  /* Demo affordance: lets the tracker be viewed in a state an admin would
     otherwise have to set up — `?preview=delivered` or `?preview=lab_retake`. */
  const [forceStatus, setForceStatus] = useState<SubmissionStatus | null>(null);
  /* Adjustment requests raised against the displayed order — the tracker
     extends past Delivered with their round-trip (Aug 21 client review).
     `?preview=adjustment_<status>` synthesises one for a demo. */
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>([]);
  const [forceAdjustment, setForceAdjustment] = useState<AdjustmentStatus | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading URL params on mount
    if (preview === "delivered") setForceStatus("completed");
    else if (preview === "lab_retake") setForceStatus("lab_retake");
    else if (preview === "in_production") setForceStatus("in_fabrication");
    else if (preview?.startsWith("adjustment_")) {
      const st = preview.slice("adjustment_".length) as AdjustmentStatus;
      if (["pending", "approved", "received", "delivered", "rejected"].includes(st)) {
        setForceStatus("completed");
        setForceAdjustment(st);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const mine = await api.submissions.listMine();
        if (!cancelled) {
          setOrders(mine);
          setSelectedId((prev) => prev ?? mine[0]?.id ?? null);
        }
      } catch (err) {
        console.error("Could not load your orders:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Supplies requests are messages in the conversation; the context already
     narrows them for us, newest first. */

  /* The order on show — the one picked in the switcher, or the newest. */
  const order = orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    api.adjustments.listForSubmission(order.id)
      .then((rows) => { if (!cancelled) setAdjustments(rows); })
      .catch(() => { if (!cancelled) setAdjustments([]); });
    return () => { cancelled = true; };
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the id on purpose

  /* The adjustment the tracker narrates: the newest non-draft one, or the
     demo-forced one. */
  const activeAdjustment: Pick<AdjustmentRequest, "status" | "reviewNotes" | "product"> | null = forceAdjustment
    ? { status: forceAdjustment, product: order?.products?.[0] ?? "", reviewNotes: forceAdjustment === "rejected" ? "The appliance shows wear beyond what an adjustment can correct — a remake is the right path. Customer service will reach out with options." : null }
    : adjustments.find((a) => a.status !== "draft") ?? null;
  const effectiveStatus: SubmissionStatus | undefined = order
    ? (forceStatus ?? order.status)
    : undefined;
  const stagesComplete = effectiveStatus ? STAGES_COMPLETE[effectiveStatus] : 0;
  /* A partial-resubmission request blocks the order at the review stage. When
     the note names a single area, the retake can target just that impression. */
  const isBlocked = effectiveStatus === "changes_requested";
  /* Lab retake: the impressions came back physically and one didn't survive —
     the stop sits past Review completed, a new kit is on its way, and nothing
     needs returning first (Aug 18 session). Kit dispatch stays manual in
     Shopify; the portal shows the message, the tracking, and the retake path. */
  const isLabRetake = effectiveStatus === "lab_retake";
  const resubmitArea =
    isBlocked || isLabRetake
      ? (order?.retakeArea ??
          resubmitAreaFromNotes(order?.reviewNotes) ??
          (forceStatus === "lab_retake" ? ("upper" as const) : null))
      : null;
  const retakeKitTracking = isLabRetake
    ? (order?.retakeKitTracking ?? (forceStatus === "lab_retake" ? "1Z999AA10777813377" : null))
    : null;

  /* The primary action only opens once the care team's review is complete —
     i.e. the "Review completed" stage has been cleared. */
  const reviewComplete = stagesComplete > REVIEW_COMPLETE_INDEX;

  /* The final "Delivered" stage is reached — unlocks the Care Guide. */
  const deliveredActive = stagesComplete >= STAGE_LABELS.length;

  const STATUS_CLASS: Record<RequestStatus, string> = {
    pending: styles.statusPending,
    accepted: styles.statusAccepted,
    rejected: styles.statusRejected,
  };

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
          <Link href="/profile" className={styles.profileBtn} aria-label="Your account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2.2c-4.4 0-8 2.6-8 5.8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.2-3.6-5.8-8-5.8z" />
            </svg>
            <span className={styles.profileLabel}>Account</span>
          </Link>
        </div>

        <h1 className={styles.heading}>My Orders</h1>

        <div className={styles.grid}>
          <div className={styles.colMain}>
        {/* ── Order summary ── */}
        {loading ? (
          /* Hold the frame until the order loads */
          <section className={styles.orderCard} aria-busy="true" />
        ) : !order ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyTitle}>No order yet</p>
            <p className={styles.emptyBody}>
              Once you finish your intake, your order and its progress will show up here.
            </p>
          </div>
        ) : (
          <section className={styles.orderCard}>
            {/* Order-level meta bar — reference, placed date and status. Doubles
                as the order switcher (a dropdown) when there's more than one. */}
            <OrderSwitcher
              orders={orders}
              selectedId={order.id}
              onSelect={setSelectedId}
              status={effectiveStatus}
            />

            {/* What's on the order — one row per appliance, each with its photo
                and, for a partial or full denture, its arch (Upper / Lower) so
                it's never ambiguous. Arch is hidden where it doesn't apply. */}
            {order.products.length > 0 && (
              <ul className={styles.itemsList}>
                {order.products.map((slug, i) => {
                  const arch = productArch(order, slug);
                  const img = productImage(slug);
                  return (
                    <li key={`${slug}-${i}`} className={styles.itemRow}>
                      <span className={styles.itemThumb} aria-hidden="true">
                        {img && (
                          <Image src={img} alt="" width={80} height={80} sizes="40px" style={{ objectFit: "cover" }} />
                        )}
                      </span>
                      <span className={styles.itemName}>{productLabel(slug)}</span>
                      {arch && <span className={styles.archPill}>{arch}</span>}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Section divider so the fulfilment tracker reads as its own
                block, not a continuation of the appliance list. */}
            <p className={styles.progressLabel}>Order progress</p>

            {/* Fulfilment tracker — the completed run is drawn as one
                continuous gradient rail (see .timeline::after). */}
            <ol className={styles.timeline} style={{ "--done": stagesComplete } as CSSProperties}>
              {STAGE_LABELS.map((label, i) => {
                const done = i < stagesComplete;
                const isCurrent = i === stagesComplete - 1;
                /* A partial-resubmission request is a red stop AT the current
                   stage — not a reset to the top — so the patient sees exactly
                   what's blocking without thinking they've lost their progress. */
                const isBlocker = (isBlocked || isLabRetake) && isCurrent;
                /* Colour each cleared dot with the gradient at its point on the
                   rail, so the circles and the bar read as one. */
                const dotColor = done && !isBlocker
                  ? gradientColor(stagesComplete > 1 ? i / (stagesComplete - 1) : 0)
                  : undefined;
                return (
                  <li
                    key={label}
                    className={`${styles.stage} ${done ? styles.stageDone : ""} ${isCurrent ? styles.stageCurrent : ""} ${isBlocker ? styles.stageBlocked : ""}`}
                  >
                    <span
                      className={styles.stageDot}
                      aria-hidden="true"
                      style={dotColor ? { background: dotColor, borderColor: dotColor } : undefined}
                    />
                    <span className={styles.stageText}>
                      <span className={styles.stageLabel}>
                        {isBlocker
                          ? isLabRetake
                            ? resubmitArea
                              ? `Action needed — retake your ${resubmitArea} impression`
                              : "Action needed — retake & resubmit"
                            : "Action needed — resubmit for approval"
                          : label}
                      </span>
                      {/* Production is the one stage that gets a timestamp and a
                          set-expectations note (Aug 21 client review): the date
                          once it has started, the crafting window while it's
                          the current stage. */}
                      {label === "In production" && done && !isBlocker && (order.fabricationStartedAt || isCurrent) && (
                        <span className={styles.stageMeta}>
                          {order.fabricationStartedAt && `Started ${formatDate(order.fabricationStartedAt)}`}
                          {order.fabricationStartedAt && isCurrent && " · "}
                          {isCurrent && "Please allow 5–7 business days for crafting"}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}

              {/* ── Adjustment round-trip — continues the tracker past Delivered
                  once the patient has raised an adjustment (Aug 21 client
                  review): Submitted → Received → Delivered, or a red
                  "Unable to adjust" stop with the team's reason. ── */}
              {activeAdjustment && stagesComplete >= STAGE_LABELS.length && (() => {
                const st = activeAdjustment.status;
                const rejectedAdj = st === "rejected";
                const rows: { label: string; done: boolean; current: boolean }[] = rejectedAdj
                  ? [
                      { label: "Adjustment submitted", done: true, current: false },
                      { label: "Unable to adjust", done: false, current: true },
                    ]
                  : [
                      { label: "Adjustment submitted", done: true, current: st === "pending" || st === "changes_requested" || st === "approved" },
                      { label: "Adjustment received", done: st === "received" || st === "delivered", current: st === "received" },
                      { label: "Adjustment delivered", done: st === "delivered", current: st === "delivered" },
                    ];
                return rows.map((r) => (
                  <li
                    key={r.label}
                    className={`${styles.stage} ${styles.stageAdjustment} ${r.done ? styles.stageDone : ""} ${r.current ? styles.stageCurrent : ""} ${rejectedAdj && r.current ? styles.stageBlockedRed : ""}`}
                  >
                    <span
                      className={styles.stageDot}
                      aria-hidden="true"
                      style={r.done ? { background: "#121723", borderColor: "#121723" } : undefined}
                    />
                    <span className={styles.stageText}>
                      <span className={styles.stageLabel}>{r.label}</span>
                      {r.current && st === "approved" && (
                        <span className={styles.stageMeta}>Approved — send your appliance back with the return label in your messages</span>
                      )}
                      {r.current && st === "pending" && (
                        <span className={styles.stageMeta}>Our care team is reviewing your request</span>
                      )}
                      {r.current && st === "received" && (
                        <span className={styles.stageMeta}>Your appliance is at the lab — please allow 5–7 business days</span>
                      )}
                    </span>
                  </li>
                ));
              })()}
            </ol>

            {/* Unable to adjust — the reason, in the team's words, with the
                care-team route (same copy the admin sees). */}
            {activeAdjustment?.status === "rejected" && stagesComplete >= STAGE_LABELS.length && (
              <div className={`${styles.blockerCard} ${styles.blockerCardRed}`}>
                <div className={styles.blockerHead}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  Unable to adjust
                </div>
                <p className={styles.blockerText}>
                  {activeAdjustment.reviewNotes || "We couldn't adjust this appliance. Our care team will follow up with next steps."}
                </p>
                <div className={styles.blockerActions}>
                  <Link href="/messages" className={`${styles.blockerBtn} ${styles.blockerBtnRed}`}>Message the care team</Link>
                </div>
              </div>
            )}

            {/* Resubmission blocker — the targeted action item. Shows what the
                lab needs and routes straight to a retake, rather than sending
                the patient back to the start of the impression flow. */}
            {(isBlocked || isLabRetake) && (
              <div className={styles.blockerCard}>
                <div className={styles.blockerHead}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {isLabRetake ? "New kit on the way" : "Action needed"}
                </div>
                <p className={styles.blockerText}>
                  {isLabRetake ? (
                    resubmitArea ? (
                      <>We received your impressions, but your <strong>{resubmitArea}</strong> impression needs a retake. We&apos;re sending you a fresh kit — nothing to send back for now. Once it arrives, retake just that impression and resubmit. Everything else is safely on file.</>
                    ) : (
                      <>We received your impressions, but one needs a retake. We&apos;re sending you a fresh kit — nothing to send back for now. Once it arrives, retake and resubmit. Everything else is safely on file.</>
                    )
                  ) : resubmitArea ? (
                    <>Your care team needs a quick retake of your <strong>{resubmitArea}</strong> impression to perfect your fit. The rest is on file.</>
                  ) : (
                    <>Your care team needs a quick retake to perfect your fit. See the details and resubmit when you&apos;re ready.</>
                  )}
                </p>
                {retakeKitTracking && (
                  <p className={styles.blockerTracking}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
                      <circle cx="7" cy="17" r="1.6" />
                      <circle cx="17.5" cy="17" r="1.6" />
                    </svg>
                    Replacement kit tracking&nbsp;<strong>{retakeKitTracking}</strong>
                  </p>
                )}
                <div className={styles.blockerActions}>
                  <Link
                    href={`/impression-photos${resubmitArea ? `?area=${resubmitArea}` : ""}`}
                    className={styles.blockerBtn}
                  >
                    {isLabRetake ? "Retake & resubmit" : "Resubmit impression"}
                  </Link>
                  <Link href="/messages" className={styles.blockerLink}>View details</Link>
                </div>
              </div>
            )}

            {/* Quick links off the tracker — the documents the patient earns as
                the order advances. Prescriptions unlock at review complete, the
                Care Guide at delivery; they share one button treatment so the
                pair reads as a set rather than two loose chips. */}
            {(reviewComplete || deliveredActive) && (
              <div className={styles.quickLinks}>
                {reviewComplete && (
                  <Link href={`/my-documents?id=${order.id}`} className={styles.quickLink}>
                    <svg className={styles.quickLinkIcon} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    <span className={styles.quickLinkLabel}>Your prescriptions</span>
                    <svg className={styles.quickLinkChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                )}

                {deliveredActive && (
                  <Link href="/care-guide" className={styles.quickLink}>
                    <svg className={styles.quickLinkIcon} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 5a2 2 0 0 1 2-2h10a1 1 0 0 1 1 1v13H6a2 2 0 0 0-2 2z" />
                      <path d="M4 19a2 2 0 0 0 2 2h11" /><path d="M8 7h6M8 10h6" />
                    </svg>
                    <span className={styles.quickLinkLabel}>View your Care Guide</span>
                    <svg className={styles.quickLinkChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                )}
              </div>
            )}

            {(order.trackingNumber || estimatedArrival(order)) && (
              <div className={styles.orderMetaRow}>
                {estimatedArrival(order) && (
                  <p className={styles.eta}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Arrives by <span className={styles.etaDate}>{estimatedArrival(order)}</span>
                  </p>
                )}
                {order.trackingNumber && (
                  <p className={styles.tracking}>
                    Tracking <span className={styles.trackingNo}>{order.trackingNumber}</span>
                  </p>
                )}
              </div>
            )}

            {/* Primary action — unlocked once the care team's review is done. */}
            {reviewComplete ? (
              <Link href={`/my-documents?id=${order.id}`} className={styles.viewBtn}>View order</Link>
            ) : (
              <button type="button" className={`${styles.viewBtn} ${styles.viewBtnLocked}`} disabled aria-disabled="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                View order
              </button>
            )}

            {/* Report an issue — offered once they'd actually have the appliance
                in hand. Opens a chooser: not received / arrived damaged (each
                sends the care team a note) or an adjustment (its own flow). */}
            {(effectiveStatus === "shipped" || effectiveStatus === "completed") && (
              <button
                type="button"
                className={styles.adjustBtn}
                onClick={() => setReportOpen(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
                Report an issue
              </button>
            )}

          </section>
        )}
          </div>

          <div className={styles.colSide}>
        {/* ── Protection / insurance ──
             Tied to the appliance: view coverage, or add protection (links out
             to the website). Renders nothing when there's no insurable order. */}
        <InsuranceCard />

        {/* ── Subscription ──
             The recurring deliveries, alongside the one-off appliance order.
             Same card as Home; Manage opens the full account/billing surface. */}
        <SubscriptionCard manageHref="/manage-subscription" />

        {/* ── Requests ── */}
        <section className={styles.requestsSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Requests</h2>
            <Link href="/messages" className={styles.newRequestLink}>
              New request →
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className={styles.emptyCard}>
              <p className={styles.emptyTitle}>No requests yet</p>
              <p className={styles.emptyBody}>
                Need more impression material or a different tray size? Ask your care
                team in <Link href="/messages" className={styles.inlineLink}>Messages</Link>.
              </p>
            </div>
          ) : (
            <ul className={styles.requestList}>
              {requests.map((message) => {
                const req = message.request!;
                return (
                <li key={message.id} className={styles.requestCard}>
                  <div className={styles.requestHead}>
                    <span className={styles.requestKind}>{REQUEST_LABELS[req.kind]}</span>
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[req.status]}`}>
                      {STATUS_COPY[req.status]}
                    </span>
                  </div>

                  {req.detail && <p className={styles.requestDetail}>{req.detail}</p>}
                  <p className={styles.requestDate}>Requested {formatDate(message.createdAt)}</p>

                  {req.status === "accepted" && (
                    <div className={styles.outcomeBox}>
                      <div className={styles.outcomeRow}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 12.5L9.5 18L20 6.5" />
                        </svg>
                        <span>{req.outcome}</span>
                      </div>
                      {req.trackingNumber && (
                        <p className={styles.tracking}>
                          Tracking <span className={styles.trackingNo}>{req.trackingNumber}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === "rejected" && (
                    <p className={styles.rejectedNote}>
                      Your care team has followed up in this conversation.
                    </p>
                  )}

                  <Link href="/messages" className={styles.threadLink}>
                    View conversation →
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
        </section>
          </div>
        </div>
      </div>

      {order && (
        <ReportIssueSheet
          open={reportOpen}
          orderId={order.id}
          onClose={() => setReportOpen(false)}
          onReport={(kind, note, photos) => sendRequest(kind, "", note, photos)}
        />
      )}

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
