"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

export default function Camera() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.bg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.bgOverlay} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Photo step" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="31"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="31"  width="173" height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23"  height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23"  height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar}>
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/photo-intro', 'backward')}>
          <Image src="/assets/images/camera-icon-back.svg" alt="" width={20} height={20} unoptimized />
        </button>
        <span className={styles.navTitle}>Mouth Angles - Close Bite</span>
        <Link href="/" className={styles.navBtn} aria-label="Close">
          <Image src="/assets/images/camera-icon-close.svg" alt="" width={20} height={20} unoptimized />
        </Link>
      </nav>

      {/* Timeline */}
      <div className={styles.timeline} aria-label="Photo steps">
        <div className={styles.timelineStep}>
          <div className={`${styles.stepDot} ${styles.stepDotActive}`}>
            <span className={styles.stepNum}>1</span>
          </div>
          <span className={styles.stepLabel}>Front</span>
        </div>
        <div className={styles.timelineStep}>
          <div className={`${styles.stepDot} ${styles.stepDotDone}`}>
            <Image src="/assets/images/camera-icon-step-check.svg" alt="" width={12} height={12} unoptimized />
          </div>
          <span className={styles.stepLabel}>Left side</span>
        </div>
        <div className={styles.timelineStep}>
          <div className={`${styles.stepDot} ${styles.stepDotDone}`}>
            <Image src="/assets/images/camera-icon-step-check.svg" alt="" width={12} height={12} unoptimized />
          </div>
          <span className={styles.stepLabel}>Right side</span>
        </div>
      </div>

      {/* White card */}
      <div className={styles.card} id="main-content">

        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderText}>
            <h1 className={styles.cardTitle}>Close bite</h1>
            <p className={styles.cardSubtitle}>Align teeth to the oval guide, then hold steady to capture</p>
          </div>
        </div>

        {/* Tutorial button — 73×64, 20px from right, 14px above status bar (top=75px) */}
        <Image
          src="/assets/images/camera-tutorial-btn.svg"
          alt="Tutorial"
          width={73}
          height={64}
          className={styles.tutorialBtn}
          unoptimized
        />

        {/* Status bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusIconWrap}>
            <Image src="/assets/images/camera-icon-align.svg" alt="" width={18} height={18} unoptimized />
          </div>
          <div className={styles.statusText}>
            <strong className={styles.statusTitle}>Almost aligned</strong>
            <span className={styles.statusSub}>Move slightly right to center teeth</span>
          </div>
        </div>

        {/* Viewfinder */}
        <div className={styles.viewfinder} aria-label="Camera viewfinder">
          <span className={`${styles.corner} ${styles.cornerTL}`} />
          <span className={`${styles.corner} ${styles.cornerTR}`} />
          <span className={`${styles.corner} ${styles.cornerBL}`} />
          <span className={`${styles.corner} ${styles.cornerBR}`} />
          {/* Teeth guide centered */}
          <div className={styles.teethGuide}>
            <Image src="/assets/images/camera-teeth-guide.png" alt="Teeth alignment guide" width={280} height={140} style={{ width: '100%', height: 'auto' }} unoptimized />
          </div>
          <div className={styles.centeringHint}>
            <span className={styles.centeringDot} />
            <span className={styles.centeringText}>Centering…</span>
          </div>
        </div>

        {/* Camera controls */}
        <div className={styles.controls}>
          <button className={`${styles.controlBtn} ${styles.controlBtnTimer}`} aria-label="Timer">
            <Image src="/assets/images/camera-icon-timer.svg" alt="" width={21} height={21} unoptimized />
          </button>
          <button className={`${styles.controlBtn} ${styles.controlBtnFlash}`} aria-label="Flash">
            <Image src="/assets/images/camera-icon-flash.svg" alt="" width={21} height={21} unoptimized />
          </button>
          <button className={styles.shutter} aria-label="Capture photo">
            <div className={styles.shutterInner} />
          </button>
          <button className={`${styles.controlBtn} ${styles.controlBtnGrid}`} aria-label="Grid">
            <Image src="/assets/images/camera-icon-grid.svg" alt="" width={21} height={21} unoptimized />
          </button>
        </div>

      </div>
    </main>
  );
}
