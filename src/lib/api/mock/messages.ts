/**
 * The per-submission chat between a patient and the care team.
 *
 * Distinct from `threads.ts`, which models the patient asking for supplies and
 * support deciding. Both exist in the product; they are not the same thing.
 */

import { nanoid } from "nanoid";

import type { MessagesApi } from "../contract";
import type { ChatMessage } from "../types";
import { ApiError } from "../types";
import { clone, delay, emitMessage, getDb, mutate, nowIso, subscribeToMessages } from "./store";

export const mockMessages: MessagesApi = {
  async list(submissionId) {
    await delay();
    const messages = getDb()
      .messages.filter((m) => m.submissionId === submissionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return clone(messages);
  },

  async send(submissionId, body, senderRole, senderName) {
    await delay();

    const trimmed = body.trim();
    if (!trimmed) throw new ApiError("validation", "Write a message before sending.");

    const message: ChatMessage = {
      id: `msg-${nanoid(8)}`,
      submissionId,
      senderRole,
      senderName,
      body: trimmed,
      createdAt: nowIso(),
      readAt: null,
    };

    mutate((db) => {
      db.messages.push(message);
    });
    emitMessage(message);
    return clone(message);
  },

  async markRead(submissionId, markRole) {
    await delay(60);
    const at = nowIso();

    mutate((db) => {
      db.messages.forEach((m) => {
        if (m.submissionId === submissionId && m.senderRole === markRole && !m.readAt) {
          m.readAt = at;
        }
      });
    });
  },

  async unreadCounts(submissionIds) {
    await delay(60);
    const wanted = new Set(submissionIds);
    const counts: Record<string, number> = {};

    getDb().messages.forEach((m) => {
      if (!wanted.has(m.submissionId)) return;
      if (m.senderRole !== "patient" || m.readAt) return;
      counts[m.submissionId] = (counts[m.submissionId] ?? 0) + 1;
    });

    return counts;
  },

  subscribe(submissionId, handler) {
    return subscribeToMessages(submissionId, (message) => handler(clone(message)));
  },
};
