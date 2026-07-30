"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission } from "@/lib/api";
import { productLabels } from "@/app/context/productConfig";

interface InfoRow {
  label: string;
  value: string | null;
}

interface PhotoItem {
  src: string;
  caption: string;
}

export default function MyDocumentsPage() {
  const router = useRouter();

  const [order, setOrder] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = new URLSearchParams(window.location.search).get("id");
        let sub: Submission | null = null;
        if (id) {
          sub = await api.submissions.getById(id).catch(() => null);
        }
        if (!sub) sub = await api.submissions.getMine();
        if (!cancelled) setOrder(sub);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows: InfoRow[] = order
    ? [
        { label: "Name", value: order.name },
        { label: "State", value: order.state },
        { label: "Ordered product", value: order.products.length ? productLabels(order.products) : null },
        { label: "Tooth shade", value: order.whiteShade },
        { label: "Gum shade", value: order.gumShade },
      ].filter((r) => r.value)
    : [];

  /* Match exactly the four teeth photos the customer captured during intake,
     in the order they took them (see camera → camera-1 → open-bite → open-bite-2),
     followed by their impression-tray photos. One flat list, one section. */
  const teethLabels = ["Front", "Mouth open", "Left side", "Right side"];
  const impressionLabels = ["Upper 1", "Upper 2", "Lower 1", "Lower 2"];

  const photos: PhotoItem[] = order
    ? [
        ...[order.closeBitePhotos?.[0], order.closeBitePhotos?.[1], order.openBitePhotos?.[0], order.openBitePhotos?.[1]]
          .map((src, i) => ({ src, caption: teethLabels[i] }))
          .filter((p): p is PhotoItem => Boolean(p.src)),
        ...(order.impressionPhotos ?? [])
          .map((src, i) => ({ src, caption: impressionLabels[i] ?? `Impression ${i + 1}` }))
          .filter((p): p is PhotoItem => Boolean(p.src)),
      ]
    : [];

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          aria-label="Back"
          onClick={() => router.back()}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>My Documents</h1>
      </header>

      <div className={styles.content} id="main-content">
        {loading && <p className={styles.muted}>Loading…</p>}

        {!loading && !order && (
          <div className={styles.card}>
            <p className={styles.muted}>We couldn’t find this order’s documents.</p>
          </div>
        )}

        {!loading && order && (
          <>
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>About you</h2>
              <dl className={styles.infoList}>
                {rows.map((r) => (
                  <div key={r.label} className={styles.infoRow}>
                    <dt className={styles.infoLabel}>{r.label}</dt>
                    <dd className={styles.infoValue}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Your photos</h2>
              {photos.length > 0 ? (
                <div className={styles.photoGrid}>
                  {photos.map((p, i) => (
                    <figure key={`${p.src}-${i}`} className={styles.photoCell}>
                      <span className={styles.photoThumb}>
                        <Image src={p.src} alt={p.caption} fill sizes="90px" style={{ objectFit: "cover" }} />
                      </span>
                      <figcaption className={styles.photoCaption}>{p.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No photos are attached to this order yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
