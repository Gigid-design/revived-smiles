/**
 * Faked photo capture and analysis.
 *
 * The analyser reads the same prompt config the admin screen edits, so a
 * change made in the admin demo genuinely shows up in the patient capture
 * flow. It always returns a pass: a demo that randomly fails a photo in front
 * of an audience is worse than one that never does.
 *
 * The tuned production prompt and the real response contract are preserved in
 * `docs/backend-contract/photo-analysis.md`.
 */

import { nanoid } from "nanoid";

import type { PhotosApi } from "../contract";
import type { AnalysisCheck, PhotoAnalysis, PhotoType } from "../types";
import { ApiError, PHOTO_TYPE_SLOTS } from "../types";
import { clone, delay, getDb, mutate } from "./store";

/** Long enough that the "analysing" state is legible, short enough to feel snappy. */
const ANALYSIS_MS = 900;

const SUMMARIES: Record<PhotoType, string> = {
  "close-bite-front": "Clear front view with both arches visible.",
  "close-bite-side": "Good side angle — the back teeth are in frame.",
  "open-bite-front": "Mouth is open wide enough to read the gum line.",
  "open-bite-side": "The back of the ridge is visible and in focus.",
};

const CENTERS: Record<PhotoType, { x: number; y: number }> = {
  "close-bite-front": { x: 0.5, y: 0.52 },
  "close-bite-side": { x: 0.46, y: 0.5 },
  "open-bite-front": { x: 0.5, y: 0.54 },
  "open-bite-side": { x: 0.47, y: 0.52 },
};

/** Falls back to a generic set if the admin has deleted every prompt version. */
const FALLBACK_CHECKS: AnalysisCheck[] = [
  { id: "is_dental", label: "Dental photo", pass: true, detail: "The mouth is clearly in frame." },
  { id: "blur", label: "Sharpness", pass: true, detail: "In focus." },
  { id: "lighting", label: "Lighting", pass: true, detail: "Evenly lit." },
  { id: "framing", label: "Framing", pass: true, detail: "Well framed." },
  { id: "glare", label: "Glare", pass: true, detail: "No hotspots." },
];

function checksFor(photoType: PhotoType): AnalysisCheck[] {
  const active = getDb().promptConfigs.find((c) => c.photoType === photoType && c.isActive);
  if (!active) return clone(FALLBACK_CHECKS);

  return [...active.contentChecks, ...active.qualityChecks].map((check) => ({
    id: check.id,
    label: check.label,
    pass: true,
    detail: check.requirement,
  }));
}

export const mockPhotos: PhotosApi = {
  async analyze(image, photoType) {
    if (!image) throw new ApiError("validation", "No photo was captured.");
    await delay(ANALYSIS_MS);

    const active = getDb().promptConfigs.find((c) => c.photoType === photoType && c.isActive);

    const analysis: PhotoAnalysis = {
      checks: checksFor(photoType),
      summary: SUMMARIES[photoType] ?? "Photo looks good.",
      teethCenter: CENTERS[photoType] ?? { x: 0.5, y: 0.5 },
      pass: true,
      promptConfigId: active?.id,
    };
    return analysis;
  },

  async upload(file, kind) {
    await delay();

    // Nothing to upload to, so the blob becomes a URL the browser can render.
    // A real implementation returns a stored object's URL instead.
    const url =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : "";

    return { url, path: `${kind}/${Date.now()}-${nanoid(6)}` };
  },

  async attachToSubmission(submissionId, photoType, url, analysis) {
    await delay();

    mutate((db) => {
      const row = db.submissions.find((s) => s.id === submissionId);
      if (!row) throw new ApiError("not_found", "That order could not be found.");

      const { field, index } = PHOTO_TYPE_SLOTS[photoType];
      const photos = [...row[field]];
      photos[index] = url;
      row[field] = photos;

      if (analysis) {
        row.photoAnalyses = { ...row.photoAnalyses, [photoType]: analysis };
      }
    });
  },
};
