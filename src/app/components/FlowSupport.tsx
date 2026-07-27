"use client";

import { FloatingChat } from "./FloatingChat";
import { useSubmission } from "../context/SubmissionContext";

/**
 * Drop-in "contact support" affordance for the intake / photo flow screens,
 * where there's no bottom nav to reach Messages. Reads the submission context
 * itself so a page only needs `<FlowSupport />` — no prop wiring — and every
 * step gets the same floating chat, as Gitai asked ("an option to contact
 * support at the bottom of every slide").
 *
 * `variant` defaults to the inline circle that sits beside a bottom CTA. The
 * camera steps have no such CTA row (their bottom is the shutter/controls), so
 * they pass `"fab"` for the self-positioning floating button instead.
 */
export function FlowSupport({ variant = "inline" }: { variant?: "inline" | "fab" }) {
  const { data } = useSubmission();
  const patientName = data.name?.trim().split(" ")[0] || "there";
  return <FloatingChat submissionId={data.submissionId} patientName={patientName} variant={variant} />;
}
