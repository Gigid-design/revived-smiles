/**
 * Recurring consumable deliveries.
 *
 * Rescheduling and skipping actually move the date in the demo, so the card
 * behaves like a real subscription rather than looking like one.
 */

import type { SubscriptionsApi } from "../contract";
import type { BillingAddress, PaymentMethod, Subscription, SubscriptionStatus } from "../types";
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
      if (sub.status === "canceled") {
        throw new ApiError("validation", "This subscription has been canceled.");
      }
      sub.status = status;

      /* Resuming from a lapsed pause would otherwise leave a date in the past. */
      if (status === "active" && new Date(sub.nextDeliveryAt).getTime() < Date.now()) {
        sub.nextDeliveryAt = addWeeks(nowIso(), sub.intervalWeeks);
      }
      return clone(sub);
    });
  },

  async cancel(id) {
    await delay();

    return mutate((db) => {
      const sub = find(db, id);
      if (sub.status === "canceled") return clone(sub); // idempotent
      sub.status = "canceled";
      sub.canceledAt = nowIso();
      return clone(sub);
    });
  },

  async listPlans() {
    await delay();
    return clone(getDb().plans);
  },

  async changePlan(id, planId) {
    await delay();

    return mutate((db) => {
      const sub = find(db, id);
      if (sub.status === "canceled") {
        throw new ApiError("validation", "This subscription has been canceled.");
      }
      const plan = db.plans.find((p) => p.id === planId);
      if (!plan) throw new ApiError("not_found", "That plan could not be found.");

      sub.intervalWeeks = plan.intervalWeeks;
      sub.pricePerDelivery = plan.pricePerDelivery;
      sub.currency = plan.currency;
      return clone(sub);
    });
  },

  async getPaymentMethod() {
    await delay();
    return clone(getDb().paymentMethod);
  },

  async updatePaymentMethod(input) {
    await delay();

    /* Keep only what a tokenising processor would hand back — never the PAN. */
    const digits = input.number.replace(/\D/g, "");
    if (digits.length < 12) {
      throw new ApiError("validation", "That card number doesn't look right.");
    }
    if (input.cvc.replace(/\D/g, "").length < 3) {
      throw new ApiError("validation", "Enter the 3- or 4-digit security code.");
    }
    if (input.expMonth < 1 || input.expMonth > 12) {
      throw new ApiError("validation", "Enter a valid expiry month.");
    }

    const method: PaymentMethod = {
      brand: brandFromNumber(digits),
      last4: digits.slice(-4),
      expMonth: input.expMonth,
      expYear: input.expYear,
    };

    return mutate((db) => {
      db.paymentMethod = method;
      return clone(method);
    });
  },

  async getBillingAddress() {
    await delay();
    return clone(getDb().billingAddress);
  },

  async updateBillingAddress(input: BillingAddress) {
    await delay();

    if (!input.line1.trim() || !input.city.trim() || !input.postalCode.trim()) {
      throw new ApiError("validation", "Street, city and postal code are required.");
    }

    return mutate((db) => {
      db.billingAddress = clone(input);
      return clone(db.billingAddress);
    });
  },

  async listInvoices() {
    await delay();
    return clone(getDb().invoices);
  },
};

/** Best-effort card brand from the leading digits — enough for the demo badge. */
function brandFromNumber(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}
