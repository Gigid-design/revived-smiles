"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

interface NewSubmissionEvent {
  name: string;
  id: string;
}

export function useRealtimeSubmissions() {
  const [lastEvent, setLastEvent] = useState<number>(Date.now());
  const [newSubmission, setNewSubmission] = useState<NewSubmissionEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => {
    setLastEvent(Date.now());
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    const channel = supabase
      .channel("submissions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          const row = payload.new as { name?: string; id?: string };
          setNewSubmission({ name: row.name || "New Patient", id: row.id || "" });
          setLastEvent(Date.now());

          // Auto-clear toast after 8 seconds
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setNewSubmission(null), 8000);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions" },
        () => {
          setLastEvent(Date.now());
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNewSubmission = useCallback(() => {
    setNewSubmission(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { lastEvent, refresh, newSubmission, dismissNewSubmission };
}
