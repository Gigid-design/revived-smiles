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
  | "lab_retake"
  | "rejected"
  | "in_fabrication"
  | "shipped"
  | "completed";

/** Human-facing label for each status. Used by status-change chat events and
    anywhere a status needs to read as a sentence rather than a slug. */
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  /* Displayed as "In review" — the pending/in-review split was dropped
     (Aug 24, Nathan: "hard to track if an agent has it"). The status value
     stays for the backend; the patient and admin see one stage. */
  pending: "In review",
  in_review: "In review",
  approved: "Approved",
  changes_requested: "Changes requested",
  lab_retake: "Lab retake needed",
  rejected: "Can't proceed with order",
  in_fabrication: "In fabrication",
  shipped: "Shipped",
  completed: "Completed",
};

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
  "lab_retake",
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
  return status === "rejected" || status === "changes_requested" || status === "lab_retake";
}

/**
 * One product's own intake answers within an order.
 *
 * An order can carry several appliances, and two of them may each need their
 * own tooth chart and shade — e.g. an upper acrylic partial and a lower
 * flexible partial replace different teeth. So the charted answers are kept
 * per product here, keyed by product slug in `Submission.itemDetails`, rather
 * than once for the whole order. Products that need neither a chart nor a shade
 * (a retainer, a nightguard) contribute no entry.
 */
export interface ItemDetail {
  whiteShade: string | null;
  gumShade: string | null;
  /** Universal tooth numbering, 1–32. */
  selectedTeeth: number[];
  teethNotSure: boolean;
  /** Per-item free-text note ("only replace 2 of these"), optional. */
  notes: string | null;
}

