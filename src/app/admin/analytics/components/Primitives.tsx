"use client";

/**
 * The small shared pieces: an agent's identity cell, a top-performer card, and
 * the horizontal bar list the Tags tab opens with.
 */

import Image from "next/image";

import type { AgentIdentity, AnalyticsRange, CompanySummary, TagUsage, TopPerformer } from "@/lib/api";
import { describePreviousWindow, EMPTY, formatDelta, formatMetric } from "../format";
import styles from "../page.module.css";

/**
 * Avatar plus name, used in every agent table.
 *
 * Falls back to initials on a tinted disc when there is no photo — the same
 * treatment the sidebar gives the signed-in admin.
 */
export function AgentCell({ agent }: { agent: AgentIdentity }) {
  return (
    <span className={styles.agentCell}>
      {agent.avatarUrl ? (
        <Image
          className={styles.agentAvatarImg}
          src={agent.avatarUrl}
          alt=""
          width={28}
          height={28}
        />
      ) : (
        <span className={styles.agentAvatar} aria-hidden="true">
          {agent.initials}
        </span>
      )}
      <span className={styles.agentName}>{agent.name}</span>
    </span>
  );
}

/**
 * The whole-team band (Aug 25 — "company-wide first response time or
 * company-wide resolution time").
 *
 * It sits above the top-performer cards because it answers the first question
 * a manager opens this screen with, and every number below it is a breakdown
 * of one of these. The distinction it has to hold up is that these are the
 * team's figures, not an agent's — hence the heading, and hence the deltas,
 * which only make sense for a figure that has a history.
 */
export function CompanyBand({
  summary,
  range,
}: {
  summary: CompanySummary;
  range: AnalyticsRange;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.companyHeader}>
        <h2 className={styles.sectionTitle}>Company-wide</h2>
        <p className={styles.companyCaption}>
          {summary.activeAgents} {summary.activeAgents === 1 ? "agent" : "agents"} active ·{" "}
          {describePreviousWindow(range)}
        </p>
      </div>

      <div className={styles.companyGrid}>
        {summary.metrics.map((metric) => {
          const delta = formatDelta(metric.value, metric.previous, metric.lowerIsBetter);
          const tone =
            delta === null || delta.good === null
              ? styles.deltaFlat
              : delta.good
                ? styles.deltaGood
                : styles.deltaBad;

          return (
            <div key={metric.key} className={styles.companyTile}>
              <span className={styles.companyLabel}>{metric.label}</span>
              <span className={styles.companyValue}>
                {formatMetric(metric.value, metric.unit)}
              </span>
              {delta === null ? (
                <span className={`${styles.companyDelta} ${styles.deltaFlat}`}>
                  No comparison
                </span>
              ) : (
                <span className={`${styles.companyDelta} ${tone}`}>
                  {delta.direction !== "flat" && (
                    <span aria-hidden="true">{delta.direction === "up" ? "↑" : "↓"}</span>
                  )}
                  {delta.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** One of the four cards above the agent tables. */
export function TopPerformerCard({ performer }: { performer: TopPerformer }) {
  const { agent, label, value, unit } = performer;

  return (
    <div className={styles.performerCard}>
      {agent ? (
        <span className={styles.performerAvatar} aria-hidden="true">
          {agent.initials}
        </span>
      ) : (
        <span className={`${styles.performerAvatar} ${styles.performerAvatarEmpty}`} aria-hidden="true">
          {EMPTY}
        </span>
      )}

      <span className={styles.performerBody}>
        <span className={styles.performerName}>{agent ? agent.name : "No qualifying agent"}</span>
        <span className={styles.performerMetric}>
          <span className={styles.performerLabel}>{label}</span>
          <span className={styles.performerValue}>{formatMetric(value, unit)}</span>
        </span>
      </span>
    </div>
  );
}

/**
 * Ranked horizontal bars.
 *
 * Bars are scaled against the largest value rather than the total, so the
 * leader always fills the track and the differences between the rest stay
 * visible.
 */
export function BarList({ items }: { items: TagUsage[] }) {
  const max = Math.max(1, ...items.map((item) => item.total));

  return (
    <ul className={styles.barList}>
      {items.map((item) => (
        <li key={item.tag} className={styles.barRow}>
          <span className={styles.barLabel} title={item.tag}>
            {item.tag}
          </span>
          <span className={styles.barTrack}>
            <span
              className={styles.barFill}
              style={{ width: `${(item.total / max) * 100}%` }}
            />
          </span>
          <span className={styles.barValue}>{item.total.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
