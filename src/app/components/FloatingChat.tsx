"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "./ChatPanel";
import { useChat } from "../hooks/useChat";
import styles from "./FloatingChat.module.css";

interface FloatingChatProps {
  submissionId: string | null;
  patientName: string;
}

export function FloatingChat({ submissionId, patientName }: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useChat(submissionId, "patient", patientName);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        style={{ display: open ? "none" : undefined }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.fabBadge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat drawer overlay */}
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            {/* Drawer header */}
            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderLeft}>
                <div className={styles.drawerAvatar}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className={styles.drawerTitle}>Care Team</p>
                  <p className={styles.drawerSubtitle}>We typically reply within a few hours</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Chat content */}
            <div className={styles.drawerBody}>
              <ChatPanel
                submissionId={submissionId}
                currentRole="patient"
                currentName={patientName}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
