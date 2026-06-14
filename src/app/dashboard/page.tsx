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
          {/* Title */}
          <h2 className={styles.cardTitle}>Now please ship back the impression kit</h2>

          {/* Subtitle */}
          <p className={styles.cardSub}>Acrylic partial denture</p>

          {/* Product image */}
          <div className={styles.productImgWrap}>
            <Image
              src="/assets/images/hero-product-v2.png"
              alt="Impression kit"
              fill
              style={{ objectFit: "contain" }}
              sizes="99px"
            />
          </div>

          {/* Progress track */}
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>

          {/* Step labels — absolutely positioned at exact Figma offsets */}
          <div className={styles.stepLabels}>
            <span className={`${styles.stepLabel} ${styles.stepMedium}`}>Ordered</span>
            <span className={`${styles.stepLabel} ${styles.stepMedium} ${styles.stepIntake}`}>Intake Form</span>
            <span className={`${styles.stepLabel} ${styles.stepRegular} ${styles.stepTeam}`}>Team Review</span>
            <span className={`${styles.stepLabel} ${styles.stepMuted} ${styles.stepStart}`}>Start The Treatment</span>
          </div>

          {/* VIEW MORE button */}
          <Link href="/order-detail" className={styles.viewMoreBtn}>VIEW MORE</Link>
        </div>

        {/* Care teams section */}
        <h2 className={styles.sectionTitle}>My Care Teams</h2>

        <div className={styles.teamCard}>
          {/* Text content — absolute positioned to match Figma */}
          <p className={styles.teamName}>Concierge</p>
          <p className={styles.teamAvail}>Available now</p>
          <p className={styles.teamAgent}>John Smith</p>

          {/* Users icon + orders */}
          <div className={styles.teamIconRow}>
            <Image
              src="/assets/images/icon-group.svg"
              alt=""
              width={22}
              height={22}
              unoptimized
              className={styles.teamIcon}
            />
            <p className={styles.teamOrders}>+2 orders</p>
          </div>

          {/* Avatar circle */}
          <div className={styles.teamAvatarWrap}>
            <Image
              src="/assets/images/concierge-photo.png"
              alt="John Smith"
              fill
              style={{ objectFit: "cover", objectPosition: "center top" }}
              sizes="88px"
            />
          </div>

          {/* Chevron */}
          <button className={styles.chevronBtn} aria-label="View concierge">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
              <path d="M1 1l6 6-6 6" stroke="#8a8a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

      {/* Bottom nav */}
      <div className={styles.bottomNav} aria-label="Main navigation">
        <Image
          src="/assets/images/nav-bar-home.svg"
          alt="Navigation bar"
          width={271}
          height={59}
          unoptimized
        />
      </div>
    </main>
  );
}
