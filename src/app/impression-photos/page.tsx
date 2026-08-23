"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { api, ApiError } from "@/lib/api";
import type { ImpressionPhoto } from "@/lib/api";

/* Each slot names the exact angle the lab grades from — "Angle 1 / Angle 2"
   told the patient nothing (Aug 21 client review). `how` is the one-line
   instruction shown on the card; the lab's real example photos drop into the
   example strip once the client supplies them. */
const SLOTS = [
  { id: 1, label: "Upper impression", sub: "Straight down", how: "Hold the phone directly above the tray so you see the whole horseshoe.", tray: "imp-tray-upper-1.svg", flip: false },
  { id: 2, label: "Upper impression", sub: "Front edge, tilted", how: "Tilt the tray toward you so the front teeth and their depth are visible.", tray: "imp-tray-upper-2.svg", flip: false },
  { id: 3, label: "Lower impression", sub: "Straight down", how: "Directly above the tray — the full arch, no fingers over the edges.", tray: "imp-tray-lower.svg",   flip: false },
  { id: 4, label: "Lower impression", sub: "Front edge, tilted", how: "Tilt toward you so the front teeth and the tray rim both show.", tray: "imp-tray-upper.svg",   flip: true  },
];

interface PhotoEntry {
  preview: string;
  url: string;
  path: string;
}

