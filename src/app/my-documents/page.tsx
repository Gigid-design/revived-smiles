"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission, SubmissionStatus } from "@/lib/api";
import {
  productLabel,
  productLabels,
  productImage,
  productNeedsShade,
  productNeedsTeethChart,
  isClaimProduct,
} from "@/app/context/productConfig";

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
  lab_retake: "Retake requested",
  changes_requested: "Needs changes",
  rejected: "Can't proceed with order",
  in_fabrication: "In fabrication",
  shipped: "Shipped",
  completed: "Completed",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* The status tag colour, matching the badge language used on My Orders and in
   Messages: green when done, amber while in progress, red when it needs the
   patient. */
function statusTone(status: SubmissionStatus): "statusTagDone" | "statusTagActive" | "statusTagAlert" {
  if (status === "changes_requested" || status === "rejected") return "statusTagAlert";
  if (REVIEWED_STATUSES.includes(status)) return "statusTagDone";
  return "statusTagActive";
}

/* The four teeth photos + impression photos are captured once per order and
   shared by every product on it. Kept here so both record views agree. */
function collectPhotos(order: Submission): PhotoItem[] {
  const teethLabels = ["Front", "Mouth open", "Left side", "Right side"];
  const impressionLabels = ["Upper 1", "Upper 2", "Lower 1", "Lower 2"];
  return [
    ...[order.closeBitePhotos?.[0], order.closeBitePhotos?.[1], order.openBitePhotos?.[0], order.openBitePhotos?.[1]]
      .map((src, i) => ({ src, caption: teethLabels[i] }))
      .filter((p): p is PhotoItem => Boolean(p.src)),
    ...(order.impressionPhotos ?? [])
      .map((src, i) => ({ src, caption: impressionLabels[i] ?? `Impression ${i + 1}` }))
      .filter((p): p is PhotoItem => Boolean(p.src)),
  ];
}

function teethValue(order: Submission): string | null {
  if (order.teethNotSure) return "Not sure";
  if (order.selectedTeeth.length) return [...order.selectedTeeth].sort((a, b) => a - b).join(", ");
  return null;
}

/* ── Shared sub-views ── */

function DownloadLinks({ orderId, product }: { orderId: string; product?: string }) {
  const suffix = product ? `&product=${product}` : "";
  // A claim line has no prescription — only offer the invoice for it.
  const showPrescription = !(product && isClaimProduct(product));
  return (
    <div className={styles.downloads}>
      <Link href={`/documents?id=${orderId}&type=invoice${suffix}`} className={styles.downloadRow}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
        </svg>
        <span>Download invoice</span>
        <span className={styles.downloadHint}>PDF</span>
      </Link>
      {showPrescription && (
        <Link href={`/documents?id=${orderId}&type=prescription${suffix}`} className={styles.downloadRow}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
          </svg>
          <span>Download prescription</span>
          <span className={styles.downloadHint}>PDF</span>
        </Link>
      )}
    </div>
  );
}

function PhotoCard({ order }: { order: Submission }) {
  const photos = collectPhotos(order);
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Intake photos</h2>
      {photos.length > 0 ? (
        <>
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
          <p className={styles.sharedNote}>Captured once for this order and shared by every item on it.</p>
        </>
      ) : (
        <p className={styles.muted}>No photos are attached to this order yet.</p>
      )}
    </section>
  );
}

