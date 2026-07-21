"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface NewSubmissionEvent {
  name: string;
  id: string;
}

export function useRealtimeSubmissions() {
  const [lastEvent, setLastEvent] = useState<number>(() => Date.now());
  const [newSubmission, setNewSubmission] = useState<NewSubmissionEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => {
    setLastEvent(Date.now());
  }, []);

  useEffect(() => {
    const unsubscribe = api.submissions.onChange((change) => {
      setLastEvent(Date.now());

      if (change.type !== "created") return;

      setNewSubmission({
        name: change.patientName || "New Patient",
        id: change.submissionId,
      });

      // Auto-clear toast after 8 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNewSubmission(null), 8000);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
    };
  }, []);

  const dismissNewSubmission = useCallback(() => {
    setNewSubmission(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { lastEvent, refresh, newSubmission, dismissNewSubmission };
}
