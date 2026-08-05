"use client";

/* Screen 2 — pick the products to adjust. Multiple can be chosen (Gitai, Aug 4:
   "in case both of them have an issue"), so this is a checkbox group, not a
   radio. Only items on the selected order appear. In-scope items are selectable;
   an item the flow doesn't cover is shown but disabled, with a pointer to
   customer service so the order still looks complete. */

import { useState } from "react";
import Link from "next/link";
import type { Submission } from "@/lib/api";
import { productImage, productLabel } from "../../context/productConfig";
import { getAdjustmentProduct } from "../../context/adjustmentConfig";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface ProductScreenProps {
  order: Submission;
  initial: string[];
  onContinue: (products: string[]) => void;
}

export function ProductScreen({ order, initial, onContinue }: ProductScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  /* Deduplicate the order's products by slug so a product bought twice on one
     order doesn't render two rows that fight over the same selection. */
  const slugs = Array.from(new Set(order.products));
  const hasOutOfScope = slugs.some((slug) => getAdjustmentProduct(slug) === null);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>What do you need help with?</h1>
        <p className={styles.subtitle}>
          Choose every appliance you&apos;d like to adjust — you can pick more than one.
        </p>

        <div className={styles.optionList} role="group" aria-label="Products on this order">
          {slugs.map((slug) => {
            const inScope = getAdjustmentProduct(slug) !== null;
            const active = selected.has(slug);
            const image = productImage(slug);
            return (
              <button
                key={slug}
                type="button"
                role="checkbox"
                aria-checked={active}
                disabled={!inScope}
                className={`${styles.option} ${active ? styles.optionSelected : ""} ${!inScope ? styles.optionDisabled : ""}`}
                onClick={() => inScope && toggle(slug)}
              >
                <span className={`${styles.indicator} ${styles.radioSquare}`}>
                  {active && <CheckIcon />}
                </span>
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.optionThumb} src={image} alt="" />
                )}
                <span className={styles.optionBody}>
                  <span className={styles.optionTitle}>{productLabel(slug)}</span>
                  {!inScope && (
                    <span className={styles.optionMeta}>Adjusted through customer service</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {hasOutOfScope && (
          <p className={styles.subtitle}>
            For an item handled by customer service,{" "}
            <Link href="/messages" className={styles.inlineLink}>message the team</Link>.
          </p>
        )}
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          disabled={selected.size === 0}
          onClick={() => selected.size > 0 && onContinue(slugs.filter((s) => selected.has(s)))}
        >
          Continue{selected.size > 1 ? ` (${selected.size})` : ""}
        </button>
      </div>
    </>
  );
}