export default function ImpressionPhotos() {
  const { navigate, back } = usePageTransition();
  const { data, update, ensureSubmissionId } = useSubmission();
  const [photos, setPhotos] = useState<Record<number, PhotoEntry>>({});
  const [uploading, setUploading] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /* Bite registration is acknowledged, not photographed — a bite is hard to
     verify from a photo, so Gitai only needs the customer to confirm they did it. */
  const [biteAck, setBiteAck] = useState(false);
  /* A targeted resubmission (?area=lower) — the lab only needs one impression
     again; the others are already on file and restored into their slots. */
  const [resubmitArea, setResubmitArea] = useState<"upper" | "lower" | "bite" | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("area");
    if (a === "upper" || a === "lower" || a === "bite") {
      setResubmitArea(a); // eslint-disable-line react-hooks/set-state-in-effect -- read target area from the URL on mount
    }
  }, []);

  /* Restore previously-uploaded impression photos (e.g. the user uploaded here,
     was routed off to finish intake/teeth photos, and looped back). */
  useEffect(() => {
    if (data.impressionPhotos?.length) {
      const restored: Record<number, PhotoEntry> = {};
      data.impressionPhotos.forEach((p) => {
        restored[p.slot] = { preview: p.url, url: p.url, path: p.path };
      });
      setPhotos(restored); // eslint-disable-line react-hooks/set-state-in-effect -- one-time restore of persisted uploads on mount
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadedCount = Object.keys(photos).length;
  const totalPhotos = SLOTS.length;
  const pct = Math.round((uploadedCount / totalPhotos) * 100);

  async function handleFileChange(id: number, file: File | undefined) {
    if (!file) return;
    setUploading(id);
    try {
      const preview = URL.createObjectURL(file);
      const { url, path } = await api.photos.upload(file, "impression");

      setPhotos(prev => ({ ...prev, [id]: { preview, url, path } }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function handleCardClick(id: number) {
    /* Demo builds fill the slot on tap rather than opening a file picker —
       nobody wants Finder in front of an audience. */
    if (api.photos.usesStandInPhotos) {
      setUploading(id);
      try {
        const { url, path } = await api.photos.standInPhoto("impression");
        setPhotos(prev => ({ ...prev, [id]: { preview: url, url, path } }));
      } finally {
        setUploading(null);
      }
      return;
    }

    const input = inputRefs.current[id];
    if (input) {
      input.value = "";  // reset so re-selecting the same file fires onChange
      input.click();
    }
  }

  function handleRemove(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    const prev = photos[id];
    if (prev?.preview) URL.revokeObjectURL(prev.preview);
    setPhotos(p => { const next = { ...p }; delete next[id]; return next; });
  }

  async function handleSubmit() {
    if (uploadedCount < 4 || !biteAck || submitting) return;

    setSubmitting(true);

    const impressionPhotos: ImpressionPhoto[] = SLOTS.flatMap(s => {
      const entry = photos[s.id];
      return entry ? [{ slot: s.id as ImpressionPhoto["slot"], url: entry.url, path: entry.path }] : [];
    });

    try {
      const id = await ensureSubmissionId();

      // Saving the photos is also what submits the order: the backend moves it
      // out of `draft` itself, but only once every other section is complete.
      await api.submissions.finalize(id, impressionPhotos);

      update({ impressionPhotos });

      /* Finish on the confirmation screen, whose OKAY! returns to the
         dashboard — the same shape as the teeth-photo flow. The dashboard is
         the hub and already shows what's done and what's left, so a finished
         task hands control back rather than marching the patient into the
         next one. */
      navigate("/complete", "forward");
    } catch (err) {
      console.error("Submission failed:", err);
      alert(err instanceof ApiError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Progress header — label + %, gradient bar, back + step counter */}
      <header className={styles.progressHeader}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>Impression Photos</span>
          <div className={styles.progressTopRight}>
            <span className={styles.progressPct}>{pct}%</span>
            <button className={styles.closeBtn} aria-label="Close" onClick={() => navigate('/dashboard', 'backward')}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.progressTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Impression photos progress">
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.progressBottom}>
          <button className={styles.backBtn} aria-label="Go back" onClick={() => back('/dashboard')}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <span className={styles.stepCount}>{uploadedCount} of {totalPhotos} photos</span>
        </div>
      </header>

      {/* White card */}
      <div className={styles.card} id="main-content">
        <h1 className={styles.cardTitle}>Impression Photos</h1>
        <p className={styles.cardSubtitle}>Take 4 photos of your at-home impression kit so we can verify your molds are accurate.</p>

        {/* Example photos section */}
        <div className={styles.exampleSection}>
          <p className={styles.exampleLabel}>
            <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{display:"inline",verticalAlign:"middle",marginRight:"6px"}}>
              <path d="M17.4419 3.72096H16.7349C16.5183 3.72357 16.3054 3.66464 16.1209 3.55101C15.9365 3.43739 15.7881 3.27374 15.693 3.0791L14.8558 1.41398C14.645 0.987672 14.3188 0.629114 13.9142 0.379135C13.5096 0.129156 13.043 -0.00219892 12.5674 2.78485e-05H7.43256C6.95699 -0.00219892 6.49036 0.129156 6.08579 0.379135C5.68121 0.629114 5.35497 0.987672 5.14419 1.41398L4.30698 3.0791C4.21189 3.27374 4.0635 3.43739 3.87906 3.55101C3.69463 3.66464 3.48173 3.72357 3.26512 3.72096H2.55814C1.87968 3.72096 1.22901 3.99048 0.749262 4.47022C0.269518 4.94996 0 5.60064 0 6.2791V15.5814C0 16.2599 0.269518 16.9106 0.749262 17.3903C1.22901 17.87 1.87968 18.1396 2.55814 18.1396H17.4419C18.1203 18.1396 18.771 17.87 19.2507 17.3903C19.7305 16.9106 20 16.2599 20 15.5814V6.2791C20 5.60064 19.7305 4.94996 19.2507 4.47022C18.771 3.99048 18.1203 3.72096 17.4419 3.72096ZM10 14.8837C9.03409 14.8837 8.08987 14.5973 7.28675 14.0607C6.48363 13.5241 5.85767 12.7613 5.48803 11.8689C5.11839 10.9766 5.02168 9.99461 5.21012 9.04726C5.39856 8.09991 5.86369 7.22972 6.54669 6.54672C7.22969 5.86371 8.09988 5.39859 9.04723 5.21015C9.99458 5.02171 10.9765 5.11842 11.8689 5.48806C12.7613 5.8577 13.524 6.48365 14.0607 7.28678C14.5973 8.0899 14.8837 9.03412 14.8837 10C14.8813 11.2945 14.3659 12.5353 13.4506 13.4506C12.5353 14.366 11.2945 14.8813 10 14.8837Z" fill="#0E1B4D"/>
              <path d="M10.0001 13.4885C11.9267 13.4885 13.4885 11.9267 13.4885 10.0001C13.4885 8.07352 11.9267 6.51172 10.0001 6.51172C8.07352 6.51172 6.51172 8.07352 6.51172 10.0001C6.51172 11.9267 8.07352 13.4885 10.0001 13.4885Z" fill="#0E1B4D"/>
            </svg>
            Example photos
          </p>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder} style={{ position: "relative", padding: 0, overflow: "hidden" }}>
                <Image src="/assets/images/impression-example-good.svg" alt="Good example" fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <span className={styles.exampleBadgeGood}>Good</span>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholderBad} style={{ position: "relative", padding: 0, overflow: "hidden" }}>
                <Image src="/assets/images/impression-example-bad.svg" alt="Bad example" fill style={{ objectFit: "cover" }} unoptimized />
              </div>
              <span className={styles.exampleBadgeBad}>Bad</span>
            </div>
          </div>
          <p className={styles.exampleHint}>
            <strong>Good:</strong> white surface, daylight, whole arch in frame, tray edges visible.{" "}
            <strong>Bad:</strong> dark or shadowed, cropped arch, fingers over the impression, blurry.
          </p>
        </div>

        {/* Targeted resubmission — only the flagged impression is needed. */}
        {resubmitArea && (
          <div className={styles.resubmitBanner}>
            <strong>Just your {resubmitArea} impression this time.</strong>{" "}
            Your other impressions are already on file — retake your{" "}
            {resubmitArea === "bite" ? "bite registration" : `${resubmitArea} photos`} below and resubmit.
          </div>
        )}

        {/* Tip box */}
        <div className={styles.tipBox}>
          <p className={styles.tipText}>
            <strong>Good lighting matters.</strong>{" "}
            <span>Place your mold on a white surface and ensure the arch shape is clearly visible before snapping.</span>
          </p>
        </div>

        {/* Upper Arch */}
        <p className={styles.sectionLabel}>Upper Arch</p>
        <div className={styles.photoGrid}>
          {SLOTS.slice(0, 2).map(slot => (
            <button
              key={slot.id}
              className={`${styles.photoCard} ${photos[slot.id] ? styles.photoCardFilled : ""}`}
              onClick={() => { void handleCardClick(slot.id); }}
              aria-label={`Upload ${slot.label}`}
            >
              {photos[slot.id] ? (
                <>
                  <img src={photos[slot.id].preview} alt={slot.label} className={styles.uploadedPhoto} />
                  <button className={styles.removeBadge} onClick={(e) => handleRemove(slot.id, e)} aria-label={`Remove ${slot.label}`}>
                    <Image src="/assets/images/imp-icon-close-sm.svg" alt="" width={10} height={10} unoptimized />
                  </button>
                </>
              ) : uploading === slot.id ? (
                <div className={styles.photoCardInner}>
                  <span style={{ fontSize: 11, color: "#8a8a8a" }}>Uploading…</span>
                </div>
              ) : (
                <div className={styles.photoCardInner}>
                  <Image src={`/assets/images/${slot.tray}`} alt="" width={44} height={50} className={styles.trayImg}
                    style={slot.flip ? { transform: "scaleX(-1)" } : undefined} unoptimized />
                </div>
              )}
              <div className={`${styles.plusBadge} ${photos[slot.id] ? styles.plusBadgeSuccess : ""}`} aria-hidden="true">
                <Image
                  src={photos[slot.id] ? "/assets/images/imp-icon-check.svg" : "/assets/images/imp-icon-plus-new.svg"}
                  alt="" width={10} height={10} unoptimized
                />
              </div>
              {!photos[slot.id] && uploading !== slot.id && (
                <>
                  <p className={styles.photoLabel}>{slot.label}</p>
                  <p className={styles.photoSub}>{slot.sub}</p>
                  <p className={styles.photoHow}>{slot.how}</p>
                </>
              )}
              <input
                ref={el => { inputRefs.current[slot.id] = el; }}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={e => handleFileChange(slot.id, e.target.files?.[0])}
              />
            </button>
          ))}
        </div>

        {/* Lower Arch */}
        <p className={styles.sectionLabel}>Lower Arch</p>
        <div className={styles.photoGrid}>
          {SLOTS.slice(2, 4).map(slot => (
            <button
              key={slot.id}
              className={`${styles.photoCard} ${photos[slot.id] ? styles.photoCardFilled : ""}`}
              onClick={() => { void handleCardClick(slot.id); }}
              aria-label={`Upload ${slot.label}`}
            >
              {photos[slot.id] ? (
                <>
                  <img src={photos[slot.id].preview} alt={slot.label} className={styles.uploadedPhoto} />
                  <button className={styles.removeBadge} onClick={(e) => handleRemove(slot.id, e)} aria-label={`Remove ${slot.label}`}>
                    <Image src="/assets/images/imp-icon-close-sm.svg" alt="" width={10} height={10} unoptimized />
                  </button>
                </>
              ) : uploading === slot.id ? (
                <div className={styles.photoCardInner}>
                  <span style={{ fontSize: 11, color: "#8a8a8a" }}>Uploading…</span>
                </div>
              ) : (
                <div className={styles.photoCardInner}>
                  <Image src={`/assets/images/${slot.tray}`} alt="" width={44} height={50} className={styles.trayImg}
                    style={slot.flip ? { transform: "scaleX(-1)" } : undefined} unoptimized />
                </div>
              )}
              <div className={`${styles.plusBadge} ${photos[slot.id] ? styles.plusBadgeSuccess : ""}`} aria-hidden="true">
                <Image
                  src={photos[slot.id] ? "/assets/images/imp-icon-check.svg" : "/assets/images/imp-icon-plus-new.svg"}
                  alt="" width={10} height={10} unoptimized
                />
              </div>
              {!photos[slot.id] && uploading !== slot.id && (
                <>
                  <p className={styles.photoLabel}>{slot.label}</p>
                  <p className={styles.photoSub}>{slot.sub}</p>
                  <p className={styles.photoHow}>{slot.how}</p>
                </>
              )}
              <input
                ref={el => { inputRefs.current[slot.id] = el; }}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={e => handleFileChange(slot.id, e.target.files?.[0])}
              />
            </button>
          ))}
        </div>

        {/* Bite Registration — acknowledgment only (no photo). Gitai needs the
            customer to confirm they completed the bite with the purple putty;
            a bite is hard to verify from a photo, so this is a checkbox, not an upload. */}
        <p className={styles.sectionLabel}>Bite Registration</p>
        <label className={`${styles.biteAck} ${biteAck ? styles.biteAckChecked : ""}`}>
          <input
            type="checkbox"
            className={styles.biteCheckbox}
            checked={biteAck}
            onChange={e => setBiteAck(e.target.checked)}
          />
          <span className={styles.biteCheckboxBox} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 6.2L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.biteAckText}>
            I completed my <strong>bite registration</strong> using the{" "}
            <span className={styles.putty}>purple putty</span> included in my kit.
          </span>
        </label>

      </div>

      {/* Continue button */}
      <div className={styles.btnWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${uploadedCount === 4 && biteAck && !submitting ? styles.btnActive : ""}`}
          disabled={uploadedCount < 4 || !biteAck || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "SUBMITTING…" : "CONTINUE"}
        </button>
        <FlowSupport />
      </div>
    </main>
  );
}
