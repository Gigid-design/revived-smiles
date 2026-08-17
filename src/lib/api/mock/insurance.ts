/**
 * Product-protection plans.
 *
 * Reading is the bulk of V1: the patient buys insurance on the website, so
 * `list` just returns the seeded records for the signed-in patient's
 * appliances. Filing a claim is the one write — it records the claim and drops
 * a recap into the order conversation, the same way a submission does.
 */

import { nanoid } from "nanoid";

import type { InsuranceApi } from "../contract";
import type { ChatMessage, Insurance, InsuranceClaim } from "../types";
import { ApiError } from "../types";
import { clone, delay, emitMessage, getDb, mutate, nowIso } from "./store";

/** Product slug for the claim line added to an order on submission.
 *  Must match the "insurance-claim" entry in the UI product catalogue. */
const CLAIM_PRODUCT_ID = "insurance-claim";

/* ── One-claim-per-coverage-year policy ──
   The coverage year is measured from the order date, so eligibility resets on
   each order anniversary. Enforced here (authoritative) and mirrored in the UI
   via the computed `nextClaimEligibleAt`. */

/** The order date that anchors the coverage year; falls back to the plan's
 *  purchase date, then now, if the order can't be found. */
function orderAnchor(submissionId: string, purchasedAt: string | null): string {
  const order = getDb().submissions.find((s) => s.id === submissionId);
  return order?.createdAt ?? purchasedAt ?? nowIso();
}

/** The coverage-year window [start, end) that contains `now`, anchored on the
 *  order date so it rolls over on each anniversary. */
function coverageWindow(orderIso: string, now: Date): { start: Date; end: Date } {
  const order = new Date(orderIso);
  let years = now.getFullYear() - order.getFullYear();
  const anniversary = new Date(order);
  anniversary.setFullYear(order.getFullYear() + years);
  if (anniversary > now) years -= 1; // this year's anniversary hasn't arrived yet
  const start = new Date(order);
  start.setFullYear(order.getFullYear() + years);
  const end = new Date(order);
  end.setFullYear(order.getFullYear() + years + 1);
  return { start, end };
}

/** ISO date the patient may next file, or `null` if they can file now — null
 *  when no claim exists or the last claim fell in an earlier coverage year. */
function nextEligible(orderIso: string, claim: InsuranceClaim | null, now = new Date()): string | null {
  if (!claim) return null;
  const { start, end } = coverageWindow(orderIso, now);
  return new Date(claim.submittedAt) >= start ? end.toISOString() : null;
}

/** "August 2, 2027" — for the limit message. */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** The plain-language recap a filed claim drops into the conversation. */
function buildClaimSummary(insurance: Insurance): string {
  const claim = insurance.claim!;
  return [
    "I've filed a protection claim:",
    "",
    `• Appliance: ${insurance.productName}`,
    `• Reason: ${claim.reason}`,
    ...(claim.detail.trim() ? [`• Details: ${claim.detail.trim()}`] : []),
  ].join("\n");
}

export const mockInsurance: InsuranceApi = {
  async list() {
    await delay();

    const db = getDb();
    const user = db.authUser;
    if (!user) return [];

    /* Scope to the caller's appliances, the way a real backend would. */
    const mine = new Set(
      db.submissions
        .filter((s) => s.userId === user.id || s.email === user.email)
        .map((s) => s.id),
    );

    return db.insurances
      .filter((i) => mine.has(i.submissionId))
      .map((i) => {
        const rec = clone(i);
        rec.nextClaimEligibleAt = nextEligible(orderAnchor(i.submissionId, i.purchasedAt), i.claim);
        return rec;
      });
  },

  async fileClaim(insuranceId, claim) {
    await delay();

    if (!claim.reason.trim()) {
      throw new ApiError("validation", "Tell us why you're filing a claim.");
    }

    const { insurance, recap } = mutate((db) => {
      const record = db.insurances.find((i) => i.id === insuranceId);
      if (!record) throw new ApiError("not_found", "That protection plan could not be found.");

      /* One claim per coverage year (measured from the order date). Authoritative
         gate: reject a second claim inside the current window regardless of what
         the client shows. */
      const anchor = orderAnchor(record.submissionId, record.purchasedAt);
      const blockedUntil = nextEligible(anchor, record.claim);
      if (blockedUntil) {
        throw new ApiError(
          "validation",
          `You've already filed a claim for this coverage year. You can file another claim on ${longDate(blockedUntil)}.`,
        );
      }

      /* Filing implies coverage. A real backend enforces this from the store;
         the demo record may still read `not_insured` when previewed, so flip it
         (and fill in believable plan details it wouldn't have had) so the
         resulting card is coherent — insured, with coverage and a claim. */
      if (record.status !== "insured") {
        record.status = "insured";
        record.planName ??= "Protection Plan";
        record.coverage ??= "1 replacement · 12 months";
        record.purchasedAt ??= new Date(Date.now() - 20 * 86_400_000).toISOString();
        record.expiresAt ??= new Date(Date.now() + 345 * 86_400_000).toISOString();
      }
      record.claim = {
        reason: claim.reason.trim(),
        detail: claim.detail.trim(),
        status: "in_review",
        submittedAt: nowIso(),
      };

      /* Add an "Insurance Claim" line to the covered appliance's order, so the
         claim shows up as a product on the order (invoice generation follows
         as a separate step). Deduped in case a claim is re-filed. */
      const order = db.submissions.find((s) => s.id === record.submissionId);
      if (order && !order.products.includes(CLAIM_PRODUCT_ID)) {
        order.products.push(CLAIM_PRODUCT_ID);
      }

      /* Drop a recap into the order conversation — the same record-keeping the
         submission does, so the patient has a copy and staff can reply. */
      const recap: ChatMessage = {
        id: `msg-${nanoid(8)}`,
        submissionId: record.submissionId,
        senderRole: "patient",
        senderName: db.authUser?.name ?? "You",
        body: buildClaimSummary(record),
        createdAt: nowIso(),
        readAt: null,
      };
      db.messages.push(recap);

      const out = clone(record);
      out.nextClaimEligibleAt = nextEligible(anchor, record.claim);
      return { insurance: out, recap };
    });

    /* Emit outside the mutate so a live Messages view picks it up at once. */
    emitMessage(recap);
    return insurance;
  },

  async getForSubmission(submissionId) {
    await delay();
    const record = getDb().insurances.find((i) => i.submissionId === submissionId);
    if (!record) return null;
    const out = clone(record);
    out.nextClaimEligibleAt = nextEligible(orderAnchor(record.submissionId, record.purchasedAt), record.claim);
    return out;
  },
};
