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
import type { ChatMessage, Insurance } from "../types";
import { ApiError } from "../types";
import { clone, delay, emitMessage, getDb, mutate, nowIso } from "./store";

/** The plain-language recap a filed claim drops into the conversation. */
function buildClaimSummary(insurance: Insurance): string {
  const claim = insurance.claim!;
  return [
    "I've filed a protection claim:",
    "",
    `• Appliance: ${insurance.productName}`,
    `• Reason: ${claim.reason}`,
    `• Still have the appliance: ${claim.hasAppliance ? "Yes" : "No"}`,
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

    return clone(db.insurances.filter((i) => mine.has(i.submissionId)));
  },

  async fileClaim(insuranceId, claim) {
    await delay();

    if (!claim.reason.trim()) {
      throw new ApiError("validation", "Tell us why you're filing a claim.");
    }

    const { insurance, recap } = mutate((db) => {
      const record = db.insurances.find((i) => i.id === insuranceId);
      if (!record) throw new ApiError("not_found", "That protection plan could not be found.");

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
        hasAppliance: claim.hasAppliance,
        detail: claim.detail.trim(),
        status: "in_review",
        submittedAt: nowIso(),
      };

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

      return { insurance: clone(record), recap };
    });

    /* Emit outside the mutate so a live Messages view picks it up at once. */
    emitMessage(recap);
    return insurance;
  },
};
