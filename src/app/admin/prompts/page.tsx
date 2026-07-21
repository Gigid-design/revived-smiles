"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { api, PHOTO_TYPES } from "@/lib/api";
import type { PhotoType, PromptConfig } from "@/lib/api";

const PHOTO_TYPE_ORDER = PHOTO_TYPES;

const PHOTO_TYPE_IMAGES: Record<string, string> = {
  "close-bite-front": "/assets/images/close-bite-front.png",
  "close-bite-side": "/assets/images/close-bite-right.png",
  "open-bite-front": "/assets/images/open-bite-front.png",
  "open-bite-side": "/assets/images/open-bite-right.png",
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
  const [configs, setConfigs] = useState<Partial<Record<PhotoType, PromptConfig[]>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setConfigs(await api.prompts.listAll());
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
  for (const key of Object.keys(configs) as PhotoType[]) {
    if (!orderedTypes.includes(key) && configs[key]?.length) orderedTypes.push(key);
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
            const versions = configs[photoType] ?? [];
            const active = versions.find((v) => v.isActive) ?? versions[0];
            const totalVersions = versions.length;

            if (!active) return null;

            return (
              <Link
                key={photoType}
                href={`/admin/prompts/${encodeURIComponent(photoType)}`}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  {PHOTO_TYPE_IMAGES[photoType] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={PHOTO_TYPE_IMAGES[photoType]}
                      alt={active.label}
                      className={styles.cardIcon}
                    />
                  ) : (
                    <span className={styles.cardIconFallback}>📷</span>
                  )}
                  <span className={styles.versionBadge}>v{active.version}</span>
                </div>

                <h2 className={styles.cardTitle}>{active.label}</h2>

                <p className={styles.cardDesc}>
                  {active.poseDescription.slice(0, 120)}
                  {active.poseDescription.length > 120 ? "…" : ""}
                </p>

                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Checks</span>
                    <span className={styles.metaValue}>
                      {active.contentChecks.length} content + 4 quality
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Versions</span>
                    <span className={styles.metaValue}>{totalVersions}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Last updated</span>
                    <span className={styles.metaValue}>
                      {formatDate(active.createdAt)}
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
