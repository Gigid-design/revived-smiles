"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import { productLabels } from "@/app/context/productConfig";

interface InfoRow {
  label: string;
  value: string | null;
}

interface PhotoItem {
  src: string;
  caption: string;
}

/* An order's documents are ready to view once the care team has reviewed it. */
const REVIEWED_STATUSES: SubmissionStatus[] = ["approved", "in_fabrication", "shipped", "completed"];

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "In progress",
  pending: "In review",
  in_review: "In review",
  approved: "Approved",
  changes_requested: "Needs changes",
  rejected: "Not approved",
  in_fabrication: "In fabrication",
  shipped: "Shipped",
  completed: "Completed",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function MyDocuments() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [orders, setOrders] = useState<Submission[]>([]);
  const [order, setOrder] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (selectedId) {
          const sub = await api.submissions.getById(selectedId).catch(() => null);
          if (!cancelled) setOrder(sub);
        } else {
          const mine = await api.submissions.listMine();
          if (!cancelled) setOrders(mine);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  /* The tooth-chart selection from intake (step 5): which missing teeth the
     customer asked us to replace, or "Not sure" if they weren't certain. */
  const teethToReplace = order
    ? order.teethNotSure
      ? "Not sure"
      : order.selectedTeeth.length
        ? [...order.selectedTeeth].sort((a, b) => a - b).join(", ")
        : null
    : null;

  const rows: InfoRow[] = order
    ? [
        { label: "Name", value: order.name },
        { label: "State", value: order.state },
        { label: "Ordered product", value: order.products.length ? productLabels(order.products) : null },
        { label: "Teeth to replace", value: teethToReplace },
        { label: "Tooth shade", value: order.whiteShade },
        { label: "Gum shade", value: order.gumShade },
      ].filter((r) => r.value)
    : [];

  /* Match exactly the four teeth photos the customer captured during intake,
     in the order they took them (see camera → camera-1 → open-bite → open-bite-2),
     followed by their impression-tray photos. One flat list, one section. */
  const teethLabels = ["Front", "Mouth open", "Left side", "Right side"];
  const impressionLabels = ["Upper 1", "Upper 2", "Lower 1", "Lower 2"];

  const photos: PhotoItem[] = order
    ? [
        ...[order.closeBitePhotos?.[0], order.closeBitePhotos?.[1], order.openBitePhotos?.[0], order.openBitePhotos?.[1]]
          .map((src, i) => ({ src, caption: teethLabels[i] }))
          .filter((p): p is PhotoItem => Boolean(p.src)),
        ...(order.impressionPhotos ?? [])
          .map((src, i) => ({ src, caption: impressionLabels[i] ?? `Impression ${i + 1}` }))
          .filter((p): p is PhotoItem => Boolean(p.src)),
      ]
    : [];

  const isDetail = Boolean(selectedId);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          aria-label="Back"
          onClick={() => router.back()}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>My Documents</h1>
      </header>

      <div className={styles.content} id="main-content">
        {loading && <p className={styles.muted}>Loading…</p>}

        {/* ───── List view: one entry per order ───── */}
        {!loading && !isDetail && (
          orders.length > 0 ? (
            <nav className={styles.orderList} aria-label="Your orders">
              {orders.map((o) => {
                const ready = REVIEWED_STATUSES.includes(o.status);
                return (
                  <Link key={o.id} href={`/my-documents?id=${o.id}`} className={styles.orderRow}>
                    <span className={styles.orderIcon} aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" />
                      </svg>
                    </span>
                    <span className={styles.orderMain}>
                      <span className={styles.orderTitle}>{o.products.length ? productLabels(o.products) : "Order"}</span>
                      <span className={styles.orderMeta}>
                        {o.orderNumber ? `${o.orderNumber} · ` : ""}{formatDate(o.createdAt)}
                      </span>
                    </span>
                    <span className={`${styles.statusChip} ${ready ? styles.statusChipReady : ""}`}>{STATUS_LABELS[o.status]}</span>
                    <svg className={styles.orderChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className={styles.card}>
              <p className={styles.muted}>You don’t have any orders yet.</p>
            </div>
          )
        )}

        {/* ───── Detail view: one order's record ───── */}
        {!loading && isDetail && !order && (
          <div className={styles.card}>
            <p className={styles.muted}>We couldn’t find this order’s documents.</p>
          </div>
        )}

        {!loading && isDetail && order && (
          <>
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>About you</h2>
              <dl className={styles.infoList}>
                {rows.map((r) => (
                  <div key={r.label} className={styles.infoRow}>
                    <dt className={styles.infoLabel}>{r.label}</dt>
                    <dd className={styles.infoValue}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Your photos</h2>
              {photos.length > 0 ? (
                <div className={styles.photoGrid}>
                  {photos.map((p, i) => (
                    <figure key={`${p.src}-${i}`} className={styles.photoCell}>
                      <span className={styles.photoThumb}>
                        <Image src={p.src} alt={p.caption} fill sizes="44px" style={{ objectFit: "cover" }} />
                      </span>
                      <figcaption className={styles.photoCaption}>{p.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No photos are attached to this order yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function MyDocumentsPage() {
  return (
    <Suspense fallback={<main className={styles.screen} />}>
      <MyDocuments />
    </Suspense>
  );
}
