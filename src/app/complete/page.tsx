"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Complete() {
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

      {/* Hero photo — left:-1px, top:0, w:432px, h:704px */}
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

      {/* Progress bar — all 4 segments fully navy */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Complete" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="62"  width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="93"  width="302" height="5" rx="2.5" fill="#0E184D"/>
      </svg>

      {/* Card — left:16, right:16, top:437, h:495, radius:32 32 0 0 */}
      <div className={styles.card} id="main-content">
        {/* Card bg texture */}
        <Image
          src="/assets/images/complete-card-bg-v2.png"
          alt=""
          fill
          style={{ objectFit: "cover" }}
          sizes="398px"
          className={styles.cardTexture}
        />

        {/* Title — center at 94px from card top, 36px semibold */}
        <h1 className={styles.title}>Impression process completed!</h1>

        {/* Description — center at 181.5px from card top, 12px medium */}
        <p className={styles.desc}>
          Thank you for completing the impression process! We'll carefully review the images you've submitted and will be in touch soon with the next steps.
        </p>

      </div>

      {/* OKAY! button — fixed bottom, same as Tooth Chart */}
      <div className={styles.btnWrapper}>
        <button type="button" className={styles.btn}>OKAY!</button>
      </div>
    </main>
  );
}
