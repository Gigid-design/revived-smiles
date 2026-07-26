"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";
import { ChatBubbleIcon } from "./ChatBubbleIcon";

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    match: (p: string) => p === "/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11.3 2.53a1 1 0 0 1 1.4 0l8 7.7a1 1 0 0 1 .3.72V20a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20v-9.05a1 1 0 0 1 .3-.72z" />
      </svg>
    ),
  },
  {
    href: "/my-order",
    label: "My Orders",
    match: (p: string) => p === "/my-order",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4.6A2.6 2.6 0 0 0 2 4.6v6.6a2 2 0 0 0 .59 1.41l8.2 8.2a2.4 2.4 0 0 0 3.4 0l6.42-6.42a2.4 2.4 0 0 0 0-3.4z" />
        <circle cx="7.4" cy="7.4" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    match: (p: string) => p.startsWith("/messages"),
    /* Shared icon so the flow-screen support button matches this tab exactly. */
    icon: <ChatBubbleIcon />,
  },
];

export function BottomNav({ messagesBadge = 0 }: { messagesBadge?: number }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-label={tab.label}
          >
            <span className={styles.icon}>
              {tab.icon}
              {tab.label === "Messages" && messagesBadge > 0 && (
                <span className={styles.badge}>{messagesBadge > 9 ? "9+" : messagesBadge}</span>
              )}
            </span>
            <span className={styles.label}>{tab.label === "Messages" ? "Chat" : tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
