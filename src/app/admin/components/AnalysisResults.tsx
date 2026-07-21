"use client";

import { useState } from "react";
import styles from "./AnalysisResults.module.css";
import { PHOTO_TYPES, PHOTO_TYPE_LABELS } from "@/lib/api";
import type { PhotoAnalyses, PhotoAnalysis, PhotoType } from "@/lib/api";

interface PhotoWithAnalysis {
  url: string;
  label: string;
  photoType: PhotoType | "";
  analysis: PhotoAnalysis | null;
}

interface AnalysisResultsProps {
  photoAnalyses: PhotoAnalyses;
  closeBitePhotos: { url: string; label: string }[];
  openBitePhotos: { url: string; label: string }[];
  defaultOpen?: boolean;
  onReviewCriteria?: (photoUrl: string, photoLabel: string, photoType: PhotoType) => void;
}

const PHOTO_TYPE_MAP: Record<string, PhotoType> = {
  "Close Bite — Front": "close-bite-front",
  "Close Bite — Left": "close-bite-side",
  "Close Bite — Right": "close-bite-side",
  "Open Bite — Front": "open-bite-front",
  "Open Bite — Left": "open-bite-side",
  "Open Bite — Right": "open-bite-side",
};

/* Ordered list matching camera flow */
const ANALYSIS_ORDER = PHOTO_TYPES;

export function AnalysisResults({
  photoAnalyses,
  closeBitePhotos,
  openBitePhotos,
  defaultOpen = true,
  onReviewCriteria,
}: AnalysisResultsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (!photoAnalyses || Object.keys(photoAnalyses).length === 0) {
    return null;
  }

  /* Build unified list of photos with their analyses */
  const allPhotos: PhotoWithAnalysis[] = [];
  const allTeethPhotos = [...closeBitePhotos, ...openBitePhotos];

  for (const photo of allTeethPhotos) {
    const photoType = PHOTO_TYPE_MAP[photo.label] ?? "";
    allPhotos.push({
      url: photo.url,
      label: photo.label,
      photoType,
      analysis: (photoType ? photoAnalyses[photoType] : null) ?? null,
    });
  }

  /* Also add any analyses that don't have a matching photo (edge case) */
  for (const key of ANALYSIS_ORDER) {
    const entry = photoAnalyses[key];
    if (!allPhotos.some((p) => p.photoType === key) && entry) {
      allPhotos.push({
        url: "",
        label: PHOTO_TYPE_LABELS[key] ?? key,
        photoType: key,
        analysis: entry,
      });
    }
  }

  /* Stats */
  const totalAnalyses = Object.keys(photoAnalyses).length;
  const passCount = Object.values(photoAnalyses).filter((a) => a?.pass).length;
  const failCount = totalAnalyses - passCount;

  const verdict = failCount === 0
    ? { label: "All Checks Passed", color: "var(--admin-success)" }
    : failCount === totalAnalyses
      ? { label: "All Checks Failed", color: "var(--admin-danger)" }
      : { label: `${failCount} of ${totalAnalyses} Failed`, color: "#f97316" };

  function toggleCard(key: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={styles.card}>
      <button className={styles.header} onClick={() => setOpen(!open)}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 6h2v5H9V6zm0 6h2v2H9v-2z" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.headerTitle}>AI Photo Analysis</span>
          <span className={styles.verdictLabel} style={{ color: verdict.color }}>
            {verdict.label}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.stat}>
            <span className={styles.statPass}>{passCount}</span> pass
          </span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.stat}>
            <span className={styles.statFail}>{failCount}</span> fail
          </span>
          <svg
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className={styles.body}>
          {allPhotos.map((photo) => {
            if (!photo.analysis || !photo.photoType) return null;
            const a = photo.analysis;
            const photoType = photo.photoType;
            const isExpanded = expandedCards.has(photo.photoType);
            const checksPassed = a.checks.filter((c) => c.pass).length;
            const checksTotal = a.checks.length;

            return (
              <div key={photo.photoType} className={styles.analysisCard}>
                <div
                  role="button"
                  tabIndex={0}
                  className={styles.analysisCardHeader}
                  onClick={() => toggleCard(photo.photoType)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleCard(photo.photoType); }}
                >
                  <div className={styles.analysisCardLeft}>
                    {photo.url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className={styles.miniThumb}
                      />
                    )}
                    <div className={styles.analysisCardInfo}>
                      <span className={styles.analysisCardTitle}>{photo.label}</span>
                      <span className={styles.analysisCardMeta}>
                        {checksPassed}/{checksTotal} checks passed
                      </span>
                    </div>
                  </div>
                  <div className={styles.analysisCardRight}>
                    {onReviewCriteria && (
                      <button
                        type="button"
                        className={styles.reviewCriteriaBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReviewCriteria(photo.url, photo.label, photoType);
                        }}
                      >
                        🤖 Review Criteria
                      </button>
                    )}
                    <span className={`${styles.passBadge} ${a.pass ? styles.passBadgePass : styles.passBadgeFail}`}>
                      {a.pass ? "PASS" : "FAIL"}
                    </span>
                    <svg
                      className={`${styles.chevronSmall} ${isExpanded ? styles.chevronOpen : ""}`}
                      width="14" height="14" viewBox="0 0 16 16" fill="none"
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.analysisCardBody}>
                    {/* Check list */}
                    <div className={styles.checkList}>
                      {a.checks.map((check) => (
                        <div key={check.id} className={styles.checkItem}>
                          <span
                            className={styles.checkIcon}
                            style={{ color: check.pass ? "var(--admin-success)" : "var(--admin-danger)" }}
                          >
                            {check.pass ? "✓" : "✗"}
                          </span>
                          <div className={styles.checkContent}>
                            <div className={styles.checkHeader}>
                              <span className={styles.checkLabel}>{check.label}</span>
                              <span className={styles.checkDetail}>{check.detail}</span>
                            </div>
                            {check.observation && (
                              <p className={styles.checkObservation}>{check.observation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Summary */}
                    {a.summary && (
                      <div className={styles.summaryBox}>
                        <div className={styles.summaryLabel}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M8 1l2.35 4.76 5.25.77-3.8 3.7.9 5.24L8 13.27l-4.7 2.2.9-5.24-3.8-3.7 5.25-.77L8 1z" fill="currentColor" />
                          </svg>
                          AI Summary
                        </div>
                        <p className={styles.summaryText}>{a.summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
