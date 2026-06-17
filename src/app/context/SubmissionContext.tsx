"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";

export interface SubmissionState {
  email: string;
  name: string;
  state: string;
  products: string[];
  whiteShade: string | null;
  gumShade: string | null;
  selectedTeeth: number[];
  teethNotSure: boolean;
  impressionPhotos: { slot: number; url: string; path: string }[];
  submissionId: string | null;
}

interface SubmissionContextValue {
  data: SubmissionState;
  update: (patch: Partial<SubmissionState>) => void;
  /** Create a draft submission row in Supabase. Returns the new row's ID. */
  createDraft: (email: string, userId: string) => Promise<string>;
  /** Patch the current draft row in Supabase with the given DB-column fields. */
  patchSubmission: (fields: Record<string, unknown>) => Promise<void>;
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
  impressionPhotos: [],
  submissionId: null,
};

const SubmissionContext = createContext<SubmissionContextValue | null>(null);

export function SubmissionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubmissionState>(defaults);

  /* Restore submissionId from sessionStorage on mount */
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored && !data.submissionId) {
        setData((prev) => ({ ...prev, submissionId: stored })); // eslint-disable-line react-hooks/set-state-in-effect -- restoring persisted submissionId on mount
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<SubmissionState>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  const createDraft = useCallback(async (email: string, userId: string): Promise<string> => {
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("submissions")
      .insert({ email, user_id: userId, status: "draft" })
      .select("id")
      .single();

    if (error) throw error;

    const id = row.id as string;
    setData((prev) => ({ ...prev, submissionId: id, email }));
    try { sessionStorage.setItem(SESSION_KEY, id); } catch {}
    return id;
  }, []);

  const patchSubmission = useCallback(async (fields: Record<string, unknown>): Promise<void> => {
    const id = data.submissionId || (() => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } })();
    if (!id) {
      console.warn("patchSubmission called without a submission ID");
      return;
    }
    try {
      const res = await fetch("/api/patch-submission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, fields }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("patchSubmission failed:", err);
      }
    } catch (err) {
      console.error("patchSubmission failed:", err);
    }
  }, [data.submissionId]);

  function reset() {
    setData(defaults);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  return (
    <SubmissionContext.Provider value={{ data, update, createDraft, patchSubmission, reset }}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const ctx = useContext(SubmissionContext);
  if (!ctx) throw new Error("useSubmission must be used inside SubmissionProvider");
  return ctx;
}
