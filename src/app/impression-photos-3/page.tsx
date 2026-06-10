"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

const UPPER = [
  { id: 1, label: "Upper Impression 1", sub: "Angle 1", tray: "imp-tray-upper-1.svg", flip: false },
  { id: 2, label: "Upper Impression 2", sub: "Angle 2", tray: "imp-tray-upper-2.svg", flip: false },
];
const LOWER = [
  { id: 3, label: "Lower Impression 1", sub: "Angle 1", tray: "imp-tray-lower.svg", flip: false },
  { id: 4, label: "Lower Impression 2", sub: "Angle 2", tray: "imp-tray-upper.svg", flip: true  },
];

export default function ImpressionPhotos3() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar — 4 navy segs: x=0,31,62 + main track at x=93 w=302, active w=80 */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Impression photos step 2" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="93"  width="195" height="5" rx="2.5" fill="#0E184D"/>
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
          <p className={styles.progressText}><strong>4</strong> of 4 photos added</p>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.dotActive}`} />
            <span className={`${styles.dot} ${styles.dotActive}`} />
            <span className={`${styles.dot} ${styles.dotActive}`} />
            <span className={`${styles.dot} ${styles.dotActive}`} />
          </div>
        </div>

        {/* Upper Arch */}
        <p className={styles.sectionLabel}>Upper Arch</p>
        <div className={styles.photoGrid}>
          {/* Upper Impression 1 — done state v2 */}
          <Image
            src="/assets/images/imp-upper-1-done-2.svg"
            alt="Upper Impression 1 — done"
            width={175}
            height={157}
            className={styles.photoCardDone}
            unoptimized
          />
          {/* Upper Impression 2 — done state */}
          <Image
            src="/assets/images/imp-upper-2-done.svg"
            alt="Upper Impression 2 — done"
            width={175}
            height={157}
            className={styles.photoCardDone}
            unoptimized
          />
        </div>

        {/* Lower Arch */}
        <p className={styles.sectionLabel}>Lower Arch</p>
        <div className={styles.photoGrid}>
          <Image src="/assets/images/imp-lower-1-done.svg" alt="Lower Impression 1 — done" width={175} height={157} className={styles.photoCardDone} unoptimized />
          <Image src="/assets/images/imp-lower-2-done.svg" alt="Lower Impression 2 — done" width={175} height={157} className={styles.photoCardDone} unoptimized />
        </div>

      </div>

      {/* Continue button — fixed bottom, same as all other pages */}
      <div className={styles.btnWrapper}>
        <button type="button" className={styles.btn} onClick={() => navigate('/complete', 'forward')}>CONTINUE</button>
      </div>
    </main>
  );
}
