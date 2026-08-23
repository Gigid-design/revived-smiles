/**
 * Shared presentation helpers for the admin adjustment-request screens.
 *
 * Keeps the queue and the detail view reading the same labels, so a change to
 * how an issue or answer is phrased lands in one place. The customer-facing copy
 * lives in `adjustmentConfig.ts`; this only maps the stored request onto it.
 */

import type {
  AdjustmentAnswers,
  AdjustmentPhotos,
  AdjustmentStatus,
} from "@/lib/api";
import { ISSUE_LABELS } from "@/app/context/adjustmentConfig";

/** The badge palette for an adjustment status — mirrors StatusBadge's language. */
export const ADJ_STATUS_META: Record<
  AdjustmentStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "Draft", bg: "#f1f5f9", text: "#475569" },
  pending: { label: "Pending Review", bg: "#fef3c7", text: "#92400e" },
  changes_requested: { label: "Changes Requested", bg: "#ffedd5", text: "#9a3412" },
  approved: { label: "Approved", bg: "#dcfce7", text: "#166534" },
  received: { label: "Received at Lab", bg: "#e0e7ff", text: "#3730a3" },
  delivered: { label: "Adjusted & Delivered", bg: "#dcfce7", text: "#166534" },
  /* Client copy (Aug 21): the same words the patient sees. */
  rejected: { label: "Unable to Adjust", bg: "#fee2e2", text: "#991b1b" },
};

/** Human label for one stored issue id. */
export function issueLabel(id: keyof typeof ISSUE_LABELS): string {
  return ISSUE_LABELS[id] ?? id;
}

/** One structured answer, flattened to a label/value row for display. */
export interface AnswerRow {
  label: string;
  value: string;
}

/**
 * The structured Screen-5 answers a request carries, as display rows. Only the
 * fields actually present appear — a request never carries every field.
 */
export function answerRows(answers: AdjustmentAnswers): AnswerRow[] {
  const rows: AnswerRow[] = [];
  if (answers.woreForFiveDays !== undefined) {
    rows.push({ label: "Worn 5+ days", value: answers.woreForFiveDays ? "Yes" : "No" });
  }
  if (answers.completedHotWaterActivation !== undefined) {
    rows.push({
      label: "Hot-water activation done",
      value: answers.completedHotWaterActivation ? "Yes" : "No",
    });
  }
  if (answers.looseSnug) {
    rows.push({ label: "Was it ever snug?", value: answers.looseSnug });
  }
  if (answers.fitDescription) {
    rows.push({ label: "Fit", value: answers.fitDescription });
  }
  if (answers.crackedHasAllPieces !== undefined) {
    rows.push({ label: "Has all pieces", value: answers.crackedHasAllPieces ? "Yes" : "No" });
  }
  if (answers.newToothShade) {
    rows.push({ label: "Requested tooth shade", value: answers.newToothShade });
  }
  if (answers.newGumShade) {
    rows.push({ label: "Requested gum shade", value: answers.newGumShade });
  }
  return rows;
}

/** The photo roles, in a stable display order, with human labels. */
const PHOTO_ROLE_LABELS: Array<{ key: keyof AdjustmentPhotos; label: string }> = [
  { key: "inMouth", label: "In mouth" },
  { key: "onModels", label: "On models" },
  { key: "biteStrip", label: "Bite strip" },
  { key: "markedModels", label: "Marked models" },
  { key: "damage", label: "Damage" },
];

/** The photos actually attached to a request, as {url, label} for the viewer. */
export function photoList(photos: AdjustmentPhotos): { url: string; label: string }[] {
  return PHOTO_ROLE_LABELS.flatMap(({ key, label }) => {
    const url = photos[key];
    return url ? [{ url, label }] : [];
  });
}
