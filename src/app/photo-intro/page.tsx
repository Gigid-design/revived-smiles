"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { IntakeHeader } from "../components/IntakeHeader";

export default function PhotoIntro() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        pct={0}
        counter="4 photos"
        onBack={() => navigate('/step5', 'backward')}
        onClose={() => navigate('/', 'backward')}
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
            <span className={styles.sectionEmoji}>
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.4419 3.72096H16.7349C16.5183 3.72357 16.3054 3.66464 16.1209 3.55101C15.9365 3.43739 15.7881 3.27374 15.693 3.0791L14.8558 1.41398C14.645 0.987672 14.3188 0.629114 13.9142 0.379135C13.5096 0.129156 13.043 -0.00219892 12.5674 2.78485e-05H7.43256C6.95699 -0.00219892 6.49036 0.129156 6.08579 0.379135C5.68121 0.629114 5.35497 0.987672 5.14419 1.41398L4.30698 3.0791C4.21189 3.27374 4.0635 3.43739 3.87906 3.55101C3.69463 3.66464 3.48173 3.72357 3.26512 3.72096H2.55814C1.87968 3.72096 1.22901 3.99048 0.749262 4.47022C0.269518 4.94996 0 5.60064 0 6.2791V15.5814C0 16.2599 0.269518 16.9106 0.749262 17.3903C1.22901 17.87 1.87968 18.1396 2.55814 18.1396H17.4419C18.1203 18.1396 18.771 17.87 19.2507 17.3903C19.7305 16.9106 20 16.2599 20 15.5814V6.2791C20 5.60064 19.7305 4.94996 19.2507 4.47022C18.771 3.99048 18.1203 3.72096 17.4419 3.72096ZM10 14.8837C9.03409 14.8837 8.08987 14.5973 7.28675 14.0607C6.48363 13.5241 5.85767 12.7613 5.48803 11.8689C5.11839 10.9766 5.02168 9.99461 5.21012 9.04726C5.39856 8.09991 5.86369 7.22972 6.54669 6.54672C7.22969 5.86371 8.09988 5.39859 9.04723 5.21015C9.99458 5.02171 10.9765 5.11842 11.8689 5.48806C12.7613 5.8577 13.524 6.48365 14.0607 7.28678C14.5973 8.0899 14.8837 9.03412 14.8837 10C14.8813 11.2945 14.3659 12.5353 13.4506 13.4506C12.5353 14.366 11.2945 14.8813 10 14.8837Z" fill="#121723"/>
                <path d="M10.0001 13.4885C11.9267 13.4885 13.4885 11.9267 13.4885 10.0001C13.4885 8.07352 11.9267 6.51172 10.0001 6.51172C8.07352 6.51172 6.51172 8.07352 6.51172 10.0001C6.51172 11.9267 8.07352 13.4885 10.0001 13.4885Z" fill="#121723"/>
              </svg>
            </span>
            <div>
              <p className={styles.sectionTitle}>Teeth Together</p>
              <p className={styles.sectionDesc}>Front &amp; side view with teeth showing</p>
            </div>
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
            <span className={styles.sectionEmoji}>
              <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.4419 3.72096H16.7349C16.5183 3.72357 16.3054 3.66464 16.1209 3.55101C15.9365 3.43739 15.7881 3.27374 15.693 3.0791L14.8558 1.41398C14.645 0.987672 14.3188 0.629114 13.9142 0.379135C13.5096 0.129156 13.043 -0.00219892 12.5674 2.78485e-05H7.43256C6.95699 -0.00219892 6.49036 0.129156 6.08579 0.379135C5.68121 0.629114 5.35497 0.987672 5.14419 1.41398L4.30698 3.0791C4.21189 3.27374 4.0635 3.43739 3.87906 3.55101C3.69463 3.66464 3.48173 3.72357 3.26512 3.72096H2.55814C1.87968 3.72096 1.22901 3.99048 0.749262 4.47022C0.269518 4.94996 0 5.60064 0 6.2791V15.5814C0 16.2599 0.269518 16.9106 0.749262 17.3903C1.22901 17.87 1.87968 18.1396 2.55814 18.1396H17.4419C18.1203 18.1396 18.771 17.87 19.2507 17.3903C19.7305 16.9106 20 16.2599 20 15.5814V6.2791C20 5.60064 19.7305 4.94996 19.2507 4.47022C18.771 3.99048 18.1203 3.72096 17.4419 3.72096ZM10 14.8837C9.03409 14.8837 8.08987 14.5973 7.28675 14.0607C6.48363 13.5241 5.85767 12.7613 5.48803 11.8689C5.11839 10.9766 5.02168 9.99461 5.21012 9.04726C5.39856 8.09991 5.86369 7.22972 6.54669 6.54672C7.22969 5.86371 8.09988 5.39859 9.04723 5.21015C9.99458 5.02171 10.9765 5.11842 11.8689 5.48806C12.7613 5.8577 13.524 6.48365 14.0607 7.28678C14.5973 8.0899 14.8837 9.03412 14.8837 10C14.8813 11.2945 14.3659 12.5353 13.4506 13.4506C12.5353 14.366 11.2945 14.8813 10 14.8837Z" fill="#121723"/>
                <path d="M10.0001 13.4885C11.9267 13.4885 13.4885 11.9267 13.4885 10.0001C13.4885 8.07352 11.9267 6.51172 10.0001 6.51172C8.07352 6.51172 6.51172 8.07352 6.51172 10.0001C6.51172 11.9267 8.07352 13.4885 10.0001 13.4885Z" fill="#121723"/>
              </svg>
            </span>
            <div>
              <p className={styles.sectionTitle}>Mouth Open</p>
              <p className={styles.sectionDesc}>Front &amp; side view with mouth open</p>
            </div>
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
      </div>
    </main>
  );
}
