/**
 * Submissions against the in-memory store.
 *
 * The rules the old admin screen enforced only in the browser — notes before a
 * rejection, timestamps on ship and completion — are applied here too, so the
 * demo behaves like the real thing is specified to.
 */

import { nanoid } from "nanoid";

import type { SubmissionsApi } from "../contract";
import type {
  ImpressionPhoto,
  Paged,
  Submission,
  SubmissionDraft,
  SubmissionQuery,
  SubmissionStats,
} from "../types";
import { ApiError, requiresReviewNotes } from "../types";
import {
  clone,
  delay,
  emitSubmissionChange,
  getDb,
  mutate,
  nowIso,
  subscribeToSubmissions,
} from "./store";

const DEFAULT_PAGE_SIZE = 25;

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

    /* Intake no longer asks for either, so the account is where they come
       from. A real backend reads the account record rather than a session. */
    const account = getDb().authUser;

    const draft: Submission = {
      id: `sub-${nanoid(8)}`,
      userId,
      email: email.trim().toLowerCase(),
      name: account?.name ?? null,
      state: account?.state ?? null,
      products: [],
      whiteShade: null,
      gumShade: null,
      selectedTeeth: [],
      teethNotSure: false,
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
      // — nor `name` or `state`, which belong to the account.
      const writable: Array<keyof SubmissionDraft> = [
        "email",
        "products",
        "whiteShade",
        "gumShade",
        "selectedTeeth",
        "teethNotSure",
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

    return mutate((db) => {
      const row = db.submissions.find((s) => s.id === id);
      if (!row) throw new ApiError("not_found", "That order could not be found.");

      row.impressionPhotos = impressionPhotos
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((p) => p.url);

      const created = row.status === "draft" && isComplete(row);
      if (created) row.status = "pending";

      emitSubmissionChange({
        type: created ? "created" : "updated",
        submissionId: row.id,
        patientName: row.name,
        status: row.status,
      });
      return clone(row);
    });
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
