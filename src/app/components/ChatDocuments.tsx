"use client";

import { useState } from "react";
import { api, ApiError, type MessageDocuments } from "@/lib/api";
import styles from "./ChatDocuments.module.css";

/** Trigger a browser download for a generated PDF blob. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
  </svg>
);

/**
 * The prepaid return label + packing slip a customer receives in chat when an
 * adjustment is approved. Each button generates its PDF on demand from the
 * shipping API and hands it to the browser — the documents belong to the
 * customer, so this renders on their side of the conversation.
 */
export function ChatDocuments({
  submissionId,
  documents,
}: {
  submissionId: string;
  documents: MessageDocuments;
}) {
  const [busy, setBusy] = useState<"label" | "slip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getLabel() {
    setBusy("label");
    setError(null);
    try {
      const blob = await api.shipping.label(submissionId, documents.patientName ?? "Patient");
      saveBlob(blob, `return-label-${submissionId.slice(0, 8)}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the label.");
    } finally {
      setBusy(null);
    }
  }

  async function getSlip() {
    if (!documents.packingSlip) return;
    setBusy("slip");
    setError(null);
    try {
      const blob = await api.shipping.packingSlip(documents.packingSlip);
      saveBlob(blob, `packing-slip-${documents.packingSlip.requestNumber}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the packing slip.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.docs}>
      {documents.returnLabel && (
        <button type="button" className={styles.docBtn} onClick={() => void getLabel()} disabled={busy !== null}>
          <DownloadIcon />
          {busy === "label" ? "Preparing…" : "Return label"}
        </button>
      )}
      {documents.packingSlip && (
        <button type="button" className={styles.docBtn} onClick={() => void getSlip()} disabled={busy !== null}>
          <DownloadIcon />
          {busy === "slip" ? "Preparing…" : "Packing slip"}
        </button>
      )}
      {error && <p className={styles.docError}>{error}</p>}
    </div>
  );
}
