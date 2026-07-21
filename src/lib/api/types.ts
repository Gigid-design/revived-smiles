/**
 * The domain model for Revived Smiles.
 *
 * This is the single source of truth for the shapes that move between the UI
 * and whatever backend sits behind `ApiClient`. Before this file existed the
 * submission shape was redeclared in five screens with contradictory
 * nullability, and the photo-check shape in six.
 *
 * Naming: the front end speaks camelCase everywhere. Any snake_case is a
 * detail of a particular backend and belongs inside that backend's adapter,
 * never in a screen.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Cancels a subscription. Safe to call more than once. */
export type Unsubscribe = () => void;

/** ISO-8601 timestamp, e.g. "2026-07-21T10:34:00.000Z". */
export type Timestamp = string;

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

/**
 * The four guided teeth photos, in capture order.
 *
 * This slug is the app's most load-bearing string: it keys the capture
 * screens, the analysis request, the stored analysis map, and the prompt
 * config for that pose. It was a bare `string` in every signature before.
 */
export type PhotoType =
  | "close-bite-front"
  | "close-bite-side"
  | "open-bite-front"
  | "open-bite-side";

export const PHOTO_TYPES: readonly PhotoType[] = [
  "close-bite-front",
  "close-bite-side",
  "open-bite-front",
  "open-bite-side",
] as const;

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  "close-bite-front": "Close Bite — Front",
  "close-bite-side": "Close Bite — Side",
  "open-bite-front": "Open Bite — Front",
  "open-bite-side": "Open Bite — Side",
};

/** Which submission field a given pose is stored in, and at which index. */
export const PHOTO_TYPE_SLOTS: Record<
  PhotoType,
  { field: "closeBitePhotos" | "openBitePhotos"; index: 0 | 1 }
> = {
  "close-bite-front": { field: "closeBitePhotos", index: 0 },
  "close-bite-side": { field: "closeBitePhotos", index: 1 },
  "open-bite-front": { field: "openBitePhotos", index: 0 },
  "open-bite-side": { field: "openBitePhotos", index: 1 },
};

export function isPhotoType(value: string): value is PhotoType {
  return (PHOTO_TYPES as readonly string[]).includes(value);
}

/** One criterion the analyser graded a photo against. */
export interface AnalysisCheck {
  /** e.g. "teeth_visible", "blur". Keys the remediation copy on the capture screens. */
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  observation?: string;
}

/** The analyser's verdict on a single photo. */
export interface PhotoAnalysis {
  checks: AnalysisCheck[];
  summary: string | null;
  /** Normalised 0–1 coordinates used to centre the on-screen guide. */
  teethCenter: { x: number; y: number } | null;
  pass: boolean;
  /** Which prompt version produced this verdict, for admin traceability. */
  promptConfigId?: string;
}

/** Analyses stored against a submission, keyed by pose. Poses may be missing. */
export type PhotoAnalyses = Partial<Record<PhotoType, PhotoAnalysis>>;

/** A stored image. `path` is the backend's own key; the UI only needs `url`. */
export interface StoredPhoto {
  url: string;
  path: string;
}

/** The four impression-tray photos, identified by slot rather than by pose. */
export interface ImpressionPhoto extends StoredPhoto {
  slot: 1 | 2 | 3 | 4;
}

/* ------------------------------------------------------------------ */
/* Submissions                                                         */
/* ------------------------------------------------------------------ */

/**
 * The order lifecycle.
 *
 * `draft` is included deliberately — it is a real, heavily used status that
 * the old status union omitted, forcing three screens to cast around the gap.
 */
export type SubmissionStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "in_fabrication"
  | "shipped"
  | "completed";

/** The happy path, in order. Excludes the two branch statuses. */
export const WORKFLOW_STATUSES: readonly SubmissionStatus[] = [
  "pending",
  "in_review",
  "approved",
  "in_fabrication",
  "shipped",
  "completed",
] as const;

/** Statuses that take the order off the happy path and need review notes. */
export const BRANCH_STATUSES: readonly SubmissionStatus[] = [
  "changes_requested",
  "rejected",
] as const;

/** Statuses an admin is still able to act on. */
export const REVIEWABLE_STATUSES: readonly SubmissionStatus[] = [
  "pending",
  "in_review",
  "changes_requested",
] as const;

/** A status change to these requires non-empty review notes. */
export function requiresReviewNotes(status: SubmissionStatus): boolean {
  return status === "rejected" || status === "changes_requested";
}

/** A patient's order, from first draft through delivery. */
export interface Submission {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  /** Full US state name, e.g. "California" — not the abbreviation. */
  state: string | null;
  /** `ProductConfig["id"]` slugs. Render via `productLabel()`, never raw. */
  products: string[];
  /** "A1" | "A2" | "A3" */
  whiteShade: string | null;
  /** "G1" | "G2" | "G3" | "G4" */
  gumShade: string | null;
  /** Universal tooth numbering, 1–32. */
  selectedTeeth: number[];
  teethNotSure: boolean;
  /** [front, side] */
  closeBitePhotos: string[];
  /** [front, side] */
  openBitePhotos: string[];
  /** Up to four impression-tray photos. */
  impressionPhotos: string[];
  photoAnalyses: PhotoAnalyses;
  status: SubmissionStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  trackingNumber: string | null;
  shippedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}

