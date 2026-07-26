"use client";

import { FloatingChat } from "./FloatingChat";
import { useSubmission } from "../context/SubmissionContext";

/**
 * Drop-in "contact support" affordance for the intake / photo flow screens,
 * where there's no bottom nav to reach Messages. Reads the submission context
 * itself so a page only needs `<FlowSupport />` — no prop wiring — and every
 * step gets the same floating chat, as Gitai asked ("an option to contact
 * support at the bottom of every slide").
 */
export function FlowSupport() {
  const { data } = useSubmission();
  const patientName = data.name?.trim().split(" ")[0] || "there";
  return <FloatingChat submissionId={data.submissionId} patientName={patientName} variant="inline" />;
}
