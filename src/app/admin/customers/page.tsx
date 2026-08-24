"use client";

/**
 * Customers — one row per person, their whole relationship in one place.
 *
 * Nathan's reframing of the client's "customer-360 tab" ask (Aug 24): not a
 * resurrected submission-detail view, but a Customers list that drills into
 * either the conversation (the working surface) or the record. Groups the
 * submissions the mock exposes by patient email; a real backend serves this
 * as its own customers query.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../submissions/page.module.css";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "@/lib/api";
import type { Submission } from "@/lib/api";
import { formatUsd, productsSubtotalCents } from "@/app/context/productConfig";

interface CustomerRow {
  email: string;
  name: string;
  state: string;
  orders: Submission[];
  spentCents: number;
  lastActivity: string;
}

function initials(name: string): string {
  return name.split(" ").map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminCustomersPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.submissions
      .list({ page: 0, pageSize: 100 })
      .then(({ rows }) => { if (!cancelled) setSubs(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const customers = useMemo<CustomerRow[]>(() => {
    const byEmail = new Map<string, CustomerRow>();
    for (const sub of subs) {
      const key = sub.email;
      const row = byEmail.get(key) ?? {
        email: key,
        name: sub.name ?? "—",
        state: sub.state ?? "—",
        orders: [],
        spentCents: 0,
        lastActivity: sub.createdAt,
      };
      row.orders.push(sub);
      row.spentCents += productsSubtotalCents(sub.products ?? []);
      if (sub.createdAt > row.lastActivity) row.lastActivity = sub.createdAt;
      byEmail.set(key, row);
    }
    const q = query.trim().toLowerCase();
    return [...byEmail.values()]
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [subs, query]);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            placeholder="Search customers by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        <span className={styles.resultCount}>
          {customers.length} customer{customers.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className={styles.emptyState}>No customers match your search.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>State</th>
                <th>Orders</th>
                <th>Latest status</th>
                <th>Total spent</th>
                <th>Last activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const latest = c.orders[0];
                return (
                  <tr key={c.email}>
                    <td>
                      <span className={styles.nameCell}>
                        <span className={styles.nameText}>{initials(c.name)} · {c.name}</span>
                        <span className={styles.emailText}>{c.email}</span>
                      </span>
                    </td>
                    <td>{c.state}</td>
                    <td>
                      {c.orders.map((o) => (
                        <span key={o.id} className={styles.productBadge}>
                          {o.orderNumber ?? o.id}
                        </span>
                      ))}
                    </td>
                    <td><StatusBadge status={latest.status} /></td>
                    <td><span className={styles.dateText}>{formatUsd(c.spentCents)}</span></td>
                    <td><span className={styles.dateText}>{formatDate(c.lastActivity)}</span></td>
                    <td>
                      <span style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <Link href="/admin/chat" style={{ textDecoration: "none", fontWeight: 600 }}>Chat</Link>
                        <Link href={`/admin/submissions/${latest.id}`} style={{ textDecoration: "none", fontWeight: 600 }}>Record</Link>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
