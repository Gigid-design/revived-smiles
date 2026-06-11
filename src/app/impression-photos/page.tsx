"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

const SLOTS = [
  { id: 1, label: "Upper Impression 1", sub: "Angle 1", tray: "imp-tray-upper-1.svg", flip: false },
  { id: 2, label: "Upper Impression 2", sub: "Angle 2", tray: "imp-tray-upper-2.svg", flip: false },
  { id: 3, label: "Lower Impression 1", sub: "Angle 1", tray: "imp-tray-lower.svg",   flip: false },
  { id: 4, label: "Lower Impression 2", sub: "Angle 2", tray: "imp-tray-upper.svg",   flip: true  },
];

export default function ImpressionPhotos() {
  const { navigate } = usePageTransition();
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadedCount = Object.keys(photos).length;

  function handleFileChange(id: number, file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos(prev => ({ ...prev, [id]: url }));
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
    if (prev) URL.revokeObjectURL(prev);
    setPhotos(p => { const next = { ...p }; delete next[id]; return next; });
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
                  <img src={photos[slot.id]} alt={slot.label} className={styles.uploadedPhoto} />
                  <button className={styles.removeBadge} onClick={(e) => handleRemove(slot.id, e)} aria-label={`Remove ${slot.label}`}>
                    <Image src="/assets/images/imp-icon-close-sm.svg" alt="" width={10} height={10} unoptimized />
                  </button>
                </>
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
              {!photos[slot.id] && (
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
                  <img src={photos[slot.id]} alt={slot.label} className={styles.uploadedPhoto} />
                  <button className={styles.removeBadge} onClick={(e) => handleRemove(slot.id, e)} aria-label={`Remove ${slot.label}`}>
                    <Image src="/assets/images/imp-icon-close-sm.svg" alt="" width={10} height={10} unoptimized />
                  </button>
                </>
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
              {!photos[slot.id] && (
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
          className={`${styles.btn} ${uploadedCount === 4 ? styles.btnActive : ""}`}
          disabled={uploadedCount < 4}
          onClick={() => uploadedCount === 4 && navigate('/impression-photos-2', 'forward')}
        >
          CONTINUE
        </button>
      </div>
    </main>
  );
}
