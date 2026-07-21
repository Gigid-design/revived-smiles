"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

import { api } from "@/lib/api";
import type { ImpressionPhoto, SubmissionDraft } from "@/lib/api";

/**
 * The intake in progress.
 *
 * Held locally so every step renders instantly and the dashboard can show
 * progress, then synced through `api.submissions`. Nothing in here knows or
 * cares what is storing the data.
 */
export interface SubmissionState {
  email: string;
  name: string;
  state: string;
  products: string[];
  whiteShade: string | null;
  gumShade: string | null;
  selectedTeeth: number[];
  teethNotSure: boolean;
  /* Teeth photos — bite closed (front, side) and mouth open (front, side). */
  closeBitePhotos: string[];
  openBitePhotos: string[];
  impressionPhotos: ImpressionPhoto[];
  submissionId: string | null;
}

interface SubmissionContextValue {
  data: SubmissionState;
  /** Local-only update. Use for anything not yet ready to persist. */
  update: (patch: Partial<SubmissionState>) => void;
  /** Starts an order. Returns the new submission's id. */
  createDraft: (email: string, userId: string | null) => Promise<string>;
  /** Updates local state and persists the intake fields in one go. */
  saveDraft: (patch: Partial<SubmissionDraft>) => Promise<void>;
  reset: () => void;
}

const SESSION_KEY = "rs_submission_id";

const defaults: SubmissionState = {
  email: "",
  name: "",
  state: "",
  products: [],
  whiteShade: null,
  gumShade: null,
  selectedTeeth: [],
  teethNotSure: false,
  closeBitePhotos: [],
  openBitePhotos: [],
  impressionPhotos: [],
  submissionId: null,
};

const SubmissionContext = createContext<SubmissionContextValue | null>(null);

function readStoredId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function SubmissionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubmissionState>(defaults);

  /* Restore the in-progress order id so a refresh doesn't start over. */
  useEffect(() => {
    const stored = readStoredId();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore on mount
      setData((prev) => (prev.submissionId ? prev : { ...prev, submissionId: stored }));
    }
  }, []);

  const update = useCallback((patch: Partial<SubmissionState>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const createDraft = useCallback(async (email: string, userId: string | null): Promise<string> => {
    const id = await api.submissions.createDraft(email, userId);
    setData((prev) => ({ ...prev, submissionId: id, email }));
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      /* private mode — the id still lives in memory for this session */
    }
    return id;
  }, []);

  const saveDraft = useCallback(
    async (patch: Partial<SubmissionDraft>): Promise<void> => {
      // Local first, so the next screen renders without waiting on the round trip.
      setData((prev) => ({ ...prev, ...patch }) as SubmissionState);

      const id = data.submissionId ?? readStoredId();
      if (!id) return;

      try {
        await api.submissions.updateDraft(id, patch);
      } catch (err) {
        // A failed sync must not block the patient mid-intake; the local copy
        // still carries their answers forward.
        console.error("Could not save intake answers:", err);
      }
    },
    [data.submissionId],
  );

  const reset = useCallback(() => {
    setData(defaults);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing to clear */
    }
  }, []);

  return (
    <SubmissionContext.Provider value={{ data, update, createDraft, saveDraft, reset }}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const ctx = useContext(SubmissionContext);
  if (!ctx) throw new Error("useSubmission must be used inside SubmissionProvider");
  return ctx;
}
