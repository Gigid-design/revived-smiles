"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";
import { IntakeHeader } from "../components/IntakeHeader";
import { FlowSupport } from "../components/FlowSupport";
import { api, ApiError } from "@/lib/api";
import type { Insurance } from "@/lib/api";

/**
 * File a protection claim — a short intake, the way Gitai described it: "a few
 * questions, the reasoning, do you still have your models," then routed to the
 * care team. One question per screen with a big Continue and a visible Back /
 * Close, matching the impression intake so the older audience isn't lost.
 */

interface Reason {
  id: string;
  label: string;
  desc: string;
}

const REASONS: Reason[] = [
  { id: "lost", label: "Lost or missing", desc: "I can't find my appliance." },
  { id: "broken", label: "Broke or cracked", desc: "It's damaged, split, or a piece came off." },
  { id: "fit", label: "Doesn't fit right", desc: "It's loose, tight, or uncomfortable." },
  { id: "other", label: "Something else", desc: "I'll explain in my own words." },
];

const DETAIL_MAX = 300;
const STEP_TITLES = [
  "What happened?",
  "Do you still have your appliance?",
  "Anything you'd like to add?",
  "Review your claim",
];

export default function InsuranceClaim() {
  const router = useRouter();

  const [insurance, setInsurance] = useState<Insurance | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [step, setStep] = useState(0);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [hasAppliance, setHasAppliance] = useState<boolean | null>(null);
  const [detail, setDetail] = useState("");

  // Extra-info prompt shown after the customer taps "Submit claim".
  const [showExtra, setShowExtra] = useState(false);
  const [extraInfo, setExtraInfo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.insurance
      .list()
      .then((records) => {
        if (cancelled) return;
        // Filing implies coverage; the first record is this patient's appliance.
        if (records[0]) setInsurance(records[0]);
        else setLoadFailed(true);
      })
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const reason = REASONS.find((r) => r.id === reasonId) ?? null;
  const total = STEP_TITLES.length;
  const pct = Math.round(((step + 1) / total) * 100);

  const canAdvance =
    (step === 0 && reasonId !== null) ||
    (step === 1 && hasAppliance !== null) ||
    step === 2 ||
    step === 3;

  function back() {
    setError(null);
    if (step === 0) router.push("/my-order");
    else setStep((s) => s - 1);
  }

  async function submit() {
    if (!insurance || !reason || hasAppliance === null) return;
    setSubmitting(true);
    setError(null);
    // Fold the step-2 note and the extra-info prompt into the single `detail`
    // field the claim API accepts.
    const extra = extraInfo.trim();
    const combinedDetail = [detail.trim(), extra && `Additional information: ${extra}`]
      .filter(Boolean)
      .join("\n\n");
    try {
      await api.insurance.fileClaim(insurance.id, {
        reason: reason.label,
        hasAppliance,
        detail: combinedDetail,
      });
      setShowExtra(false);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success ── */
  if (submitted) {
    return (
      <main className={styles.screen}>
        <div className={`${styles.card} ${styles.successCard}`} id="main-content">
          <div className={styles.successIcon} aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5L9.5 18L20 6.5" />
            </svg>
          </div>
          <h1 className={styles.successTitle}>Claim submitted</h1>
          <p className={styles.successBody}>
            Your care team has your claim and will review it shortly. We&apos;ve added a copy to
            your messages — they&apos;ll reply there with next steps.
          </p>
          <Link href="/my-order" className={`${styles.btn} ${styles.btnActive}`}>
            Back to my orders
          </Link>
          <Link href="/messages" className={styles.successLink}>
            View in Messages →
          </Link>
        </div>
      </main>
    );
  }

  /* ── Can't file (no insurable appliance) ── */
  if (loadFailed) {
    return (
      <main className={styles.screen}>
        <IntakeHeader
          label="Protection claim"
          pct={0}
          counter=""
          onBack={() => router.push("/my-order")}
          onClose={() => router.push("/my-order")}
        />
        <div className={styles.card} id="main-content">
          <h1 className={styles.cardTitle}>Nothing to claim yet</h1>
          <p className={styles.helpText}>
            You&apos;ll be able to file a claim once your appliance is covered by a Protection Plan.
          </p>
        </div>
        <div className={styles.buttonWrapper}>
          <Link href="/my-order" className={`${styles.btn} ${styles.btnActive}`}>
            Back to my orders
          </Link>
        </div>
      </main>
    );
  }

  /* ── Already filed this coverage year (one claim per year, from order date) ── */
  if (insurance?.nextClaimEligibleAt) {
    const nextDate = new Date(insurance.nextClaimEligibleAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return (
      <main className={styles.screen}>
        <IntakeHeader
          label="Protection claim"
          pct={0}
          counter=""
          onBack={() => router.push("/my-order")}
          onClose={() => router.push("/my-order")}
        />
        <div className={styles.card} id="main-content">
          <h1 className={styles.cardTitle}>One claim per year</h1>
          <p className={styles.helpText}>
            You&apos;ve already filed a claim for this coverage year. You can file another
            claim on {nextDate}. In the meantime, your care team can still help — just
            reach out in Messages.
          </p>
        </div>
        <div className={styles.buttonWrapper}>
          <Link href="/my-order" className={`${styles.btn} ${styles.btnActive}`}>
            Back to my orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Protection claim"
        pct={pct}
        counter={`Step ${step + 1} of ${total}`}
        onBack={back}
        onClose={() => router.push("/my-order")}
      />

      <div className={styles.card} id="main-content">
        <h1 className={styles.cardTitle}>{STEP_TITLES[step]}</h1>

        {/* Step 0 — reason */}
        {step === 0 && (
          <div className={styles.options} role="radiogroup" aria-label="Reason for claim">
            {REASONS.map((r) => {
              const active = reasonId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.option} ${active ? styles.optionActive : ""}`}
                  onClick={() => setReasonId(r.id)}
                >
                  <span className={styles.optionText}>
                    <span className={styles.optionLabel}>{r.label}</span>
                    <span className={styles.optionDesc}>{r.desc}</span>
                  </span>
                  <span className={styles.radio} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1 — still have the appliance */}
        {step === 1 && (
          <>
            <p className={styles.helpText}>
              This helps your care team decide whether to repair or replace it.
            </p>
            <div className={styles.options} role="radiogroup" aria-label="Do you still have your appliance?">
              {[
                { value: true, label: "Yes, I still have it" },
                { value: false, label: "No, I don't have it" },
              ].map((opt) => {
                const active = hasAppliance === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`${styles.option} ${active ? styles.optionActive : ""}`}
                    onClick={() => setHasAppliance(opt.value)}
                  >
                    <span className={styles.optionText}>
                      <span className={styles.optionLabel}>{opt.label}</span>
                    </span>
                    <span className={styles.radio} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2 — free-text detail */}
        {step === 2 && (
          <>
            <p className={styles.helpText}>
              Optional — a sentence or two is plenty. Your care team can always ask for more.
            </p>
            <textarea
              className={styles.textarea}
              placeholder="Tell us what happened…"
              maxLength={DETAIL_MAX}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <p className={styles.counter}>{detail.length} / {DETAIL_MAX}</p>
          </>
        )}

        {/* Step 3 — review */}
        {step === 3 && (
          <div className={styles.review}>
            <ReviewRow label="Appliance" value={insurance?.productName ?? "—"} />
            <ReviewRow label="Reason" value={reason?.label ?? "—"} />
            <ReviewRow label="Still have it" value={hasAppliance ? "Yes" : "No"} />
            <ReviewRow label="Details" value={detail.trim() || "None added"} />
            <p className={styles.reviewNote}>
              Submitting sends this to your care team and adds a copy to your messages.
            </p>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}
      </div>

      <div className={styles.buttonWrapper}>
        {step < total - 1 ? (
          <button
            type="button"
            className={`${styles.btn} ${canAdvance ? styles.btnActive : ""}`}
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnActive}`}
            disabled={submitting || !insurance}
            onClick={() => { setError(null); setShowExtra(true); }}
          >
            Submit claim
          </button>
        )}
        <FlowSupport />
      </div>

      {showExtra && (
        <ExtraInfoModal
          value={extraInfo}
          onChange={setExtraInfo}
          submitting={submitting}
          error={error}
          onCancel={() => { if (!submitting) { setShowExtra(false); setError(null); } }}
          onConfirm={submit}
        />
      )}
    </main>
  );
}

/* ── Additional-information prompt, shown after tapping "Submit claim" ── */
const EXTRA_MAX = 300;

function ExtraInfoModal({
  value,
  onChange,
  submitting,
  error,
  onCancel,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Add additional information"
      onClick={onCancel}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Add any additional information</h2>
        <p className={styles.helpText}>
          Optional — anything else that could help your care team review the claim.
        </p>
        <textarea
          className={styles.textarea}
          placeholder="Add more detail…"
          maxLength={EXTRA_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <p className={styles.counter}>{value.length} / {EXTRA_MAX}</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            disabled={submitting}
            onClick={onCancel}
          >
            Back
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnActive}`}
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? "Submitting…" : "Submit claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value}</span>
    </div>
  );
}
