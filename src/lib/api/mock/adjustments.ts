/**
 * Adjustment requests against the in-memory store.
 *
 * Mirrors the discipline the contract specifies: a request is tied to a real
 * order, the team's decision needs a note when it isn't an approval, and
 * raising a request drops a plain-language recap into the order conversation so
 * the patient has a record and the care team can reply against it — the same
 * pattern as `submissions.finalize` and `insurance.fileClaim`.
 */

import { nanoid } from "nanoid";

import { ISSUE_LABELS } from "@/app/context/adjustmentConfig";
import { productLabel } from "@/app/context/productConfig";
import type { AdjustmentsApi } from "../contract";
import type {
  AdjustmentDecision,
  AdjustmentRequest,
  ChatMessage,
  NewAdjustmentRequest,
} from "../types";
import { ApiError, adjustmentRequiresNotes } from "../types";
import { CARE_TEAM_NAME } from "./seed";
import { clone, delay, emitMessage, getDb, mutate, nowIso } from "./store";

function byNewest(a: AdjustmentRequest, b: AdjustmentRequest): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * A stable, human-facing request number for the summary sheet, e.g.
 * "ADJ-1042-2" — the order number without its "#", plus a per-order sequence.
 * A real backend allocates this transactionally; the demo counts existing rows.
 */
function nextRequestNumber(submissionId: string, orderNumber: string | null): string {
  const base = (orderNumber ?? submissionId).replace(/^#/, "");
  const seq = getDb().adjustmentRequests.filter((r) => r.submissionId === submissionId).length + 1;
  return `ADJ-${base}-${seq}`;
}

/** The recap the request drops into the order conversation. */
function buildAdjustmentSummary(req: AdjustmentRequest): string {
  const lines: string[] = ["I've submitted an adjustment request:", ""];
  lines.push(`• Product: ${productLabel(req.product)}`);
  if (req.issues.length) {
    lines.push(`• What's wrong: ${req.issues.map((i) => ISSUE_LABELS[i]).join(", ")}`);
  }
  if (req.answers.newToothShade) lines.push(`• Requested tooth shade: ${req.answers.newToothShade}`);
  if (req.answers.newGumShade) lines.push(`• Requested gum shade: ${req.answers.newGumShade}`);

  const photoCount = Object.values(req.photos).filter(Boolean).length;
  if (photoCount) lines.push(`• Photos: ${photoCount} attached`);
  if (req.description.trim()) lines.push(`• Details: ${req.description.trim()}`);
  lines.push("", `Request number: ${req.requestNumber}`);
  return lines.join("\n");
}

function find(id: string): AdjustmentRequest {
  const found = getDb().adjustmentRequests.find((r) => r.id === id);
  if (!found) throw new ApiError("not_found", "That adjustment request could not be found.");
  return found;
}

export const mockAdjustments: AdjustmentsApi = {
  async create(input: NewAdjustmentRequest) {
    await delay();

    /* The request must attach to a real order the patient owns, and the
       product must be on that order — the same protection as
       `Submission.products`. A real backend verifies both server-side. */
    const order = getDb().submissions.find((s) => s.id === input.submissionId);
    if (!order) throw new ApiError("not_found", "That order could not be found.");
    if (!order.products.includes(input.product)) {
      throw new ApiError("validation", "That product isn't on the selected order.");
    }
    if (input.issues.length === 0) {
      throw new ApiError("validation", "Select at least one issue.");
    }
    if (!input.description.trim()) {
      throw new ApiError("validation", "Tell us what's wrong before submitting.");
    }

    const at = nowIso();
    const request: AdjustmentRequest = {
      id: `adj-${nanoid(8)}`,
      requestNumber: nextRequestNumber(order.id, order.orderNumber),
      userId: order.userId,
      submissionId: order.id,
      orderNumber: order.orderNumber,
      product: input.product,
      issues: [...input.issues],
      answers: { ...input.answers },
      photos: { ...input.photos },
      description: input.description.trim(),
      status: "pending",
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedAt: null,
      createdAt: at,
      submittedAt: at,
    };

    const summary = mutate((db): ChatMessage => {
      db.adjustmentRequests.unshift(request);
      const message: ChatMessage = {
        id: `msg-${nanoid(8)}`,
        submissionId: order.id,
        senderRole: "patient",
        senderName: order.name ?? "You",
        body: buildAdjustmentSummary(request),
        createdAt: at,
        readAt: null,
      };
      db.messages.push(message);
      return message;
    });

    /* Emit outside the mutate so the patient's live Messages view picks the
       recap up the moment the request is submitted. */
    emitMessage(summary);
    return clone(request);
  },

  async getById(id) {
    await delay();
    return clone(find(id));
  },

  async listMine() {
    await delay();
    const db = getDb();
    const user = db.authUser;
    if (!user) return [];
    return clone(db.adjustmentRequests.filter((r) => r.userId === user.id).sort(byNewest));
  },

  async listForSubmission(submissionId) {
    await delay();
    return clone(
      getDb().adjustmentRequests.filter((r) => r.submissionId === submissionId).sort(byNewest),
    );
  },

  async decide(id, decision: AdjustmentDecision) {
    await delay();

    if (adjustmentRequiresNotes(decision.status) && !decision.reviewNotes?.trim()) {
      throw new ApiError("validation", "Add a note explaining what the patient needs to do.");
    }

    const { request, reply } = mutate((db) => {
      const row = db.adjustmentRequests.find((r) => r.id === id);
      if (!row) throw new ApiError("not_found", "That adjustment request could not be found.");

      const at = nowIso();
      row.status = decision.status;
      row.reviewedBy = decision.reviewedBy;
      row.reviewedAt = at;
      row.reviewNotes = decision.reviewNotes?.trim() ?? null;
      if (decision.status === "approved") {
        row.approvedAt = at;
        /* TODO (Phase 5 — approval actions): emit the prepaid return label,
           add the "Adjusted Product" line item to the Shopify order, and
           generate the printable summary sheet. */
      }

      /* Post the team's note into the conversation so the patient sees why the
         request reopened or was routed on, the same place the recap landed. */
      let reply: ChatMessage | null = null;
      if (row.reviewNotes) {
        reply = {
          id: `msg-${nanoid(8)}`,
          submissionId: row.submissionId,
          senderRole: "admin",
          senderName: CARE_TEAM_NAME,
          body: row.reviewNotes,
          createdAt: at,
          readAt: null,
        };
        db.messages.push(reply);
      }
      return { request: clone(row), reply };
    });

    if (reply) emitMessage(reply);
    return request;
  },
};