function MyDocuments() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const productParam = searchParams.get("product");

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

  const isDetail = Boolean(selectedId);
  const activeProduct = order && productParam && order.products.includes(productParam) ? productParam : null;
  /* A claim invoice is available as soon as the claim is filed — it isn't tied
     to appliance fabrication, so it bypasses the review gate below. */
  const claimSlug = order?.products.find(isClaimProduct) ?? null;

  /* Record rows — scoped to a single product when one is selected. */
  const rows: InfoRow[] = order
    ? activeProduct
      ? [
          { label: "Name", value: order.name },
          { label: "State", value: order.state },
          { label: "Item", value: productLabel(activeProduct) },
          { label: "Teeth to replace", value: productNeedsTeethChart(activeProduct) ? teethValue(order) : null },
          { label: "Tooth shade", value: productNeedsShade(activeProduct) ? order.whiteShade : null },
          { label: "Gum shade", value: productNeedsShade(activeProduct) ? order.gumShade : null },
        ].filter((r) => r.value)
      : [
          { label: "Name", value: order.name },
          { label: "State", value: order.state },
          { label: "Ordered product", value: order.products.length ? productLabels(order.products) : null },
          { label: "Teeth to replace", value: order.products.some(productNeedsTeethChart) ? teethValue(order) : null },
          { label: "Tooth shade", value: order.products.some(productNeedsShade) ? order.whiteShade : null },
          { label: "Gum shade", value: order.products.some(productNeedsShade) ? order.gumShade : null },
        ].filter((r) => r.value)
    : [];

  /* List view: one row per order — that's how the customer submits them, so it's
     how they look for their paperwork. Each order's per-item invoices and
     prescriptions live inside its detail view. */

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <header className={styles.header}>
        <button type="button" className={styles.backBtn} aria-label="Back" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>My Documents</h1>
      </header>

      <div className={styles.content} id="main-content">
        {loading && <p className={styles.muted}>Loading…</p>}

        {/* ───── List view: one entry per ordered product ───── */}
        {!loading && !isDetail && (
          orders.length > 0 ? (
            <nav className={styles.orderList} aria-label="Your orders">
              {orders.map((o) => {
                const items = o.products.length ? o.products : ["order"];
                return (
                  <Link key={o.id} href={`/my-documents?id=${o.id}`} className={styles.orderCard}>
                    <div className={styles.orderCardHead}>
                      <span className={styles.orderCardTitle}>{o.orderNumber ? `Order ${o.orderNumber}` : "Order"}</span>
                      <span className={`${styles.statusTag} ${styles[statusTone(o.status)]}`}>{STATUS_LABELS[o.status]}</span>
                    </div>
                    <div className={styles.orderCardMeta}>
                      <span className={styles.countPill}>{items.length} {items.length === 1 ? "Item" : "Items"}</span>
                      {o.createdAt && <span className={styles.orderCardDate}>{formatDate(o.createdAt)}</span>}
                    </div>
                    <ul className={styles.docItemList}>
                      {items.map((slug, i) => {
                        const img = slug === "order" ? null : productImage(slug);
                        return (
                          <li key={`${slug}-${i}`} className={styles.docItemRow}>
                            <span className={styles.docItemThumb} aria-hidden>
                              {img ? (
                                <Image src={img} alt="" fill sizes="40px" style={{ objectFit: "cover" }} />
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a93a3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
                                </svg>
                              )}
                            </span>
                            <span className={styles.docItemName}>{slug === "order" ? "Order" : productLabel(slug)}</span>
                          </li>
                        );
                      })}
                    </ul>
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

        {/* ───── Detail: a product's record (or the whole order) ───── */}
        {!loading && isDetail && !order && (
          <div className={styles.card}>
            <p className={styles.muted}>We couldn’t find this order’s documents.</p>
          </div>
        )}

        {!loading && isDetail && order && (
          <>
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{activeProduct ? productLabel(activeProduct) : "About you"}</h2>
              <dl className={styles.infoList}>
                {rows.map((r) => (
                  <div key={r.label} className={styles.infoRow}>
                    <dt className={styles.infoLabel}>{r.label}</dt>
                    <dd className={styles.infoValue}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Documents — per product */}
            {REVIEWED_STATUSES.includes(order.status) ? (
              activeProduct ? (
                <section className={styles.card}>
                  <h2 className={styles.sectionTitle}>Documents</h2>
                  <p className={styles.cardHint}>For HSA, FSA &amp; insurance reimbursement.</p>
                  <DownloadLinks orderId={order.id} product={activeProduct} />
                </section>
              ) : (
                <section className={styles.card}>
                  <h2 className={styles.sectionTitle}>Documents by item</h2>
                  <p className={styles.cardHint}>For HSA, FSA &amp; insurance reimbursement.</p>
                  {order.products.map((slug) => (
                    <div key={slug} className={styles.productDocs}>
                      <p className={styles.productDocsName}>{productLabel(slug)}</p>
                      <DownloadLinks orderId={order.id} product={slug} />
                    </div>
                  ))}
                </section>
              )
            ) : activeProduct ? (
              /* Single-item view before review. A claim invoice is always
                 available; an appliance's docs wait for review. */
              isClaimProduct(activeProduct) ? (
                <section className={styles.card}>
                  <h2 className={styles.sectionTitle}>Documents</h2>
                  <p className={styles.cardHint}>For HSA, FSA &amp; insurance reimbursement.</p>
                  <DownloadLinks orderId={order.id} product={activeProduct} />
                </section>
              ) : (
                <section className={styles.card}>
                  <h2 className={styles.sectionTitle}>Documents</h2>
                  <p className={styles.muted}>
                    Your invoice and prescription will be available here once your order has been reviewed.
                  </p>
                </section>
              )
            ) : (
              /* Whole-order view before review. Surface the claim invoice now,
                 and note the rest follows review. */
              <section className={styles.card}>
                <h2 className={styles.sectionTitle}>Documents</h2>
                {claimSlug && (
                  <div className={styles.productDocs}>
                    <p className={styles.productDocsName}>{productLabel(claimSlug)}</p>
                    <DownloadLinks orderId={order.id} product={claimSlug} />
                  </div>
                )}
                <p className={styles.muted}>
                  Your appliance invoice and prescription will be available here once your order has been reviewed.
                </p>
              </section>
            )}

            <PhotoCard order={order} />
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
