"use client";

import Image from "next/image";
import Link from "next/link";
/* Deliberately reuses the impression-complete stylesheet so the two completion
   screens are visually identical — one source of truth for the treatment. */
import styles from "../complete/page.module.css";

/* Deterministic confetti (index-derived, no Math.random) — matches /complete. */
const CONFETTI_COLORS = ["#FDD33B", "#C6DCFE", "#0E184D", "#10b981", "#ffffff"];
const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  left: (i * 173) % 100,
  delay: (i % 8) * 0.18,
  duration: 2.6 + (i % 5) * 0.35,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
}));

/** Shown once the intake form and all four teeth photos are done.
 *  Impression photos are a separate task and are not required to get here. */
export default function IntakeComplete() {
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

        <div className={styles.body}>
          <p className={styles.desc}>
            Great work — your details and teeth photos are all in. Here&apos;s what&apos;s next:
          </p>

          <ol className={styles.steps}>
            <li className={styles.step}>
              Head to your dashboard to upload your impression photos — the last step.
            </li>
            <li className={styles.step}>
              Our care team reviews everything, usually within 24–48 hours.
            </li>
            <li className={styles.step}>
              We&apos;ll let you know by email and right here in the app.
            </li>
          </ol>
        </div>
      </div>

      <div className={styles.btnWrapper}>
        <Link href="/dashboard" className={styles.btn}>OKAY!</Link>
      </div>
    </main>
  );
}
