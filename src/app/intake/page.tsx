"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";

export default function Intake() {
  const [name, setName] = useState("");
  const hasValue = name.trim().length > 0;

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Outer texture background */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>

      {/* Card gradient background */}
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar} aria-label="Step 1 of 3" role="progressbar" aria-valuenow={1} aria-valuemin={1} aria-valuemax={3}>
        <div className={styles.segTrack}>
          <div className={styles.segActive} />
        </div>
        <div className={styles.segSmall} />
        <div className={styles.segSmall} />
      </div>

      {/* Nav bar */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <Link href="/welcome" className={styles.navBtn} aria-label="Go back">
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </Link>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content">
        <h1 className={styles.cardTitle}>Your name</h1>

        {/* Floating label input — same typing state as page 1 */}
        <div className={styles.inputWrapper}>
          <input
            id="fullName"
            type="text"
            placeholder=" "
            className={styles.input}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="fullName" className={styles.floatingLabel}>
            Your Full Name
          </label>
        </div>

        {/* CONTINUE — inactive (#e0e7f3) until input has value, then navy (#0e1b4d) */}
        <div className={styles.buttonWrapper}>
          <button
            type="button"
            className={`${styles.btn} ${hasValue ? styles.btnActive : ""}`}
            onClick={() => { if (hasValue) window.location.href = '/step2'; }}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </main>
  );
}
