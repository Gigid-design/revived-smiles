"use client";

import { ReactNode, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";
import { AdminAuthGuard, isPublicAdminPath } from "./components/AdminAuthGuard";
import { AdminSidebar } from "./components/AdminSidebar";
import { RoleGate } from "./components/RoleGate";
import { AdminTopbar } from "./components/AdminTopbar";
import { useRealtimeSubmissions } from "./hooks/useRealtimeSubmissions";
import type { AdminSection } from "@/lib/api";

/**
 * Which section each route belongs to, longest prefix first.
 *
 * Gating lives here rather than in each page so a route added later is covered
 * by default: an unmapped path falls through to `"dashboard"`, which every role
 * can reach, so a new screen is visible until someone decides otherwise —
 * never silently locked, and never silently exempt from the sidebar's rules.
 *
 * `/admin/submissions` is the full-record fallback linked from the dashboard;
 * it shows what the chat rail shows, so it answers to the same section.
 */
const ROUTE_SECTIONS: [prefix: string, section: AdminSection][] = [
  ["/admin/analytics", "analytics"],
  ["/admin/adjustments", "adjustments"],
  ["/admin/customers", "customers"],
  ["/admin/submissions", "chat"],
  ["/admin/chat", "chat"],
  ["/admin/prompts", "prompts"],
];

function sectionFor(pathname: string): AdminSection {
  return ROUTE_SECTIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "dashboard";
}

/** Context so child pages can access realtime state without prop drilling */
interface RealtimeContextValue {
  lastEvent: number;
  refresh: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({ lastEvent: 0, refresh: () => {} });

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { lastEvent, refresh, newSubmission, dismissNewSubmission } = useRealtimeSubmissions();
  const pathname = usePathname();

  return (
    <AdminAuthGuard>
      <RealtimeContext.Provider value={{ lastEvent, refresh }}>
        <AdminSidebar />
        <div className={styles.mainColumn}>
          <AdminTopbar
            onRefresh={refresh}
            newSubmission={newSubmission}
            onDismissNewSubmission={dismissNewSubmission}
          />
          <main className={styles.content}>
            {isPublicAdminPath(pathname) ? (
              children
            ) : (
              <RoleGate section={sectionFor(pathname)}>{children}</RoleGate>
            )}
          </main>
        </div>
      </RealtimeContext.Provider>
    </AdminAuthGuard>
  );
}
