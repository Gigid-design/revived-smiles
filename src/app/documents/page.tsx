"use client";

/* Print-ready invoice & prescription documents.
 *
 * Reached as /documents?id=<submissionId>&type=invoice|prescription.
 * The layout is optimised for the browser's "Save as PDF", so customers can
 * keep an itemised receipt and a prescription for HSA / FSA / insurance
 * reimbursement. No PDF dependency — we lean on the print dialog.
 *
 * The clinic details below (address, EIN, license) are PLACEHOLDERS — replace
 * them with the real business + provider information before going live. */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission } from "@/lib/api";
import {
  productLabel,
  productPriceCents,
  productsSubtotalCents,
  formatUsd,
} from "@/app/context/productConfig";

/* ── PLACEHOLDER business + provider details — set your real values ── */
const CLINIC = {
  name: "Revived Smiles",
  addressLines: ["1234 Example Ave, Suite 100", "Austin, TX 78701"],
  email: "support@revivedsmiles.com",
  ein: "00-0000000", // EIN / Tax ID — required on HSA/FSA receipts
  providerName: "Revived Smiles Care Team",
  providerLicense: "License #000000",
};

function fullDate(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function docNumber(order: Submission, prefix: string): string {
  const base = order.orderNumber?.replace("#", "") || order.id.replace(/[^0-9]/g, "").slice(-4) || "0001";
  return `${prefix}-${base}`;
}

function DocumentView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const type = params.get("type") === "prescription" ? "prescription" : "invoice";

  const [order, setOrder] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let sub: Submission | null = null;
        if (id) sub = await api.submissions.getById(id).catch(() => null);
        if (!sub) sub = await api.submissions.getMine();
        if (!cancelled) setOrder(sub);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const teeth = order && !order.teethNotSure && order.selectedTeeth.length
    ? [...order.selectedTeeth].sort((a, b) => a - b).join(", ")
    : order?.teethNotSure ? "To be confirmed" : null;

  return (
    <main className={styles.screen}>
      {/* Screen-only toolbar (hidden when printing) */}
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={() => router.back()}>← Back</button>
        <button type="button" className={`${styles.toolBtn} ${styles.toolBtnPrimary}`} onClick={() => window.print()}>
          Save as PDF
        </button>
      </div>

      {loading && <p className={styles.loading}>Preparing document…</p>}

      {!loading && !order && (
        <p className={styles.loading}>We couldn’t find this order.</p>
      )}

      {!loading && order && (
        <article className={styles.sheet}>
          <header className={styles.docHeader}>
            <div>
              <h1 className={styles.brand}>{CLINIC.name}</h1>
              {CLINIC.addressLines.map((l) => <p key={l} className={styles.brandMeta}>{l}</p>)}
              <p className={styles.brandMeta}>{CLINIC.email}</p>
            </div>
            <div className={styles.docTitleBlock}>
              <p className={styles.docType}>{type === "invoice" ? "Invoice" : "Prescription"}</p>
              <p className={styles.docNo}>{docNumber(order, type === "invoice" ? "INV" : "RX")}</p>
              <p className={styles.docDate}>{fullDate(order.reviewedAt ?? order.createdAt)}</p>
            </div>
          </header>

          <section className={styles.parties}>
            <div>
              <p className={styles.partyLabel}>{type === "invoice" ? "Billed to" : "Patient"}</p>
              <p className={styles.partyName}>{order.name || "—"}</p>
              {order.state && <p className={styles.partyMeta}>{order.state}</p>}
              {order.email && <p className={styles.partyMeta}>{order.email}</p>}
            </div>
            {order.orderNumber && (
              <div className={styles.partyRight}>
                <p className={styles.partyLabel}>Order</p>
                <p className={styles.partyName}>{order.orderNumber}</p>
              </div>
            )}
          </section>

          {type === "invoice" ? (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Description</th>
                    <th className={styles.thRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.products.map((slug) => (
                    <tr key={slug}>
                      <td className={styles.tdLeft}>{productLabel(slug)}</td>
                      <td className={styles.tdRight}>{formatUsd(productPriceCents(slug))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={styles.totalLabel}>Total</td>
                    <td className={styles.totalValue}>{formatUsd(productsSubtotalCents(order.products))}</td>
                  </tr>
                </tfoot>
              </table>
              <p className={styles.paidBadge}>Paid</p>
              <p className={styles.legal}>
                Itemized receipt for HSA, FSA, and insurance reimbursement. {CLINIC.name} · EIN {CLINIC.ein}.
              </p>
            </>
          ) : (
            <>
              <dl className={styles.specs}>
                <div className={styles.specRow}>
                  <dt className={styles.specLabel}>Device(s)</dt>
                  <dd className={styles.specValue}>{order.products.map(productLabel).join(", ") || "—"}</dd>
                </div>
                {teeth && (
                  <div className={styles.specRow}>
                    <dt className={styles.specLabel}>Teeth to replace</dt>
                    <dd className={styles.specValue}>{teeth}</dd>
                  </div>
                )}
                {order.whiteShade && (
                  <div className={styles.specRow}>
                    <dt className={styles.specLabel}>Tooth shade</dt>
                    <dd className={styles.specValue}>{order.whiteShade}</dd>
                  </div>
                )}
                {order.gumShade && (
                  <div className={styles.specRow}>
                    <dt className={styles.specLabel}>Gum shade</dt>
                    <dd className={styles.specValue}>{order.gumShade}</dd>
                  </div>
                )}
              </dl>
              <p className={styles.legal}>
                This custom dental device was reviewed and prescribed as medically necessary. Provided for
                HSA, FSA, and insurance reimbursement purposes.
              </p>
              <div className={styles.signature}>
                <p className={styles.sigName}>{order.reviewedBy || CLINIC.providerName}</p>
                <p className={styles.sigMeta}>{CLINIC.providerLicense}</p>
                <p className={styles.sigMeta}>Authorized {fullDate(order.reviewedAt ?? order.createdAt)}</p>
              </div>
            </>
          )}
        </article>
      )}

      <p className={styles.footerLink}>
        <Link href={`/my-documents?id=${order?.id ?? ""}`} className={styles.toolBtn}>Back to documents</Link>
      </p>
    </main>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={<main className={styles.screen} />}>
      <DocumentView />
    </Suspense>
  );
}
