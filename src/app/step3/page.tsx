"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { PRODUCTS, CATEGORY_LABELS, getNextAfterProduct } from "../context/productConfig";

function CheckIcon({ checked }: { checked: boolean }) {
  if (checked) {
    // Active — same icon shape, navy fill with white checkmark path
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0H3C1.34961 0 0 1.3501 0 3V17C0 18.6499 1.34961 20 3 20H17C18.6504 20 20 18.6499 20 17V3C20 1.3501 18.6504 0 17 0ZM14.46 8.20996L9.45996 13.21C9.25977 13.3999 9.00977 13.5 8.75 13.5C8.49023 13.5 8.24023 13.3999 8.04004 13.21L5.54004 10.71C5.15039 10.3198 5.15039 9.68018 5.54004 9.29004C5.92969 8.8999 6.57031 8.8999 6.95996 9.29004L8.75 11.0898L13.04 6.79004C13.4297 6.3999 14.0703 6.3999 14.46 6.79004C14.8496 7.18018 14.8496 7.81982 14.46 8.20996Z" fill="#0e1b4d"/>
      </svg>
    );
  }
  // Inactive — filled gray checkbox (provided asset)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0H3C1.34961 0 0 1.3501 0 3V17C0 18.6499 1.34961 20 3 20H17C18.6504 20 20 18.6499 20 17V3C20 1.3501 18.6504 0 17 0ZM14.46 8.20996L9.45996 13.21C9.25977 13.3999 9.00977 13.5 8.75 13.5C8.49023 13.5 8.24023 13.3999 8.04004 13.21L5.54004 10.71C5.15039 10.3198 5.15039 9.68018 5.54004 9.29004C5.92969 8.8999 6.57031 8.8999 6.95996 9.29004L8.75 11.0898L13.04 6.79004C13.4297 6.3999 14.0703 6.3999 14.46 6.79004C14.8496 7.18018 14.8496 7.81982 14.46 8.20996Z" fill="#E8E8E4"/>
    </svg>
  );
}

export default function Step3() {
  const { data, update, patchSubmission } = useSubmission();
  const [selected, setSelected] = useState<string | null>(data.products[0] || null);
  const { cardRef, navigate } = usePageTransition();

  function select(product: string) {
    setSelected(product);
  }

  const hasSelection = selected !== null;

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Backgrounds */}
      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Step 3 of 5" role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={5}>
        <rect x="4" width="298" height="5" rx="2.5" fill="white"/>
        <rect width="181" height="5" rx="2.5" fill="#0E1B4D"/>
        <rect x="341" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="310" width="23" height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23" height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/step2', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Products</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      {/* White card */}
      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Your ordered product</h1>

        {/* Scrollable list */}
        <ul className={styles.list} role="listbox" aria-multiselectable="false" aria-label="Select your ordered product">
          {PRODUCTS.map((product) => {
            const isChecked = selected === product.id;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isChecked}
                  className={`${styles.item} ${isChecked ? styles.itemActive : ""}`}
                  onClick={() => select(product.id)}
                >
                  <div className={styles.itemContent}>
                    <span className={styles.itemLabel}>{product.label}</span>
                    <span className={styles.itemDescription}>{product.description}</span>
                    <span className={styles.itemBadge}>{CATEGORY_LABELS[product.category]}</span>
                  </div>
                  <span className={styles.itemCheck}>
                    <CheckIcon checked={isChecked} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Gradient fade — masks list bottom edge */}
        <div className={styles.fadeGradient} aria-hidden="true" />

      </div>

      {/* CONTINUE button */}
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={`${styles.btn} ${hasSelection ? styles.btnActive : ""}`}
          onClick={() => {
            if (hasSelection && selected) {
              const arr = [selected];
              update({ products: arr });
              patchSubmission({ products: arr });
              navigate(getNextAfterProduct(selected), 'forward');
            }
          }}
        >
          CONTINUE
        </button>
      </div>
    </main>
  );
}
