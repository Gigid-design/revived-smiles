"use client";

/* The Materials / Trays supplies-request forms, shown inside the in-flow Care
   Team drawer so the customer can complete a request without leaving the chat.
   Mirrors the forms on the /messages page; submits to the same conversation via
   the passed-in sendRequest callback.

   Adjusting an appliance is no longer one of these forms — it is its own
   six-screen flow at /adjust, reached from the drawer's shortcut. */

import { useState } from "react";
import { TRAY_REASONS } from "@/lib/api";
import styles from "./ChatRequestForm.module.css";

export type FormKind = "material" | "trays";

interface ChatRequestFormProps {
  kind: FormKind;
  onCancel: () => void;
  onDone: () => void;
  sendRequest: (kind: FormKind, detail: string, note: string) => Promise<void>;
}

export function ChatRequestForm({ kind, onCancel, onDone, sendRequest }: ChatRequestFormProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const valid = kind === "material" || (kind === "trays" && !!reason);

  async function submit() {
    if (sending || !valid) return;
    setSending(true);
    try {
      await sendRequest(kind, kind === "trays" ? reason : "", note.trim());
      onDone();
    } catch (err) {
      console.error("Could not send the request:", err);
      setSending(false);
    }
  }

  const title = kind === "trays" ? "Request trays" : "Request materials";

  return (
    <div className={styles.form}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className={styles.body}>
        {kind === "trays" && (
          <>
            <span className={styles.fieldLabel}>What&apos;s wrong with them?</span>
            <div className={styles.chipRow}>
              {TRAY_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.chip} ${reason === r ? styles.chipSelected : ""}`}
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        <span className={styles.fieldLabel}>
          Anything else? <span className={styles.optional}>optional</span>
        </span>
        <textarea
          className={styles.note}
          rows={2}
          placeholder="Tell us a bit more…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={`${styles.submitBtn} ${!valid || sending ? styles.submitBtnDisabled : ""}`}
        disabled={!valid || sending}
        onClick={() => void submit()}
      >
        {sending ? "Sending…" : "Send request"}
      </button>
    </div>
  );
}
