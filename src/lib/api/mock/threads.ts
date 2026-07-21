/**
 * Patient supplies requests and questions, shown on `/my-order`.
 *
 * `setRequestStatus` fabricates the care team's reply and a tracking number.
 * That is demo simulation standing in for an admin decision — the contract
 * marks it admin-only for the real implementation.
 */

import { nanoid } from "nanoid";

import type { ThreadsApi } from "../contract";
import type { RequestStatus, Thread, ThreadMessage } from "../types";
import { ApiError, REQUEST_LABELS, REQUEST_OUTCOMES } from "../types";
import { CARE_TEAM_NAME } from "./seed";
import { clone, delay, getDb, mutate, nowIso } from "./store";

/** Stand-in carrier reference. A real backend gets this from the carrier. */
const DEMO_TRACKING = "1Z999AA10123456784";

function message(role: ThreadMessage["role"], body: string): ThreadMessage {
  return { id: `tm-${nanoid(8)}`, role, body, createdAt: nowIso() };
}

function findThread(id: string): Thread {
  const found = getDb().threads.find((t) => t.id === id);
  if (!found) throw new ApiError("not_found", "That conversation could not be found.");
  return found;
}

export const mockThreads: ThreadsApi = {
  async list() {
    await delay();
    const threads = getDb()
      .threads.slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return clone(threads);
  },

  async get(threadId) {
    await delay();
    return clone(findThread(threadId));
  },

  async startQuestion(text) {
    await delay();

    const trimmed = text.trim();
    if (!trimmed) throw new ApiError("validation", "Type your question first.");

    const at = nowIso();
    const thread: Thread = {
      id: `thread-${nanoid(8)}`,
      subject: trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed,
      messages: [message("patient", trimmed)],
      createdAt: at,
      updatedAt: at,
      unread: false,
    };

    mutate((db) => {
      db.threads.unshift(thread);
    });
    return thread.id;
  },

  async startRequest(kind, detail, note) {
    await delay();

    const at = nowIso();
    const body = [REQUEST_LABELS[kind], detail, note].filter(Boolean).join(" — ");

    const thread: Thread = {
      id: `thread-${nanoid(8)}`,
      subject: REQUEST_LABELS[kind],
      messages: [message("patient", body)],
      createdAt: at,
      updatedAt: at,
      unread: false,
      request: {
        kind,
        detail,
        note,
        status: "pending",
        outcome: null,
        trackingNumber: null,
      },
    };

    mutate((db) => {
      db.threads.unshift(thread);
    });
    return thread.id;
  },

  async reply(threadId, body) {
    await delay();

    const trimmed = body.trim();
    if (!trimmed) throw new ApiError("validation", "Write a message before sending.");

    return mutate((db) => {
      const thread = db.threads.find((t) => t.id === threadId);
      if (!thread) throw new ApiError("not_found", "That conversation could not be found.");

      thread.messages.push(message("patient", trimmed));
      thread.updatedAt = nowIso();
      return clone(thread);
    });
  },

  async markRead(threadId) {
    await delay(60);
    mutate((db) => {
      const thread = db.threads.find((t) => t.id === threadId);
      if (thread) thread.unread = false;
    });
  },

  async setRequestStatus(threadId, status: RequestStatus) {
    await delay();

    return mutate((db) => {
      const thread = db.threads.find((t) => t.id === threadId);
      if (!thread) throw new ApiError("not_found", "That conversation could not be found.");
      if (!thread.request) {
        throw new ApiError("validation", "That conversation isn't a supplies request.");
      }

      thread.request.status = status;

      if (status === "accepted") {
        const outcome = REQUEST_OUTCOMES[thread.request.kind];
        thread.request.outcome = outcome;
        thread.request.trackingNumber = DEMO_TRACKING;
        thread.messages.push(
          message(
            "care",
            `${outcome}. Your tracking number is ${DEMO_TRACKING}. Hold off on taking the impression until it arrives.`,
          ),
        );
      } else if (status === "rejected") {
        thread.request.outcome = null;
        thread.request.trackingNumber = null;
        thread.messages.push(
          message(
            "care",
            `We've taken a look and think your current ${
              thread.request.kind === "trays" ? "trays" : "material"
            } will work. Message us here if you'd like to talk it through.`,
          ),
        );
      }

      thread.unread = true;
      thread.updatedAt = nowIso();
      return clone(thread);
    });
  },
};

export { CARE_TEAM_NAME };
