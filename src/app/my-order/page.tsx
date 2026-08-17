"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { SubscriptionCard } from "@/app/components/SubscriptionCard";
import { InsuranceCard } from "@/app/components/InsuranceCard";
import { ReportIssueSheet } from "@/app/components/ReportIssueSheet";
import { ShippingLabelModal } from "@/app/components/ShippingLabelModal";
import {
  productLabel,
  productLabels,
  productImage,
  productHasArch,
  archFromTeeth,
  ARCH_LABELS,
} from "@/app/context/productConfig";

/* An order's thumbnail = its first product's photo, falling back to the
   generic hero image for an order with no recognised product. */
function orderImage(products: string[]): string {
  return (products.length ? productImage(products[0]) : null) ?? "/assets/images/hero-product.png";
}

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
const STAGE_LABELS = [
  "Order placed",
  "Impression kit shipped",
  "Impressions received",
  "In review by your care team",
  "Review completed",
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
  pending: 3,
  in_review: 4,
  changes_requested: 4,
  rejected: 4,
  approved: 5,
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

/* The patient-facing wording for an order status. */
const ORDER_STATUS_COPY: Record<SubmissionStatus, string> = {
  draft: "In progress",
  pending: "In review",
  in_review: "In review",
  changes_requested: "Action needed",
  rejected: "Declined",
  approved: "Review completed",
  in_fabrication: "In production",
  shipped: "Shipped",
  completed: "Completed",
};

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

/* The domain model has no customer-facing order reference, so the one shown here
   is derived from the submission id — the same reference printed on the return
   shipping label, so the two always agree. */
function orderReference(id: string): string {
  return `RS-${id.slice(0, 8).toUpperCase()}`;
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
  const { requests, unreadCount, sendRequest, send } = useMessages();

  const [orders, setOrders] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  /* Demo affordance: lets the tracker be viewed in its delivered state (and the
     Care Guide link that only appears then) without an admin advancing the
     order. Set via `?preview=delivered`. */
  const [forceDelivered, setForceDelivered] = useState(false);

  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading URL params on mount
    if (params.get("preview") === "delivered") setForceDelivered(true);
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
  const hasMultiple = orders.length > 1;

  /* Close the order switcher on an outside click or Escape. */
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (headRef.current && !headRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const effectiveStatus: SubmissionStatus | undefined = order
    ? (forceDelivered ? "completed" : order.status)
    : undefined;
  const stagesComplete = effectiveStatus ? STAGES_COMPLETE[effectiveStatus] : 0;

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
            <div className={styles.orderHeadWrap} ref={headRef}>
              <button
                type="button"
                className={`${styles.orderBar} ${hasMultiple ? styles.orderBarTrigger : ""}`}
                onClick={() => hasMultiple && setMenuOpen((o) => !o)}
                disabled={!hasMultiple}
                aria-haspopup={hasMultiple ? "listbox" : undefined}
                aria-expanded={hasMultiple ? menuOpen : undefined}
                aria-label={hasMultiple ? "Switch order" : undefined}
              >
                <span className={styles.orderBarText}>
                  <span className={styles.orderRef}>{orderReference(order.id)}</span>
                  <span className={styles.orderPlaced}>Placed {formatPlaced(order.createdAt)}</span>
                </span>
                <span className={styles.orderStatus}>{ORDER_STATUS_COPY[effectiveStatus ?? order.status]}</span>
                {hasMultiple && (
                  <svg
                    className={`${styles.orderHeadChevron} ${menuOpen ? styles.orderHeadChevronOpen : ""}`}
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </button>

              {hasMultiple && menuOpen && (
                <div className={styles.orderMenu} role="listbox" aria-label="Your orders">
                  {orders.map((o) => {
                    const selected = o.id === order.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`${styles.orderMenuItem} ${selected ? styles.orderMenuItemActive : ""}`}
                        onClick={() => { setSelectedId(o.id); setMenuOpen(false); }}
                      >
                        <div className={styles.orderMenuThumb}>
                          <Image src={orderImage(o.products)} alt="" width={96} height={96} sizes="44px" style={{ objectFit: "cover" }} />
                        </div>
                        <div className={styles.orderMenuText}>
                          <span className={styles.orderMenuName}>
                            {o.products.length ? productLabels(o.products) : "Your order"}
                          </span>
                          <span className={styles.orderMenuMeta}>
                            {orderReference(o.id)} · {ORDER_STATUS_COPY[o.status]}
                          </span>
                        </div>
                        {selected && (
                          <svg className={styles.orderMenuCheck} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 12.5L9.5 18L20 6.5" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
                /* Colour each cleared dot with the gradient at its point on the
                   rail, so the circles and the bar read as one. */
                const dotColor = done
                  ? gradientColor(stagesComplete > 1 ? i / (stagesComplete - 1) : 0)
                  : undefined;
                return (
                  <li
                    key={label}
                    className={`${styles.stage} ${done ? styles.stageDone : ""} ${isCurrent ? styles.stageCurrent : ""}`}
                  >
                    <span
                      className={styles.stageDot}
                      aria-hidden="true"
                      style={dotColor ? { background: dotColor, borderColor: dotColor } : undefined}
                    />
                    <span className={styles.stageLabel}>{label}</span>
                  </li>
                );
              })}
            </ol>

            {/* Care Guide — sits under "Delivered" and only once it's reached. */}
            {deliveredActive && (
              <Link href="/care-guide" className={styles.careGuideLink}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 5a2 2 0 0 1 2-2h10a1 1 0 0 1 1 1v13H6a2 2 0 0 0-2 2z" />
                  <path d="M4 19a2 2 0 0 0 2 2h11" /><path d="M8 7h6M8 10h6" />
                </svg>
                View your Care Guide
                <svg className={styles.careGuideChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
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

            {/* Return or cancel — for an order still in flight (e.g. an unused
                impression kit they've decided not to use). Issues a prepaid
                return label and lets the care team know. */}
            {effectiveStatus !== "completed" && effectiveStatus !== "rejected" && (
              <button
                type="button"
                className={styles.returnBtn}
                onClick={() => {
                  void send("I'd like to return or cancel this order — please help me with a refund.");
                  setReturnOpen(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7h13a4 4 0 0 1 0 8h-3" />
                  <path d="M7 11 3 7l4-4" />
                </svg>
                Return or cancel order
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
          onReport={(kind, note) => sendRequest(kind, "", note)}
        />
      )}

      {order && (
        <ShippingLabelModal
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          submissionId={order.id}
          patientName={order.name ?? "Patient"}
        />
      )}

      <BottomNav messagesBadge={unreadCount} />
    </main>
  );
}
