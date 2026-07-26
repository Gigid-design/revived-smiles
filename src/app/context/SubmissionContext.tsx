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
  /* Optional free-text note the patient can add during intake. */
  notes: string;
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
  /**
   * The id of the order being worked on, creating one if there isn't one yet.
   *
   * Resolves in order: the id already in memory, the id kept for this session,
   * the signed-in patient's most recent order, and finally a fresh draft.
   * Screens must call this rather than reaching for the id themselves — five
   * of them used to, and every one of them broke if you entered the flow
   * anywhere other than the sign-in screen.
   */
  ensureSubmissionId: () => Promise<string>;
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
  notes: "",
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

function writeStoredId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode — the id still lives in memory for this session */
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
    writeStoredId(id);
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

  const ensureSubmissionId = useCallback(async (): Promise<string> => {
    const known = data.submissionId ?? readStoredId();

    /* Never trust a remembered id without confirming the order still exists.
       It outlives the data it points at — a reseeded demo, a cleared backend,
       a deleted order — and a stale one used to wedge the flow permanently
       with "that order could not be found" until storage was cleared by hand. */
    if (known) {
      try {
        await api.submissions.getById(known);
        return known;
      } catch {
        writeStoredId(null);
        setData((prev) => ({ ...prev, submissionId: null }));
      }
    }

    /* Entered the flow without signing in — adopt the order already on file
       before starting a new one, so progress isn't split across two drafts. */
    const mine = await api.submissions.getMine();
    if (mine) {
      setData((prev) => ({
        ...prev,
        submissionId: mine.id,
        email: prev.email || mine.email,
      }));
      writeStoredId(mine.id);
      return mine.id;
    }

    const user = await api.auth.getUser();
    return createDraft(user?.email ?? data.email, user?.id ?? null);
  }, [data.submissionId, data.email, createDraft]);

  const reset = useCallback(() => {
    setData(defaults);
    writeStoredId(null);
  }, []);

  return (
    <SubmissionContext.Provider
      value={{ data, update, createDraft, saveDraft, ensureSubmissionId, reset }}
    >
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const ctx = useContext(SubmissionContext);
  if (!ctx) throw new Error("useSubmission must be used inside SubmissionProvider");
  return ctx;
}
