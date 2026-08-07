"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MacroPicker.module.css";

/** A canned reply the admin can search for and apply. Some also carry an
 *  action note (e.g. "sets status") — V1 lets the agent select what's
 *  available; the action itself is configured upstream in Gorgias. */
export interface Macro {
  id: string;
  name: string;
  tags: string[];
  body: string;
  /** Optional side-effect this macro represents, shown in the preview. */
  action?: string;
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
    action: "Sets status to Approved · adds tag “impression approved”",
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
    action: "Sets status to Changes requested",
  },
  {
    id: "order-already-shipped",
    name: "Order Change/Cancel: Already Shipped",
    tags: ["order", "shipping", "cancel"],
    body: "Your order has already shipped, so we're unable to change or cancel it at this stage. Once it arrives, reach out and we'll help with any adjustments.",
  },
  {
    id: "order-cancel-refund",
    name: "Order Change/Cancel: Cancel & Refund",
    tags: ["order", "refund", "cancel"],
    body: "We've cancelled your order and a refund has been issued to your original payment method. Please allow 5–10 business days for it to appear.",
    action: "Sets status to Cancelled",
  },
  {
    id: "shipping-tracking",
    name: "Shipping: Tracking link",
    tags: ["shipping", "tracking"],
    body: "Your order is on its way! You can follow it any time from the tracking link on your My Order page.",
  },
];

const SUGGESTED_IDS = ["generic-help", "approve-impression", "generic-signoff"];

export function MacroPicker({ onApply }: { onApply: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function apply(m: Macro) {
    onApply(m.body);
    setOpen(false);
    setQuery("");
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
                    {preview.action}
                  </p>
                )}
                <button type="button" className={styles.applyBtn} onClick={() => apply(preview)}>
                  Apply
                </button>
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
