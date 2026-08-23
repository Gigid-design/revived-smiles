"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MacroPicker.module.css";
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/api";

/**
 * The side-effect a macro performs when applied.
 *
 * `status` moves the submission along (the "Approve Impression" macro sets it to
 * Approved); `tag` is a label applied alongside, shown for traceability. In V1
 * the tag is descriptive only — the status change is the real action, run
 * through the same `updateStatus` path as the review buttons.
 */
export interface MacroAction {
  /** Human summary shown in the preview, e.g. "Sets status to Approved…". */
  label: string;
  /** The status this macro moves the submission to. */
  status: SubmissionStatus;
  /** A tag applied with the action, e.g. "impression approved". */
  tag?: string;
  /** Which impression a lab retake targets — travels with the status update. */
  retakeArea?: "upper" | "lower" | "bite";
}

/** A canned reply the admin can search for and apply. Some also carry an
 *  action that moves the order along when applied (see `MacroAction`). */
export interface Macro {
  id: string;
  name: string;
  tags: string[];
  body: string;
  /** Optional action performed when the macro is applied. */
  action?: MacroAction;
}

const MACROS: Macro[] = [
  {
    id: "generic-help",
    name: "Generic: How can I help?",
    tags: ["generic", "greeting"],
    body: "Hi there — thanks for reaching out! How can I help you today?",
  },
  {
    id: "approve-impression",
    name: "Approve Impression",
    tags: ["impression", "approval", "review"],
    body: "Great news — your impressions passed our review and we're moving your order into production. We'll be in touch with the next steps shortly.",
    action: {
      label: "Sets status to Approved · adds tag “impression approved”",
      status: "approved",
      tag: "impression approved",
    },
  },
  {
    id: "generic-signoff",
    name: "Generic: Sign off",
    tags: ["generic", "closing"],
    body: "Let us know if we can do anything else for you — we're here to help.",
  },
  {
    id: "request-photos",
    name: "Impression: Request better photos",
    tags: ["impression", "photos", "review"],
    body: "Thanks for your submission! A few of your impression photos came out blurry. Could you please retake them in good lighting and re-upload? That will help our lab give you the best fit.",
    action: {
      label: "Sets status to Changes requested · adds tag “photos requested”",
      status: "changes_requested",
      tag: "photos requested",
    },
  },
  {
    id: "resubmit-upper",
    name: "Resubmit: Upper impression",
    tags: ["impression", "resubmit", "upper", "changes", "lab"],
    body: "We reviewed your impressions in the lab and need a fresh upper impression to get your fit right. We've sent new trays and material — tracking is on its way. Once they arrive, please retake just your upper impression and resubmit. Everything else is on file, so you won't need to start over.",
    action: {
      label: "Sets status to Changes requested · adds tag “resubmit upper”",
      status: "changes_requested",
      tag: "resubmit upper",
    },
  },
  {
    id: "resubmit-lower",
    name: "Resubmit: Lower impression",
    tags: ["impression", "resubmit", "lower", "changes", "lab"],
    body: "We reviewed your impressions in the lab and need a fresh lower impression to get your fit right. We've sent new trays and material — tracking is on its way. Once they arrive, please retake just your lower impression and resubmit. Everything else is on file, so you won't need to start over.",
    action: {
      label: "Sets status to Changes requested · adds tag “resubmit lower”",
      status: "changes_requested",
      tag: "resubmit lower",
    },
  },
  {
    id: "resubmit-bite",
    name: "Resubmit: Bite impression",
    tags: ["impression", "resubmit", "bite", "changes", "lab"],
    body: "We reviewed your impressions in the lab and need a new bite impression to get your fit right. We've sent what you need — tracking is on its way. Once it arrives, please retake just your bite and resubmit. Everything else is on file, so you won't need to start over.",
    action: {
      label: "Sets status to Changes requested · adds tag “resubmit bite”",
      status: "changes_requested",
      tag: "resubmit bite",
    },
  },
  /* Lab retake — the post-approval branch (Aug 18 session). The impressions
     were approved and physically received, then found unusable in the lab. A
     fresh kit is dispatched manually via Shopify; the macro carries the news,
     names the arch, and parks the order at `lab_retake` until the patient
     resubmits. Nothing needs returning first. */
  {
    id: "lab-retake-upper",
    name: "Lab retake: Upper impression",
    tags: ["impression", "retake", "upper", "lab", "kit"],
    body: "We received your impressions — thank you! Unfortunately the upper impression didn't survive the trip in usable shape, so we're sending you a fresh kit with new trays and material. Nothing to send back for now. Once the kit arrives, retake just your upper impression, photograph it, and resubmit. Your lower impression and everything else are safely on file.",
    action: {
      label: "Sets status to Lab retake · adds tag \u201clab retake upper\u201d",
      status: "lab_retake",
      tag: "lab retake upper",
      retakeArea: "upper",
    },
  },
  {
    id: "lab-retake-lower",
    name: "Lab retake: Lower impression",
    tags: ["impression", "retake", "lower", "lab", "kit"],
    body: "We received your impressions — thank you! Unfortunately the lower impression didn't survive the trip in usable shape, so we're sending you a fresh kit with new trays and material. Nothing to send back for now. Once the kit arrives, retake just your lower impression, photograph it, and resubmit. Your upper impression and everything else are safely on file.",
    action: {
      label: "Sets status to Lab retake · adds tag \u201clab retake lower\u201d",
      status: "lab_retake",
      tag: "lab retake lower",
      retakeArea: "lower",
    },
  },
  {
    id: "lab-retake-bite",
    name: "Lab retake: Bite impression",
    tags: ["impression", "retake", "bite", "lab", "kit"],
    body: "We received your impressions — thank you! We need a fresh bite registration to get your fit right, so we're sending you new bite material. Nothing to send back for now. Once it arrives, retake just your bite, photograph it, and resubmit. Both impressions and everything else are safely on file.",
    action: {
      label: "Sets status to Lab retake · adds tag \u201clab retake bite\u201d",
      status: "lab_retake",
      tag: "lab retake bite",
      retakeArea: "bite",
    },
  },
  {
    id: "reject-submission",
    name: "Impression: Can't proceed with order",
    tags: ["impression", "reject", "review"],
    body: "Thank you for your submission. After review, we're unable to proceed with these impressions and recommend seeing a dentist in person before we fit anything. Our team will follow up with the details.",
    action: {
      label: "Sets status to Rejected · adds tag “impression rejected”",
      status: "rejected",
      tag: "impression rejected",
    },
  },
  {
    id: "order-already-shipped",
    name: "Order Change/Cancel: Already Shipped",
    tags: ["order", "shipping", "cancel"],
    body: "Your order has already shipped, so we're unable to change or cancel it at this stage. Once it arrives, reach out and we'll help with any adjustments.",
  },
  {
    id: "shipping-tracking",
    name: "Shipping: Tracking link",
    tags: ["shipping", "tracking"],
    body: "Your order is on its way! You can follow it any time from the tracking link on your My Order page.",
  },
];

