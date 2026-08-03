"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./InsuranceCard.module.css";
import { api } from "@/lib/api";
import type { ClaimStatus, Insurance } from "@/lib/api";
import { applyInsurancePreview } from "@/app/hooks/useInsurance";

const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  in_review: "In review",
  approved: "Approved",
  denied: "Denied",
};

const CLAIM_STATUS_CLASS: Record<ClaimStatus, string> = {
  in_review: styles.claimReview,
  approved: styles.claimApproved,
  denied: styles.claimDenied,
};

/**
 * The product-protection plan for the patient's appliance, on My Orders.
 *
 * Two faces of one card:
 *  • insured     → coverage summary (plan, what's covered, covered-until).
 *  • not insured → an "add protection" offer that links out to the website,
 *                  with a gentle countdown while the seven-day window is open.
 *
 * V1 is read-only: buying happens on the website, so the CTA is a link, not a
 * checkout. Renders nothing when the patient has no insurable appliance, so a
 * caller can drop it in unconditionally.
 *
 * For demos, the `?insurance=insured|claimed|not_insured` URL previews a given
 * state (see `applyInsurancePreview`) without ever writing to the store.
 */

const DAY_MS = 86_400_000;

function money(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minorUnits / 100,
  );
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Whole days from now until `iso`, floored at zero. */
function daysUntil(iso: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((then.getTime() - start.getTime()) / DAY_MS));
}

export function InsuranceCard() {
  const [insurance, setInsurance] = useState<Insurance | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.insurance
      .list()
      .then((records) => {
        // Demo-only: the URL can preview a specific state (see the hook).
        if (!cancelled) setInsurance(applyInsurancePreview(records[0] ?? null));
      })
      .catch((err) => console.error("Could not load insurance:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!insurance) return null;

  const insured = insurance.status === "insured";
  const daysLeft = insurance.windowClosesAt ? daysUntil(insurance.windowClosesAt) : null;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <ShieldIcon insured={insured} />
          <h2 className={styles.title}>Protection</h2>
        </div>
        <span className={`${styles.status} ${insured ? styles.statusInsured : styles.statusNone}`}>
          {insured ? "Insured" : "Not protected"}
        </span>
      </div>

      <p className={styles.appliance}>{insurance.productName}</p>

      {insured && insurance.planName ? (
        <div className={styles.coverage}>
          <div className={styles.coverageRow}>
            <span className={styles.coverageLabel}>Plan</span>
            <span className={styles.coverageValue}>{insurance.planName}</span>
          </div>
          {insurance.coverage && (
            <div className={styles.coverageRow}>
              <span className={styles.coverageLabel}>Covers</span>
              <span className={styles.coverageValue}>{insurance.coverage}</span>
            </div>
          )}
          {insurance.expiresAt && (
            <div className={styles.coverageRow}>
              <span className={styles.coverageLabel}>Covered until</span>
              <span className={styles.coverageValue}>{longDate(insurance.expiresAt)}</span>
            </div>
          )}
          {insurance.purchasedAt && (
            <p className={styles.addedNote}>Added {longDate(insurance.purchasedAt)}</p>
          )}
        </div>
      ) : null}

      {insured && (
        <>
          {insurance.claim && (
            <div className={styles.claimPanel}>
              <div className={styles.claimHead}>
                <span className={styles.claimTitle}>Your claim</span>
                <span className={`${styles.claimBadge} ${CLAIM_STATUS_CLASS[insurance.claim.status]}`}>
                  {CLAIM_STATUS_LABEL[insurance.claim.status]}
                </span>
              </div>
              <p className={styles.claimMeta}>
                {insurance.claim.reason} · Filed {longDate(insurance.claim.submittedAt)}
              </p>
              {insurance.nextClaimEligibleAt && (
                <p className={styles.claimMeta}>
                  One claim per year — next claim available {longDate(insurance.nextClaimEligibleAt)}.
                </p>
              )}
              <Link href="/messages" className={styles.claimLink}>View in Messages →</Link>
            </div>
          )}
          {!insurance.nextClaimEligibleAt && (
            <Link href="/insurance-claim" className={styles.claimBtn}>
              File a claim
            </Link>
          )}
        </>
      )}

      {!insured && (
        <>
          <p className={styles.pitch}>
            Add the Protection Plan and we&apos;ll repair or replace your appliance if it&apos;s
            lost or damaged.
          </p>

          {daysLeft !== null && daysLeft > 0 && (
            <p className={styles.window}>
              <ClockIcon />
              <span>
                <strong>{daysLeft} {daysLeft === 1 ? "day" : "days"} left</strong> to add protection
              </span>
            </p>
          )}

          <a
            href={insurance.purchaseUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            Add protection
            {insurance.price != null && (
              <span className={styles.ctaPrice}>{money(insurance.price, insurance.currency)}</span>
            )}
          </a>
        </>
      )}
    </section>
  );
}

function ShieldIcon({ insured }: { insured: boolean }) {
  return (
    <svg
      className={insured ? styles.iconInsured : styles.iconNone}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {insured && <path d="M9 12l2 2 4-4" />}
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
