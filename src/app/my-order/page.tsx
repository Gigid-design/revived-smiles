"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { BottomNav } from "@/app/components/BottomNav";
import { useRequests, REQUEST_LABELS, SupportRequest } from "@/app/context/RequestsContext";

/* Placeholder order summary. Wiring this to the real submission/Shopify order
   is a separate scope — this pass covers the customer-facing surface. */
const ORDER = {
  product: "Flexible Partial Denture",
  reference: "RS-10428",
  placed: "Jul 14, 2026",
  status: "In review",
};

/* Fulfilment stages shown in the tracker. `done` marks progress so far. */
const STAGES: { label: string; done: boolean }[] = [
  { label: "Order placed", done: true },
  { label: "Impression kit shipped", done: true },
  { label: "Impressions received", done: true },
  { label: "In review by your care team", done: false },
  { label: "In production", done: false },
  { label: "On its way to you", done: false },
];

const STATUS_COPY: Record<SupportRequest["status"], string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Declined",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MyOrder() {
  const { requests } = useRequests();

  const STATUS_CLASS: Record<SupportRequest["status"], string> = {
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

        <h1 className={styles.heading}>My Order</h1>

        {/* ── Order summary ── */}
        <section className={styles.orderCard}>
          <div className={styles.orderHead}>
            <div>
              <h2 className={styles.orderProduct}>{ORDER.product}</h2>
              <p className={styles.orderMeta}>
                {ORDER.reference} · Placed {ORDER.placed}
              </p>
            </div>
            <span className={styles.orderStatus}>{ORDER.status}</span>
          </div>

          {/* Fulfilment tracker */}
          <ol className={styles.timeline}>
            {STAGES.map((stage, i) => {
              const isCurrent = stage.done && !STAGES[i + 1]?.done;
              return (
                <li
                  key={stage.label}
                  className={`${styles.stage} ${stage.done ? styles.stageDone : ""} ${isCurrent ? styles.stageCurrent : ""}`}
                >
                  <span className={styles.stageDot} aria-hidden="true" />
                  <span className={styles.stageLabel}>{stage.label}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Requests ── */}
        <section className={styles.requestsSection}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Requests</h2>
            <Link href="/dashboard?chat=1" className={styles.newRequestLink}>
              New request →
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className={styles.emptyCard}>
              <p className={styles.emptyTitle}>No requests yet</p>
              <p className={styles.emptyBody}>
                Need more impression material or a different tray size? Ask your care
                team in <Link href="/dashboard?chat=1" className={styles.inlineLink}>Messages</Link>.
              </p>
            </div>
          ) : (
            <ul className={styles.requestList}>
              {requests.map((req) => (
                <li key={req.id} className={styles.requestCard}>
                  <div className={styles.requestHead}>
                    <span className={styles.requestKind}>{REQUEST_LABELS[req.kind]}</span>
                    <span className={`${styles.statusBadge} ${STATUS_CLASS[req.status]}`}>
                      {STATUS_COPY[req.status]}
                    </span>
                  </div>

                  {req.detail && <p className={styles.requestDetail}>{req.detail}</p>}
                  <p className={styles.requestDate}>Requested {formatDate(req.createdAt)}</p>

                  {req.status === "accepted" && (
                    <div className={styles.outcomeBox}>
                      <div className={styles.outcomeRow}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 12.5L9.5 18L20 6.5" />
                        </svg>
                        <span>{req.outcome}</span>
                      </div>
                      {req.tracking && (
                        <p className={styles.tracking}>
                          Tracking <span className={styles.trackingNo}>{req.tracking}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === "rejected" && (
                    <p className={styles.rejectedNote}>
                      Your care team will follow up in{" "}
                      <Link href="/dashboard?chat=1" className={styles.inlineLink}>Messages</Link>.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
