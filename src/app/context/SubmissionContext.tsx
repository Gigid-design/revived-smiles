"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
  reset: () => void;
}

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

  function update(patch: Partial<SubmissionState>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setData(defaults);
  }

  return (
    <SubmissionContext.Provider value={{ data, update, reset }}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const ctx = useContext(SubmissionContext);
  if (!ctx) throw new Error("useSubmission must be used inside SubmissionProvider");
  return ctx;
}
