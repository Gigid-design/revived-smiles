"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { Submission } from "@/lib/api";
import { productLabels } from "@/app/context/productConfig";

/* Captions for the guided teeth photos, by their slot in the array. */
const PHOTO_CAPTIONS = ["Front", "Left side", "Right side", "Angle"];

interface InfoRow {
  label: string;
  value: string | null;
}

function PhotoGrid({
  title,
  photos,
  onOpen,
}: {
  title: string;
  photos: string[];
  onOpen: (src: string, caption: string) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.photoGrid}>
        {photos.map((src, i) => {
          const caption = PHOTO_CAPTIONS[i] ?? `Photo ${i + 1}`;
          return (
            <button
              key={`${src}-${i}`}
              type="button"
              className={styles.photoCell}
              onClick={() => onOpen(src, caption)}
              aria-label={`View ${title} — ${caption}`}
            >
              <span className={styles.photoThumb}>
                <Image src={src} alt={`${title} — ${caption}`} fill sizes="140px" style={{ objectFit: "cover" }} />
              </span>
              <span className={styles.photoCaption}>{caption}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MyDocumentsPage() {
  const router = useRouter();

  const [order, setOrder] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);

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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const rows: InfoRow[] = order
    ? [
        { label: "Name", value: order.name },
        { label: "State", value: order.state },
        { label: "Ordered product", value: order.products.length ? productLabels(order.products) : null },
        { label: "Tooth shade", value: order.whiteShade },
        { label: "Gum shade", value: order.gumShade },
      ].filter((r) => r.value)
    : [];

  const closePhotos = order?.closeBitePhotos ?? [];
  const openPhotos = order?.openBitePhotos ?? [];
  const openLightbox = (src: string, caption: string) => setLightbox({ src, caption });

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

            <PhotoGrid title="Close bite photos" photos={closePhotos} onOpen={openLightbox} />
            <PhotoGrid title="Open bite photos" photos={openPhotos} onOpen={openLightbox} />

            {closePhotos.length === 0 && openPhotos.length === 0 && (
              <div className={styles.card}>
                <p className={styles.muted}>No photos are attached to this order yet.</p>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={lightbox.caption} onClick={() => setLightbox(null)}>
          <button type="button" className={styles.lightboxClose} aria-label="Close" onClick={() => setLightbox(null)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox.src} alt={lightbox.caption} width={900} height={900} className={styles.lightboxImg} />
            <p className={styles.lightboxCaption}>{lightbox.caption}</p>
          </div>
        </div>
      )}
    </main>
  );
}
