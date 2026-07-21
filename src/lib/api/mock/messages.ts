/**
 * The one conversation per order, shared by the patient and the care team.
 *
 * Supplies requests live here too, as messages carrying a `request` payload,
 * so the patient sees an outcome attached to the thing she asked for rather
 * than in a separate place.
 */

import { nanoid } from "nanoid";

import type { MessagesApi } from "../contract";
import type { ChatMessage, RequestKind, RequestStatus } from "../types";
import { ApiError, REQUEST_LABELS, REQUEST_OUTCOMES } from "../types";
import { CARE_TEAM_NAME, DEMO_TRACKING } from "./seed";
import { clone, delay, emitMessage, getDb, mutate, nowIso, subscribeToMessages } from "./store";

function newMessage(partial: Omit<ChatMessage, "id" | "createdAt" | "readAt">): ChatMessage {
  return {
    id: `msg-${nanoid(8)}`,
    createdAt: nowIso(),
    readAt: null,
    ...partial,
  };
}

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

    const message = newMessage({ submissionId, senderRole, senderName, body: trimmed });

    mutate((db) => {
      db.messages.push(message);
    });
    emitMessage(message);
    return clone(message);
  },

  async sendRequest(submissionId, kind: RequestKind, detail, note, senderName) {
    await delay();

    /* The headline reads as a sentence on its own, so the message still makes
       sense anywhere the structured part isn't rendered. */
    const headline = [REQUEST_LABELS[kind], detail].filter(Boolean).join(" — ");
    const trimmedNote = note.trim();

    const message = newMessage({
      submissionId,
      senderRole: "patient",
      senderName,
      body: trimmedNote ? `${headline}\n\n${trimmedNote}` : headline,
      request: { kind, detail, status: "pending", outcome: null, trackingNumber: null },
    });

    mutate((db) => {
      db.messages.push(message);
    });
    emitMessage(message);
    return clone(message);
  },

  async setRequestStatus(messageId, status: RequestStatus) {
    await delay();

    const { updated, reply } = mutate((db) => {
      const target = db.messages.find((m) => m.id === messageId);
      if (!target) throw new ApiError("not_found", "That request could not be found.");
      if (!target.request) {
        throw new ApiError("validation", "That message isn't a supplies request.");
      }

      target.request.status = status;

      let body: string;
      if (status === "accepted") {
        const outcome = REQUEST_OUTCOMES[target.request.kind];
        target.request.outcome = outcome;
        target.request.trackingNumber = DEMO_TRACKING;
        body =
          `${outcome}. Your tracking number is ${DEMO_TRACKING}. ` +
          `Hold off on taking the impression until it arrives.`;
      } else {
        target.request.outcome = null;
        target.request.trackingNumber = null;
        body =
          `We've taken a look and think your current ` +
          `${target.request.kind === "trays" ? "trays" : "material"} will work. ` +
          `Message us here if you'd like to talk it through.`;
      }

      /* Support answers in the same conversation — there is nowhere else for
         the reply to go now, which is the point of the redesign. */
      const careReply = newMessage({
        submissionId: target.submissionId,
        senderRole: "admin",
        senderName: CARE_TEAM_NAME,
        body,
      });
      db.messages.push(careReply);

      return { updated: clone(target), reply: clone(careReply) };
    });

    emitMessage(reply);
    return updated;
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
