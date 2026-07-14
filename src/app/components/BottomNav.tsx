"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    match: (p: string, search: string) => p === "/dashboard" && !search.includes("chat=1"),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11.3 2.53a1 1 0 0 1 1.4 0l8 7.7a1 1 0 0 1 .3.72V20a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20v-9.05a1 1 0 0 1 .3-.72z" />
      </svg>
    ),
  },
  {
    href: "/dashboard?chat=1",
    label: "Messages",
    match: (p: string, search: string) => p === "/dashboard" && search.includes("chat=1"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="6" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="18" cy="12" r="1.7" />
      </svg>
    ),
  },
];

export function BottomNav({ messagesBadge = 0 }: { messagesBadge?: number }) {
  const pathname = usePathname();
  const search = typeof window !== "undefined" ? window.location.search : "";

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = tab.match(pathname, search);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-label={tab.label}
          >
            <span className={`${styles.icon} ${tab.label === "Messages" ? styles.iconChip : ""}`}>
              {tab.icon}
              {tab.label === "Messages" && messagesBadge > 0 && (
                <span className={styles.badge}>{messagesBadge > 9 ? "9+" : messagesBadge}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