/* The three review decisions up front — approve, deny, or send back for
   changes — so support can action a submission straight from the chip row. */
const SUGGESTED_IDS = ["approve-impression", "reject-submission", "request-photos"];

export function MacroPicker({ onApply }: { onApply: (macro: Macro) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  /* The action macro staged for confirmation, and whether it's running — so a
     status change takes a deliberate second click rather than firing on select. */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MACROS;
    return MACROS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  const preview = filtered.find((m) => m.id === previewId) ?? filtered[0] ?? null;
  const suggested = MACROS.filter((m) => SUGGESTED_IDS.includes(m.id));

  /* Close on outside click. */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmId(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function reset() {
    setOpen(false);
    setQuery("");
    setConfirmId(null);
  }

  /** Plain replies apply straight away; a macro that also actions the ticket
      stages a confirm first, so an approval/rejection is never a one-click slip. */
  function apply(m: Macro) {
    if (m.action) {
      setOpen(true);
      setPreviewId(m.id);
      setConfirmId(m.id);
      return;
    }
    void onApply(m);
    reset();
  }

  async function confirmApply(m: Macro) {
    if (busy) return;
    setBusy(true);
    try {
      await onApply(m);
      reset();
    } catch (err) {
      console.error("Could not apply macro:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.picker} ref={rootRef}>
      {/* Search row — the lightning icon opens the macro search */}
      <div className={styles.searchRow}>
        <button
          type="button"
          className={styles.bolt}
          aria-label={open ? "Close macros" : "Search macros"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M11 2L4 11h5l-1 7 7-9h-5l1-7z" fill="currentColor" />
          </svg>
        </button>
        <input
          className={styles.search}
          placeholder="Search macros by name, tags or body…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className={styles.chevron}
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden data-open={open || undefined}>
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Dropdown — list + preview */}
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.listEmpty}>No macros match “{query}”.</div>
            ) : (
              filtered.map((m) => {
                const active = preview?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.listItem} ${active ? styles.listItemActive : ""}`}
                    onMouseEnter={() => setPreviewId(m.id)}
                    onFocus={() => setPreviewId(m.id)}
                    onClick={() => apply(m)}
                  >
                    <span className={styles.listItemName}>{m.name}</span>
                    <span className={styles.listItemCheck} aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className={styles.preview}>
            {preview ? (
              <>
                <p className={styles.previewBody}>{preview.body}</p>
                {preview.action && (
                  <p className={styles.previewAction}>
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    {preview.action.label}
                  </p>
                )}
                {confirmId === preview.id && preview.action ? (
                  <div className={styles.confirmBar}>
                    <p className={styles.confirmText}>
                      Set this order to{" "}
                      <b>{SUBMISSION_STATUS_LABELS[preview.action.status]}</b> and send this reply?
                    </p>
                    <div className={styles.confirmBtns}>
                      <button
                        type="button"
                        className={styles.confirmApply}
                        disabled={busy}
                        onClick={() => void confirmApply(preview)}
                      >
                        {busy ? "Applying…" : "Confirm & send"}
                      </button>
                      <button
                        type="button"
                        className={styles.confirmCancel}
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${styles.applyBtn} ${preview.action ? styles.applyBtnAction : ""}`}
                    onClick={() => apply(preview)}
                  >
                    {preview.action ? "Apply & update status" : "Apply"}
                  </button>
                )}
              </>
            ) : (
              <p className={styles.previewHint}>Hover a macro to preview it.</p>
            )}
          </div>
        </div>
      )}

      {/* Suggested macros — quick apply when the search is collapsed */}
      {!open && (
        <div className={styles.suggested}>
          <span className={styles.suggestedLabel}>Suggested macros</span>
          <div className={styles.chips}>
            {suggested.map((m) => (
              <button key={m.id} type="button" className={styles.chip} onClick={() => apply(m)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
