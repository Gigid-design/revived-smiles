"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Submission, SubmissionStatus } from "@/lib/api";
import { productImage, productLabels } from "@/app/context/productConfig";
import styles from "./OrderSwitcher.module.css";

/* The patient-facing wording for an order status. */
const ORDER_STATUS_COPY: Record<SubmissionStatus, string> = {
  draft: "In progress",
  pending: "In review",
  in_review: "In review",
  changes_requested: "Action needed",
  lab_retake: "Action needed",
  rejected: "Can't proceed with order",
  approved: "Review completed",
  in_fabrication: "In production",
  shipped: "Shipped",
  completed: "Completed",
};

/* The Shopify order number is the reference the patient, support and the lab
   all share, so it leads platform-wide (Aug 21 client review). The derived
   RS- ref only stands in when an order hasn't synced its number yet. */
export function orderReference(order: { id: string; orderNumber?: string | null }): string {
  return order.orderNumber ? `Order ${order.orderNumber}` : `RS-${order.id.slice(0, 8).toUpperCase()}`;
}

function formatPlaced(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* An order's thumbnail = its first product's photo, falling back to the
   generic hero image for an order with no recognised product. */
function orderImage(products: string[]): string {
  return (products.length ? productImage(products[0]) : null) ?? "/assets/images/hero-product.png";
}

interface OrderSwitcherProps {
  /** Every order the patient has, newest first. */
  orders: Submission[];
  selectedId: string;
  onSelect: (id: string) => void;
  /**
   * Status shown on the trigger, when it differs from the selected order's own
   * — `/my-order` passes the one its `?preview=` override is rendering.
   */
  status?: SubmissionStatus;
  /**
   * Draws the bordered surface even for a single order.
   *
   * On `/my-order` this bar sits inside the order card, which already provides
   * the surface, so a lone order reads as a heading rather than a control.
   * Standing on its own — above a conversation, say — it needs its own edges
   * whether or not there is anything to switch to.
   */
  framed?: boolean;
}

/**
 * Which order you're looking at, and a way to change it.
 *
 * One control in two places on purpose. It began on `/my-order`; Messages grew
 * its own row of chips for the same job (Aug 24), and two answers to "which
 * order is this about?" is one more than a patient should have to learn. The
 * chips also scaled badly — three orders filled the row, and a fourth wrapped.
 *
 * With a single order it states the fact and nothing more: no chevron, no
 * menu, not focusable. There is nothing to switch to, and a control that opens
 * onto one option teaches people it isn't worth opening.
 */
export function OrderSwitcher({
  orders,
  selectedId,
  onSelect,
  status,
  framed = false,
}: OrderSwitcherProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);

  const selected = orders.find((o) => o.id === selectedId) ?? orders[0];
  const hasMultiple = orders.length > 1;

  /* Close on an outside click or Escape. */
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (headRef.current && !headRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* An order can vanish from under an open menu — a reseeded demo, a switch on
     another tab. Close rather than leave a menu open over a stale list. */
  useEffect(() => {
    if (!hasMultiple && menuOpen) setMenuOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- closing on a shrunken list
  }, [hasMultiple, menuOpen]);

  if (!selected) return null;

  const shown = status ?? selected.status;
  const isBlocked = shown === "changes_requested" || shown === "lab_retake";

  return (
    <div className={styles.wrap} ref={headRef}>
      <button
        type="button"
        className={`${styles.bar} ${hasMultiple || framed ? styles.barFramed : ""}`}
        onClick={() => hasMultiple && setMenuOpen((o) => !o)}
        disabled={!hasMultiple}
        aria-haspopup={hasMultiple ? "listbox" : undefined}
        aria-expanded={hasMultiple ? menuOpen : undefined}
        aria-label={hasMultiple ? "Switch order" : undefined}
      >
        <span className={styles.barText}>
          <span className={styles.ref}>{orderReference(selected)}</span>
          <span className={styles.placed}>Placed {formatPlaced(selected.createdAt)}</span>
        </span>

        <span className={`${styles.status} ${isBlocked ? styles.statusBlocked : ""}`}>
          {ORDER_STATUS_COPY[shown]}
        </span>

        {hasMultiple && (
          <svg
            className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`}
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {hasMultiple && menuOpen && (
        <div className={styles.menu} role="listbox" aria-label="Your orders">
          {orders.map((o) => {
            const active = o.id === selected.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.menuItem} ${active ? styles.menuItemActive : ""}`}
                onClick={() => {
                  onSelect(o.id);
                  setMenuOpen(false);
                }}
              >
                <div className={styles.menuThumb}>
                  <Image
                    src={orderImage(o.products)}
                    alt=""
                    width={96}
                    height={96}
                    sizes="44px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className={styles.menuText}>
                  <span className={styles.menuName}>
                    {o.products.length ? productLabels(o.products) : "Your order"}
                  </span>
                  <span className={styles.menuMeta}>
                    {orderReference(o)} · {ORDER_STATUS_COPY[o.status]}
                  </span>
                </div>
                {active && (
                  <svg className={styles.menuCheck} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12.5L9.5 18L20 6.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
