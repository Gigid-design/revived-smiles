"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

/* Deterministic confetti pieces — values derived from the index (not
   Math.random) so server and client render identically (no hydration
   mismatch). Colours are the brand palette. */
const CONFETTI_COLORS = ["#F5C24C", "#AFC9F2", "#0E184D", "#E58F8F", "#8FD0C2", "#ffffff"];
const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  left: (i * 173) % 100,                 // spread across the width
  delay: (i % 8) * 0.18,                 // staggered start
  duration: 2.8 + (i % 5) * 0.4,         // varied fall speed
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,                    // mix rounds and rectangles
  drift: ((i % 5) - 2) * 16,             // -32..32px lateral sway
  spin: 320 + (i % 4) * 80,              // 320..560deg gentle tumble
}));

export default function Complete() {
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Celebratory confetti burst */}
      <div className={styles.confetti} aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className={`${styles.confettiPiece} ${c.round ? styles.confettiRound : ""}`}
            style={{
              left: `${c.left}%`,
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              ["--drift" as string]: `${c.drift}px`,
              ["--spin" as string]: `${c.spin}deg`,
            }}
          />
        ))}
      </div>

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

        {/* Title */}
        <h1 className={styles.title}>Impressions submitted!</h1>

        {/* Intro + concrete next steps */}
        <div className={styles.body}>
          <p className={styles.desc}>
            Thank you for completing the impression process! Here&apos;s what happens next:
          </p>

          <ol className={styles.steps}>
            <li className={styles.step}>
              Our care team reviews your photos — usually within 24–48 hours.
            </li>
            <li className={styles.step}>
              We&apos;ll let you know by email and right here in the app.
            </li>
            <li className={styles.step}>
              Once approved, we start crafting your custom fit.
            </li>
          </ol>
        </div>
      </div>

      {/* OKAY! button — fixed bottom, same as Tooth Chart */}
      <div className={styles.btnWrapper}>
        <Link href="/dashboard" className={styles.btn}>OKAY!</Link>
      </div>
    </main>
  );
}
