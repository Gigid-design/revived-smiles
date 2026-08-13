"use client";

import { useCallback, useEffect } from "react";
import styles from "./ChatPhotoLightbox.module.css";
import type { MessagePhoto } from "@/lib/api";

/** A filesystem-friendly name for a saved photo, e.g. "close-bite-front.png". */
function downloadName(url: string, label?: string): string {
  const ext = url.split("?")[0].split(".").pop() || "jpg";
  const base = (label ?? "photo").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "photo"}.${ext}`;
}

interface ChatPhotoLightboxProps {
  photos: MessagePhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * A full-screen viewer for the photos attached to a chat message — so the
 * support team can expand an impression image without leaving the conversation,
 * the way Gorgias shows an attachment. Backdrop or Esc closes; the arrows (and
 * ← / →) step through the strip.
 */
export function ChatPhotoLightbox({ photos, index, onIndexChange, onClose }: ChatPhotoLightboxProps) {
  const count = photos.length;
  const photo = photos[index];

  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [index, count, onIndexChange],
  );

  /* Save the image the agent is looking at — Gitai asked to keep a copy on hand
     in case a submission is later disputed. The photos are same-origin assets,
     so a download anchor pulls the file straight down. */
  const download = useCallback(() => {
    if (!photo) return;
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = downloadName(photo.url, photo.label);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [photo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && count > 1) go(1);
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, count]);

  if (!photo) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button
        type="button"
        className={styles.download}
        onClick={(e) => { e.stopPropagation(); download(); }}
        aria-label="Save photo"
        title="Save photo"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
      </button>

      <button type="button" className={styles.close} onClick={onClose} aria-label="Close viewer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {count > 1 && (
        <button
          type="button"
          className={`${styles.nav} ${styles.prev}`}
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="Previous photo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}

      <figure className={styles.figure} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- stand-in demo asset, not a Next-optimised route */}
        <img src={photo.url} alt={photo.label ?? "Attached photo"} className={styles.image} />
        <figcaption className={styles.caption}>
          <span className={styles.captionLabel}>{photo.label ?? "Photo"}</span>
          {count > 1 && <span className={styles.captionCount}>{index + 1} / {count}</span>}
        </figcaption>
      </figure>

      {count > 1 && (
        <button
          type="button"
          className={`${styles.nav} ${styles.next}`}
          onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="Next photo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
