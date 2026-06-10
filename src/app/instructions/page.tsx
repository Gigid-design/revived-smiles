"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

export default function Instructions() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Backgrounds */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/instructions-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/instructions-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar — SVG coords from Figma (viewBox 0 0 395 5, positioned at left:17) */}
      {/* left:17→x=0, left:48→x=31, left:79→x=62, left:389→x=372 */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Instructions step" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="62"  width="73"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="372" width="23"  height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav — close button only (no back) */}
      <nav className={styles.navBar}>
        <div className={styles.navSpacer} />
        <Link href="/" className={styles.navBtn} aria-label="Close">
          <Image src="/assets/images/instructions-icon-close.svg" alt="" width={20} height={20} unoptimized />
        </Link>
      </nav>

      {/* Title — centered at top:184px */}
      <h1 className={styles.title} id="main-content">How to take your impression</h1>

      {/* Photo card — 356×500, centered, 22px below title */}
      <Image
        src="/assets/images/instructions-card.svg"
        alt="Mix your putty — how to take your impression"
        width={356}
        height={500}
        className={styles.photoCard}
        unoptimized
        priority
      />

      {/* Bottom buttons — fixed to viewport bottom */}
      <div className={styles.bottomNav}>
        <button className={styles.btnBack} aria-label="Previous" onClick={() => navigate('/open-bite', 'backward')}>
          <Image src="/assets/images/instructions-btn-back.svg" alt="Back" width={56} height={56} unoptimized />
        </button>
        <button className={styles.btnNext} aria-label="Next" onClick={() => navigate('/instructions-2', 'forward')}>
          <Image src="/assets/images/instructions-btn-next.svg" alt="Next" width={94} height={56} unoptimized />
        </button>
      </div>
    </main>
  );
}
