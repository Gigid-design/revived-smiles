"use client";

/**
 * The small shared pieces: an agent's identity cell, a top-performer card, and
 * the horizontal bar list the Tags tab opens with.
 */

import Image from "next/image";

import type { AgentIdentity, TagUsage, TopPerformer } from "@/lib/api";
import { EMPTY, formatMetric } from "../format";
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
