"use client";

import styles from "./PhotoTimeline.module.css";

export interface TimelineStep {
  label: string;
}

interface Props {
  steps: TimelineStep[];
  currentStep: number; // 0-indexed
}

export default function PhotoTimeline({ steps, currentStep }: Props) {
  return (
    <div className={styles.timeline} role="navigation" aria-label="Photo progress">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const _isUpcoming = i > currentStep;

        return (
          <div key={i} className={styles.stepGroup}>
            {/* Connector line (before each step except first) */}
            {i > 0 && (
              <div
                className={`${styles.connector} ${isCompleted || isCurrent ? styles.connectorActive : ""}`}
              />
            )}

            {/* Circle */}
            <div
              className={`${styles.circle} ${
                isCompleted ? styles.circleCompleted :
                isCurrent ? styles.circleCurrent :
                styles.circleUpcoming
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span className={styles.circleNumber}>{i + 1}</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`${styles.label} ${
                isCompleted ? styles.labelCompleted :
                isCurrent ? styles.labelCurrent :
                styles.labelUpcoming
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
