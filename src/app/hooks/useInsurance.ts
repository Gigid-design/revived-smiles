"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Insurance, InsuranceClaim } from "@/lib/api";

const DAY_MS = 86_400_000;

/** Believable plan details for the insured demo previews. */
const INSURED_FIELDS = {
  status: "insured" as const,
  planName: "Protection Plan",
  coverage: "1 replacement · 12 months",
  purchasedAt: new Date(Date.now() - 20 * DAY_MS).toISOString(),
  expiresAt: new Date(Date.now() + 345 * DAY_MS).toISOString(),
  windowClosesAt: null,
};

/** A stand-in open claim for the "claim in review" preview. */
const PREVIEW_CLAIM: InsuranceClaim = {
  reason: "Broke or cracked",
  hasAppliance: true,
  detail: "The clasp on the left side snapped.",
  status: "in_review",
  submittedAt: new Date(Date.now() - DAY_MS).toISOString(),
};

/**
 * Demo-only: force a specific insurance state from the URL so each status has
 * its own showcase link, independent of what's persisted in the session:
 *
 *   ?insurance=insured       → insured, no claim (the "File a claim" state)
 *   ?insurance=claimed       → insured, claim in review
 *   ?insurance=not_insured   → not insured (the purchase offer)
 *   (no param)               → the real record
 *
 * Purely presentational — it never writes to the store, so switching URLs never
 * mutates state or leaks between statuses.
 */
export function applyInsurancePreview(record: Insurance | null): Insurance | null {
  if (!record || typeof window === "undefined") return record;

  switch (new URLSearchParams(window.location.search).get("insurance")) {
    case "insured":
      return { ...record, ...INSURED_FIELDS, claim: null };
    case "claimed":
    case "in_review":
      return { ...record, ...INSURED_FIELDS, claim: PREVIEW_CLAIM };
    case "not_insured":
    case "none":
      return {
        ...record,
        status: "not_insured",
        planName: null,
        coverage: null,
        purchasedAt: null,
        expiresAt: null,
        claim: null,
        price: record.price ?? 4900,
        currency: record.currency || "USD",
        windowClosesAt: record.windowClosesAt ?? new Date(Date.now() + 5 * DAY_MS).toISOString(),
        purchaseUrl: record.purchaseUrl ?? "https://revivedsmiles.com/products/protection-plan",
      };
    default:
      return record;
  }
}

/**
 * The signed-in patient's protection plan, for surfaces that only need to know
 * whether to offer a claim (Dashboard, Messages). `InsuranceCard` loads its own
 * copy because it renders the full plan; this is the lightweight gate.
 *
 * `canClaim` is true only when the appliance is insured and has no open claim —
 * so we don't invite a second claim while one is already in review, or prompt a
 * claim on an uninsured appliance.
 */
export function useInsurance() {
  const [insurance, setInsurance] = useState<Insurance | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.insurance
      .list()
      .then((records) => {
        if (!cancelled) setInsurance(applyInsurancePreview(records[0] ?? null));
      })
      .catch((err) => console.error("Could not load insurance:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const insured = insurance?.status === "insured";
  return { insurance, insured, canClaim: insured && !insurance?.claim };
}
