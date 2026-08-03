"use client";

/* Screen 2 — pick the product. Only items on the selected order appear, so the
   customer cannot pick something they never bought. Out-of-scope items still
   show (so the order doesn't look incomplete) but route to customer service. */

import { useState } from "react";
import type { Submission } from "@/lib/api";
import { productImage, productLabel } from "../../context/productConfig";
import { OUT_OF_SCOPE_MESSAGE, getAdjustmentProduct } from "../../context/adjustmentConfig";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface ProductScreenProps {
  order: Submission;
  initial: string | null;
  onContinue: (product: string) => void;
  onOutOfScope: () => void;
}

export function ProductScreen({ order, initial, onContinue, onOutOfScope }: ProductScreenProps) {
  const [selected, setSelected] = useState<string | null>(initial);
  const inScope = selected ? getAdjustmentProduct(selected) !== null : false;
  const showOutOfScope = selected !== null && !inScope;

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>Which product do you need help with?</h1>
        <p className={styles.subtitle}>These are the items on {order.orderNumber ?? "your order"}.</p>

        <div className={styles.optionList} role="radiogroup" aria-label="Products on this order">
          {order.products.map((slug, i) => {
            const active = slug === selected;
            const image = productImage(slug);
            return (
              <button
                key={`${slug}-${i}`}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.option} ${active ? styles.optionSelected : ""}`}
                onClick={() => setSelected(slug)}
              >
                <span className={styles.indicator}>{active && <CheckIcon />}</span>
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.optionThumb} src={image} alt="" />
                )}
                <span className={styles.optionBody}>
                  <span className={styles.optionTitle}>{productLabel(slug)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {showOutOfScope && <p className={styles.emphasis}>{OUT_OF_SCOPE_MESSAGE}</p>}
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            if (inScope) onContinue(selected);
            else onOutOfScope();
          }}
        >
          {showOutOfScope ? "Contact customer service" : "Continue"}
        </button>
      </div>
    </>
  );
}
