/**
 * The app's one and only door to a backend.
 *
 *   import { api } from "@/lib/api";
 *   const submission = await api.submissions.getMine();
 *
 * Nothing under `src/app/**` may import a database client, call `fetch`
 * against a data endpoint, or otherwise know where the data lives. If a screen
 * needs something the contract doesn't offer, the answer is to add it to
 * `contract.ts` and implement it here — not to reach around this file.
 *
 * ---------------------------------------------------------------------------
 * Connecting a real backend
 * ---------------------------------------------------------------------------
 *
 * 1. Write a new implementation of `ApiClient` (say `src/lib/api/http/`), using
 *    `contract.ts` as the specification. Its doc comments record the rules the
 *    prototype only enforced in the browser — read them before implementing.
 * 2. Change the one line below to select it.
 * 3. Delete `src/lib/api/mock/`.
 *
 * No screen changes in any of those steps. That is the point of this file.
 */

import type { ApiClient } from "./contract";
import { mockApi } from "./mock";

/** Swap this for a real implementation when the backend is ready. */
export const api: ApiClient = mockApi;

/** Restores the demo to its seeded state. */
export { resetDb } from "./mock";

export {
  CARE_TEAM_NAME,
  DEMO_ADMIN_EMAIL,
  DEMO_IMPRESSION_PHOTO,
  DEMO_PATIENT,
  DEMO_PHOTOS,
  DEMO_SUBMISSION_ID,
} from "./mock";

export type {
  AdminUser,
  AdvisorContext,
  AdvisorMessage,
  AnalysisCheck,
  ApiErrorCode,
  AppNotification,
  AuthEvent,
  AuthUser,
  ChatMessage,
  ImpressionPhoto,
  MessageRole,
  NewPromptConfig,
  NotificationType,
  OAuthProvider,
  Paged,
  PhotoAnalyses,
  PhotoAnalysis,
  PhotoType,
  PromptCheck,
  PromptConfig,
  MessageRequest,
  RequestKind,
  RequestStatus,
  StatusUpdate,
  StoredPhoto,
  Submission,
  SubmissionChange,
  SubmissionDraft,
  SubmissionQuery,
  SubmissionStats,
  SubmissionStatus,
  Timestamp,
  Unsubscribe,
} from "./types";

export {
  ApiError,
  BRANCH_STATUSES,
  PHOTO_TYPE_LABELS,
  PHOTO_TYPE_SLOTS,
  PHOTO_TYPES,
  REQUEST_LABELS,
  REQUEST_OUTCOMES,
  TRAY_REASONS,
  REVIEWABLE_STATUSES,
  WORKFLOW_STATUSES,
  isPhotoType,
  requiresReviewNotes,
} from "./types";

export type { ApiClient } from "./contract";
