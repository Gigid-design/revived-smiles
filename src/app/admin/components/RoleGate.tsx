"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAdminUser } from "./AdminAuthGuard";
import { ADMIN_SECTION_LABELS, canAccess, STAFF_ROLE_LABELS } from "@/lib/api";
import type { AdminSection } from "@/lib/api";
import styles from "./RoleGate.module.css";

/**
 * Renders a section only for the roles provisioned to see it.
 *
 * The sidebar already hides what a role cannot open, so most people never meet
 * this. It exists for the ones who do: a bookmarked URL, a link pasted into
 * chat, a shared screenshot. The ask on Aug 25 was that such a visit reads as
 * a deliberate boundary rather than a broken page — an empty screen looks like
 * the portal failed, and support raises a ticket about it.
 *
 * Not a security boundary. The adapter refuses these calls too, and a real
 * backend must refuse them again; this only decides what a person is shown.
 */
export function RoleGate({ section, children }: { section: AdminSection; children: ReactNode }) {
  const user = useAdminUser();

  /* The guard above renders nothing until the session resolves, so a null user
     here means the shell is still settling — not that access was refused. */
  if (!user) return null;
  if (canAccess(user.role, section)) return <>{children}</>;

  return (
    <div className={styles.gate} role="status">
      <div className={styles.icon} aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
          <path d="M12 14.5v2" />
        </svg>
      </div>

      <h1 className={styles.title}>{ADMIN_SECTION_LABELS[section]} isn&apos;t part of your role</h1>

      <p className={styles.body}>
        You&apos;re signed in as <strong>{user.name}</strong>, a{" "}
        {STAFF_ROLE_LABELS[user.role].toLowerCase()} account. A manager can change what your role
        reaches — nothing is wrong with this page or with your sign-in.
      </p>

      <Link href="/admin" className={styles.back}>
        Back to the dashboard
      </Link>
    </div>
  );
}
