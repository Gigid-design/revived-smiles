"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/* Support requests raised by the customer from Messages (e.g. "send me more
   impression material", "my trays are the wrong size"). Support accepts or
   rejects them; an accepted request is reflected back to the customer and
   tracked in My Order.

   NOTE: this is UI state only. Wiring requests to the backend — and whether an
   accepted request writes through to Shopify — is a separate scope. */

export type RequestKind = "material" | "trays";
export type RequestStatus = "pending" | "accepted" | "rejected";

export interface SupportRequest {
  id: string;
  kind: RequestKind;
  /** Reason picked in the form, e.g. "Trays too big". Empty for plain material requests. */
  detail: string;
  note: string;
  status: RequestStatus;
  createdAt: string;
  /** What the customer sees once accepted, e.g. "New trays sent". */
  outcome: string | null;
  /** Placeholder tracking reference once fulfilled. */
  tracking: string | null;
}

export const REQUEST_LABELS: Record<RequestKind, string> = {
  material: "More impression material",
  trays: "Different tray size",
};

/** What support sends when it accepts each kind of request. */
const OUTCOMES: Record<RequestKind, string> = {
  material: "New impression material sent",
  trays: "New trays sent",
};

const STORAGE_KEY = "rs_support_requests";
const DESIGN_MODE = process.env.NEXT_PUBLIC_DESIGN_MODE === "1";

/* Design mode: start with one already-accepted request so the tracking UI in
   My Order is visible without having to create one first. */
function seedRequests(): SupportRequest[] {
  const now = Date.now();
  return [
    {
      id: "demo-req-1",
      kind: "trays",
      detail: "Trays too small",
      note: "",
      status: "accepted",
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
      outcome: OUTCOMES.trays,
      tracking: "1Z999AA10123456784",
    },
  ];
}

interface RequestsContextValue {
  requests: SupportRequest[];
  /** Raise a new request. Starts as "pending" until support responds. */
  addRequest: (kind: RequestKind, detail: string, note: string) => SupportRequest;
  /** Support's decision. Accepting fills in the outcome + tracking reference. */
  setStatus: (id: string, status: RequestStatus) => void;
}

const RequestsContext = createContext<RequestsContextValue | null>(null);

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Restore from sessionStorage so requests survive moving between tabs. */
  useEffect(() => {
    let initial: SupportRequest[] = [];
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
      else if (DESIGN_MODE) initial = seedRequests();
    } catch {
      if (DESIGN_MODE) initial = seedRequests();
    }
    setRequests(initial); // eslint-disable-line react-hooks/set-state-in-effect -- one-time restore on mount
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests)); } catch {}
  }, [requests, hydrated]);

  const addRequest = useCallback((kind: RequestKind, detail: string, note: string) => {
    const req: SupportRequest = {
      id: `req-${Date.now()}`,
      kind,
      detail,
      note,
      status: "pending",
      createdAt: new Date().toISOString(),
      outcome: null,
      tracking: null,
    };
    setRequests((prev) => [...prev, req]);
    return req;
  }, []);

  const setStatus = useCallback((id: string, status: RequestStatus) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              outcome: status === "accepted" ? OUTCOMES[r.kind] : null,
              tracking: status === "accepted" ? "1Z999AA10123456784" : null,
            }
          : r
      )
    );
  }, []);

  return (
    <RequestsContext.Provider value={{ requests, addRequest, setStatus }}>
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error("useRequests must be used inside RequestsProvider");
  return ctx;
}
