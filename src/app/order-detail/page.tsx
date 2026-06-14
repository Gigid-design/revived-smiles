"use client";

import Link from "next/link";
import styles from "./page.module.css";

const ABOUT_ROWS = [
  { label: "Name",            value: "Mira M." },
  { label: "State",           value: "California" },
  { label: "Ordered Product", value: "Acrylic Partial Denture, Retainer", underline: true },
  { label: "Tooth Shade",     value: "A2" },
  { label: "Gum Shade",       value: "G3" },
];

const CLOSE_BITE_PHOTOS = [
  { label: "Close bite front" },
  { label: "Close bite left side" },
  { label: "Close bite right side" },
];

const OPEN_BITE_PHOTOS = [
  { label: "Open bite front" },
  { label: "Open bite left side" },
];

export default function OrderDetail() {
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn} aria-label="Go back">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L1.5 7.5l6 6" stroke="#0e1b4d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <h1 className={styles.title}>Acrylic Partial Denture</h1>
      </header>

      {/* Scrollable content */}
      <div className={styles.content} id="main-content">

        {/* About you */}
        <p className={styles.sectionLabel}>About you</p>
        <div className={styles.section}>
          {ABOUT_ROWS.map((row) => (
            <div key={row.label} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={`${styles.rowValue} ${row.underline ? styles.rowValueUnderline : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Close bite photos */}
        <p className={styles.sectionLabel}>Close bite photos</p>
        <div className={styles.section}>
          {CLOSE_BITE_PHOTOS.map((photo) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                <div className={styles.thumbnailPlaceholder} />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Open bite photos */}
        <p className={styles.sectionLabel}>Open bite photos</p>
        <div className={styles.section}>
          {OPEN_BITE_PHOTOS.map((photo) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                <div className={styles.thumbnailPlaceholder} />
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <nav className={styles.bottomNav} aria-label="Main navigation">
        <Link href="/dashboard" className={styles.navItem} aria-label="Home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="#8a8a8a" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
            <path d="M9 22V12h6v10" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <button className={styles.navItem} aria-label="Messages">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.navDot} />
        </button>
        <button className={`${styles.navItem} ${styles.navItemActive}`} aria-label="Orders">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="#0e1b4d" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#0e1b4d" strokeWidth="1.5"/>
            <path d="M9 12h6M9 16h4" stroke="#0e1b4d" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button className={styles.navItem} aria-label="Cart">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </nav>
    </main>
  );
}
