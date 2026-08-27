/**
 * The staff suggestion box.
 *
 * Small enough to be uninteresting, except for the one thing worth getting
 * right: who wrote an entry and who may read the list are both decided here,
 * from the session, and never from an argument. `contract.ts` is the
 * specification — read the doc comments there before reimplementing this.
 */

import { nanoid } from "nanoid";

import type { SuggestionsApi } from "../contract";
import type { Suggestion } from "../types";
import { ApiError, MAX_SUGGESTION_LENGTH, canAccess } from "../types";
import { clone, delay, getDb, mutate, nowIso } from "./store";

/** The signed-in staff member, or a `not_authorized` rejection. */
function requireStaff() {
  const admin = getDb().adminUser;
  if (!admin) {
    throw new ApiError("not_authorized", "Sign in to the staff portal first.");
  }
  return admin;
}

export const mockSuggestions: SuggestionsApi = {
  async create(body) {
    await delay();

    const admin = requireStaff();
    const text = body.trim();

    if (!text) {
      throw new ApiError("validation", "Write your suggestion first.");
    }
    if (text.length > MAX_SUGGESTION_LENGTH) {
      throw new ApiError(
        "validation",
        `Keep it under ${MAX_SUGGESTION_LENGTH} characters — this one is ${text.length}.`,
      );
    }

    const suggestion: Suggestion = {
      id: `sug-${nanoid(8)}`,
      body: text,
      submittedBy: admin.name,
      submittedByRole: admin.role,
      createdAt: nowIso(),
    };

    mutate((db) => {
      db.suggestions.push(suggestion);
    });

    return clone(suggestion);
  },

  async list() {
    await delay();

    const admin = requireStaff();
    if (!canAccess(admin.role, "suggestions")) {
      throw new ApiError("not_authorized", "The suggestion box is read by managers.");
    }

    return clone(
      getDb()
        .suggestions.slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
  },
};
