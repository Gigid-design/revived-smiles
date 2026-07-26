"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";
import { SubscriptionCard } from "@/app/components/SubscriptionCard";
import { ShippingLabelModal } from "@/app/components/ShippingLabelModal";
import { productLabels } from "@/app/context/productConfig";
import { useMessages, REQUEST_LABELS, RequestStatus } from "@/app/context/MessagesContext";

/* Fulfilment stages shown in the tracker, in order. */
const STAGE_LABELS = [
  "Order placed",
  "Impression kit shipped",
  "Impressions received",
  "In review by your care team",
  "In production",
  "On its way to you",
];

/* How far along the tracker each order status sits — the count of stages above
   that are complete. The last completed stage is the one highlighted. */
const STAGES_COMPLETE: Record<SubmissionStatus, number> = {
  draft: 2,
  pending: 3,
  in_review: 4,
  changes_requested: 4,
  rejected: 4,
  approved: 4,
  in_fabrication: 5,
  shipped: 6,
  completed: 6,
};

/* The patient-facing wording for an order status. */
const ORDER_STATUS_COPY: Record<SubmissionStatus, string> = {
  draft: "In progress",
  pending: "In review",
  in_review: "In review",
  changes_requested: "Action needed",
  rejected: "Declined",
  approved: "Approved",
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

/* Once impressions are approved the patient mails the physical molds back, so
   the ShipStation return label is available from here on. */
const LABEL_READY: SubmissionStatus[] = ["approved", "in_fabrication", "shipped", "completed"];

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
  const { requests, unreadCount } = useMessages();

  const [order, setOrder] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [labelOpen, setLabelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        const mine = await api.submissions.getMine();
        if (!cancelled) setOrder(mine);
      } catch (err) {
        console.error("Could not load your order:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Supplies requests are messages in the conversation; the context already
     narrows them for us, newest first. */

  const stagesComplete = order ? STAGES_COMPLETE[order.status] : 0;

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
          <Link href="/profile" className={styles.profileBtn} aria-label="Your profile">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#121723" aria-hidden>
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2.2c-4.4 0-8 2.6-8 5.8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.2-3.6-5.8-8-5.8z" />
            </svg>
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
            <div className={styles.orderHead}>
              <div>
                <h2 className={styles.orderProduct}>
                  {order.products.length ? productLabels(order.products) : "Your order"}
                </h2>
                <p className={styles.orderMeta}>
                  {orderReference(order.id)} · Placed {formatPlaced(order.createdAt)}
                </p>
              </div>
              <span className={styles.orderStatus}>{ORDER_STATUS_COPY[order.status]}</span>
            </div>

            {/* Fulfilment tracker */}
            <ol className={styles.timeline}>
              {STAGE_LABELS.map((label, i) => {
                const done = i < stagesComplete;
                const isCurrent = i === stagesComplete - 1;
                return (
                  <li
                    key={label}
                    className={`${styles.stage} ${done ? styles.stageDone : ""} ${isCurrent ? styles.stageCurrent : ""}`}
                  >
                    <span className={styles.stageDot} aria-hidden="true" />
                    <span className={styles.stageLabel}>{label}</span>
                  </li>
                );
              })}
            </ol>

            {order.trackingNumber && (
              <p className={styles.tracking}>
                Tracking <span className={styles.trackingNo}>{order.trackingNumber}</span>
              </p>
            )}

            {estimatedArrival(order) && (
              <p className={styles.eta}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Arrives by <span className={styles.etaDate}>{estimatedArrival(order)}</span>
              </p>
            )}

            {LABEL_READY.includes(order.status) && (
              <button
                type="button"
                className={styles.labelBtn}
                onClick={() => setLabelOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
                  <path d="M9 9h4M9 13h6M9 17h6" />
                </svg>
                View return shipping label
              </button>
            )}
          </section>
        )}
          </div>

          <div className={styles.colSide}>
        {/* ── Subscription ──
             The recurring deliveries, alongside the one-off appliance order.
             Same card as Home; no Manage link, because this is where Manage
             was sending her. */}
        <SubscriptionCard />

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

      <BottomNav messagesBadge={unreadCount} />

      {order && (
        <ShippingLabelModal
          open={labelOpen}
          onClose={() => setLabelOpen(false)}
          submissionId={order.id}
          patientName={order.name ?? "Patient"}
        />
      )}
    </main>
  );
}
