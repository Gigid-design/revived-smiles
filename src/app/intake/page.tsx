"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";

export default function Intake() {
  const [name, setName] = useState("");
  const hasValue = name.trim().length > 0;
  const { cardRef, navigate } = usePageTransition("fade");
  const { update } = useSubmission();

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
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Step 1 of 3" role="progressbar" aria-valuenow={1} aria-valuemin={1} aria-valuemax={3}>
        <rect x="4" width="298" height="5" rx="2.5" fill="white"/>
        <rect width="48" height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="310" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23" height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/welcome', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
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

      </div>

      {/* CONTINUE — inactive (#e0e7f3) until input has value, then navy (#0e1b4d) */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${hasValue ? styles.btnActive : ""}`}
          onClick={() => { if (hasValue) { update({ name: name.trim() }); navigate('/step2', 'forward'); } }}
        >
          CONTINUE
        </button>
      </div>
    </main>
  );
}
