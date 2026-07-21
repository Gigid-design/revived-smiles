"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { useMessages } from "../context/MessagesContext";
import { PRODUCTS, CATEGORY_LABELS, getNextAfterProduct, getTotalSteps, productLabel } from "../context/productConfig";
import { IntakeHeader } from "../components/IntakeHeader";
import { WrongOrderSheet } from "../components/WrongOrderSheet";
import { api } from "@/lib/api";

/**
 * Step 1 — the product, carried over from the Shopify order.
 *
 * It is shown, not chosen. The order is what the patient paid for and what the
 * lab builds, so letting intake rewrite it would let someone be fabricated a
 * product nobody was charged for. If it looks wrong she flags it and the care
 * team resolves it; the submission is only ever corrected by staff.
 */
export default function ProductStep() {
  const { data, update, ensureSubmissionId } = useSubmission();
  const { requests, sendRequest } = useMessages();
  const { cardRef, navigate } = usePageTransition();

  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(data.products[0] ?? null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* The product lives on the order, not in intake's local state, so read it
     back rather than trusting whatever the context happens to be carrying. */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const id = await ensureSubmissionId();
        const submission = await api.submissions.getById(id);
        if (cancelled) return;
        setProduct(submission.products[0] ?? null);
        setOrderNumber(submission.orderNumber);

        /* Mirror the product into the shared intake state. The shade and
           tooth-chart screens read it from there to work out how many steps
           they are of how many, and this is now the only screen that learns
           it — nothing writes `products` any more, because nothing may. */
        update({ products: submission.products });
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

  const config = product ? PRODUCTS.find((p) => p.id === product) : undefined;

  /* How long the wizard is depends on the product. Until one is known there is
     no honest total, and claiming one would show a full bar on a screen she
     can't move past. */
  const total = product ? getTotalSteps(product) : null;

  async function flagOrder(detail: string, note: string) {
    await sendRequest("order", detail, note);
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={total ? Math.round((1 / total) * 100) : 0}
        counter={total ? `Step 1 of ${total}` : "Step 1"}
        onBack={() => navigate('/dashboard', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Your ordered product</h1>

        <div className={styles.orderBody}>
          {loading && <div className={styles.orderSkeleton} aria-busy="true" />}

          {/* No matched order — she can't proceed, so send her to a human. */}
          {!loading && !product && (
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

          {!loading && product && (
            <>
              {/* Read-only: this is a statement of what was ordered. */}
              <div className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderProduct}>{productLabel(product)}</span>
                  <span className={styles.orderLock} aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                </div>

                {config && <p className={styles.orderDescription}>{config.description}</p>}

                <div className={styles.orderMeta}>
                  {config && <span className={styles.orderBadge}>{CATEGORY_LABELS[config.category]}</span>}
                  {orderNumber && (
                    <span className={styles.orderRef}>From your order {orderNumber}</span>
                  )}
                </div>

                {openFlag && (
                  <span className={styles.orderFlagChip}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v5l3 1.8" />
                    </svg>
                    We&apos;re checking this for you
                  </span>
                )}
              </div>

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
          className={`${styles.btn} ${product ? styles.btnActive : ""}`}
          disabled={!product}
          onClick={() => {
            if (product) navigate(getNextAfterProduct(product), 'forward');
          }}
        >
          CONTINUE
        </button>
      </div>

      <WrongOrderSheet
        open={sheetOpen}
        currentProduct={product ?? ""}
        onClose={() => setSheetOpen(false)}
        onFlag={flagOrder}
      />
    </main>
  );
}
