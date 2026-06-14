"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const STEPS = ["Ordered", "Intake Form", "Team Review", "Start The Treatment"];
const ACTIVE_STEP = 2; // 0-indexed, currently at "Team Review"

export default function Dashboard() {
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">

        {/* Greeting */}
        <h1 className={styles.greeting}>Welcome back,<br />Angela</h1>

        {/* Order status card */}
        <div className={styles.card}>
          <div className={styles.cardBody}>
            {/* Product image */}
            <div className={styles.productImgWrap}>
              <Image
                src="/assets/images/hero-product-v2.png"
                alt="Impression kit"
                fill
                style={{ objectFit: "contain" }}
                sizes="100px"
              />
            </div>

            <div className={styles.cardInfo}>
              <h2 className={styles.cardTitle}>Now please ship back the impression kit</h2>
              <p className={styles.cardSub}>Acrylic Partial Denture</p>

              {/* Progress bar */}
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} />
              </div>

              {/* Step labels */}
              <div className={styles.stepLabels}>
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`${styles.stepLabel} ${i <= ACTIVE_STEP ? styles.stepLabelActive : styles.stepLabelMuted}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Link href="/order-detail" className={styles.viewMoreBtn}>VIEW MORE</Link>
        </div>

        {/* Care teams section */}
        <h2 className={styles.sectionTitle}>My care Teams</h2>

        <div className={styles.teamCard}>
          <div className={styles.teamInfo}>
            <h3 className={styles.teamName}>Concierge</h3>
            <p className={styles.teamAvail}>Available now</p>
            <p className={styles.teamAgent}>John Smith</p>
            <p className={styles.teamOrders}>+2 orders</p>
          </div>
          <div className={styles.teamAvatarWrap}>
            <Image
              src="/assets/images/welcome-photo-1.png"
              alt="John Smith"
              fill
              style={{ objectFit: "cover" }}
              sizes="96px"
            />
          </div>
          <button className={styles.chevronBtn} aria-label="View concierge">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
              <path d="M1 1l6 6-6 6" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

      {/* Bottom nav */}
      <nav className={styles.bottomNav} aria-label="Main navigation">
        <button className={`${styles.navItem} ${styles.navItemActive}`} aria-label="Home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" fill="#0e1b4d" stroke="#0e1b4d" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className={styles.navItem} aria-label="Messages">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className={styles.navItem} aria-label="Orders">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#8a8a8a" strokeWidth="1.5"/>
            <path d="M9 12h6M9 16h4" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round"/>
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
