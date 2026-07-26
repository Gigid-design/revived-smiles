"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "./ChatPanel";
import { ChatBubbleIcon } from "./ChatBubbleIcon";
import { useChat } from "../hooks/useChat";
import styles from "./FloatingChat.module.css";

interface FloatingChatProps {
  submissionId: string | null;
  patientName: string;
  /** "fab" floats bottom-right; "inline" sits in a bottom action row beside a CTA. */
  variant?: "fab" | "inline";
}

export function FloatingChat({ submissionId, patientName, variant = "fab" }: FloatingChatProps) {
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
      {/* Trigger — floating FAB or an inline circle beside a CTA */}
      <button
        type="button"
        className={variant === "inline" ? styles.inlineBtn : styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Contact support"
        style={variant === "fab" && open ? { display: "none" } : undefined}
      >
        <ChatBubbleIcon size={20} fill={variant === "inline" ? "#121723" : "#ffffff"} />
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
                  <ChatBubbleIcon size={18} fill="#ffffff" />
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
