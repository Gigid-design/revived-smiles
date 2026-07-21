/**
 * Recurring consumable deliveries.
 *
 * Rescheduling and skipping actually move the date in the demo, so the card
 * behaves like a real subscription rather than looking like one.
 */

import type { SubscriptionsApi } from "../contract";
import type { Subscription, SubscriptionStatus } from "../types";
import { ApiError } from "../types";
import { clone, delay, getDb, mutate, nowIso } from "./store";

const DAY_MS = 86_400_000;

/** A delivery pushed out further than this is a cancellation in disguise. */
const MAX_HORIZON_DAYS = 90;

function addWeeks(iso: string, weeks: number): string {
  return new Date(new Date(iso).getTime() + weeks * 7 * DAY_MS).toISOString();
}

function find(db: { subscriptions: Subscription[] }, id: string): Subscription {
  const found = db.subscriptions.find((s) => s.id === id);
  if (!found) throw new ApiError("not_found", "That subscription could not be found.");
  return found;
}

export const mockSubscriptions: SubscriptionsApi = {
  async list() {
    await delay();
    return clone(getDb().subscriptions);
  },

  async reschedule(id, nextDeliveryAt) {
    await delay();

    const when = new Date(nextDeliveryAt);
    if (Number.isNaN(when.getTime())) {
      throw new ApiError("validation", "That doesn't look like a date.");
    }

    /* Compare against the start of today so choosing "today" still works. */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (when.getTime() < today.getTime()) {
      throw new ApiError("validation", "Pick a date in the future.");
    }
    if (when.getTime() > Date.now() + MAX_HORIZON_DAYS * DAY_MS) {
      throw new ApiError(
        "validation",
        `Deliveries can be moved up to ${MAX_HORIZON_DAYS} days out. To stop them altogether, pause the subscription instead.`,
      );
    }

    return mutate((db) => {
      const sub = find(db, id);
      sub.nextDeliveryAt = when.toISOString();
      return clone(sub);
    });
  },

  async skipNext(id) {
    await delay();

    return mutate((db) => {
      const sub = find(db, id);
      if (sub.status === "paused") {
        throw new ApiError("validation", "This subscription is paused — nothing is scheduled.");
      }

      /* Skip from today when the next delivery is already overdue, so a
         forgotten subscription doesn't schedule itself into the past. */
      const from =
        new Date(sub.nextDeliveryAt).getTime() < Date.now() ? nowIso() : sub.nextDeliveryAt;

      sub.nextDeliveryAt = addWeeks(from, sub.intervalWeeks);
      sub.lastSkippedAt = nowIso();
      return clone(sub);
    });
  },

  async setStatus(id, status: SubscriptionStatus) {
    await delay();

    return mutate((db) => {
      const sub = find(db, id);
      sub.status = status;

      /* Resuming from a lapsed pause would otherwise leave a date in the past. */
      if (status === "active" && new Date(sub.nextDeliveryAt).getTime() < Date.now()) {
        sub.nextDeliveryAt = addWeeks(nowIso(), sub.intervalWeeks);
      }
      return clone(sub);
    });
  },
};
