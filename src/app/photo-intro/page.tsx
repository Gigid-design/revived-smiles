"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { FlowSupport } from "../components/FlowSupport";
import { usePageTransition } from "../hooks/usePageTransition";
import { IntakeHeader } from "../components/IntakeHeader";

export default function PhotoIntro() {
  const { navigate, back } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Teeth Photos"
        pct={0}
        counter="4 photos"
        onBack={() => back('/dashboard')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* Scrollable content card */}
      <div className={styles.contentCard} id="main-content">
        <h1 className={styles.heading}>What You&apos;ll Capture</h1>
        <p className={styles.subtitle}>
          We need 4 photos of your teeth from different angles so our lab can craft a perfect fit.
        </p>

        {/* Photo count summary */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>
              <Image src="/assets/images/close-bite-icon.svg" alt="" width={48} height={48} unoptimized />
            </span>
            <span className={styles.summaryLabel}>Teeth Together</span>
            <span className={styles.summaryCount}>2 photos</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>
              <Image src="/assets/images/open-bite-icon.svg" alt="" width={48} height={48} unoptimized />
            </span>
            <span className={styles.summaryLabel}>Mouth Open</span>
            <span className={styles.summaryCount}>2 photos</span>
          </div>
        </div>

        {/* Section: Close Bite */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderText}>
              <p className={styles.sectionTitle}>Teeth Together</p>
              <p className={styles.sectionDesc}>Front &amp; side view with teeth showing</p>
            </div>
            <span className={styles.sectionCount}>2 photos</span>
          </div>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <Image src="/assets/images/close-bite-front.png" alt="Front teeth together" fill style={{ objectFit: "cover", borderRadius: "inherit" }} unoptimized />
              <span className={styles.placeholderLabel}>Front</span>
            </div>
            <div className={styles.exampleCard}>
              <Image src="/assets/images/photo-intro-left-side.png" alt="Side teeth together" fill style={{ objectFit: "cover", borderRadius: "inherit" }} unoptimized />
              <span className={styles.placeholderLabel}>Side</span>
            </div>
          </div>
        </div>

        {/* Section: Open Bite */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderText}>
              <p className={styles.sectionTitle}>Mouth Open</p>
              <p className={styles.sectionDesc}>Front &amp; side view with mouth open</p>
            </div>
            <span className={styles.sectionCount}>2 photos</span>
          </div>
          <div className={styles.exampleRow}>
            <div className={styles.exampleCard}>
              <Image src="/assets/images/open-bite-front.png" alt="Front mouth open" fill style={{ objectFit: "cover", borderRadius: "inherit" }} unoptimized />
              <span className={styles.placeholderLabel}>Front</span>
            </div>
            <div className={styles.exampleCard}>
              <Image src="/assets/images/open-bite-left.png" alt="Side mouth open" fill style={{ objectFit: "cover", borderRadius: "inherit" }} unoptimized />
              <span className={styles.placeholderLabel}>Side</span>
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
        <FlowSupport />
      </div>
    </main>
  );
}
