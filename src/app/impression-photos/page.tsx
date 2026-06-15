"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { supabase } from "../../lib/supabase";

const SLOTS = [
  { id: 1, label: "Upper Impression 1", sub: "Angle 1", tray: "imp-tray-upper-1.svg", flip: false },
  { id: 2, label: "Upper Impression 2", sub: "Angle 2", tray: "imp-tray-upper-2.svg", flip: false },
  { id: 3, label: "Lower Impression 1", sub: "Angle 1", tray: "imp-tray-lower.svg",   flip: false },
  { id: 4, label: "Lower Impression 2", sub: "Angle 2", tray: "imp-tray-upper.svg",   flip: true  },
];

interface PhotoEntry {
  preview: string;
  url: string;
  path: string;
}

export default function ImpressionPhotos() {
  const { navigate } = usePageTransition();
  const { data, update } = useSubmission();
  const [photos, setPhotos] = useState<Record<number, PhotoEntry>>({});
  const [uploading, setUploading] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadedCount = Object.keys(photos).length;

  async function handleFileChange(id: number, file: File | undefined) {
    if (!file) return;
    setUploading(id);
    try {
      const preview = URL.createObjectURL(file);
      const ext = file.name.split(".").pop();
      const path = `impressions/${Date.now()}-slot${id}.${ext}`;
      const { error } = await supabase.storage
        .from("impression-photos")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("impression-photos")
        .getPublicUrl(path);

      setPhotos(prev => ({ ...prev, [id]: { preview, url: urlData.publicUrl, path } }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  function handleCardClick(id: number) {
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
    if (uploadedCount < 4 || submitting) return;
    setSubmitting(true);

    const photoUrls = SLOTS.map(s => photos[s.id]?.url).filter(Boolean);

    // Get current auth user ID
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          state: data.state,
          products: data.products,
          whiteShade: data.whiteShade,
          gumShade: data.gumShade,
          selectedTeeth: data.selectedTeeth,
          teethNotSure: data.teethNotSure,
          impressionPhotos: photoUrls,
          userId: user?.id ?? null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Submission failed");
      }

      update({
        submissionId: result.id,
        impressionPhotos: SLOTS.map(s => photos[s.id]).filter(Boolean).map((p, i) => ({ slot: i + 1, url: p.url, path: p.path })),
      });
      navigate("/complete", "forward");
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar — active segment fills as photos are uploaded */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Impression photos" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="93"  width={80 + (222 * uploadedCount / 4)} height="5" rx="2.5" fill="#0E184D"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar}>
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/instructions-4', 'backward')}>
          <Image src="/assets/images/imp-icon-back.svg" alt="" width={20} height={20} unoptimized />
        </button>
        <span className={styles.navTitle}>Impression Photos</span>
        <Link href="/" className={styles.navBtn} aria-label="Close">
          <Image src="/assets/images/imp-icon-close.svg" alt="" width={20} height={20} unoptimized />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content">
        <h1 className={styles.cardTitle}>Impression Photos</h1>
        <p className={styles.cardSubtitle}>Take 4 photos of your at-home impression kit so we can verify your molds are accurate.</p>

        {/* Example photos section */}
        <div className={styles.exampleSection}>
          <p className={styles.exampleLabel}>📷 Example photos</p>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.examplePlaceholderIcon}>✓</span>
              </div>
              <span className={styles.exampleBadgeGood}>Good</span>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholderBad}>
                <span className={styles.examplePlaceholderIcon}>✕</span>
              </div>
              <span className={styles.exampleBadgeBad}>Bad</span>
            </div>
          </div>
          <p className={styles.exampleHint}>
            Place mold on a white surface with good lighting. Ensure the arch shape is clearly visible.
          </p>
        </div>

        {/* Tip box */}
        <div className={styles.tipBox}>
          <p className={styles.tipText}>
            <strong>Good lighting matters.</strong>{" "}
            <span>Place your mold on a white surface and ensure the arch shape is clearly visible before snapping.</span>
          </p>
        </div>

        {/* Upload progress */}
        <div className={styles.progressRow}>
          <p className={styles.progressText}><strong>{uploadedCount}</strong> of 4 photos added</p>
          <div className={styles.dots}>
            {SLOTS.map(s => (
              <span key={s.id} className={`${styles.dot} ${photos[s.id] ? styles.dotActive : ""}`} />
            ))}
          </div>
        </div>

        {/* Upper Arch */}
        <p className={styles.sectionLabel}>Upper Arch</p>
        <div className={styles.photoGrid}>
          {SLOTS.slice(0, 2).map(slot => (
            <button
              key={slot.id}
              className={`${styles.photoCard} ${photos[slot.id] ? styles.photoCardFilled : ""}`}
              onClick={() => handleCardClick(slot.id)}
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
              onClick={() => handleCardClick(slot.id)}
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

      </div>

      {/* Continue button */}
      <div className={styles.btnWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${uploadedCount === 4 && !submitting ? styles.btnActive : ""}`}
          disabled={uploadedCount < 4 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "SUBMITTING…" : "CONTINUE"}
        </button>
      </div>
    </main>
  );
}
