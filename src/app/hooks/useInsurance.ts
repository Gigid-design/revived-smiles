"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Insurance } from "@/lib/api";

/**
 * The signed-in patient's protection plan, for surfaces that only need to know
 * whether to offer a claim (Dashboard, Messages). `InsuranceCard` loads its own
 * copy because it renders the full plan; this is the lightweight gate.
 *
 * `canClaim` is true only when the appliance is insured and has no open claim —
 * so we don't invite a second claim while one is already in review, or prompt a
 * claim on an uninsured appliance.
 *
 * Honours the `?insurance=insured` demo preview, the same convention the card
 * uses, so all three surfaces light up together when previewing the flow.
 */
export function useInsurance() {
  const [insurance, setInsurance] = useState<Insurance | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.insurance
      .list()
      .then((records) => {
        if (cancelled) return;
        let record = records[0] ?? null;
        if (
          record &&
          record.status !== "insured" &&
          new URLSearchParams(window.location.search).get("insurance") === "insured"
        ) {
          record = { ...record, status: "insured" };
        }
        setInsurance(record);
      })
      .catch((err) => console.error("Could not load insurance:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const insured = insurance?.status === "insured";
  return { insurance, insured, canClaim: insured && !insurance?.claim };
}
