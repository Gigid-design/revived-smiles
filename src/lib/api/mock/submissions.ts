/**
 * Submissions against the in-memory store.
 *
 * The rules the old admin screen enforced only in the browser — notes before a
 * rejection, timestamps on ship and completion — are applied here too, so the
 * demo behaves like the real thing is specified to.
 */

import { nanoid } from "nanoid";

import { productLabels } from "@/app/context/productConfig";
import type { SubmissionsApi } from "../contract";
import type {
  ChatMessage,
  ImpressionPhoto,
  Paged,
  Submission,
  SubmissionDraft,
  SubmissionQuery,
  SubmissionStats,
} from "../types";
import { ApiError, requiresReviewNotes } from "../types";
import { DEMO_SHOPIFY_ORDER } from "./seed";
import {
  clone,
  delay,
  emitMessage,
  emitSubmissionChange,
  getDb,
  mutate,
  nowIso,
  subscribeToSubmissions,
} from "./store";

const DEFAULT_PAGE_SIZE = 25;

/** Gum shades are stored as internal codes; the patient sees the names. */
const GUM_SHADE_LABELS: Record<string, string> = { G1: "Dark", G2: "Pink", G3: "Clear" };

/**
 * Builds the plain-language recap the patient's submission drops into the
 * conversation — the hims/hers pattern: "once you complete the form it sends it
 * pre-filled to your provider in the messages box." It gives the patient a
 * single record of exactly what they sent and something the care team can reply
 * against, instead of the details living only inside the order.
 */