/** A patient's order, from first draft through delivery. */
export interface Submission {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  /** Full US state name, e.g. "California" — not the abbreviation. */
  state: string | null;
  /**
   * The Shopify order this submission was raised against, e.g. "#1042".
   *
   * Shown to the patient so the pre-filled product is traceable to something
   * she recognises from her receipt. Null only if no order could be matched.
   */
  orderNumber: string | null;
  /**
   * `ProductConfig["id"]` slugs. Render via `productLabel()`, never raw.
   *
   * Comes from the Shopify order, not from intake — see `SubmissionDraft`.
   */
  products: string[];
  /** The VITA A range: "A1" | "A2" | "A3" | "A4", lightest to darkest. */
  whiteShade: string | null;
  /** "G1" (dark) | "G2" (pink) | "G3" (clear). Not a light-to-dark scale. */
  gumShade: string | null;
  /** Universal tooth numbering, 1–32. */
  selectedTeeth: number[];
  teethNotSure: boolean;
  /**
   * Per-product intake answers, keyed by product slug. Present on multi-item
   * orders (and single-item ones filled through the current wizard); absent on
   * legacy records. The top-level `whiteShade` / `gumShade` / `selectedTeeth` /
   * `teethNotSure` fields mirror the order's first charted product, so screens
   * that predate multi-item orders keep working.
   */
  itemDetails?: Record<string, ItemDetail>;
  /**
   * Optional free-text note from the patient (e.g. "only replace 2 of my 6
   * missing teeth", an address change). Character-limited in the UI. Optional
   * so existing records and literals don't need to carry it.
   */
  notes?: string | null;
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
  /* Tracking for the replacement impression kit sent on a `lab_retake` — the
     physical impressions were received and found unusable, so a fresh kit goes
     out while the original order holds its place in the pipeline. Kit dispatch
     itself stays manual in Shopify (Aug 18 session — no automated writes yet);
     the backend records the resulting tracking number here. */
  retakeKitTracking?: string | null;
  /* Which impression the lab retake targets — see StatusUpdate.retakeArea. */
  retakeArea?: RetakeArea | null;
  /* The order's shipping address, mirrored from the Shopify order and kept in
     sync by the order-update webhook (Aug 18 session — "if we change the
     address on the Shopify order, it changes here as well"). Read-only in the
     portal: Shopify stays the system of record. */
  shippingAddress?: BillingAddress | null;
  /* When fabrication began — the only stage the patient tracker timestamps,
     with the "allow 5–7 business days" note (Aug 21 client review). */
  fabricationStartedAt?: Timestamp | null;
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
 *
 * `products` is absent for a stronger reason. It comes from the Shopify order
 * the patient paid against, and the lab builds what that order says. If intake
 * could rewrite it, an order could be fabricated as something nobody was
 * charged for. A patient who believes the product is wrong raises a `"order"`
 * request instead (see `RequestKind`), which the care team resolves — the
 * submission itself is only ever corrected by staff.
 */
export type SubmissionDraft = Pick<
  Submission,
  | "email"
  | "whiteShade"
  | "gumShade"
  | "selectedTeeth"
  | "teethNotSure"
  | "itemDetails"
  | "notes"
>;

/** The single impression area a retake targets. */
export type RetakeArea = "upper" | "lower" | "bite";

/** The admin's decision on a submission. */
export interface StatusUpdate {
  status: SubmissionStatus;
  reviewedBy: string;
  reviewNotes?: string;
  trackingNumber?: string;
  /* Which impression a `lab_retake` targets. Structured on purpose — the
     patient UI names the arch and routes the retake, so it must not depend on
     parsing the note's prose. */
  retakeArea?: RetakeArea | null;
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
  /**
   * Present when this message is a system-generated activity event — a form
   * submission or a status change — rather than something a person typed. The
   * chat renders these as a centred timeline card, not a left/right bubble, so
   * the care team sees the order's history inline with the conversation.
   */
  event?: MessageEvent;
  /**
   * Photos carried by this message, shown as an inline thumbnail strip and
   * expandable in a lightbox — so the support team can view the impression
   * images without leaving the chat. Rides on the submission event today; a
   * plain message may also carry them.
   */
  attachments?: MessagePhoto[];
  /**
   * Downloadable fulfilment documents offered with this message — e.g. the
   * prepaid return label + packing slip the customer receives when an
   * adjustment is approved (Aug 13: these belong to the customer, in chat,
   * not to an admin download button).
   */
  documents?: MessageDocuments;
}

/**
 * Fulfilment documents attached to a chat message. Each flag/payload is
 * generated on demand from `ShippingApi` when the customer downloads it.
 */
export interface MessageDocuments {
  /** Offer the prepaid return label (built from the order + patient name). */
  returnLabel?: boolean;
  /** Patient name for the return label. */
  patientName?: string;
  /** Offer the adjustment packing slip; carries its own render fields. */
  packingSlip?: PackingSlipInput;
}

/* ------------------------------------------------------------------ */
/* System activity events (a kind of message)                          */
/* ------------------------------------------------------------------ */

/**
 * A photo attached to a chat message.
 *
 * `url` is all the UI needs to show and expand it; `label` names the pose or
 * slot ("Close Bite — Front", "Impression 2") so the thumbnail and the
 * lightbox can caption it.
 */
export interface MessagePhoto {
  url: string;
  label?: string;
}

/**
 * What a system message records.
 *
 * `submission` captures the moment the patient completed the impression +
 * intake form; `adjustment` captures an adjustment/remake request being raised;
 * `status_change` captures the care team moving the order along. `submission`
 * and `adjustment` both render as a recap card (facts + optional photos); only
 * `status_change` draws as an inline pill.
 */
export type ChatEventKind = "submission" | "adjustment" | "status_change";

/** One labelled fact on a submission event card, e.g. "Tooth shade — A2". */
export interface MessageEventFact {
  label: string;
  value: string;
}

/**
 * The structured payload behind a system message. Mirrors the `request`
 * pattern: the message keeps a plain-text `body` for anywhere the card isn't
 * rendered, and this carries what the card needs to draw itself.
 */
export interface MessageEvent {
  kind: ChatEventKind;
  /** Card headline, e.g. "Impression & intake submitted". */
  title: string;
  /** Submission events: the recap facts (product, shades, teeth, notes). */
  facts?: MessageEventFact[];
  /** Status-change events: where the order moved. */
  fromStatus?: SubmissionStatus;
  toStatus?: SubmissionStatus;
  /** Who caused it — the reviewer's name on a status change. */
  actor?: string;
}

/* ------------------------------------------------------------------ */
/* Supplies requests (a kind of message)                               */
/* ------------------------------------------------------------------ */

/**
 * `material` and `trays` ask for something to be sent. `order` is different:
 * it reports that the product carried over from Shopify looks wrong. The
 * patient cannot correct that herself — `products` is not writable from intake
 * — so raising one of these is how the discrepancy reaches a human.
 */
export type RequestKind = "material" | "trays" | "order" | "not-received" | "damaged";

export type RequestStatus = "pending" | "accepted" | "rejected";

export const REQUEST_LABELS: Record<RequestKind, string> = {
  material: "More impression material",
  trays: "Different tray size",
  order: "Wrong product on my order",
  "not-received": "Shipment not received",
  damaged: "Shipment arrived damaged",
};

export const REQUEST_OUTCOMES: Record<RequestKind, string> = {
  material: "New impression material sent",
  trays: "New trays sent",
  order: "Order corrected",
  "not-received": "Replacement shipment arranged",
  damaged: "Replacement arranged",
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
  /** Evidence the patient attached — required for a damaged-shipment report
      (Aug 21 client review). URLs from `photos.upload(…, "issue")`. */
  photos?: string[];
}

/* ------------------------------------------------------------------ */
/* Adjustment requests                                                 */
/* ------------------------------------------------------------------ */

/**
 * The eight issues an adjustment request can be about.
 *
 * Canonical here in the domain model; the customer-facing copy, ordering and
 * per-product applicability live in `adjustmentConfig.ts`, which imports this
 * union. `fit` covers both "does not fit at all" and "too tight" — the button
 * label varies by product, but the stored issue is one thing.
 */
export type AdjustmentIssueId =
  | "sore-spots"
  | "bite"
  | "loose"
  | "fit"
  | "cracked"
  | "aesthetics"
  | "tooth-shade"
  | "gum-shade";

/**
 * Where an adjustment request sits.
 *
 * The portal collects; the team decides. After submission there are exactly
 * three outcomes (see the spec, "After they submit"): something missing
 * (`changes_requested`, reopens with a note), not right for this flow
 * (`rejected`, routed to customer service), or `approved`.
 */
export type AdjustmentStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  /* The physical round-trip after approval — the patient tracker shows
     Submitted → Received → Delivered (Aug 21 client review). */
  | "received"
  | "delivered"
  | "rejected";

/**
 * The structured answers to the per-issue questions on Screen 5. Every field
 * is optional because it is only present when its issue was selected — a
 * request about a cracked nightguard carries none of the partial-denture
 * fields.
 */
export interface AdjustmentAnswers {
  /** Sore spots: the wear-period checkbox. */
  woreForFiveDays?: boolean;
  /** Sore spots: the hot-water activation checkbox (hot-water products only). */
  completedHotWaterActivation?: boolean;
  /** Loose: whether it was ever snug — one of `LOOSE.options`. */
  looseSnug?: string;
  /**
   * Fit (hot-water partials): whether the hot-water reset fixed it. `true`
   * closes the request out with nothing shipped, so a submitted request never
   * carries `true` here — it exists only to gate the flow.
   */
  fitResolvedByHotWater?: boolean;
  /** Fit (non-partials): which describes it — one of `FIT.describeOptions`. */
  fitDescription?: string;
  /** Cracked: whether they still have all the pieces. */
  crackedHasAllPieces?: boolean;
  /** Tooth shade: the requested new shade, e.g. "A2". */
  newToothShade?: string;
  /** Gum shade: the requested new shade, e.g. "G3". */
  newGumShade?: string;
}

/**
 * The photos an adjustment request collects. Keyed by role rather than by slot,
 * since which photos are required depends on the selected issues (see
 * `photoRequirements()`). Each value is a stored image URL.
 */
export interface AdjustmentPhotos {
  /** Always collected in the last section. Optional in storage only for cracked. */
  inMouth?: string;
  /** Always collected in the last section. */
  onModels?: string;
  /** Only when Bite was selected. */
  biteStrip?: string;
  /** Sore spots, step 3: the marked dental models. */
  markedModels?: string;
  /** Cracked: a photo of the damage. */
  damage?: string;
}

/**
 * One patient's request to adjust an appliance, from the six-screen flow.
 *
 * Raised against a real order (`submissionId`) so the product is traceable and
 * cannot be invented — the same discipline as `Submission.products`. The lab
 * decides adjustment vs remake after the appliance arrives; this record is only
 * the collected request.
 */
export interface AdjustmentRequest {
  id: string;
  /** Human-facing number for the summary sheet, e.g. "ADJ-1042-1". */
  requestNumber: string;
  userId: string | null;
  /** The order this request is about. */
  submissionId: string;
  /** Denormalised from the order, so lists needn't join. */
  orderNumber: string | null;
  /** The single product slug — a `ProductConfig["id"]`. Render via `productLabel()`. */
  product: string;
  /** The issues selected on Screen 4, in the flow's display order. */
  issues: AdjustmentIssueId[];
  answers: AdjustmentAnswers;
  photos: AdjustmentPhotos;
  /** The single free-text box in the whole flow. Always required to submit. */
  description: string;
  status: AdjustmentStatus;
  /** Set when the team asks for something missing or routes it to CS. */
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  approvedAt: Timestamp | null;
  /* Why it couldn't be adjusted (or went to remake) — see ADJUSTMENT_REASON_TAGS. */
  reasonTag?: AdjustmentReasonTag | null;
  /* Appliance back at the lab / adjusted appliance delivered to the patient. */
  receivedAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
  createdAt: Timestamp;
  submittedAt: Timestamp | null;
}

/**
 * What the client sends to raise a request. The server assigns id, number,
 * status and timestamps; the patient supplies only what they answered.
 */
export interface NewAdjustmentRequest {
  submissionId: string;
  product: string;
  issues: AdjustmentIssueId[];
  answers: AdjustmentAnswers;
  photos: AdjustmentPhotos;
  description: string;
}

/** Why an adjustment was declined or sent to remake — structured for the
    analytics the client asked for (Aug 21: "adjustments/remakes and their
    reasoning tags"). Free-text notes stay; the tag is what charts. */
export const ADJUSTMENT_REASON_TAGS = [
  "Fit — too tight",
  "Fit — too loose",
  "Wear or damage",
  "Beyond adjustment — remake",
  "Patient error",
  "Manufacturing defect",
  "Other",
] as const;
export type AdjustmentReasonTag = (typeof ADJUSTMENT_REASON_TAGS)[number];

/** The team's decision on an adjustment request. */
export interface AdjustmentDecision {
  status: Extract<AdjustmentStatus, "approved" | "changes_requested" | "rejected" | "received" | "delivered">;
  reviewedBy: string;
  /** Required for `changes_requested` and `rejected`. */
  reviewNotes?: string;
  /** Required alongside a `rejected` decision — feeds the reason analytics. */
  reasonTag?: AdjustmentReasonTag;
}

/** `changes_requested` and `rejected` require a note explaining why. */
export function adjustmentRequiresNotes(status: AdjustmentStatus): boolean {
  return status === "changes_requested" || status === "rejected";
}

/**
 * What a packing slip needs to identify a returned case.
 *
 * Printed by the patient and dropped in the return box for an approved
 * adjustment/remake, so the lab can match the models to the order when they
 * arrive (Gitai, Aug 11). Deliberately minimal — order, name, product, and
 * that it's an adjustment/remake only.
 */
export interface PackingSlipInput {
  requestNumber: string;
  orderNumber: string | null;
  patientName: string;
  productLabel: string;
  kind: "Adjustment" | "Remake";
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

/**
 * The job roles staff are provisioned into (Aug 25 session, ≈23:35–26:24).
 *
 * Grouped rather than per-employee checkboxes — Gitai: "if we're able to create
 * job roles, that would be cool… instead of having to figure out the check
 * boxes, we can just [assign] it and it instantly gets access to what the
 * shipping team needs." Nathan owns provisioning; this is the vocabulary both
 * sides agree on.
 */
export type StaffRole = "manager" | "support" | "shipping" | "technician";

export const STAFF_ROLES: readonly StaffRole[] = [
  "manager",
  "support",
  "shipping",
  "technician",
] as const;

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  manager: "Manager",
  support: "Support",
  shipping: "Shipping",
  technician: "Technician",
};

/**
 * Every gated area of the staff portal.
 *
 * `suggestions` is the manager's read of the suggestion box — writing to it is
 * open to all staff and is not gated, so it is not a section.
 */
export type AdminSection =
  | "dashboard"
  | "analytics"
  | "adjustments"
  | "customers"
  | "chat"
  | "prompts"
  | "suggestions";

/** How each section names itself in a "not for your role" message. */
export const ADMIN_SECTION_LABELS: Record<AdminSection, string> = {
  dashboard: "The dashboard",
  analytics: "Analytics",
  adjustments: "Adjustments",
  customers: "Customers",
  chat: "Chat",
  prompts: "AI Prompts",
  suggestions: "The suggestion box",
};

/**
 * What each role may open.
 *
 * Manager sees everything — Gitai: "obviously management has access to
 * everything." Analytics is manager-only because it holds colleagues'
 * individual performance numbers. Technicians get adjustments ("I still want
 * them to have access to all the information regarding adjustments"). Shipping
 * is deliberately narrow — their own queue is the Tasks view, which is not
 * built yet; add `"tasks"` here and to `AdminSection` when it lands.
 *
 * This table is presentation only. It decides what a screen offers, never what
 * a caller is allowed to do — see `AdminUser.role`.
 */
export const ROLE_SECTIONS: Record<StaffRole, readonly AdminSection[]> = {
  manager: ["dashboard", "analytics", "adjustments", "customers", "chat", "prompts", "suggestions"],
  support: ["dashboard", "adjustments", "customers", "chat", "prompts"],
  shipping: ["dashboard"],
  technician: ["dashboard", "adjustments"],
};

/** Whether `role` may open `section`. */
export function canAccess(role: StaffRole, section: AdminSection): boolean {
  return ROLE_SECTIONS[role].includes(section);
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /**
   * Decided by the backend at sign-in, never by the browser.
   *
   * The client reads it to hide what a role cannot use, which is a courtesy,
   * not a boundary: every guarded method must re-check it server-side, because
   * a hidden nav item is one typed URL away from being visited.
   */
  role: StaffRole;
  loggedInAt: Timestamp;
}

/**
 * One entry in the staff suggestion box (Aug 25 session, ≈26:27–27:34).
 *
 * Gitai: "we expect our team to grow… instead of just telling management, hey,
 * I think this is a good idea… maybe they forget about it. We can just have a
 * suggestion box." Any staff member writes one; managers read the list.
 *
 * Deliberately without a triage workflow — no assignee, no status, no reply.
 * What was asked for is a place to put an idea and a place to read them; a
 * status column nobody agreed to would just rot half-filled.
 */
export interface Suggestion {
  id: string;
  body: string;
  /** Display name of the staff member who wrote it. */
  submittedBy: string;
  /** Their role at the time of writing — context a manager reads it against. */
  submittedByRole: StaffRole;
  createdAt: Timestamp;
}

/** The longest suggestion the box accepts. */
export const MAX_SUGGESTION_LENGTH = 1000;

export type OAuthProvider = "google" | "azure";

/** Auth lifecycle events the reset-password screen listens for. */
export type AuthEvent = "signed_in" | "signed_out" | "password_recovery";

/* ------------------------------------------------------------------ */
/* Subscriptions (recurring consumable deliveries)                     */
/* ------------------------------------------------------------------ */

export type SubscriptionStatus = "active" | "paused" | "canceled";

/**
 * A recurring delivery, e.g. whitening gel refills.
 *
 * Separate from `Submission`: a submission is the one-off appliance being
 * made, a subscription is a consumable that keeps arriving. The patient's
 * question about a subscription is almost always "when is the next one?",
 * so `nextDeliveryAt` is the field the card is built around.
 */
export interface Subscription {
  id: string;
  productName: string;
  description: string;
  imageUrl: string;
  /** Weeks between deliveries. */
  intervalWeeks: number;
  /** Price per delivery in minor units (cents), to avoid float rounding. */
  pricePerDelivery: number;
  /** ISO-4217, e.g. "USD". */
  currency: string;
  status: SubscriptionStatus;
  nextDeliveryAt: Timestamp;
  /** When a delivery was last skipped, so the card can say so. */
  lastSkippedAt: Timestamp | null;
  /** Set when the subscription is canceled, so the UI can say when it ends. */
  canceledAt: Timestamp | null;
}

/**
 * The card on file for a subscription's recurring charge.
 *
 * Only ever the last four digits and the brand — the full number never crosses
 * this boundary or lands in the store. A real backend tokenises the card with
 * the payment processor and hands back exactly this much.
 */
export interface PaymentMethod {
  /** "Visa", "Mastercard", "Amex"… */
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

/** The address a subscription is billed and shipped to. */
export interface BillingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type InvoiceStatus = "paid" | "refunded" | "failed";

/** A past charge, for the billing-history list. */
export interface Invoice {
  id: string;
  date: Timestamp;
  description: string;
  /** Charged amount in minor units (cents). */
  amount: number;
  currency: string;
  status: InvoiceStatus;
}

/** A plan the patient can switch a subscription to. */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  intervalWeeks: number;
  pricePerDelivery: number;
  currency: string;
}

/**
 * Whether an appliance is covered by the product-protection plan.
 *
 * Kept to the two states the patient needs to see. `insured` shows the plan
 * details; `not_insured` shows the offer. Purchasing happens on the website
 * (Shopify), so there is deliberately no "pending" state here — the record
 * flips to `insured` once the backend sees the completed purchase.
 */
export type InsuranceStatus = "insured" | "not_insured";

/**
 * Where a filed protection claim sits. A claim is submitted from the app and
 * worked by the care team, so it opens `in_review` and ends approved/denied —
 * there is no patient-visible "draft" claim.
 */
export type ClaimStatus = "in_review" | "approved" | "denied";

/**
 * A protection claim the patient filed against their plan.
 *
 * Modelled on the intake form Gitai described — "a few questions, the
 * reasoning, do you still have your models" — then routed to the care team.
 */
export interface InsuranceClaim {
  /** Why they're claiming, e.g. "Broke or cracked". */
  reason: string;
  /** Anything else they added, character-limited on the way in. */
  detail: string;
  status: ClaimStatus;
  submittedAt: Timestamp;
}

/**
 * The product-protection plan for one appliance.
 *
 * Product insurance is Revived Smiles' most-purchased add-on. It is bought on
 * the website (upsell links, Shopify), so V1 only *reads* it here — the card
 * shows coverage when insured, or an "add protection" offer that links out to
 * the website when not. One record per insurable appliance (`submissionId`).
 */
export interface Insurance {
  id: string;
  /** The appliance order this plan covers. */
  submissionId: string;
  /** The appliance's name, denormalised so the card needn't load the order. */
  productName: string;
  status: InsuranceStatus;