/**
 * The fields the patient fills in during intake.
 *
 * Replaces the old `patchSubmission(fields: Record<string, unknown>)`, which
 * accepted any key and wrote it straight to the database unvalidated.
 *
 * `name` and `state` are deliberately absent: the intake wizard no longer asks
 * for them, they come from the account, and so the patient must not be able to
 * write them through this path. Changing either is an account operation.
 */
export type SubmissionDraft = Pick<
  Submission,
  | "email"
  | "products"
  | "whiteShade"
  | "gumShade"
  | "selectedTeeth"
  | "teethNotSure"
>;

/** The admin's decision on a submission. */
export interface StatusUpdate {
  status: SubmissionStatus;
  reviewedBy: string;
  reviewNotes?: string;
  trackingNumber?: string;
}

/** Query for the admin submissions list. */
export interface SubmissionQuery {
  /** Zero-based. */
  page?: number;
  pageSize?: number;
  status?: SubmissionStatus | "";
  /** Matches name or email, case-insensitive. */
  search?: string;
}

export interface Paged<T> {
  rows: T[];
  /** Total matching rows across all pages, for the pager. */
  total: number;
}

export interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  changesRequested: number;
}

/** Fired when a submission is created or changes, to refresh admin lists. */
export interface SubmissionChange {
  type: "created" | "updated";
  submissionId: string;
  patientName: string | null;
  status: SubmissionStatus;
}

/* ------------------------------------------------------------------ */
/* Chat (patient <-> admin, per submission)                            */
/* ------------------------------------------------------------------ */

export type MessageRole = "admin" | "patient";

/**
 * One message in a submission's conversation.
 *
 * There is exactly one conversation per order, shared by the patient and the
 * care team. It replaces the old split where the patient wrote into `threads`
 * and the admin read a different store, so neither side could hear the other.
 */
export interface ChatMessage {
  id: string;
  submissionId: string;
  senderRole: MessageRole;
  senderName: string;
  body: string;
  createdAt: Timestamp;
  readAt: Timestamp | null;
  /**
   * Present when this message is a supplies request rather than plain text.
   *
   * The request lives on the message the patient actually sent, so its
   * outcome appears attached to the thing she asked for rather than in a
   * separate place she has to go and find.
   */
  request?: MessageRequest;
}

/* ------------------------------------------------------------------ */
/* Supplies requests (a kind of message)                               */
/* ------------------------------------------------------------------ */

export type RequestKind = "material" | "trays";

export type RequestStatus = "pending" | "accepted" | "rejected";

export const REQUEST_LABELS: Record<RequestKind, string> = {
  material: "More impression material",
  trays: "Different tray size",
};

export const REQUEST_OUTCOMES: Record<RequestKind, string> = {
  material: "New impression material sent",
  trays: "New trays sent",
};

/** Reasons offered for a tray request. Material requests need no reason. */
export const TRAY_REASONS = ["Trays too big", "Trays too small"] as const;

export interface MessageRequest {
  kind: RequestKind;
  /** Reason picked in the form, e.g. "Trays too big". Empty for material. */
  detail: string;
  status: RequestStatus;
  /** What the patient sees once accepted, e.g. "New trays sent". */
  outcome: string | null;
  trackingNumber: string | null;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationType = "status_update" | "action_required" | "info";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  submissionId: string | null;
  createdAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Prompt configuration (admin tuning of the photo analyser)           */
/* ------------------------------------------------------------------ */

export interface PromptCheck {
  id: string;
  label: string;
  requirement: string;
}

export interface PromptConfig {
  id: string;
  photoType: PhotoType;
  version: number;
  label: string;
  poseDescription: string;
  contentChecks: PromptCheck[];
  qualityChecks: PromptCheck[];
  isActive: boolean;
  createdBy: string | null;
  changeNotes: string | null;
  createdAt: Timestamp;
}

export interface NewPromptConfig {
  photoType: PhotoType;
  label: string;
  poseDescription: string;
  contentChecks: PromptCheck[];
  qualityChecks?: PromptCheck[];
  changeNotes: string;
  createdBy?: string;
}

/** One turn in the admin's conversation with the prompt advisor. */
export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorContext {
  photoType?: PhotoType;
  photoLabel?: string;
  photoUrl?: string;
  analysis?: PhotoAnalysis | null;
  submissionId?: string;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

/**
 * The account. `name` and `state` live here rather than being asked for during
 * intake, and a new draft is stamped with them at creation — see
 * `SubmissionsApi.createDraft`.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** Full US state name, e.g. "California" — not the abbreviation. */
  state: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  loggedInAt: Timestamp;
}

export type OAuthProvider = "google" | "azure";

/** Auth lifecycle events the reset-password screen listens for. */
export type AuthEvent = "signed_in" | "signed_out" | "password_recovery";

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * Every adapter rejects with this, so screens can show a message without
 * knowing which backend produced it.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export type ApiErrorCode =
  | "not_found"
  | "invalid_credentials"
  | "email_taken"
  | "not_authenticated"
  | "not_authorized"
  | "validation"
  | "network"
  | "unknown";
