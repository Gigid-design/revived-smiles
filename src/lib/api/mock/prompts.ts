/**
 * Prompt configuration for the photo analyser.
 *
 * Versioning behaves as specified: saving a version makes it the sole active
 * one for that pose, and restoring an older version does the same. Unlike the
 * old two-step database write, this cannot leave a pose with no active prompt.
 *
 * The advisor is scripted. The real system prompt and its block protocol are
 * preserved in `docs/backend-contract/prompt-advisor.md`.
 */

import { nanoid } from "nanoid";

import type { PromptsApi } from "../contract";
import type { AdvisorContext, AdvisorMessage, PhotoType, PromptConfig } from "../types";
import { ApiError, PHOTO_TYPES } from "../types";

type PhotoConfigMap = Record<PhotoType, PromptConfig[]>;
import { clone, delay, getDb, mutate, nowIso } from "./store";

function byVersionDesc(a: PromptConfig, b: PromptConfig): number {
  return b.version - a.version;
}

export const mockPrompts: PromptsApi = {
  async listAll() {
    await delay();

    const grouped = {} as PhotoConfigMap;
    PHOTO_TYPES.forEach((photoType) => {
      grouped[photoType] = clone(
        getDb().promptConfigs.filter((c) => c.photoType === photoType).sort(byVersionDesc),
      );
    });
    return grouped;
  },

  async listByType(photoType) {
    await delay();
    return clone(
      getDb().promptConfigs.filter((c) => c.photoType === photoType).sort(byVersionDesc),
    );
  },

  async getActive(photoType) {
    await delay(60);
    const active = getDb().promptConfigs.find((c) => c.photoType === photoType && c.isActive);
    return active ? clone(active) : null;
  },

  async create(input) {
    await delay();

    if (!input.label.trim() || !input.poseDescription.trim()) {
      throw new ApiError("validation", "A version needs a label and a pose description.");
    }
    if (input.contentChecks.length === 0) {
      throw new ApiError("validation", "Add at least one content check.");
    }
    if (!input.changeNotes.trim()) {
      throw new ApiError("validation", "Describe what you changed and why.");
    }

    return mutate((db) => {
      const siblings = db.promptConfigs.filter((c) => c.photoType === input.photoType);
      const nextVersion = siblings.reduce((max, c) => Math.max(max, c.version), 0) + 1;

      // Deactivate and insert together, so there is never a moment with no
      // active prompt for this pose.
      siblings.forEach((c) => {
        c.isActive = false;
      });

      const created: PromptConfig = {
        id: `prompt-${nanoid(8)}`,
        photoType: input.photoType,
        version: nextVersion,
        label: input.label.trim(),
        poseDescription: input.poseDescription.trim(),
        contentChecks: input.contentChecks,
        qualityChecks: input.qualityChecks ?? [],
        isActive: true,
        createdBy: input.createdBy ?? "Admin",
        changeNotes: input.changeNotes.trim(),
        createdAt: nowIso(),
      };

      db.promptConfigs.push(created);
      return clone(created);
    });
  },

  async activate(id, photoType) {
    await delay();

    mutate((db) => {
      const exists = db.promptConfigs.some((c) => c.id === id);
      if (!exists) throw new ApiError("not_found", "That prompt version could not be found.");

      db.promptConfigs.forEach((c) => {
        if (c.photoType === photoType) c.isActive = c.id === id;
      });
    });
  },

  async advise(messages: AdvisorMessage[], context?: AdvisorContext) {
    await delay(1200);

    const last = messages.findLast((m) => m.role === "user")?.content ?? "";
    const pose = context?.photoLabel ?? context?.photoType ?? "this photo type";

    if (/^yes, apply this change/i.test(last.trim())) {
      return [
        ":::success",
        "Applied. A new version is now live for " + pose + ".",
        ":::",
        "",
        "In the demo this is a scripted reply — no prompt version was written. " +
          "With a backend attached, the advisor saves a new version and it becomes active immediately.",
      ].join("\n");
    }

    return [
      `Here's how I read the checks for **${pose}**.`,
      "",
      ":::current",
      "The active version asks the analyser to confirm the pose is correct, then grades sharpness, lighting, framing and glare separately.",
      ":::",
      "",
      ":::proposed",
      "Tighten the lighting check so a shadow across the gum line fails, rather than only overall darkness. That is the failure most often missed on side photos.",
      ":::",
      "",
      ":::warning",
      "This is the demo advisor and its answers are scripted. Connect a backend to get real analysis of your prompt history and pass rates.",
      ":::",
    ].join("\n");
  },
};
