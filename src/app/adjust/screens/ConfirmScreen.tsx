"use client";

/* Screen 3 — confirm they have their appliance and models. Comes before any
   questions about what's wrong. "No" routes to customer service; the portal
   must not mention warranty here. */

import { useState } from "react";
import { CONFIRM_MODELS } from "../../context/adjustmentConfig";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface ConfirmScreenProps {
  onYes: () => void;
  onNo: () => void;
}

export function ConfirmScreen({ onYes, onNo }: ConfirmScreenProps) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>{CONFIRM_MODELS.question}</h1>
        <p className={styles.subtitle}>{CONFIRM_MODELS.intro}</p>

        <div className={styles.optionList} role="radiogroup" aria-label={CONFIRM_MODELS.question}>
          {(["yes", "no"] as const).map((value) => {
            const active = choice === value;
            const label = value === "yes" ? CONFIRM_MODELS.yesLabel : CONFIRM_MODELS.noLabel;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.option} ${active ? styles.optionSelected : ""}`}
                onClick={() => setChoice(value)}
              >
                <span className={styles.indicator}>{active && <CheckIcon />}</span>
                <span className={styles.optionBody}>
                  <span className={styles.optionTitle}>{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          disabled={!choice}
          onClick={() => {
            if (choice === "yes") onYes();
            else if (choice === "no") onNo();
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}
