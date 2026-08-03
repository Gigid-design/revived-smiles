"use client";

/* Screen 1 — pick the order. Their orders, newest first, with enough detail to
   tell them apart. The shell skips straight past this when there's only one. */

import { useState } from "react";
import type { Submission } from "@/lib/api";
import { productLabels } from "../../context/productConfig";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface OrderScreenProps {
  orders: Submission[];
  initial: string | null;
  onContinue: (submissionId: string) => void;
}

function orderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function OrderScreen({ orders, initial, onContinue }: OrderScreenProps) {
  const [selected, setSelected] = useState<string | null>(initial);

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>Which order do you need help with?</h1>
        <p className={styles.subtitle}>Pick the order the appliance came from.</p>

        <div className={styles.optionList} role="radiogroup" aria-label="Your orders">
          {orders.map((order) => {
            const active = order.id === selected;
            return (
              <button
                key={order.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.option} ${active ? styles.optionSelected : ""}`}
                onClick={() => setSelected(order.id)}
              >
                <span className={styles.indicator}>{active && <CheckIcon />}</span>
                <span className={styles.optionBody}>
                  <span className={styles.optionTitle}>{order.orderNumber ?? "Your order"}</span>
                  <span className={styles.optionMeta}>
                    {orderDate(order.createdAt)} · {productLabels(order.products)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          disabled={!selected}
          onClick={() => selected && onContinue(selected)}
        >
          Continue
        </button>
      </div>
    </>
  );
}
