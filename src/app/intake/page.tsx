"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { useMessages } from "../context/MessagesContext";
import {
  CATEGORY_LABELS,
  PRODUCTS,
  productLabel,
  productImage,
  firstDetailHref,
  getOrderTotalSteps,
} from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";
import { WrongOrderSheet } from "../components/WrongOrderSheet";
import { api } from "@/lib/api";

/**
 * Step 1 — the order, carried over from Shopify.
 *
 * An order can hold several appliances, so this is an overview of every item on
 * it, not a single product. It's shown, not chosen: the order is what the
 * patient paid for and what the lab builds, so letting intake rewrite it would
 * let someone be fabricated a product nobody was charged for. If it looks wrong
 * she flags it and the care team resolves it.
 *
 * From here the wizard walks a per-item detail loop — each product that needs a
 * tooth chart and/or shade gets its own screens (see `getDetailStops`) — then
 * the shared photo steps run once for the whole order.
 */

export default function OrderOverviewStep() {
  const { data, update, ensureSubmissionId } = useSubmission();
  const { requests, sendRequest } = useMessages();
  const { cardRef, navigate } = usePageTransition();

  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>(data.products);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* The products live on the order, not in intake's local state, so read them
     back rather than trusting whatever the context happens to be carrying. */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const id = await ensureSubmissionId();
        const submission = await api.submissions.getById(id);
        if (cancelled) return;
        setProducts(submission.products);
        setOrderNumber(submission.orderNumber);

        /* Mirror the order into shared intake state. Every detail screen reads
           its product and any answers already given from here — this is the
           only screen that learns them; nothing writes `products`, because
           nothing may. */
        update({
          products: submission.products,
          itemDetails: submission.itemDetails ?? data.itemDetails,
        });
      } catch (err) {
        console.error("Could not load your order:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /* An unresolved flag changes what this screen offers: there's no point
     asking her to report the same problem twice. */
  const openFlag = requests.find((m) => m.request?.kind === "order" && m.request.status === "pending");

  const hasOrder = products.length > 0;
  const total = getOrderTotalSteps(products);

  async function flagOrder(detail: string, note: string) {
    await sendRequest("order", detail, note);
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={hasOrder ? Math.round((1 / total) * 100) : 0}
        counter={hasOrder ? `Step 1 of ${total}` : "Step 1"}
        onBack={() => navigate('/dashboard', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      <div className={styles.card} id="main-content" ref={cardRef}>
        <div className={styles.overviewHead}>
          <h1 className={styles.cardTitle}>Your order</h1>
          {hasOrder && (
            <span className={styles.countBadge}>
              {products.length} {products.length === 1 ? "Item" : "Items"}
            </span>
          )}
        </div>

        <div className={styles.orderBody}>
          {loading && <div className={styles.orderSkeleton} aria-busy="true" />}

          {/* No matched order — she can't proceed, so send her to a human. */}
          {!loading && !hasOrder && (
            <div className={styles.orderEmpty}>
              <p className={styles.orderEmptyTitle}>We couldn&apos;t find your order</p>
              <p className={styles.orderEmptyBody}>
                We weren&apos;t able to match this account to a purchase, so we don&apos;t know what
                to make for you yet. Your care team can sort this out.
              </p>
              <Link href="/messages" className={styles.orderEmptyBtn}>
                MESSAGE SUPPORT
              </Link>
            </div>
          )}

          {!loading && hasOrder && (
            <>
              {/* Read-only: a statement of what was ordered, one row per item. */}
              <ul className={styles.itemList}>
                {products.map((slug, i) => {
                  const config = PRODUCTS.find((p) => p.id === slug);
                  const img = productImage(slug);
                  return (
                    <li key={`${slug}-${i}`} className={styles.itemRow}>
                      <span className={styles.itemThumb} aria-hidden>
                        {img ? (
                          <Image src={img} alt="" fill sizes="112px" style={{ objectFit: "cover" }} />
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8a93a3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
                          </svg>
                        )}
                      </span>
                      <span className={styles.itemMain}>
                        {config && (
                          <span className={`${styles.itemCategory} ${config.category === "partial-denture" ? styles.itemCategoryPartial : ""}`}>
                            {CATEGORY_LABELS[config.category]}
                          </span>
                        )}
                        <span className={styles.itemName}>{productLabel(slug)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              {orderNumber && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Your order</span>
                  <span className={styles.detailValue}>{orderNumber}</span>
                </div>
              )}

              {openFlag && (
                <span className={styles.orderFlagChip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v5l3 1.8" />
                  </svg>
                  We&apos;re checking this for you
                </span>
              )}

              <p className={styles.orderNote}>
                This comes from the order you placed, so it can&apos;t be changed here.
              </p>

              {openFlag ? (
                <Link href="/messages" className={styles.wrongOrderLink}>
                  You&apos;ve told us this looks wrong — see the conversation{" "}
                  <span aria-hidden="true">›</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.wrongOrderBtn}
                  onClick={() => setSheetOpen(true)}
                >
                  Wrong order?{" "}
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${hasOrder ? styles.btnActive : ""}`}
          disabled={!hasOrder}
          onClick={() => {
            if (hasOrder) navigate(firstDetailHref(products), 'forward');
          }}
        >
          CONTINUE
        </button>
        <FlowSupport />
      </div>

      <WrongOrderSheet
        open={sheetOpen}
        currentProduct={products[0] ?? ""}
        onClose={() => setSheetOpen(false)}
        onFlag={flagOrder}
      />
    </main>
  );
}
