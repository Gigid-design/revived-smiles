"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./SubscriptionCard.module.css";
import { api, ApiError } from "@/lib/api";
import type { Subscription } from "@/lib/api";

/**
 * The patient's recurring delivery, with the controls to manage it.
 *
 * Shown on both Home and My Orders, so it owns its own loading and state
 * rather than each screen repeating it. Renders nothing when there is no
 * subscription, so a caller can drop it in unconditionally.
 */

const DAY_MS = 86_400_000;

/** "Tue, Aug 12" — enough to plan around without reading like a receipt. */
function deliveryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** How far off it is, in the units a person would actually say it in. */
function deliveryRelative(iso: string): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);

  const days = Math.round((then.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return "Overdue";
  if (days === 0) return "Arriving today";
  if (days === 1) return "Arriving tomorrow";
  if (days < 14) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks < 8 ? `in ${weeks} weeks` : `in ${Math.round(days / 30)} months`;
}

function money(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minorUnits / 100,
  );
}

/** yyyy-mm-dd in local time, which is what <input type="date"> expects. */
function dateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

/** Quick choices, so the common cases don't need the date picker. */
const RESCHEDULE_PRESETS = [
  { label: "In a week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
];

interface SubscriptionCardProps {
  /** Card heading. */
  title?: string;
  /**
   * Where the secondary button goes. Omit on a screen that *is* the
   * management surface — there's nowhere further to send her.
   */
  manageHref?: string;
}

export function SubscriptionCard({ title = "My Subscription", manageHref }: SubscriptionCardProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.subscriptions
      .list()
      .then((subs) => {
        if (!cancelled) setSubscription(subs[0] ?? null);
      })
      .catch((err) => console.error("Could not load subscriptions:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  /** Wraps an action so every one reports failure the same way. */
  async function run(action: () => Promise<Subscription>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setSubscription(await action());
      setRescheduleOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!subscription) return null;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <span
          className={`${styles.status} ${
            subscription.status === "paused" ? styles.statusPaused : styles.statusActive
          }`}
        >
          {subscription.status === "paused" ? "Paused" : "Active"}
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.thumb}>
          <Image src={subscription.imageUrl} alt="" width={40} height={48} style={{ objectFit: "contain" }} sizes="40px" />
        </div>
        <div className={styles.info}>
          <p className={styles.name}>{subscription.productName}</p>
          <p className={styles.desc}>
            Every {subscription.intervalWeeks} weeks ·{" "}
            {money(subscription.pricePerDelivery, subscription.currency)}
          </p>
        </div>
      </div>

      {/* The thing she actually opened the card to find out. */}
      <div className={styles.nextDelivery}>
        <div className={styles.nextInfo}>
          <p className={styles.nextLabel}>
            {subscription.status === "paused" ? "Next delivery when resumed" : "Next delivery"}
          </p>
          <p className={styles.nextDate}>{deliveryDate(subscription.nextDeliveryAt)}</p>
          <p className={styles.nextRelative}>{deliveryRelative(subscription.nextDeliveryAt)}</p>
        </div>
        {subscription.status === "active" && (
          <button
            type="button"
            className={styles.skipBtn}
            disabled={busy}
            onClick={() => void run(() => api.subscriptions.skipNext(subscription.id))}
          >
            Skip this one
          </button>
        )}
      </div>

      {subscription.lastSkippedAt && !rescheduleOpen && (
        <p className={styles.note}>You skipped the last delivery.</p>
      )}

      {rescheduleOpen && (
        <div className={styles.reschedulePanel}>
          <span className={styles.fieldLabel}>Move it to</span>
          <div className={styles.dateChips}>
            {RESCHEDULE_PRESETS.map((preset) => {
              const value = dateInputValue(plusDays(preset.days));
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`${styles.dateChip} ${newDate === value ? styles.dateChipSelected : ""}`}
                  aria-pressed={newDate === value}
                  onClick={() => setNewDate(value)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <label className={styles.fieldLabel} htmlFor="reschedule-date">
            Or pick a date
          </label>
          <input
            id="reschedule-date"
            type="date"
            className={styles.dateInput}
            value={newDate}
            min={dateInputValue(new Date().toISOString())}
            max={dateInputValue(plusDays(90))}
            onChange={(e) => setNewDate(e.target.value)}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!newDate || busy}
              onClick={() =>
                void run(() =>
                  /* Midday avoids a timezone shift landing it a day early. */
                  api.subscriptions.reschedule(subscription.id, new Date(`${newDate}T12:00:00`).toISOString()),
                )
              }
            >
              {busy ? "Saving…" : "Confirm"}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => { setRescheduleOpen(false); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && !rescheduleOpen && <p className={styles.error}>{error}</p>}

      {!rescheduleOpen && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={subscription.status === "paused" || busy}
            onClick={() => {
              setNewDate(dateInputValue(subscription.nextDeliveryAt));
              setError(null);
              setRescheduleOpen(true);
            }}
          >
            Reschedule
          </button>
          {manageHref && (
            <Link href={manageHref} className={styles.secondaryBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#121723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Manage
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
