"use client";

import { useRef } from "react";
import { CameraIcon, CheckIcon } from "./icons";
import styles from "./adjust.module.css";

interface PhotoUploadProps {
  label: string;
  /** The stored data URL, or undefined when empty. */
  value: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
  optional?: boolean;
  /** Shown under the label (e.g. the cracked "skip this photo" note). */
  note?: string;
}

/**
 * One photo slot: tap to pick an image, shows a preview, tap ✕ to clear.
 * Reads the file to a data URL — the mock backend stores images inline, the
 * same shortcut the intake photo forms take.
 */
export function PhotoUpload({ label, value, onChange, optional, note }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.photoField}>
      <span className={styles.photoLabel}>
        {label}
        {optional && <span className={styles.photoOptional}>optional</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div
        className={`${styles.photoTile} ${value ? styles.photoTileFilled : ""}`}
        role="button"
        tabIndex={0}
        aria-label={value ? `Replace ${label}` : `Add ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} />
            <button
              type="button"
              className={styles.photoRemove}
              aria-label={`Remove ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
            >
              ✕
            </button>
            <span className={styles.photoBadge} aria-hidden="true">
              <CheckIcon />
            </span>
          </>
        ) : (
          <span className={styles.photoAddText}>
            <span className={styles.photoIcon} aria-hidden="true">
              <CameraIcon />
            </span>
            Add photo
          </span>
        )}
      </div>
      {note && <p className={styles.photoHint}>{note}</p>}
    </div>
  );
}
