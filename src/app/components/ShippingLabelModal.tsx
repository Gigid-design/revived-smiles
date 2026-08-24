"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import styles from "./ShippingLabelModal.module.css";

interface ShippingLabelModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  patientName: string;
}

/* A deterministic stand-in QR (real one comes from ShipStation's UPS
   paperless option — Aug 24, Nathan: "looks possible in ShipStation").
   Derived from the submission id so it's stable per order. */
function FakeQr({ seed }: { seed: string }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  let x = h || 1;
  for (let i = 0; i < 441; i++) { x = (x * 1103515245 + 12345) >>> 0; cells.push(((x >> 16) & 1) === 1); }
  const N = 21;
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width="176" height="176" role="img" aria-label="Shipping QR code">
      <rect width={N} height={N} fill="#fff" />
      {cells.map((on, i) => {
        const r = Math.floor(i / N), c = i % N;
        if (finder(r, c)) {
          const inRing = (rr: number, cc: number, r0: number, c0: number) => {
            const dr = rr - r0, dc = cc - c0;
            return (dr === 0 || dr === 6 || dc === 0 || dc === 6) || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
          };
          const origins: [number, number][] = [[0, 0], [0, N - 7], [N - 7, 0]];
          const o = origins.find(([r0, c0]) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7)!;
          return inRing(r, c, o[0], o[1]) ? <rect key={i} x={c} y={r} width="1" height="1" fill="#121723" /> : null;
        }
        return on ? <rect key={i} x={c} y={r} width="1" height="1" fill="#121723" /> : null;
      })}
    </svg>
  );
}

export function ShippingLabelModal({ open, onClose, submissionId, patientName }: ShippingLabelModalProps) {
  const [mode, setMode] = useState<"label" | "qr">("label");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  /* Ignores a label that arrives after the modal closed or a retry superseded it. */
  const requestRef = useRef(0);

  /* One loader, shared by opening the modal and by the retry button. */
  const loadLabel = useCallback(async () => {
    const seq = ++requestRef.current;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPdfUrl(null);
    setError(null);
    setLoading(true);

    try {
      const blob = await api.shipping.label(submissionId, patientName);
      if (seq !== requestRef.current) return;
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setPdfUrl(url);
    } catch (err) {
      console.error("Shipping label error:", err);
      if (seq === requestRef.current) {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      if (seq === requestRef.current) setLoading(false);
    }
  }, [submissionId, patientName]);

  // Build the PDF when the modal opens
  useEffect(() => {
    if (!open || !submissionId) return;

    /* Clearing the old label and showing the spinner IS the intended effect of
       opening, so the synchronous reset inside loadLabel is deliberate here. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void loadLabel();

    const seq = requestRef;
    return () => {
      /* Supersede the in-flight request so its result is dropped. */
      seq.current++;
    };
  }, [open, submissionId, loadLabel]);

  // Revoke blob URL on close
  useEffect(() => {
    if (!open && blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
      setPdfUrl(null);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleDownload = useCallback(() => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `shipping-label-${submissionId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfUrl, submissionId]);

  const handleRetry = useCallback(() => {
    void loadLabel();
  }, [loadLabel]);

  if (!open) return null;

  return (
    <div
      className={`${styles.overlay} ${styles.overlayOpen}`}
      onClick={onClose}
      role="dialog"
      aria-label="Shipping label"
      aria-modal="true"
    >
      {/* Close button */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close shipping label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* PDF viewer card */}
      <div className={styles.viewerCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.viewerHeader}>
          <p className={styles.viewerTitle}>Shipping Label</p>
        </div>

        {/* Label vs QR — for customers without a printer: show the code at
            any UPS location and they print the label there. */}
        <div className={styles.modeRow} role="tablist" aria-label="Label format">
          <button type="button" role="tab" aria-selected={mode === "label"} className={`${styles.modeBtn} ${mode === "label" ? styles.modeBtnOn : ""}`} onClick={() => setMode("label")}>Print label</button>
          <button type="button" role="tab" aria-selected={mode === "qr"} className={`${styles.modeBtn} ${mode === "qr" ? styles.modeBtnOn : ""}`} onClick={() => setMode("qr")}>No printer? QR code</button>
        </div>

        {mode === "qr" ? (
          <div className={styles.qrWrap}>
            <FakeQr seed={submissionId} />
            <p className={styles.qrHint}>
              Show this code at any <strong>UPS location</strong> — they&apos;ll scan it and print
              the label for you. Nothing to print at home.
            </p>
          </div>
        ) : (
        <div className={styles.pdfWrap}>
          {loading && (
            <div className={styles.statusState}>
              <div className={styles.spinner} />
              <p className={styles.statusText}>Generating label…</p>
            </div>
          )}
          {error && !loading && (
            <div className={styles.statusState}>
              <p className={styles.statusText}>{error}</p>
              <button className={styles.retryBtn} onClick={handleRetry}>TRY AGAIN</button>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className={styles.pdfFrame}
              title="Shipping label PDF"
            />
          )}
        </div>
        )}

        {/* Action bar */}
        <div className={styles.actionBar}>
          <button className={styles.downloadBtn} onClick={handleDownload} disabled={!pdfUrl || loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            DOWNLOAD PDF
          </button>
        </div>
      </div>
    </div>
  );
}
