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
  AdjustmentDecision,
  AdjustmentRequest,
  AdjustmentStatus,
  AdminUser,
  AdvisorContext,
  AdvisorMessage,
  AppNotification,
  AuthEvent,
  AuthUser,
  BillingAddress,
  ChatMessage,
  NewAdjustmentRequest,
  ImpressionPhoto,
  Insurance,
  Invoice,
  NewPromptConfig,
  OAuthProvider,
  PackingSlipInput,
  Paged,
  PaymentMethod,
  PhotoAnalysis,
  PhotoType,
  PromptConfig,
  RequestKind,
  RequestStatus,
  StatusUpdate,
  StoredPhoto,
  Submission,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubmissionChange,
  SubmissionDraft,
  SubmissionQuery,
  SubmissionStats,
  Timestamp,
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
   * All of the signed-in patient's orders, most recent first. Powers the order
   * switcher on My Orders. Must be scoped to the caller server-side.
   */
  listMine(): Promise<Submission[]>;

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

export interface SubscriptionsApi {
  /** The signed-in patient's subscriptions. Scoped to the caller server-side. */
  list(): Promise<Subscription[]>;

  /**
   * Moves the next delivery to a new date.
   *
   * Must reject a date in the past, and should refuse one beyond a sensible
   * horizon — a delivery pushed out indefinitely is a cancellation wearing a
   * disguise, and the patient should be told that plainly instead.
   */
  reschedule(id: string, nextDeliveryAt: Timestamp): Promise<Subscription>;

  /**
   * Skips the next delivery, moving it on by one interval.
   * Billing must skip too — the patient is not charged for a skipped cycle.
   */
  skipNext(id: string): Promise<Subscription>;

  /** Pauses or resumes. A paused subscription bills nothing and ships nothing. */
  setStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;

  /**
   * Cancels for good. Unlike pausing, this is terminal: billing stops, no
   * further deliveries are scheduled, and `canceledAt` is stamped so the UI can
   * say when it ends. A real backend should keep the row (not delete it) so the
   * patient can still see their history and re-subscribe.
   */
  cancel(id: string): Promise<Subscription>;

  /** The plans a subscription can be switched between. */
  listPlans(): Promise<SubscriptionPlan[]>;

  /**
   * Moves the subscription onto a different plan (interval / price). The change
   * takes effect from the next delivery; the current cycle is not re-billed.
   */
  changePlan(id: string, planId: string): Promise<Subscription>;

  /** The card on file, or `null` if none has been added yet. */
  getPaymentMethod(): Promise<PaymentMethod | null>;

  /**
   * Replaces the card on file.
   *
   * The full number is accepted here only to derive the brand and last four —
   * a real implementation tokenises it with the payment processor and never
   * stores or logs the PAN. The prototype keeps only `{brand, last4, exp}`.
   */
  updatePaymentMethod(input: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  }): Promise<PaymentMethod>;

  /** The billing/shipping address, or `null` if none is set. */
  getBillingAddress(): Promise<BillingAddress | null>;

  /** Replaces the billing/shipping address. */
  updateBillingAddress(input: BillingAddress): Promise<BillingAddress>;

  /** Past charges, most recent first. */
  listInvoices(): Promise<Invoice[]>;
}

/* ------------------------------------------------------------------ */

export interface InsuranceApi {
  /**
   * The signed-in patient's protection plans, one per insurable appliance.
   * Scoped to the caller server-side.
   *
   * V1 is read-only: purchasing happens on the website, so a real
   * implementation reads plan status from the store/subscription system and
   * returns a `not_insured` record (with an offer + purchase URL) for any
   * eligible appliance the patient has not yet protected.
   */
  list(): Promise<Insurance[]>;

  /**
   * Files a protection claim against an insured plan.
   *
   * The patient answers a short intake (reason, whether they still have the
   * appliance, free-text detail); this routes the claim to the care team and
   * drops a plain-language recap into the order conversation, so the patient
   * has a record and staff can reply against it — the same pattern as the
   * submission recap. Returns the plan with its `claim` set to `in_review`.
   *
   * A real backend must require the plan be `insured` and reject otherwise.
   */
  fileClaim(
    insuranceId: string,
    claim: { reason: string; detail: string },
  ): Promise<Insurance>;
}

/* ------------------------------------------------------------------ */

export interface AdjustmentsApi {
  /**
   * Raises an adjustment request from the six-screen flow and returns the
   * saved record in `pending`.
   *
   * The request is tied to a real order (`input.submissionId`) so the product
   * is traceable and cannot be invented — the server must verify the order
   * belongs to the authenticated patient and that `input.product` is on it,
   * exactly as `Submission.products` is protected. It assigns the id, the
   * human-facing `requestNumber`, the status and the timestamps; the client
   * supplies only what the patient answered.
   *
   * On creation it drops a plain-language recap into the order conversation —
   * the same pattern as a submission and an insurance claim — so the patient
   * has a record and the care team can reply against it.
   */
  create(input: NewAdjustmentRequest): Promise<AdjustmentRequest>;

  /** Throws `not_found` for an unknown id. Scoped to the caller server-side. */
  getById(id: string): Promise<AdjustmentRequest>;

  /** The signed-in patient's requests, newest first. Scoped server-side. */
  listMine(): Promise<AdjustmentRequest[]>;

  /** Every request raised against one order, newest first. */
  listForSubmission(submissionId: string): Promise<AdjustmentRequest[]>;

  /**
   * Admin queue: every request across all patients, newest first, optionally
   * narrowed to one status. ADMIN-ONLY in a real backend, which must reject
   * this from a patient session and compute the filter server-side rather than
   * returning every row for the client to sift. Mirrors `SubmissionsApi.list`,
   * which is how the admin submissions queue is fed.
   */
  list(status?: AdjustmentStatus | ""): Promise<AdjustmentRequest[]>;

  /**
   * Records the team's decision (see `AdjustmentDecision`).
   *
   * ADMIN-ONLY in a real backend, which must reject this from a patient
   * session. `changes_requested` and `rejected` require a note. On `approved`
   * the three approval actions fire — prepaid return label, the "Adjusted
   * Product" line item on the Shopify order, and the printable summary sheet
   * (see the spec, "What happens on approval"). Those side effects belong to a
   * later phase; this method must at minimum stamp the decision and reviewer.
   */
  decide(id: string, decision: AdjustmentDecision): Promise<AdjustmentRequest>;
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

  /**
   * The packing slip PDF for an approved adjustment/remake.
   *
   * The patient prints it and includes it in the return box so the lab can
   * identify the case when the models arrive — without it, a returned partial
   * is just anonymous models. Basic by design (order, name, product, and that
   * it's an adjustment/remake). A real implementation may instead reuse the
   * carrier/ShipStation packing slip if one is generated with the return label.
   */
  packingSlip(input: PackingSlipInput): Promise<Blob>;
}

/* ------------------------------------------------------------------ */

export interface ApiClient {
  auth: AuthApi;
  submissions: SubmissionsApi;
  photos: PhotosApi;
  messages: MessagesApi;
  notifications: NotificationsApi;
  prompts: PromptsApi;
  subscriptions: SubscriptionsApi;
  insurance: InsuranceApi;
  adjustments: AdjustmentsApi;
  shipping: ShippingApi;
}
