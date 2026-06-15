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

      {/* Title */}
      <h1 className={styles.title} id="main-content">Mouth Angles Introduction</h1>

      {/* Photo card */}
      <div className={styles.photoCard}>
        <Image
          src="/assets/images/photo-intro-hero.jpg"
          alt="Woman taking a selfie photo of her mouth"
          fill
          style={{ objectFit: "cover", objectPosition: "72% 15%" }}
          sizes="356px"
          priority
        />
        {/* Play button */}
        <div className={styles.playBtn} aria-label="Watch guide video">
          <Image src="/assets/images/photo-intro-play.svg" alt="" width={56} height={56} unoptimized />
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
