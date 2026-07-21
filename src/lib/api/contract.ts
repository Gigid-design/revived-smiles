/**
 * The contract between this front end and any backend.
 *
 * Screens import `api` from `@/lib/api` and call these methods. Nothing in
 * `src/app/**` may import a database client, call `fetch` against a data
 * endpoint, or know what stores the data. That is the whole point: swapping
 * backends means writing one new implementation of `ApiClient`, not editing
 * eighteen screens.
 *
 * This file is also the specification. Each method documents what a real
 * implementation must do, including the rules the old prototype enforced only
 * in the browser (and therefore did not really enforce at all).
 */

import type {
  AdminUser,
  AdvisorContext,
  AdvisorMessage,
  AppNotification,
  AuthEvent,
  AuthUser,
  ChatMessage,
  ImpressionPhoto,
  NewPromptConfig,
  OAuthProvider,
  Paged,
  PhotoAnalysis,
  PhotoType,
  PromptConfig,
  RequestKind,
  RequestStatus,
  StatusUpdate,
  StoredPhoto,
  Submission,
  SubmissionChange,
  SubmissionDraft,
  SubmissionQuery,
  SubmissionStats,
  Thread,
  Unsubscribe,
} from "./types";

/* ------------------------------------------------------------------ */

export interface AuthApi {
  /** Throws `email_taken` if an account already exists. */
  signUp(email: string, password: string): Promise<AuthUser>;

  /** Throws `invalid_credentials` on a bad email/password pair. */
  signIn(email: string, password: string): Promise<AuthUser>;

  /**
   * Starts a third-party sign-in. A real implementation redirects the browser
   * and resolves only if the handshake fails.
   */
  signInWithProvider(provider: OAuthProvider, redirectTo: string): Promise<AuthUser>;

  /** The signed-in patient, or null. Must never throw for a signed-out visitor. */
  getUser(): Promise<AuthUser | null>;

  signOut(): Promise<void>;

  /**
   * Sends a reset link. Must resolve identically whether or not the address
   * exists, so the response cannot be used to enumerate accounts.
   */
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;

  /**
   * True once the user has arrived on a valid password-recovery link and may
   * set a new password. The reset screen gates its form on this.
   */
  hasRecoverySession(): Promise<boolean>;

  /** Requires an active session (normal or recovery). */
  updatePassword(password: string): Promise<void>;

  /** Fires on sign-in, sign-out, and arrival via a recovery link. */
  onAuthChange(handler: (event: AuthEvent, user: AuthUser | null) => void): Unsubscribe;

  /**
   * Staff sign-in. The admin allowlist lived in two client files and the role
   * was invented in the browser; a real implementation must decide both
   * server-side. Throws `not_authorized` for a non-staff account.
   */
  signInAdmin(email: string, password: string): Promise<AdminUser>;

  /** The signed-in admin, or null. Re-verified on every guarded page load. */
  getAdminUser(): Promise<AdminUser | null>;

  signOutAdmin(): Promise<void>;
}

/* ------------------------------------------------------------------ */

export interface SubmissionsApi {
  /** Starts an order in `draft`. Returns the new submission's id. */
  createDraft(email: string, userId: string | null): Promise<string>;

  /** Throws `not_found` for an unknown id. */
  getById(id: string): Promise<Submission>;

  /**
   * The signed-in patient's current order — most recent by `createdAt`, or
   * null if they have none. Must be scoped to the caller server-side.
   */
  getMine(): Promise<Submission | null>;

  /**
   * Looks up an order for the returning-patient flow on the landing screen.
   *
   * SECURITY: the prototype exposed this unauthenticated, returning a full
   * patient record to anyone who knew an email address. A real implementation
   * must require proof of ownership — a magic link or an existing session —
   * and must not confirm whether an address is on file.
   */
  findByEmail(email: string): Promise<Submission | null>;

  /** Applies intake answers to a draft. Only `SubmissionDraft` keys are writable. */
  updateDraft(id: string, patch: Partial<SubmissionDraft>): Promise<Submission>;

  /**
   * Attaches the impression photos and, if every required piece is present,
   * moves the order `draft -> pending`. Returns the saved submission so the
   * caller can see whether it was actually submitted.
   */
  finalize(id: string, impressionPhotos: ImpressionPhoto[]): Promise<Submission>;

  /** Admin list: non-draft orders, newest first, filtered and paged. */
  list(query: SubmissionQuery): Promise<Paged<Submission>>;

  /** Admin dashboard counters. Computed server-side, not by fetching every row. */
  stats(): Promise<SubmissionStats>;

  /**
   * Records an admin decision, stamping reviewer and timestamps.
   *
   * Must enforce server-side: `rejected` and `changes_requested` require
   * non-empty notes; `shipped` sets `shippedAt`; `completed` sets
   * `completedAt`. The prototype enforced these only in the browser.
   */
  updateStatus(id: string, update: StatusUpdate): Promise<Submission>;

  /**
   * Live submission activity, for the admin lists. Replaces the database
   * change-feed subscription; any transport (websocket, SSE, polling) is fine.
   */
  onChange(handler: (change: SubmissionChange) => void): Unsubscribe;
}

