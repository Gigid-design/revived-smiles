"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/api";
import { BottomNav } from "@/app/components/BottomNav";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TYPE_ICONS: Record<string, { bg: string; color: string }> = {
  action_required: { bg: "#fef3c7", color: "#f59e0b" },
  status_update: { bg: "#dbeafe", color: "#3b82f6" },
  info: { bg: "#f0f3ff", color: "#0e1b4d" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      try {
        const rows = await api.notifications.list();
        if (!cancelled) setNotifications(rows);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Could not mark notification as read:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Could not mark notifications as read:", err);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <h1 className={styles.title}>Notifications</h1>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={() => void markAllRead()}>
            Mark all read
          </button>
        )}
      </header>

      {/* Content */}
      <div className={styles.content} id="main-content">
        {loading && (
          <div className={styles.loadingWrap}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className={styles.skeletonCircle} />
                <div style={{ flex: 1 }}>
                  <div className={styles.skeletonLine} style={{ width: "70%" }} />
                  <div className={styles.skeletonLine} style={{ width: "90%", marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>You&apos;re all caught up!</p>
            <p className={styles.emptyMsg}>No notifications yet. We&apos;ll let you know when something needs your attention.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <ul className={styles.list}>
            {notifications.map((notif) => {
              const typeStyle = TYPE_ICONS[notif.type] || TYPE_ICONS.info;
              return (
                <li key={notif.id} className={styles.item}>
                  <button
                    className={`${styles.itemBtn} ${!notif.read ? styles.itemUnread : ""}`}
                    onClick={() => {
                      if (!notif.read) void markAsRead(notif.id);
                    }}
                  >
                    <div className={styles.itemDotCol}>
                      {!notif.read && <span className={styles.unreadDot} />}
                    </div>
                    <div
                      className={styles.itemIcon}
                      style={{ background: typeStyle.bg }}
                    >
                      {notif.type === "action_required" ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={typeStyle.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={typeStyle.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      )}
                    </div>
                    <div className={styles.itemContent}>
                      <p className={styles.itemTitle}>{notif.title}</p>
                      <p className={styles.itemBody}>{notif.body}</p>
                      <p className={styles.itemTime}>{timeAgo(notif.createdAt)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </main>
  );
}
