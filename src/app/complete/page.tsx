"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Complete() {
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Full-bleed hero photo — top:0, h:704px */}
      <div className={styles.hero} aria-hidden="true">
        <Image src="/assets/images/complete-hero.jpg" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar — all 4 segments fully navy (complete) */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Complete" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="#0E184D"/>
      </svg>

      {/* Close button — right:68px, top:82px */}
      <nav className={styles.navBar}>
        <Link href="/" className={styles.navBtn} aria-label="Close">
          <Image src="/assets/images/complete-icon-close.svg" alt="" width={20} height={20} unoptimized />
        </Link>
      </nav>

      {/* Bottom card — left:16, right:16, top:437, h:495, radius:32 32 0 0 */}
      <div className={styles.card} id="main-content">
        {/* Frosted glass background */}
        <div className={styles.cardBg} aria-hidden="true">
          <Image src="/assets/images/complete-card-bg.png" alt="" fill style={{ objectFit: "cover" }} sizes="398px" />
        </div>

        {/* Title — 36px semi-bold white, top:94px from card top */}
        <h1 className={styles.title}>Impression process completed!</h1>

        {/* Description — 12px medium white */}
        <p className={styles.desc}>Thank you for completing the impression process! We'll carefully review the images you've submitted and will be in touch soon with the next steps.</p>

        {/* OKAY! button — left:21, top:404 within card, w:355, h:56 */}
        <button type="button" className={styles.btn}>OKAY!</button>
      </div>
    </main>
  );
}
