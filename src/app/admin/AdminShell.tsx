"use client";

import { ReactNode, createContext, useContext } from "react";
import { AdminAuthGuard } from "./components/AdminAuthGuard";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";
import { useRealtimeSubmissions } from "./hooks/useRealtimeSubmissions";

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

  return (
    <AdminAuthGuard>
      <RealtimeContext.Provider value={{ lastEvent, refresh }}>
        <AdminSidebar />
        <div className="admin-main-column">
          <AdminTopbar
            onRefresh={refresh}
            newSubmission={newSubmission}
            onDismissNewSubmission={dismissNewSubmission}
          />
          <main className="admin-content">{children}</main>
        </div>
      </RealtimeContext.Provider>
    </AdminAuthGuard>
  );
}