function buildSubmissionSummary(row: Submission): string {
  const lines: string[] = ["Here's a summary of what I submitted:", ""];

  const order = row.orderNumber ? ` (Order ${row.orderNumber})` : "";
  if (row.products.length) lines.push(`• Product: ${productLabels(row.products)}${order}`);
  if (row.whiteShade) lines.push(`• Tooth shade: ${row.whiteShade}`);
  if (row.gumShade) lines.push(`• Gum shade: ${GUM_SHADE_LABELS[row.gumShade] ?? row.gumShade}`);

  if (row.teethNotSure) {
    lines.push("• Teeth to replace: Not sure — please advise");
  } else if (row.selectedTeeth.length) {
    lines.push(`• Teeth to replace: ${row.selectedTeeth.map((n) => `#${n}`).join(", ")}`);
  }

  const teethPhotos = row.closeBitePhotos.filter(Boolean).length + row.openBitePhotos.filter(Boolean).length;
  const impressionPhotos = row.impressionPhotos.filter(Boolean).length;
  const photoParts: string[] = [];
  if (teethPhotos) photoParts.push(`${teethPhotos} teeth photo${teethPhotos === 1 ? "" : "s"}`);
  if (impressionPhotos) photoParts.push(`${impressionPhotos} impression photo${impressionPhotos === 1 ? "" : "s"}`);
  if (photoParts.length) lines.push(`• Photos: ${photoParts.join(" + ")} attached`);

  if (row.notes?.trim()) lines.push(`• Notes: ${row.notes.trim()}`);

  return lines.join("\n");
}

function byNewest(a: Submission, b: Submission): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function find(id: string): Submission {
  const found = getDb().submissions.find((s) => s.id === id);
  if (!found) throw new ApiError("not_found", "That order could not be found.");
  return found;
}

/** Every piece the patient must supply before an order can leave `draft`. */
function isComplete(s: Submission): boolean {
  return Boolean(
    s.name &&
      s.state &&
      s.products.length > 0 &&
      s.closeBitePhotos.filter(Boolean).length === 2 &&
      s.openBitePhotos.filter(Boolean).length === 2 &&
      s.impressionPhotos.some(Boolean),
  );
}

export const mockSubmissions: SubmissionsApi = {
  async createDraft(email, userId) {
    await delay();

    /* Intake asks for none of these. Name and state come from the account;
       the product and order number come from the Shopify order she paid
       against. A real backend reads both server-side, from the authenticated
       identity — see `SubmissionsApi.createDraft`. */
    const account = getDb().authUser;

    const draft: Submission = {
      id: `sub-${nanoid(8)}`,
      userId,
      email: email.trim().toLowerCase(),
      name: account?.name ?? null,
      state: account?.state ?? null,
      orderNumber: DEMO_SHOPIFY_ORDER.orderNumber,
      products: [...DEMO_SHOPIFY_ORDER.products],
      whiteShade: null,
      gumShade: null,
      selectedTeeth: [],
      teethNotSure: false,
      notes: null,
      closeBitePhotos: [],
      openBitePhotos: [],
      impressionPhotos: [],
      photoAnalyses: {},
      status: "draft",
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      trackingNumber: null,
      shippedAt: null,
      completedAt: null,
      createdAt: nowIso(),
    };

    mutate((db) => {
      db.submissions.unshift(draft);
    });
    return draft.id;
  },

  async getById(id) {
    await delay();
    return clone(find(id));
  },

  async getMine() {
    await delay();
    const db = getDb();
    const user = db.authUser;
    if (!user) return null;

    const mine = db.submissions
      .filter((s) => s.userId === user.id || s.email === user.email)
      .sort(byNewest);

    return mine.length > 0 ? clone(mine[0]) : null;
  },

  async listMine() {
    await delay();
    const db = getDb();
    const user = db.authUser;
    if (!user) return [];

    return clone(
      db.submissions
        .filter((s) => s.userId === user.id || s.email === user.email)
        .sort(byNewest),
    );
  },

  async findByEmail(email) {
    await delay();
    const normalised = email.trim().toLowerCase();
    const matches = getDb().submissions.filter((s) => s.email === normalised).sort(byNewest);
    if (matches.length === 0) return null;

    // A real order beats an abandoned draft.
    const live = matches.find((s) => s.status !== "draft");
    return clone(live ?? matches[0]);
  },

  async updateDraft(id, patch: Partial<SubmissionDraft>) {
    await delay();

    return mutate((db) => {
      const row = db.submissions.find((s) => s.id === id);
      if (!row) throw new ApiError("not_found", "That order could not be found.");

      // Only intake fields are writable, so a stray key can't reach `status`
      // — nor `name`/`state`, which belong to the account, nor `products`,
      // which belongs to the Shopify order.
      const writable: Array<keyof SubmissionDraft> = [
        "email",
        "whiteShade",
        "gumShade",
        "selectedTeeth",
        "teethNotSure",
        "itemDetails",
        "notes",
      ];

      writable.forEach((key) => {
        if (patch[key] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- key is constrained to SubmissionDraft above
          (row as any)[key] = patch[key];
        }
      });

      emitSubmissionChange({
        type: "updated",
        submissionId: row.id,
        patientName: row.name,
        status: row.status,
      });
      return clone(row);
    });
  },

  async finalize(id, impressionPhotos: ImpressionPhoto[]) {
    await delay();

    const { row, summary } = mutate((db) => {
      const row = db.submissions.find((s) => s.id === id);
      if (!row) throw new ApiError("not_found", "That order could not be found.");

      row.impressionPhotos = impressionPhotos
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((p) => p.url);

      const created = row.status === "draft" && isComplete(row);
      if (created) row.status = "pending";

      /* On first submission, drop a pre-filled recap into the conversation so
         the patient has a record of what they sent and the care team can reply
         against it. Gated on `created` so replacing photos later never posts a
         second one. */
      let summary: ChatMessage | null = null;
      if (created) {
        summary = {
          id: `msg-${nanoid(8)}`,
          submissionId: row.id,
          senderRole: "patient",
          senderName: row.name ?? "You",
          body: buildSubmissionSummary(row),
          createdAt: nowIso(),
          readAt: null,
        };
        db.messages.push(summary);
      }

      emitSubmissionChange({
        type: created ? "created" : "updated",
        submissionId: row.id,
        patientName: row.name,
        status: row.status,
      });
      return { row: clone(row), summary };
    });

    /* Emit outside the mutate so live subscribers (the patient's Messages
       view) pick the recap up the moment the order is submitted. */
    if (summary) emitMessage(summary);
    return row;
  },

  async list(query: SubmissionQuery): Promise<Paged<Submission>> {
    await delay();

    const { page = 0, pageSize = DEFAULT_PAGE_SIZE, status = "", search = "" } = query;
    const needle = search.trim().toLowerCase();

    const matched = getDb()
      .submissions.filter((s) => s.status !== "draft")
      .filter((s) => (status ? s.status === status : true))
      .filter((s) =>
        needle
          ? (s.name ?? "").toLowerCase().includes(needle) || s.email.toLowerCase().includes(needle)
          : true,
      )
      .sort(byNewest);

    const start = page * pageSize;
    return {
      rows: clone(matched.slice(start, start + pageSize)),
      total: matched.length,
    };
  },

  async stats(): Promise<SubmissionStats> {
    await delay();
    const live = getDb().submissions.filter((s) => s.status !== "draft");

    return {
      total: live.length,
      pending: live.filter((s) => s.status === "pending").length,
      approved: live.filter((s) => s.status === "approved").length,
      changesRequested: live.filter((s) => s.status === "changes_requested").length,
    };
  },

  async updateStatus(id, update) {
    await delay();

    if (requiresReviewNotes(update.status) && !update.reviewNotes?.trim()) {
      throw new ApiError("validation", "Add a note explaining what the patient needs to do.");
    }

    return mutate((db) => {
      const row = db.submissions.find((s) => s.id === id);
      if (!row) throw new ApiError("not_found", "That order could not be found.");

      const at = nowIso();
      row.status = update.status;
      row.reviewedBy = update.reviewedBy;
      row.reviewedAt = at;

      if (update.reviewNotes !== undefined) row.reviewNotes = update.reviewNotes;
      if (update.status === "shipped") {
        row.trackingNumber = update.trackingNumber ?? row.trackingNumber;
        row.shippedAt = at;
      }
      if (update.status === "completed") row.completedAt = at;

      emitSubmissionChange({
        type: "updated",
        submissionId: row.id,
        patientName: row.name,
        status: row.status,
      });
      return clone(row);
    });
  },

  onChange(handler) {
    return subscribeToSubmissions(handler);
  },
};
