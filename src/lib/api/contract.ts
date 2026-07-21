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
  /**
   * Starts an order in `draft`. Returns the new submission's id.
   *
   * The server must stamp onto the new draft, from sources the patient does
   * not control:
   *
   * - `name` and `state`, from the account identified by `userId`;
   * - `products` and `orderNumber`, from the patient's Shopify order.
   *
   * Intake asks for none of these, and `SubmissionDraft` excludes all of them,
   * so this is the only point at which they reach a submission. An order
   * started without an account or without a matched Shopify order is missing
   * them and cannot leave `draft` — see `finalize`.
   *
   * Matching the Shopify order is the server's job and must be done against
   * the authenticated account, never against an order number or email supplied
   * by the caller: those are guessable, and the match decides what the lab
   * fabricates.
   */
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

  /**
   * Applies intake answers to a draft. Only `SubmissionDraft` keys are
   * writable — notably not `name` or `state`, which are the account's, and not
   * `products` or `orderNumber`, which are the Shopify order's.
   *
   * The server must reject a patch carrying any of those four rather than
   * silently dropping them: a request trying to write `products` here is
   * either a stale client or someone trying to be fabricated a product they
   * did not buy, and both are worth failing loudly.
   */
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
   * True when this adapter stands in for the device camera and the file
   * picker, so the UI should fill a slot on tap rather than prompting.
   *
   * This is NOT the old DESIGN_MODE flag returning by another name. That flag
   * forked the data path — real writes versus no writes — in nine screens.
   * This declares one capability of the environment, and the data path either
   * side of it is identical: both still call `attachToSubmission`. A real
   * backend sets it false and the tap-to-fill branches become dead code
   * without anything else changing.
   */
  readonly usesStandInPhotos: boolean;

  /**
   * A stand-in image, for demo builds with no camera or filesystem.
   * Only meaningful when `usesStandInPhotos` is true.
   */
  standInPhoto(kind: PhotoType | "impression"): Promise<StoredPhoto>;

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

  /**
   * Sends a request as a message in the conversation.
   *
   * `note` is folded into the message body; `kind` and `detail` are kept
   * structured on `message.request` so the UI can render its state.
   *
   * A `kind` of `"order"` reports that the product carried over from Shopify
   * is wrong, and `detail` carries what the patient believes she ordered. It
   * is a report, not an instruction: raising one must not alter
   * `submission.products`. Only staff resolve it, and doing so is an admin
   * operation — accepting the request is the moment the order changes, and
   * that write does not belong on the patient client.
   */
  sendRequest(
    submissionId: string,
    kind: RequestKind,
    detail: string,
    note: string,
    senderName: string,
  ): Promise<ChatMessage>;

  /**
   * Support's decision on a supplies request.
   *
   * ADMIN-ONLY in a real backend, which must reject this from a patient
   * session. On acceptance it must set `outcome` and a genuine carrier
   * tracking number, and post the care team's reply into the same
   * conversation. The demo simulates all three.
   */
  setRequestStatus(messageId: string, status: RequestStatus): Promise<ChatMessage>;
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
  notifications: NotificationsApi;
  prompts: PromptsApi;
  shipping: ShippingApi;
}
