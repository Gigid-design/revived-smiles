"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

export default function PhotoIntro() {
  const { navigate } = usePageTransition();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Backgrounds */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Photo guide step" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="31"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="31"  width="49"  height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23"  height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23"  height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Photo guide card */}
      <div className={styles.photoCard} id="main-content">
        <Image
          src="/assets/images/photo-guide-1.jpg"
          alt="Guide: person taking a photo of their impression kit"
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          sizes="356px"
          priority
        />
        <div className={styles.playBtn} aria-label="Watch guide video">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5.5L19 12L8 18.5V5.5Z" fill="#0E1B4D"/>
          </svg>
        </div>
      </div>

      {/* Take Photos button — same pattern as all other screens */}
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
