"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { IntakeHeader } from "../components/IntakeHeader";

export default function Intake() {
  const { data, saveDraft } = useSubmission();
  const [name, setName] = useState(data.name || "");
  const nameRef = useRef<HTMLInputElement>(null);
  const hasValue = name.trim().length > 0;
  const { cardRef, navigate } = usePageTransition("fade");

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={20}
        counter="Step 1 of 5"
        onBack={() => navigate('/dashboard', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Your name</h1>

        {/* Floating label input — same typing state as page 1 */}
        <div className={styles.inputWrapper}>
          <input
            ref={nameRef}
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
          onClick={async () => {
            const trimmed = (name || nameRef.current?.value || "").trim();
            if (trimmed) {
              await saveDraft({ name: trimmed });
              navigate('/step2', 'forward');
            }
          }}
        >
          CONTINUE
        </button>
      </div>
    </main>
  );
}
