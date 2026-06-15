"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

export default function PhotoIntro() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Background */}
      <div className={styles.bg} aria-hidden="true">
        <Image src="/assets/images/photo-intro-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Photo guide step" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="31"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="31"  width="49"  height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23"  height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23"  height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav: back + close */}
      <button className={styles.backBtn} aria-label="Go back" onClick={() => navigate('/instructions-4', 'backward')}>
        <Image src="/assets/images/camera-icon-back.svg" alt="" width={20} height={20} unoptimized />
      </button>
      <Link href="/" className={styles.closeBtn} aria-label="Close">
        <Image src="/assets/images/camera-icon-close.svg" alt="" width={20} height={20} unoptimized />
      </Link>

      {/* Scrollable content card */}
      <div className={styles.contentCard} id="main-content">
        <h1 className={styles.heading}>What You&apos;ll Capture</h1>
        <p className={styles.subtitle}>
          We need 5 photos of your teeth from different angles so our lab can craft a perfect fit.
        </p>

        {/* Photo count summary */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>😁</span>
            <span className={styles.summaryLabel}>Close Bite</span>
            <span className={styles.summaryCount}>3 photos</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>😮</span>
            <span className={styles.summaryLabel}>Open Bite</span>
            <span className={styles.summaryCount}>2 photos</span>
          </div>
        </div>

        {/* Section: Close Bite */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEmoji}>📸</span>
            <div>
              <p className={styles.sectionTitle}>Close Bite</p>
              <p className={styles.sectionDesc}>Front, left &amp; right side with teeth closed</p>
            </div>
          </div>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.placeholderLabel}>Front</span>
              </div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.placeholderLabel}>Left Side</span>
              </div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.placeholderLabel}>Right Side</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Open Bite */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEmoji}>📸</span>
            <div>
              <p className={styles.sectionTitle}>Open Bite</p>
              <p className={styles.sectionDesc}>Front &amp; left side with mouth wide open</p>
            </div>
          </div>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.placeholderLabel}>Front</span>
              </div>
            </div>
            <div className={styles.exampleCard}>
              <div className={styles.examplePlaceholder}>
                <span className={styles.placeholderLabel}>Left Side</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className={styles.tipsCard}>
          <p className={styles.tipsTitle}>💡 Tips for best results</p>
          <ul className={styles.tipsList}>
            <li>Stand near a window or bright light</li>
            <li>Hold your phone steady with both hands</li>
            <li>Pull your lips back so all teeth are visible</li>
            <li>Have someone else take the photo if possible</li>
          </ul>
        </div>
      </div>

      {/* Take Photos button */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => navigate('/camera', 'forward')}
        >
          TAKE PHOTOS
        </button>
      </div>
    </main>
  );
}
