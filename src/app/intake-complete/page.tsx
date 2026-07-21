"use client";

import Image from "next/image";
import Link from "next/link";
/* Deliberately reuses the impression-complete stylesheet so the two completion
   screens are visually identical — one source of truth for the treatment. */
import styles from "../complete/page.module.css";

/** Shown once the intake form and all four teeth photos are done.
 *  Impression photos are a separate task and are not required to get here. */
export default function IntakeComplete() {
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Background — light blue sky gradient */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBgOuter} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Hero photo */}
      <div className={styles.hero} aria-hidden="true">
        <Image
          src="/assets/images/complete-hero-final.jpg"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="432px"
        />
      </div>

      {/* Progress bar — all segments filled */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Intake complete" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="#0E184D"/>
      </svg>

      <div className={styles.card} id="main-content">
        <Image
          src="/assets/images/complete-card-bg-v2.png"
          alt=""
          fill
          style={{ objectFit: "cover" }}
          sizes="398px"
          className={styles.cardTexture}
        />

        <h1 className={styles.title}>Intake complete!</h1>

        <p className={styles.desc}>
          Thanks for completing your intake — your details and teeth photos are all in.
          When you&apos;re ready, the last step is uploading your impression photos from
          your dashboard.
        </p>
      </div>

      <div className={styles.btnWrapper}>
        <Link href="/dashboard" className={styles.btn}>OKAY!</Link>
      </div>
    </main>
  );
}
