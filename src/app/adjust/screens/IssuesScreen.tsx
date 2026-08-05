"use client";

/* Screen 4 — what's wrong. Select everything that applies; only the options for
   their product appear, in the spec's fixed order. At least one is required. */

import { useState } from "react";
import type { AdjustmentIssueId } from "@/lib/api";
import {
  type AdjustmentProduct,
  ISSUE_ORDER,
  issueAppliesToProduct,
  issueButtonLabel,
} from "../../context/adjustmentConfig";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface IssuesScreenProps {
  product: AdjustmentProduct;
  initial: AdjustmentIssueId[];
  /** "Appliance 2 of 2 · Flexible Partial Denture" when several were picked. */
  context?: string;
  onContinue: (issues: AdjustmentIssueId[]) => void;
}

export function IssuesScreen({ product, initial, context, onContinue }: IssuesScreenProps) {
  const [selected, setSelected] = useState<Set<AdjustmentIssueId>>(new Set(initial));
  const available = ISSUE_ORDER.filter((issue) => issueAppliesToProduct(issue, product));

  function toggle(issue: AdjustmentIssueId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(issue)) next.delete(issue);
      else next.add(issue);
      return next;
    });
  }

  return (
    <>
      <div className={styles.card}>
        {context && <p className={styles.flowContext}>{context}</p>}
        <h1 className={styles.title}>What&apos;s wrong?</h1>
        <p className={styles.subtitle}>Select everything that applies.</p>

        <div className={styles.issueGrid} role="group" aria-label="What's wrong">
          {available.map((issue) => {
            const active = selected.has(issue);
            return (
              <button
                key={issue}
                type="button"
                role="checkbox"
                aria-checked={active}
                className={`${styles.option} ${active ? styles.optionSelected : ""}`}
                onClick={() => toggle(issue)}
              >
                <span className={`${styles.indicator} ${styles.radioSquare}`}>
                  {active && <CheckIcon />}
                </span>
                <span className={styles.optionBody}>
                  <span className={styles.optionTitle}>{issueButtonLabel(issue, product)}</span>
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
          disabled={selected.size === 0}
          onClick={() => onContinue(ISSUE_ORDER.filter((i) => selected.has(i)))}
        >
          Continue
        </button>
      </div>
    </>
  );
}
