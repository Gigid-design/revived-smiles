"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

const CLOSE_BITE_PHOTOS = [
  { label: "Close bite front",       mockup: null },
  { label: "Close bite left side",   mockup: "/assets/images/mockup-close-bite-left.png" },
  { label: "Close bite right side",  mockup: "/assets/images/mockup-close-bite-right.png" },
];

const OPEN_BITE_PHOTOS = [
  { label: "Open bite front",      mockup: null },
  { label: "Open bite left side",  mockup: "/assets/images/mockup-open-bite-left.png" },
];

export default function OrderDetail() {
  const [closeBitePhotos, setCloseBitePhotos] = useState<string[]>([]);
  const [openBitePhotos, setOpenBitePhotos] = useState<string[]>([]);
  const [fullName, setFullName] = useState("—");
  const [orderedProduct, setOrderedProduct] = useState("—");

  const aboutRows = [
    { label: "Name",            value: fullName },
    { label: "State",           value: "California" },
    { label: "Ordered Product", value: orderedProduct, underline: true },
    { label: "Tooth Shade",     value: "A2" },
    { label: "Gum Shade",       value: "G3" },
  ];

  useEffect(() => {
    try {
      const close = JSON.parse(localStorage.getItem('rs_closeBitePhotos') || '[]');
      setCloseBitePhotos(close);
      const open = JSON.parse(localStorage.getItem('rs_openBitePhotos') || '[]');
      setOpenBitePhotos(open);
      const name = localStorage.getItem('rs_name');
      if (name) setFullName(name.trim());

      const products = JSON.parse(localStorage.getItem('rs_products') || '[]') as string[];
      if (products.length > 0) setOrderedProduct(products.join(", "));
    } catch {}
  }, []);
  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn} aria-label="Go back">
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L1.5 7.5l6 6" stroke="#0e1b4d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <h1 className={styles.title}>{orderedProduct !== "—" ? orderedProduct : "Acrylic Partial Denture"}</h1>
      </header>

      {/* Scrollable content */}
      <div className={styles.content} id="main-content">

        {/* About you */}
        <p className={styles.sectionLabel}>About you</p>
        <div className={styles.section}>
          {aboutRows.map((row) => (
            <div key={row.label} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={`${styles.rowValue} ${row.underline ? styles.rowValueUnderline : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Close bite photos */}
        <p className={styles.sectionLabel}>Close bite photos</p>
        <div className={styles.section}>
          {CLOSE_BITE_PHOTOS.map((photo, i) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                {closeBitePhotos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={closeBitePhotos[i]} alt={photo.label} className={styles.thumbnailImg} />
                ) : photo.mockup ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.mockup} alt={photo.label} className={styles.thumbnailImg} />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Open bite photos */}
        <p className={styles.sectionLabel}>Open bite photos</p>
        <div className={styles.section}>
          {OPEN_BITE_PHOTOS.map((photo, i) => (
            <div key={photo.label} className={styles.photoRow}>
              <span className={styles.rowLabel}>{photo.label}</span>
              <div className={styles.thumbnail}>
                {openBitePhotos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={openBitePhotos[i]} alt={photo.label} className={styles.thumbnailImg} />
                ) : photo.mockup ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.mockup} alt={photo.label} className={styles.thumbnailImg} />
                ) : (
                  <div className={styles.thumbnailPlaceholder} />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div className={styles.bottomNav} aria-label="Main navigation">
        <Image
          src="/assets/images/nav-bar.svg"
          alt="Navigation bar"
          width={271}
          height={59}
          unoptimized
        />
      </div>
    </main>
  );
}
