"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./ShippingLabelModal.module.css";

const RETURN_ADDRESS = {
  name: "Revived Smiles",
  line1: "Returns Department",
  line2: "PO Box 1234",
  city: "Los Angeles, CA 90001",
};

const BAR_WIDTHS = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2];

const INSTRUCTIONS = [
  "1. Print this label and cut along the edges",
  "2. Attach securely to your impression kit box",
  "3. Drop off at your nearest USPS location",
  "4. Allow 5-7 business days for delivery",
];

interface ShippingLabelModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  patientName: string;
}

export function ShippingLabelModal({ open, onClose, submissionId, patientName }: ShippingLabelModalProps) {
  const [downloading, setDownloading] = useState(false);

  const trackingRef = `RS-${submissionId.slice(0, 8).toUpperCase()}`;
  const refCode = submissionId.slice(0, 8).toUpperCase();

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

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/shipping-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, patientName }),
      });
      if (!res.ok) throw new Error("Failed to generate label");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipping-label-${submissionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Shipping label download error:", err);
      alert("Unable to download shipping label. Please try again.");
    } finally {
      setDownloading(false);
    }
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

      {/* Label card — stop click propagation so clicking the card doesn't close */}
      <div className={styles.labelCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.brandName}>REVIVED SMILES</p>
          <p className={styles.subtitle}>Impression Kit Return Label</p>
        </div>

        <div className={styles.divider} />

        {/* FROM section */}
        <p className={styles.sectionTitle}>From:</p>
        <p className={styles.personName}>{patientName || "Patient"}</p>
        <p className={styles.refCode}>Ref: {refCode}</p>

        <div className={styles.divider} />

        {/* TO section */}
        <p className={styles.sectionTitle}>To:</p>
        <p className={styles.personName}>{RETURN_ADDRESS.name}</p>
        <p className={styles.addressLine}>{RETURN_ADDRESS.line1}</p>
        <p className={styles.addressLine}>{RETURN_ADDRESS.line2}</p>
        <p className={styles.addressLine}>{RETURN_ADDRESS.city}</p>

        <div className={styles.divider} />

        {/* Tracking reference */}
        <p className={styles.trackingLabel}>Tracking Reference</p>
        <p className={styles.trackingCode}>{trackingRef}</p>

        {/* Decorative barcode */}
        <div className={styles.barcode} aria-hidden="true">
          {BAR_WIDTHS.map((w, i) => (
            <span key={i} className={styles.bar} style={{ width: w, height: `${60 + (i % 3) * 12}%` }} />
          ))}
        </div>

        <div className={styles.divider} />

        {/* Instructions */}
        <p className={styles.instructionsTitle}>Instructions</p>
        <ul className={styles.instructionsList}>
          {INSTRUCTIONS.map((text) => (
            <li key={text} className={styles.instructionItem}>{text}</li>
          ))}
        </ul>

        {/* Download button */}
        <div className={styles.actionBar}>
          <button className={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "DOWNLOADING…" : "DOWNLOAD PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
