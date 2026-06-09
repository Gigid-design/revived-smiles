"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

const SLOTS = [
  { id: 1, label: "Upper Impression 1", sub: "Angle 1", done: true,  tray: "imp-dental-tray-2.svg", section: "upper" },
  { id: 2, label: "Upper Impression 2", sub: "Angle 2", done: false, tray: "imp-dental-tray-1.svg", section: "upper" },
  { id: 3, label: "Lower Impression 1", sub: "Angle 1", done: false, tray: "imp-dental-tray-3.svg", section: "lower" },
  { id: 4, label: "Lower Impression 2", sub: "Angle 2", done: false, tray: "imp-dental-tray-1.svg", section: "lower" },
];

const photosAdded = SLOTS.filter(s => s.done).length; // 1

export default function Step6() {
  const { cardRef, navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Backgrounds */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar — FULL (all 333px active) */}
      <div className={styles.progressBar} aria-label="Complete" role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={3}>
        <div className={styles.segTrackFull} />
        <div className={styles.segSmall} />
        <div className={styles.segSmall} />
      </div>

      {/* Nav */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/step5', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Impression Photos</h1>
        <p className={styles.cardSubtitle}>
          Take 4 photos of your at-home impression kit so we can verify your molds are accurate.
        </p>

        {/* Tip box */}
        <div className={styles.tipBox}>
          <div className={styles.tipIcon}>
            <Image src="/assets/images/imp-icon-info.svg" alt="" width={18} height={18} unoptimized />
          </div>
          <p className={styles.tipText}>
            <strong>Good lighting matters.</strong>{" "}
            <span>Place your mold on a white surface and ensure the arch shape is clearly visible before snapping.</span>
          </p>
        </div>

        {/* Upload progress */}
        <div className={styles.progressRow}>
          <p className={styles.progressText}>
            <strong>{photosAdded}</strong> of 4 photos added
          </p>
          <div className={styles.progressDots}>
            {[1,2,3,4].map(i => (
              <span key={i} className={`${styles.dot} ${i <= photosAdded ? styles.dotActive : ""}`} />
            ))}
          </div>
        </div>

        {/* UPPER ARCH */}
        <p className={styles.sectionLabel}>Upper Arch</p>
        <div className={styles.photoGrid}>
          {SLOTS.filter(s => s.section === "upper").map(slot => (
            <div key={slot.id} className={`${styles.photoCard} ${slot.done ? styles.photoCardDone : ""}`}>
              <div className={styles.photoCardInner}>
                <Image src={`/assets/images/${slot.tray}`} alt="" width={80} height={60} className={styles.trayImg} unoptimized
                  style={slot.id === 2 ? { transform: "scaleX(-1)" } : undefined} />
              </div>
              {/* Badge */}
              <div className={`${styles.badge} ${slot.done ? styles.badgeDone : styles.badgeEmpty}`}>
                <Image src={`/assets/images/${slot.done ? "imp-icon-check.svg" : "imp-icon-plus.svg"}`} alt="" width={10} height={10} unoptimized />
              </div>
              <p className={styles.photoLabel}>{slot.label}</p>
              {!slot.done && <p className={styles.photoSub}>{slot.sub}</p>}
            </div>
          ))}
        </div>

        {/* LOWER ARCH */}
        <p className={styles.sectionLabel}>Lower Arch</p>
        <div className={styles.photoGrid}>
          {SLOTS.filter(s => s.section === "lower").map(slot => (
            <div key={slot.id} className={`${styles.photoCard} ${slot.done ? styles.photoCardDone : ""}`}>
              <div className={styles.photoCardInner}>
                <Image src={`/assets/images/${slot.tray}`} alt="" width={80} height={60} className={styles.trayImg} unoptimized
                  style={slot.id === 2 ? { transform: "scaleX(-1)" } : undefined} />
              </div>
              <div className={`${styles.badge} ${slot.done ? styles.badgeDone : styles.badgeEmpty}`}>
                <Image src={`/assets/images/${slot.done ? "imp-icon-check.svg" : "imp-icon-plus.svg"}`} alt="" width={10} height={10} unoptimized />
              </div>
              <p className={styles.photoLabel}>{slot.label}</p>
              {!slot.done && <p className={styles.photoSub}>{slot.sub}</p>}
            </div>
          ))}
        </div>

      </div>

      {/* CONTINUE */}
      <div className={styles.buttonWrapper}>
        <button type="button" className={styles.btn}>CONTINUE</button>
      </div>
    </main>
  );
}
