"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

interface PromptConfig {
  id: string;
  photo_type: string;
  version: number;
  label: string;
  pose_description: string;
  content_checks: { id: string; label: string; requirement: string }[];
  is_active: boolean;
  created_by: string | null;
  change_notes: string | null;
  created_at: string;
}

const PHOTO_TYPE_ORDER = ["close-bite-front", "close-bite-side", "open-bite-front", "open-bite-side"];

const PHOTO_TYPE_ICONS: Record<string, string> = {
  "close-bite-front": "🦷",
  "close-bite-side": "🦷",
  "open-bite-front": "👄",
  "open-bite-side": "👄",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PromptsListPage() {
  const [configs, setConfigs] = useState<Record<string, PromptConfig[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        setConfigs(data.configs ?? {});
      } catch (err) {
        console.error("Failed to load prompts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading prompt configurations…</div>;
  }

  const orderedTypes = PHOTO_TYPE_ORDER.filter((t) => configs[t]?.length);
  // Include any types not in the predefined order
  for (const key of Object.keys(configs)) {
    if (!orderedTypes.includes(key)) orderedTypes.push(key);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Photo Prompts</h1>
          <p className={styles.subtitle}>
            Manage the prompts that control how the AI analyzes patient dental photos.
            Each photo type has its own prompt with specific checks and requirements.
          </p>
        </div>
      </div>

      {orderedTypes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No prompt configurations found.</p>
          <p className={styles.emptyHint}>
            Run the <code>supabase-schema-prompt-configs.sql</code> migration to seed the default prompts.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {orderedTypes.map((photoType) => {
            const versions = configs[photoType];
            const active = versions.find((v) => v.is_active) ?? versions[0];
            const totalVersions = versions.length;

            return (
              <Link
                key={photoType}
                href={`/admin/prompts/${encodeURIComponent(photoType)}`}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    {PHOTO_TYPE_ICONS[photoType] ?? "📷"}
                  </span>
                  <span className={styles.versionBadge}>v{active.version}</span>
                </div>

                <h2 className={styles.cardTitle}>{active.label}</h2>

                <p className={styles.cardDesc}>
                  {active.pose_description.slice(0, 120)}
                  {active.pose_description.length > 120 ? "…" : ""}
                </p>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Checks</span>
                    <span className={styles.metaValue}>
                      {active.content_checks.length} content + 4 quality
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Versions</span>
                    <span className={styles.metaValue}>{totalVersions}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Last updated</span>
                    <span className={styles.metaValue}>
                      {formatDate(active.created_at)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.editLink}>Edit prompt →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
