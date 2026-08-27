"use client";

import { useCallback, useEffect, useState } from "react";

import { api, canAccess, MAX_SUGGESTION_LENGTH, STAFF_ROLE_LABELS } from "@/lib/api";
import type { Suggestion } from "@/lib/api";
import { useAdminUser } from "./AdminAuthGuard";
import styles from "./SuggestionBox.module.css";

/** "3 hours ago" / "Yesterday" — the same register as the queue's dates. */
function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The staff suggestion box (Aug 25 session, ≈26:27–27:34).
 *
 * Everyone gets the box. Managers also get what's in it — Gitai wanted a place
 * for the team to leave an idea the moment they have it ("throughout the day,
 * maybe they forget about it") and one view where management reads them.
 *
 * Sending is optimistic about nothing: the field only clears once the adapter
 * has taken it, because a box that empties on a failed write silently eats the
 * one thing it exists to keep.
 */
export function SuggestionBox() {
  const user = useAdminUser();
  const isManager = user ? canAccess(user.role, "suggestions") : false;

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const load = useCallback(async () => {
    if (!isManager) return;
    try {
      setSuggestions(await api.suggestions.list());
    } catch {
      /* The list is a manager's extra; failing to load it must not take the
         box down for them. */
    }
  }, [isManager]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch on mount
  }, [load]);

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_SUGGESTION_LENGTH;
  const remaining = MAX_SUGGESTION_LENGTH - trimmed.length;

  async function send() {
    if (!trimmed || tooLong || sending) return;

    setSending(true);
    setError(null);
    try {
      await api.suggestions.create(trimmed);
      setBody("");
      setSent(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Suggestion box</h2>
          <p className={styles.subtitle}>
            {isManager
              ? "Anything the team thinks would make the portal easier to work in. Only managers see this list."
              : "Spotted something that would make your day easier? Leave it here — it goes straight to management."}
          </p>
        </div>
      </div>

      <div className={styles.composer}>
        <label className={styles.srOnly} htmlFor="suggestion-body">
          Your suggestion
        </label>
        <textarea
          id="suggestion-body"
          className={styles.textarea}
          value={body}
          rows={3}
          placeholder="e.g. the packing slip order number is too small to read at a glance"
          onChange={(e) => {
            setBody(e.target.value);
            if (sent) setSent(false);
            if (error) setError(null);
          }}
          disabled={sending}
        />

        <div className={styles.composerFooter}>
          <span className={styles.hint} aria-live="polite">
            {error ? (
              <span className={styles.error}>{error}</span>
            ) : sent ? (
              <span className={styles.sent}>Thanks — management can see it.</span>
            ) : tooLong ? (
              <span className={styles.error}>{-remaining} characters too many.</span>
            ) : remaining < 120 ? (
              `${remaining} characters left`
            ) : (
              ""
            )}
          </span>

          <button
            type="button"
            className={styles.send}
            onClick={send}
            disabled={!trimmed || tooLong || sending}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {isManager && (
        <div className={styles.list}>
          {suggestions.length === 0 ? (
            <p className={styles.empty}>Nothing in the box yet.</p>
          ) : (
            suggestions.map((s) => (
              <article key={s.id} className={styles.item}>
                <p className={styles.itemBody}>{s.body}</p>
                <p className={styles.itemMeta}>
                  <span className={styles.itemAuthor}>{s.submittedBy}</span>
                  <span className={styles.itemRole}>{STAFF_ROLE_LABELS[s.submittedByRole]}</span>
                  <span>{relative(s.createdAt)}</span>
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
