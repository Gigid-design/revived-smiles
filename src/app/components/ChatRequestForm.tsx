"use client";

/* The Materials / Trays / Adjust request forms, shown inside the in-flow
   Care Team drawer so the customer can complete a request without leaving
   the chat. Mirrors the forms on the /messages page; submits to the same
   conversation via the passed-in send / sendRequest callbacks. */

import { useRef, useState } from "react";
import { ToothChart } from "./ToothChart";
import { TRAY_REASONS } from "@/lib/api";
import styles from "./ChatRequestForm.module.css";

export type FormKind = "material" | "trays" | "adjust";

interface ChatRequestFormProps {
  kind: FormKind;
  onCancel: () => void;
  onDone: () => void;
  send: (body: string) => Promise<void>;
  sendRequest: (kind: "material" | "trays", detail: string, note: string) => Promise<void>;
}

export function ChatRequestForm({ kind, onCancel, onDone, send, sendRequest }: ChatRequestFormProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [markedTeeth, setMarkedTeeth] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleMarked(num: number) {
    setMarkedTeeth((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  const requestValid = kind === "material" || (kind === "trays" && !!reason);
  const adjustValid = !!note.trim();

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      if (kind === "adjust") {
        if (!adjustValid) { setSending(false); return; }
        const teeth = [...markedTeeth].sort((a, b) => a - b);
        await send(
          `I need to adjust my appliance.\n\n${note.trim()}\n\n` +
            `Uncomfortable teeth: ${teeth.length ? teeth.join(", ") : "none marked"}.\n` +
            `Photos ready to share: ${photos.length}.`
        );
      } else {
        if (!requestValid) { setSending(false); return; }
        await sendRequest(kind, kind === "trays" ? reason : "", note.trim());
      }
      onDone();
    } catch (err) {
      console.error("Could not send the request:", err);
      setSending(false);
    }
  }

  const title = kind === "adjust" ? "Adjust my appliance" : kind === "trays" ? "Request trays" : "Request materials";

  return (
    <div className={styles.form}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>

      <div className={styles.body}>
        {kind === "adjust" ? (
          <>
            <span className={styles.fieldLabel}>Please include all of the following:</span>
            <ul className={styles.checklist}>
              <li>Photos of the partial denture in your mouth</li>
              <li>Photos of the partial denture on the models we sent you</li>
              <li>Mark any uncomfortable areas on the chart below (if applicable)</li>
              <li>A detailed description of the issue</li>
            </ul>

            <span className={styles.fieldLabel}>Photos</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
            />
            <div className={styles.photoGrid}>
              {photos.map((src, i) => (
                <div key={i} className={styles.photoTile}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Adjustment photo ${i + 1}`} />
                  <button
                    type="button"
                    className={styles.photoRemove}
                    aria-label="Remove photo"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className={styles.photoAdd} onClick={() => fileRef.current?.click()}>
                <span aria-hidden="true">＋</span>
                Add photos
              </button>
            </div>

            <span className={styles.fieldLabel}>
              Mark uncomfortable areas <span className={styles.optional}>if applicable</span>
            </span>
            <ToothChart selected={markedTeeth} onToggle={toggleMarked} />

            <span className={styles.fieldLabel}>Describe the issue</span>
            <textarea
              className={styles.note}
              rows={3}
              placeholder="Tell us what's uncomfortable or not fitting right…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <button
        type="button"
        className={`${styles.submitBtn} ${(kind === "adjust" ? !adjustValid : !requestValid) || sending ? styles.submitBtnDisabled : ""}`}
        disabled={(kind === "adjust" ? !adjustValid : !requestValid) || sending}
        onClick={() => void submit()}
      >
        {sending ? "Sending…" : kind === "adjust" ? "Send to care team" : "Send request"}
      </button>
    </div>
  );
}
