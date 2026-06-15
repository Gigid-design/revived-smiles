"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function Dashboard() {
  const [firstName, setFirstName] = useState("Angela");
  const [productLabel, setProductLabel] = useState("Acrylic partial denture");

  useEffect(() => {
    try {
      const name = localStorage.getItem('rs_name');
      if (name) setFirstName(name.trim().split(" ")[0]);

      const products = JSON.parse(localStorage.getItem('rs_products') || '[]') as string[];
      if (products.length > 0) setProductLabel(products.join(", "));
    } catch {}
  }, []);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.content} id="main-content">

        {/* Top bar: logo + notification */}
        <div className={styles.topBar}>
          <Image
            src="/assets/images/logo-revived-smiles.png"
            alt="Revived Smiles"
            width={120}
            height={40}
            style={{ objectFit: "contain", objectPosition: "left center" }}
            sizes="120px"
          />
          <Image
            src="/assets/images/icon-notification-btn.svg"
            alt="Notifications"
            width={42}
            height={42}
            unoptimized
          />
        </div>

        {/* Greeting */}
        <h1 className={styles.greeting}>Welcome back,<br />{firstName}</h1>

        {/* Order status card */}
        <div className={styles.card}>
          {/* Title */}
          <h2 className={styles.cardTitle}>Next step: Ship back<br />your impression kit</h2>

          {/* Subtitle — mapped from ordered product selection */}
          <p className={styles.cardSub}>{productLabel}</p>

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

          {/* Step labels */}
          <div className={styles.stepLabels}>
            <span className={`${styles.stepLabel} ${styles.stepGreen}`}>Ordered</span>
            <span className={`${styles.stepLabel} ${styles.stepGreen}`}>Intake Form</span>
            <span className={`${styles.stepLabel} ${styles.stepActive}`}>Ship Kit</span>
            <span className={`${styles.stepLabel} ${styles.stepMuted}`}>Team Review</span>
            <span className={`${styles.stepLabel} ${styles.stepMuted}`}>Treatment</span>
          </div>

          {/* Info banner */}
          <div className={styles.infoBanner}>
            <Image src="/assets/images/icon-clock-circle.svg" alt="" width={32} height={33} unoptimized className={styles.infoIconWrap} />
            <div className={styles.infoText}>
              <p className={styles.infoTitle}>Estimated review: 3 - 5 business days</p>
              <p className={styles.infoSub}>After we receive your kit, your care team will begin review.</p>
            </div>
          </div>

          {/* Buttons */}
          <div className={styles.cardBtns}>
            <button className={styles.shippingBtn}>GET SHIPPING LABEL</button>
            <Link href="/order-detail" className={styles.detailsBtn}>DETAILS</Link>
          </div>
        </div>

        {/* Care team section */}
        <h2 className={styles.sectionTitle}>My Care Team</h2>

        <div className={styles.teamCard}>
          <p className={styles.teamName}>Concierge</p>
          <p className={styles.teamAvail}>Available now</p>
          <p className={styles.teamAgent}>John Smith</p>

          <div className={styles.teamIconRow}>
            <Image src="/assets/images/icon-group.svg" alt="" width={22} height={22} unoptimized className={styles.teamIcon} />
            <p className={styles.teamOrders}>+2 others</p>
          </div>

          <div className={styles.teamAvatarWrap}>
            <Image
              src="/assets/images/concierge-photo.png"
              alt="John Smith"
              fill
              style={{ objectFit: "cover", objectPosition: "center top" }}
              sizes="88px"
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
      <div className={styles.bottomNav} aria-label="Main navigation">
        <Image src="/assets/images/nav-bar-home.svg" alt="Navigation bar" width={271} height={59} unoptimized />
      </div>
    </main>
  );
}
