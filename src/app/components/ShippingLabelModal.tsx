"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import styles from "./ShippingLabelModal.module.css";

interface ShippingLabelModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  patientName: string;
}

export function ShippingLabelModal({ open, onClose, submissionId, patientName }: ShippingLabelModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Fetch PDF when modal opens
  useEffect(() => {
    if (!open || !submissionId) return;

    let cancelled = false;

    async function fetchPdf() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/shipping-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, patientName }),
        });
        if (!res.ok) throw new Error("Failed to generate label");
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        console.error("Shipping label fetch error:", err);
        if (!cancelled) setError("Unable to load shipping label. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPdf();

    return () => {
      cancelled = true;
    };
  }, [open, submissionId, patientName]);

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
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPdfUrl(null);
    setError(null);
    setLoading(true);

    fetch("/api/shipping-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, patientName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate label");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        console.error("Shipping label retry error:", err);
        setError("Unable to load shipping label. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [submissionId, patientName]);

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

        {/* PDF iframe / loading / error */}
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