/* ------------------------------------------------------------------ */

export interface PhotosApi {
  /**
   * Grades a captured photo against the active prompt for that pose.
   *
   * `image` is a data URL from the camera or file picker. A real
   * implementation uploads or streams it rather than inlining it in JSON.
   * See `docs/backend-contract/photo-analysis.md` for the tuned prompt and
   * the exact response contract.
   */
  analyze(image: string, photoType: PhotoType): Promise<PhotoAnalysis>;

  /** Stores an image and returns its retrievable URL. */
  upload(file: Blob, kind: "close-bite" | "open-bite" | "impression"): Promise<StoredPhoto>;

  /**
   * Saves one graded pose onto a submission — the photo URL into its slot and
   * the verdict into the analysis map.
   *
   * Must be atomic. The prototype read the row, edited an array in the
   * browser, and wrote it back, so two screens finishing at once could erase
   * each other's photo.
   */
  attachToSubmission(
    submissionId: string,
    photoType: PhotoType,
    url: string,
    analysis: PhotoAnalysis | null,
  ): Promise<void>;
}

/* ------------------------------------------------------------------ */

export interface MessagesApi {
  /** A submission's chat, oldest first. */
  list(submissionId: string): Promise<ChatMessage[]>;

  send(
    submissionId: string,
    body: string,
    senderRole: ChatMessage["senderRole"],
    senderName: string,
  ): Promise<ChatMessage>;

  /** Marks messages from the *other* party read. */
  markRead(submissionId: string, markRole: ChatMessage["senderRole"]): Promise<void>;

  /**
   * Unread patient messages per submission, for the admin list badges.
   * Must be a single aggregate query, not a fetch-and-count in the client.
   */
  unreadCounts(submissionIds: string[]): Promise<Record<string, number>>;

  /** Live inbound messages for one submission. */
  subscribe(submissionId: string, handler: (message: ChatMessage) => void): Unsubscribe;
}

/* ------------------------------------------------------------------ */

export interface ThreadsApi {
  /** The patient's threads, newest activity first. */
  list(): Promise<Thread[]>;

  get(threadId: string): Promise<Thread>;

  /** Opens a plain question thread. Returns the new thread id. */
  startQuestion(text: string): Promise<string>;

  /** Opens a supplies-request thread. Returns the new thread id. */
  startRequest(kind: RequestKind, detail: string, note: string): Promise<string>;

  reply(threadId: string, body: string): Promise<Thread>;

  markRead(threadId: string): Promise<void>;

  /**
   * Support's decision on a request.
   *
   * ADMIN-ONLY in a real backend. It exists on the patient client today only
   * because the prototype simulated the decision — including inventing the
   * tracking number in the browser. The demo keeps that simulation; the real
   * implementation must reject this call from a patient session.
   */
  setRequestStatus(threadId: string, status: RequestStatus): Promise<Thread>;
}

/* ------------------------------------------------------------------ */

export interface NotificationsApi {
  /** The signed-in patient's notifications, newest first. */
  list(limit?: number): Promise<AppNotification[]>;

  markRead(id: string): Promise<void>;

  markAllRead(): Promise<void>;
}

/* ------------------------------------------------------------------ */

export interface PromptsApi {
  /** Every prompt version, grouped by pose. */
  listAll(): Promise<Record<PhotoType, PromptConfig[]>>;

  /** Every version for one pose, newest first. */
  listByType(photoType: PhotoType): Promise<PromptConfig[]>;

  getActive(photoType: PhotoType): Promise<PromptConfig | null>;

  /**
   * Saves a new version and makes it the only active one for that pose.
   *
   * Must be one transaction. The prototype deactivated the old version first
   * and inserted second, so a failure between the two left a pose with no
   * active prompt at all.
   */
  create(input: NewPromptConfig): Promise<PromptConfig>;

  /** Restores an earlier version. Same atomicity requirement as `create`. */
  activate(id: string, photoType: PhotoType): Promise<void>;

  /**
   * The conversational prompt advisor. Returns assistant markdown using the
   * `:::current` / `:::proposed` / `:::success` / `:::warning` block protocol
   * the admin drawer renders — see `docs/backend-contract/prompt-advisor.md`.
   *
   * The advisor can write a new prompt version. That must require an
   * authenticated admin and an explicit confirmation step server-side.
   */
  advise(messages: AdvisorMessage[], context?: AdvisorContext): Promise<string>;
}

/* ------------------------------------------------------------------ */

export interface ShippingApi {
  /**
   * The return-shipping label PDF.
   *
   * The prototype drew a decorative barcode and a made-up reference. A real
   * implementation must get a genuine tracking number from a carrier and
   * write it back to `submission.trackingNumber`.
   */
  label(submissionId: string, patientName: string): Promise<Blob>;
}

/* ------------------------------------------------------------------ */

export interface ApiClient {
  auth: AuthApi;
  submissions: SubmissionsApi;
  photos: PhotosApi;
  messages: MessagesApi;
  threads: ThreadsApi;
  notifications: NotificationsApi;
  prompts: PromptsApi;
  shipping: ShippingApi;
}
