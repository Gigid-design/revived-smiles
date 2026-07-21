"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { IntakeHeader } from "../components/IntakeHeader";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const STATE_ABBR: Record<string, string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
  "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV",
  "New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY",
  "North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI",
  "Wyoming":"WY",
};

export default function Step2() {
  const { data, saveDraft } = useSubmission();
  const [selected, setSelected] = useState(data.state || "");
  const hasValue = selected !== "";
  const { cardRef, navigate } = usePageTransition("fade");

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Your Details"
        pct={40}
        counter="Step 2 of 5"
        onBack={() => navigate('/intake', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Your state</h1>

        {/* Custom state dropdown with floating label */}
        <div className={`${styles.selectWrapper} ${hasValue ? styles.selectFilled : ""}`}>
          {/* Floating label */}
          <span className={styles.selectLabel}>
            {hasValue ? "State" : "Select Your State"}
          </span>

          {/* Selected value display */}
          {hasValue && (
            <span className={styles.selectedValue}>
              {STATE_ABBR[selected]}
            </span>
          )}

          {/* Chevron icon */}
          <span className={styles.chevron} aria-hidden="true">
            <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.833 0.833496L5.83301 5.8335L0.833008 0.833496" stroke="#121723" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>

          {/* Native select — covers full wrapper, invisible but functional */}
          <select
            className={styles.nativeSelect}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Select your state"
          >
            <option value="" disabled />
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

      </div>

      {/* CONTINUE button */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${hasValue ? styles.btnActive : ""}`}
          onClick={async () => { if (hasValue) { await saveDraft({ state: selected }); navigate('/step3', 'forward'); } }}
        >
          CONTINUE
        </button>
      </div>
    </main>
  );
}