  /* ── Present when `insured` ── */
  /** Plan name, e.g. "Protection Plan". */
  planName: string | null;
  /** Human coverage summary, e.g. "1 replacement · 12 months". */
  coverage: string | null;
  /** When the plan was purchased. */
  purchasedAt: Timestamp | null;
  /** When coverage ends. */
  expiresAt: Timestamp | null;

  /* ── Present when `not_insured` ── */
  /** Offer price in minor units (cents), so the CTA can show what it costs. */
  price: number | null;
  /** ISO-4217, e.g. "USD". */
  currency: string;
  /**
   * The soft deadline to add protection — seven days after the appliance is
   * received. Drives the urgency line. Null once the appliance hasn't shipped
   * yet, or when the policy no longer imposes a window.
   */
  windowClosesAt: Timestamp | null;
  /** Where to buy it. Off-app for V1: the website product page. */
  purchaseUrl: string | null;

  /**
   * The open (or most recent) claim against this plan, or null if none has
   * been filed. Only meaningful when `status === "insured"`.
   */
  claim: InsuranceClaim | null;

  /**
   * When the patient may next file a claim, per the one-claim-per-coverage-year
   * rule — the coverage year is measured from the order date. `null` means they
   * can file now. Computed by the backend from the order date and the most
   * recent claim, so the UI never re-derives the policy and can't drift from it.
   */
  nextClaimEligibleAt: Timestamp | null;
}

/* ==========================================================================
   Analytics
   ========================================================================== */

/**
 * The named windows analytics are reported over.
 *
 * A key rather than a pair of dates: the backend owns the bucket boundaries
 * and the timezone they are cut on, so two clients asking for "the last 30
 * days" get the same numbers back.
 */
export type AnalyticsRangePreset = "7d" | "30d" | "90d";

/** Human-facing label for each preset, for the picker. */
export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const ANALYTICS_RANGES: AnalyticsRangePreset[] = ["7d", "30d", "90d"];

/**
 * The window analytics are reported over: a preset, or a pair of dates the
 * user picked (Aug 25 session — "are we going to be able to choose a custom
 * range as well?").
 *
 * `start` and `end` are plain calendar dates, `YYYY-MM-DD`, and the window is
 * inclusive of both. Deliberately not timestamps: the caller is choosing days
 * off a calendar, and sending an instant would drag the caller's timezone into
 * a boundary the backend has already declared it owns.
 */
export type AnalyticsRange =
  | { preset: AnalyticsRangePreset }
  | { preset: "custom"; start: string; end: string };

/**
 * The longest custom window a caller may ask for.
 *
 * A cap the UI can enforce before the request and the backend must enforce
 * again: "every day since launch" is a report, not a dashboard query, and the
 * daily buckets behind it would arrive as thousands of columns.
 */
export const MAX_CUSTOM_RANGE_DAYS = 366;

/** Whole days in a range, counting both endpoints. Null when `end` precedes `start`. */
export function analyticsRangeDays(range: AnalyticsRange): number | null {
  if (range.preset !== "custom") return Number(range.preset.replace("d", ""));

  const start = Date.parse(`${range.start}T00:00:00Z`);
  const end = Date.parse(`${range.end}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  return Math.round((end - start) / 86400000) + 1;
}

/**
 * A stable, filename-safe identifier for a range.
 *
 * Used for export filenames and cache keys, so a custom window downloads as
 * `agent-performance-2026-08-01_2026-08-25.csv` rather than overwriting the
 * last one.
 */
export function analyticsRangeSlug(range: AnalyticsRange): string {
  return range.preset === "custom" ? `${range.start}_${range.end}` : range.preset;
}

/**
 * The unit a metric is measured in, so the UI can format a bare number without
 * a per-metric lookup table. `minutes` renders as "1h 11m", `csat` as "4.6",
 * `percent` as "27.1%", `count` as "285", `decimal` as "2.0" for rates that
 * are neither a whole count nor a score out of five.
 */
export type MetricUnit = "count" | "minutes" | "percent" | "csat" | "decimal";

/** Enough to render an agent's identity in a table row or a card. */
export interface AgentIdentity {
  agentId: string;
  name: string;
  /** Precomputed so the UI never has to guess at name splitting. */
  initials: string;
  /** Null when the agent has no photo — render the initials instead. */
  avatarUrl: string | null;
}

/**
 * One agent's row in the performance table.
 *
 * Averages are null rather than zero when there is nothing to average — an
 * agent with no CSAT responses has no score, and a table that renders that as
 * "0.0" is lying. Every consumer must handle null.
 */
export interface AgentPerformance extends AgentIdentity {
  closedTickets: number;
  /** Share of all closed tickets in the range, 0–100. */
  pctOfClosedTickets: number;
  averageCsat: number | null;
  ticketsReplied: number;
  messagesSent: number;
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
}

/**
 * One agent's row in the availability table.
 *
 * The three status durations are minutes inside the range, and are expected to
 * sum to the agent's rostered time — not to the length of the range.
 */
export interface AgentAvailability extends AgentIdentity {
  onlineMinutes: number;
  awayMinutes: number;
  offlineMinutes: number;
  /** Closed tickets per hour spent online. Null when the agent was never online. */
  ticketsPerOnlineHour: number | null;
}

/** Which metric a top-performer card is celebrating. */
export type TopPerformerMetric =
  | "averageCsat"
  | "firstResponseTime"
  | "resolutionTime"
  | "closedTickets";

/**
 * The winner of one metric over the range.
 *
 * `agent` is null when nobody qualifies — no CSAT responses at all, say. The
 * card still renders, with an em dash, so the row does not reflow between
 * ranges.
 */
export interface TopPerformer {
  metric: TopPerformerMetric;
  label: string;
  agent: AgentIdentity | null;
  value: number | null;
  unit: MetricUnit;
}

/** Which whole-team figure a company-wide tile is reporting. */
export type CompanyMetricKey =
  | "closedTickets"
  | "ticketsReplied"
  | "messagesSent"
  | "averageCsat"
  | "firstResponseMinutes"
  | "resolutionMinutes";

/**
 * One whole-team figure, with the same figure from the window before it.
 *
 * Counts are totals; rates and scores are means across the team. Both are the
 * backend's arithmetic — a client that summed the agent rows itself would get
 * a different first-response time (a mean of medians is not the median), and
 * two clients disagreeing about a company number is worse than either being
 * approximate.
 *
 * `previous` covers the window of equal length immediately before this one, and
 * is null when there is no comparable history — a delta against a partial
 * window reads as a collapse that never happened.
 */
export interface CompanyMetric {
  key: CompanyMetricKey;
  label: string;
  value: number | null;
  previous: number | null;
  unit: MetricUnit;
  /** True for the time metrics, where a fall is an improvement. */
  lowerIsBetter: boolean;
}

/**
 * The company-wide band above the agent tables (Aug 25 session — "company-wide
 * first response time or company-wide resolution time").
 *
 * Distinct from `AgentAnalytics.performanceAverage`, which is the per-agent
 * mean pinned inside the table. One answers "how is the team doing", the other
 * "how does this agent compare to their colleagues", and the screen must not
 * let them be read as the same number.
 */
export interface CompanySummary {
  /** Agents with any activity in the range — the denominator behind the means. */
  activeAgents: number;
  metrics: CompanyMetric[];
}

/** Everything the Agents tab needs, in one round trip. */
export interface AgentAnalytics {
  company: CompanySummary;
  topPerformers: TopPerformer[];
  performance: AgentPerformance[];
  availability: AgentAvailability[];
  /** The "Average" summary row. Computed by the backend so every client agrees. */
  performanceAverage: Omit<AgentPerformance, keyof AgentIdentity>;
}

/**
 * One row of the channel table.
 *
 * `closedTickets` may exceed `createdTickets`: tickets created before the range
 * can be closed inside it.
 */
export interface ChannelPerformance {
  channelId: string;
  label: string;
  createdTickets: number;
  /** Share of all tickets created in the range, 0–100. */
  pctOfCreatedTickets: number;
  closedTickets: number;
  /** Total time a ticket was actively worked, not wall-clock age. */
  handleTimeMinutes: number | null;
  firstResponseMinutes: number | null;
  averageCsat: number | null;
}

/** Everything the Channels tab needs. */
export interface ChannelAnalytics {
  channels: ChannelPerformance[];
  channelAverage: Omit<ChannelPerformance, "channelId" | "label">;
}

/**
 * One tag's usage over the range.
 *
 * `perDay` is aligned index-for-index with `TagAnalytics.days`, so a chart can
 * zip the two without a date lookup. Days with no uses are 0, never absent.
 */
export interface TagUsage {
  tag: string;
  total: number;
  perDay: number[];
}

/** Everything the Tags tab needs. */
export interface TagAnalytics {
  /** Bucket start dates, ascending. One entry per column of `perDay`. */
  days: Timestamp[];
  /** Ordered by total, descending. The chart plots these. */
  topUsed: TagUsage[];
  /** Every tag used in the range, ordered by total, descending. */
  all: TagUsage[];
}

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
