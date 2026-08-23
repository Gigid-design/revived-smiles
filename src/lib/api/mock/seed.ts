/**
 * Demo data for the mock adapter.
 *
 * Two audiences to satisfy: the patient demo needs one believable order to
 * walk through, and the admin demo needs a queue with enough variety that
 * every status badge, filter and empty state has something to render.
 */

import type {
  AdjustmentRequest,
  AppNotification,
  AuthUser,
  BillingAddress,
  ChatMessage,
  Insurance,
  Invoice,
  PaymentMethod,
  PhotoType,
  PromptConfig,
  Submission,
  SubmissionStatus,
  Subscription,
  SubscriptionPlan,
} from "../types";
import { REQUEST_LABELS, REQUEST_OUTCOMES, SUBMISSION_STATUS_LABELS } from "../types";
import type { MockDb } from "./store";

/* ------------------------------------------------------------------ */
/* Constants the rest of the demo refers to                            */
/* ------------------------------------------------------------------ */

/**
 * Bump this whenever the seed below changes shape or content.
 *
 * Persisted demo state carrying an older version is discarded on load, so an
 * already-open tab picks up the new seed instead of quietly running on the old
 * one. Without it, changing the seed appeared to do nothing for anyone who had
 * the app open — the stale copy won, and the dashboard rendered as though the
 * patient had no order at all.
 */
export const SEED_VERSION = 22;

export const DEMO_SUBMISSION_ID = "demo-1";
export const CARE_TEAM_NAME = "Revived Smiles Care";

/** Name and state come from the account, not from intake. */
export const DEMO_PATIENT: AuthUser = {
  id: "demo-user-1",
  email: "angela@example.com",
  name: "Angela Carter",
  state: "California",
};

/** Credentials shown on the admin login screen. Any password works in the demo. */
export const DEMO_ADMIN_EMAIL = "admin@revivedsmiles.com";

/** Staff addresses the demo accepts. A real backend decides this server-side. */
export const DEMO_ADMIN_EMAILS = [
  "admin@revivedsmiles.com",
  "ivan.lomelin@unosquare.com",
];

/** Stand-in imagery, so captured photos have something to show. */
export const DEMO_PHOTOS: Record<PhotoType, string> = {
  "close-bite-front": "/assets/images/close-bite-front.png",
  "close-bite-side": "/assets/images/close-bite-right.png",
  "open-bite-front": "/assets/images/open-bite-front.png",
  "open-bite-side": "/assets/images/open-bite-left.png",
};

export const DEMO_IMPRESSION_PHOTO = "/assets/images/impression-example-good.svg";

/**
 * The Shopify order the demo patient placed.
 *
 * Intake reads the product from here rather than asking, so a fresh demo draft
 * arrives pre-filled exactly as a real one would. A real adapter looks this up
 * against the authenticated account.
 */
export const DEMO_SHOPIFY_ORDER = {
  orderNumber: "#1042",
  /* A multi-item order: two partials that each need their own tooth chart and
     shade (an upper and a lower, per Gitai's example) plus a nightguard that
     needs neither — so the intake wizard demonstrates the per-item detail loop
     and the "no extra details" pass-through in one order. */
  products: ["acrylic-partial", "flexible-partial", "nightguard"],
};

/** Stand-in carrier reference. A real backend gets this from the carrier. */
export const DEMO_TRACKING = "1Z999AA10123456784";

/**
 * Where the website sells the product-protection plan. Insurance is purchased
 * off-app (Shopify upsell), so the "add protection" CTA links here. A real
 * backend returns the exact product URL for the appliance being protected.
 */
export const INSURANCE_PURCHASE_URL = "https://revivedsmiles.com/products/protection-plan";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function daysInFuture(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/** A submission with sensible empty defaults, so seeds stay readable. */
/* A believable street address for a seeded patient — the rail's Customer card
   mirrors the Shopify shipping address, so every row needs one. Deterministic
   (hashed from the email) so reloads don't reshuffle the demo. */
const SEED_CITIES: Record<string, { city: string; zip: string; abbr: string }> = {
  California: { city: "San Diego", zip: "92103", abbr: "CA" },
  Texas: { city: "Austin", zip: "78704", abbr: "TX" },
  "New Jersey": { city: "Montclair", zip: "07042", abbr: "NJ" },
  Florida: { city: "Sarasota", zip: "34236", abbr: "FL" },
  Illinois: { city: "Evanston", zip: "60201", abbr: "IL" },
  Oregon: { city: "Portland", zip: "97214", abbr: "OR" },
  Maine: { city: "Portland", zip: "04101", abbr: "ME" },
  Nevada: { city: "Reno", zip: "89509", abbr: "NV" },
  "New York": { city: "Albany", zip: "12203", abbr: "NY" },
  Washington: { city: "Spokane", zip: "99201", abbr: "WA" },
  "North Carolina": { city: "Durham", zip: "27701", abbr: "NC" },
  Pennsylvania: { city: "Pittsburgh", zip: "15217", abbr: "PA" },
};
const SEED_STREETS = ["Maple Ave", "Oakwood Dr", "Cedar Ln", "Willow Ct", "Birchwood Rd", "Juniper St"];

function seedAddress(email: string, state: string | null): BillingAddress | null {
  if (!state) return null;
  const loc = SEED_CITIES[state] ?? { city: "Springfield", zip: "00000", abbr: state.slice(0, 2).toUpperCase() };
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return {
    line1: `${100 + (h % 899)} ${SEED_STREETS[h % SEED_STREETS.length]}`,
    line2: "",
    city: loc.city,
    state: loc.abbr,
    postalCode: loc.zip,
    country: "US",
  };
}

function submission(partial: Partial<Submission> & Pick<Submission, "id" | "email">): Submission {
  return {
    userId: null,
    name: null,
    state: null,
    orderNumber: null,
    products: [],
    whiteShade: null,
    gumShade: null,
    selectedTeeth: [],
    teethNotSure: false,
    closeBitePhotos: [],
    openBitePhotos: [],
    impressionPhotos: [],
    photoAnalyses: {},
    status: "pending",
    reviewNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    trackingNumber: null,
    shippedAt: null,
    completedAt: null,
    createdAt: daysAgo(1),
    ...partial,
  };
}

/** The builder above, plus a synthesized Shopify-style shipping address when
    the row doesn't carry its own. */
function submissionWithAddress(partial: Partial<Submission> & Pick<Submission, "id" | "email">): Submission {
  const row = submission(partial);
  if (row.shippingAddress === undefined) {
    row.shippingAddress = seedAddress(row.email, row.state);
  }
  return row;
}

/* ------------------------------------------------------------------ */
/* The admin queue                                                     */
/* ------------------------------------------------------------------ */

const QUEUE: Array<{
  name: string;
  email: string;
  state: string;
  products: string[];
  status: SubmissionStatus;
  days: number;
  notes?: string;
  tracking?: string;
}> = [
  { name: "Marcus Webb", email: "m.webb@example.com", state: "Texas", products: ["full-denture"], status: "pending", days: 0 },
  { name: "Priya Raman", email: "priya.r@example.com", state: "New Jersey", products: ["clear-partial"], status: "pending", days: 1 },
  { name: "Dolores Hunt", email: "d.hunt@example.com", state: "Florida", products: ["flexible-partial"], status: "in_review", days: 2 },
  { name: "Terrence Ade", email: "t.ade@example.com", state: "Georgia", products: ["acrylic-partial"], status: "in_review", days: 2 },
  {
    name: "Joyce Feldman", email: "joyce.f@example.com", state: "Ohio", products: ["flexible-partial"],
    status: "changes_requested", days: 3,
    notes: "The open-bite side photo is too dark to read the gum line. Could you retake it near a window, with the light in front of you rather than behind?",
  },
  {
    name: "Rafael Ortiz", email: "r.ortiz@example.com", state: "Arizona", products: ["unilateral-partial"],
    status: "changes_requested", days: 4,
    notes: "We need one more impression photo — the lower tray didn't come through.",
  },
  { name: "Nadia Bello", email: "n.bello@example.com", state: "Illinois", products: ["revived-veneers"], status: "approved", days: 5 },
  { name: "Colin Shaw", email: "c.shaw@example.com", state: "Oregon", products: ["nightguard"], status: "approved", days: 6 },
  { name: "Hester Quill", email: "h.quill@example.com", state: "Maine", products: ["retainer"], status: "in_fabrication", days: 8 },
  { name: "Ben Adeyemi", email: "b.adeyemi@example.com", state: "Nevada", products: ["full-denture"], status: "in_fabrication", days: 9 },
  { name: "Sofia Marchetti", email: "s.marchetti@example.com", state: "New York", products: ["clear-partial"], status: "shipped", days: 12, tracking: "1Z999AA10123456784" },
  { name: "Wesley Kaur", email: "w.kaur@example.com", state: "Washington", products: ["sports-mouthguard"], status: "shipped", days: 14, tracking: "1Z999AA10987654321" },
  { name: "Imani Brooks", email: "i.brooks@example.com", state: "North Carolina", products: ["flexible-partial"], status: "completed", days: 21 },
  {
    name: "Gerald Pinsky", email: "g.pinsky@example.com", state: "Pennsylvania", products: ["acrylic-partial"],
    status: "rejected", days: 24,
    notes: "The photos show active gum inflammation. Please see a dentist in person before we fit anything.",
  },
];

function buildQueue(): Submission[] {
  return QUEUE.map((row, i) =>
    submissionWithAddress({
      id: `sub-${String(i + 2).padStart(3, "0")}`,
      /* Every submission carries its Shopify order number, platform-wide
         (Aug 21 client review) — deterministic so demos don't reshuffle. */
      orderNumber: `#${1101 + i * 7}`,
      email: row.email,
      name: row.name,
      state: row.state,
      products: row.products,
      whiteShade: "A2",
      gumShade: "G2",
      selectedTeeth: row.products.some((p) => p.includes("partial")) ? [12, 13, 14] : [],
      status: row.status,
      createdAt: daysAgo(row.days),
      reviewNotes: row.notes ?? null,
      reviewedBy: row.status === "pending" ? null : "Admin User",
      reviewedAt: row.status === "pending" ? null : daysAgo(Math.max(0, row.days - 1)),
      trackingNumber: row.tracking ?? null,
      fabricationStartedAt: ["in_fabrication", "shipped", "completed"].includes(row.status)
        ? daysAgo(Math.max(0, row.days - 2))
        : null,
      shippedAt: row.tracking ? daysAgo(Math.max(0, row.days - 3)) : null,
      completedAt: row.status === "completed" ? daysAgo(Math.max(0, row.days - 6)) : null,
      closeBitePhotos: [DEMO_PHOTOS["close-bite-front"], DEMO_PHOTOS["close-bite-side"]],
      openBitePhotos: [DEMO_PHOTOS["open-bite-front"], DEMO_PHOTOS["open-bite-side"]],
      impressionPhotos: [DEMO_IMPRESSION_PHOTO, DEMO_IMPRESSION_PHOTO],
      photoAnalyses: {
        "close-bite-front": {
          checks: [
            { id: "teeth_visible", label: "Teeth visible", pass: true, detail: "Upper and lower arches are in frame." },
            { id: "front_view", label: "Front-on angle", pass: true, detail: "Camera is square to the face." },
            { id: "blur", label: "Sharpness", pass: true, detail: "In focus." },
            { id: "lighting", label: "Lighting", pass: true, detail: "Evenly lit." },
            { id: "framing", label: "Framing", pass: true, detail: "Mouth fills the frame." },
            { id: "glare", label: "Glare", pass: true, detail: "No hotspots." },
          ],
          summary: "Clear front view with both arches visible.",
          teethCenter: { x: 0.5, y: 0.52 },
          pass: true,
        },
      },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Prompt configuration                                                */
/* ------------------------------------------------------------------ */

const QUALITY_CHECKS = [
  { id: "blur", label: "Sharpness", requirement: "The teeth are in focus, with no motion blur." },
  { id: "lighting", label: "Lighting", requirement: "The mouth is evenly lit, with no deep shadow across the gum line." },
  { id: "framing", label: "Framing", requirement: "The mouth fills most of the frame and nothing is cropped." },
  { id: "glare", label: "Glare", requirement: "No flash hotspot obscures the tooth surface." },
];

const POSE_SPECS: Record<PhotoType, { label: string; pose: string; content: Array<{ id: string; label: string; requirement: string }> }> = {
  "close-bite-front": {
    label: "Close Bite — Front",
    pose: "Teeth together, lips relaxed apart, camera square to the face at mouth height.",
    content: [
      { id: "teeth_visible", label: "Teeth visible", requirement: "Both the upper and lower front teeth are visible with the bite closed." },
      { id: "front_view", label: "Front-on angle", requirement: "The camera is facing the mouth straight on, not angled to either side." },
    ],
  },
  "close-bite-side": {
    label: "Close Bite — Side",
    pose: "Teeth together, head turned roughly 45 degrees so the side teeth are visible.",
    content: [
      { id: "teeth_visible", label: "Teeth visible", requirement: "The side teeth are visible with the bite closed." },
      { id: "side_angle", label: "Side angle", requirement: "The head is turned enough to show the back teeth in profile." },
    ],
  },
  "open-bite-front": {
    label: "Open Bite — Front",
    pose: "Mouth open wide, camera square to the face, gum line visible above and below.",
    content: [
      { id: "mouth_open", label: "Mouth open", requirement: "The mouth is open wide enough to see the upper and lower gum line." },
      { id: "front_view", label: "Front-on angle", requirement: "The camera is facing the mouth straight on." },
    ],
  },
  "open-bite-side": {
    label: "Open Bite — Side",
    pose: "Mouth open, head turned roughly 45 degrees, back gum ridge visible.",
    content: [
      { id: "mouth_open", label: "Mouth open", requirement: "The mouth is open wide enough to see the gum ridge." },
      { id: "side_angle", label: "Side angle", requirement: "The head is turned enough to show the back of the ridge." },
    ],
  },
};

function buildPromptConfigs(): PromptConfig[] {
  return (Object.keys(POSE_SPECS) as PhotoType[]).map((photoType) => ({
    id: `prompt-${photoType}-v1`,
    photoType,
    version: 1,
    label: POSE_SPECS[photoType].label,
    poseDescription: POSE_SPECS[photoType].pose,
    contentChecks: POSE_SPECS[photoType].content,
    qualityChecks: QUALITY_CHECKS,
    isActive: true,
    createdBy: "Seed",
    changeNotes: "Initial version.",
    createdAt: daysAgo(30),
  }));
}

/* ------------------------------------------------------------------ */
/* The demo patient's own thread, chat and notifications               */
/* ------------------------------------------------------------------ */

/**
 * One conversation, running oldest to newest, including a resolved supplies
 * request and an unread reply — so the demo shows a request card in both of
 * its interesting states without anyone having to create one first.
 */
function buildMessages(): ChatMessage[] {
  const patientName = DEMO_PATIENT.name ?? "Angela Carter";

  /* The impression + teeth photos Angela submitted, labelled the way the
     submission event attaches them — so her admin conversation shows the same
     expandable photo strip as a real submission. */
  const submittedPhotos: ChatMessage["attachments"] = [
    { url: DEMO_PHOTOS["close-bite-front"], label: "Close Bite — Front" },
    { url: DEMO_PHOTOS["close-bite-side"], label: "Close Bite — Side" },
    { url: DEMO_PHOTOS["open-bite-front"], label: "Open Bite — Front" },
    { url: DEMO_PHOTOS["open-bite-side"], label: "Open Bite — Side" },
    { url: DEMO_IMPRESSION_PHOTO, label: "Impression 1" },
    { url: DEMO_IMPRESSION_PHOTO, label: "Impression 2" },
  ];

  const script: Array<{
    role: ChatMessage["senderRole"];
    body: string;
    mins: number;
    unread?: boolean;
    request?: ChatMessage["request"];
    event?: ChatMessage["event"];
    attachments?: ChatMessage["attachments"];
  }> = [
    {
      role: "admin",
      body: "Hi Angela — welcome to Revived Smiles. I'm here if anything in the photo steps is unclear.",
      mins: 5760,
    },
    {
      role: "patient",
      body: "Thanks! Quick question — do I need to take the impression photos on the same day?",
      mins: 5750,
    },
    {
      role: "admin",
      body: "No need. Take your time. The trays keep, and the photos only need to be from the same impression.",
      mins: 5740,
    },
    {
      role: "patient",
      body: `${REQUEST_LABELS.trays} — Trays too big\n\nThe upper tray doesn't sit flush at the back — it lifts when I bite down.`,
      mins: 4320,
      request: {
        kind: "trays",
        detail: "Trays too big",
        status: "accepted",
        outcome: REQUEST_OUTCOMES.trays,
        trackingNumber: DEMO_TRACKING,
      },
    },
    {
      role: "admin",
      body: `${REQUEST_OUTCOMES.trays}. Your tracking number is ${DEMO_TRACKING}. Hold off on taking the impression until it arrives.`,
      mins: 4260,
    },
    {
      role: "patient",
      body: "Perfect, thank you — they arrived this morning.",
      mins: 180,
    },
    {
      role: "patient",
      body: "Here's a summary of what I submitted:\n\n• Product: Acrylic Partial Flipper, Flexible Partial Denture, Nightguard (Order #1042)\n• Tooth shade: A2\n• Gum shade: Pink\n• Teeth to replace: #12, #13, #14\n• Photos: 4 teeth photos + 2 impression photos attached",
      mins: 120,
      event: {
        kind: "submission",
        title: "Impression & intake submitted",
        facts: [
          { label: "Product", value: "Acrylic Partial Flipper, Flexible Partial Denture, Nightguard (Order #1042)" },
          { label: "Tooth shade", value: "A2" },
          { label: "Gum shade", value: "Pink" },
          { label: "Teeth to replace", value: "#12, #13, #14" },
        ],
      },
      attachments: submittedPhotos,
    },
    {
      role: "admin",
      body: "Got it — everything's come through. We're reviewing your impressions now and will be in touch shortly.",
      mins: 90,
    },
    {
      role: "admin",
      body: `Status changed from ${SUBMISSION_STATUS_LABELS.pending} to ${SUBMISSION_STATUS_LABELS.in_review}.`,
      mins: 88,
      event: {
        kind: "status_change",
        title: "Status updated",
        fromStatus: "pending",
        toStatus: "in_review",
        actor: "Admin User",
      },
    },
    {
      role: "admin",
      body: "Quick note — your upper impression looks great. We're just checking the lower arch now.",
      mins: 30,
      unread: true,
    },
  ];

  return script.map((m, i) => ({
    id: `demo-msg-${i + 1}`,
    submissionId: DEMO_SUBMISSION_ID,
    senderRole: m.role,
    senderName: m.role === "admin" ? CARE_TEAM_NAME : patientName,
    body: m.body,
    createdAt: minutesAgo(m.mins),
    readAt: m.unread ? null : minutesAgo(Math.max(m.mins - 2, 0)),
    ...(m.request ? { request: m.request } : {}),
    ...(m.event ? { event: m.event } : {}),
    ...(m.attachments ? { attachments: m.attachments } : {}),
  }));
}

/**
 * A short conversation on a queue order (Dolores Hunt, `sub-004`) that ends on
 * an *unresolved* supplies request — so the admin chat has a pending request to
 * accept or decline, demonstrating the care-team console. Without this, every
 * request in the demo is already resolved and the accept/decline controls never
 * appear for staff.
 */
function buildInboxRequests(): ChatMessage[] {
  const submissionId = "sub-004";
  const patientName = "Dolores Hunt";

  /* The impression + teeth photos this order submitted, labelled the way the
     submission event attaches them — so the admin chat shows a real, expandable
     photo strip without anyone walking the intake flow first. */
  const submittedPhotos: ChatMessage["attachments"] = [
    { url: DEMO_PHOTOS["close-bite-front"], label: "Close Bite — Front" },
    { url: DEMO_PHOTOS["close-bite-side"], label: "Close Bite — Side" },
    { url: DEMO_PHOTOS["open-bite-front"], label: "Open Bite — Front" },
    { url: DEMO_PHOTOS["open-bite-side"], label: "Open Bite — Side" },
    { url: DEMO_IMPRESSION_PHOTO, label: "Impression 1" },
    { url: DEMO_IMPRESSION_PHOTO, label: "Impression 2" },
  ];

  const script: Array<{
    role: ChatMessage["senderRole"];
    body: string;
    mins: number;
    read?: boolean;
    request?: ChatMessage["request"];
    event?: ChatMessage["event"];
    attachments?: ChatMessage["attachments"];
  }> = [
    {
      role: "patient",
      body: "Here's a summary of what I submitted:\n\n• Product: Flexible Partial Denture\n• Tooth shade: A2\n• Gum shade: Pink\n• Teeth to replace: #12, #13, #14\n• Photos: 4 teeth photos + 2 impression photos attached",
      mins: 2880,
      read: true,
      event: {
        kind: "submission",
        title: "Impression & intake submitted",
        facts: [
          { label: "Product", value: "Flexible Partial Denture" },
          { label: "Tooth shade", value: "A2" },
          { label: "Gum shade", value: "Pink" },
          { label: "Teeth to replace", value: "#12, #13, #14" },
        ],
      },
      attachments: submittedPhotos,
    },
    {
      role: "admin",
      body: `Status changed from ${SUBMISSION_STATUS_LABELS.pending} to ${SUBMISSION_STATUS_LABELS.in_review}.`,
      mins: 2820,
      event: {
        kind: "status_change",
        title: "Status updated",
        fromStatus: "pending",
        toStatus: "in_review",
        actor: "Admin User",
      },
    },
    {
      role: "patient",
      body: "Hi — one of my lower trays cracked when I was boiling it. Could I get a replacement?",
      mins: 240,
    },
    {
      role: "admin",
      body: "So sorry to hear that, Dolores. Send a request through and we'll get fresh material out to you.",
      mins: 220,
    },
    {
      role: "patient",
      body: `${REQUEST_LABELS.material}\n\nThe lower tray split down the middle — I don't think I can take an impression with it.`,
      mins: 90,
      request: { kind: "material", detail: "", status: "pending", outcome: null, trackingNumber: null },
    },
  ];

  return script.map((m, i) => ({
    id: `inbox-msg-${i + 1}`,
    submissionId,
    senderRole: m.role,
    senderName: m.role === "admin" ? CARE_TEAM_NAME : patientName,
    body: m.body,
    createdAt: minutesAgo(m.mins),
    readAt: m.read || m.role === "admin" ? minutesAgo(Math.max(m.mins - 2, 0)) : null,
    ...(m.request ? { request: m.request } : {}),
    ...(m.event ? { event: m.event } : {}),
    ...(m.attachments ? { attachments: m.attachments } : {}),
  }));
}

function buildNotifications(): AppNotification[] {
  return [
    {
      id: "demo-notif-1",
      title: "Your photos are being reviewed",
      body: "A technician is checking your impressions now. We'll let you know as soon as they're approved.",
      type: "status_update",
      read: false,
      submissionId: DEMO_SUBMISSION_ID,
      createdAt: minutesAgo(45),
    },
    {
      id: "demo-notif-2",
      title: "New trays are on the way",
      body: "We've sent a smaller tray set out to you. Tracking: 1Z999AA10123456784.",
      type: "info",
      read: false,
      submissionId: DEMO_SUBMISSION_ID,
      createdAt: daysAgo(3),
    },
    {
      id: "demo-notif-3",
      title: "Welcome to Revived Smiles",
      body: "Your account is set up. Start by telling us which product you're after.",
      type: "info",
      read: true,
      submissionId: DEMO_SUBMISSION_ID,
      createdAt: daysAgo(5),
    },
  ];
}

/* ------------------------------------------------------------------ */

/** A live subscription with its next delivery a few weeks out. */
function buildSubscriptions(): Subscription[] {
  return [
    {
      id: "sub-whitening-1",
      productName: "Whitening Gel Refill",
      description: "Professional whitening gel, delivered automatically.",
      imageUrl: "/assets/images/subscription-product.png",
      intervalWeeks: 8,
      pricePerDelivery: 2900,
      currency: "USD",
      status: "active",
      nextDeliveryAt: daysInFuture(19),
      lastSkippedAt: null,
      canceledAt: null,
    },
  ];
}

/** The plans the whitening subscription can move between. */
function buildPlans(): SubscriptionPlan[] {
  return [
    {
      id: "plan-monthly",
      name: "Monthly refill",
      description: "A fresh gel every 4 weeks — best for daily whitening.",
      intervalWeeks: 4,
      pricePerDelivery: 3400,
      currency: "USD",
    },
    {
      id: "plan-standard",
      name: "Standard refill",
      description: "Every 8 weeks. The usual pace for most smiles.",
      intervalWeeks: 8,
      pricePerDelivery: 2900,
      currency: "USD",
    },
    {
      id: "plan-quarterly",
      name: "Quarterly refill",
      description: "Every 12 weeks — for occasional touch-ups.",
      intervalWeeks: 12,
      pricePerDelivery: 2500,
      currency: "USD",
    },
  ];
}

function buildPaymentMethod(): PaymentMethod {
  return { brand: "Visa", last4: "4242", expMonth: 8, expYear: 2027 };
}

function buildBillingAddress(): BillingAddress {
  return {
    line1: "128 Maple Avenue",
    line2: "Apt 4",
    city: "Austin",
    state: "Texas",
    postalCode: "78701",
    country: "United States",
  };
}

/** A short history of past whitening charges, most recent first. */
function buildInvoices(): Invoice[] {
  return [
    { id: "inv-0004", date: daysAgo(3), description: "Whitening Gel Refill", amount: 2900, currency: "USD", status: "paid" },
    { id: "inv-0003", date: daysAgo(59), description: "Whitening Gel Refill", amount: 2900, currency: "USD", status: "paid" },
    { id: "inv-0002", date: daysAgo(115), description: "Whitening Gel Refill", amount: 2900, currency: "USD", status: "paid" },
    { id: "inv-0001", date: daysAgo(171), description: "Whitening starter kit", amount: 4900, currency: "USD", status: "paid" },
  ];
}

/**
 * The demo patient's protection plan.
 *
 * Seeded as `not_insured` so the primary demo shows the "add protection" offer
 * (the new revenue path), with a live window so the urgency line has something
 * to count down. The card also honours `?insurance=insured` to preview the
 * covered layout without touching this seed. `productName` is denormalised as a
 * literal to keep this backend-layer file from importing the app's product
 * catalogue — it mirrors DEMO_SHOPIFY_ORDER's `flexible-partial`.
 */
function buildInsurances(): Insurance[] {
  return [
    {
      id: "ins-demo-1",
      submissionId: DEMO_SUBMISSION_ID,
      productName: "Flexible Partial Denture",
      status: "not_insured",
      planName: null,
      coverage: null,
      purchasedAt: null,
      expiresAt: null,
      price: 4900,
      currency: "USD",
      windowClosesAt: daysInFuture(5),
      purchaseUrl: INSURANCE_PURCHASE_URL,
      claim: null,
      nextClaimEligibleAt: null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Adjustment requests — the admin review queue                        */
/* ------------------------------------------------------------------ */

/**
 * A few adjustment requests so the admin queue renders every state without
 * anyone having to walk the six-screen flow first. One belongs to the demo
 * patient (so it also appears in her portal's request history), the rest to
 * queue patients. Photos reuse existing stand-in imagery — a real backend
 * stores the customer's uploads.
 */
function buildAdjustmentRequests(): AdjustmentRequest[] {
  const inMouth = "/assets/images/close-bite-front.png";
  const onModels = "/assets/images/impression-photo.svg";
  const biteStrip = "/assets/images/close-bite-right.png";
  const markedModels = "/assets/images/open-bite-front.png";

  return [
    /* Demo patient — a nightguard that's too tight. Newest, still pending. */
    {
      id: "adj-seed-1",
      requestNumber: "ADJ-0987-1",
      userId: DEMO_PATIENT.id,
      submissionId: "demo-2",
      orderNumber: "#0987",
      product: "nightguard",
      issues: ["fit"],
      answers: { fitDescription: "It goes in, but it's too tight" },
      photos: { inMouth, onModels },
      description:
        "It fits over my front teeth but I have to force it onto the back molars, " +
        "and it aches after a few minutes. Feels about a size too tight across the arch.",
      status: "pending",
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedAt: null,
      createdAt: minutesAgo(90),
      submittedAt: minutesAgo(90),
    },
    /* Queue patient — sore spots + loose on a flexible partial, pending. */
    {
      id: "adj-seed-2",
      requestNumber: "ADJ-sub-014-1",
      userId: null,
      submissionId: "sub-014",
      orderNumber: null,
      product: "flexible-partial",
      issues: ["sore-spots", "loose"],
      answers: {
        woreForFiveDays: true,
        completedHotWaterActivation: true,
        looseSnug: "It was snug at first and loosened over time",
      },
      photos: { inMouth, onModels, markedModels },
      description:
        "Rubs raw on the left gum near the clasp, and over the last two weeks it's " +
        "started to lift when I eat. I've marked the sore spot on the models.",
      status: "pending",
      reviewNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedAt: null,
      createdAt: daysAgo(1),
      submittedAt: daysAgo(1),
    },
    /* Queue patient — a shade change already sent back for more info. */
    {
      id: "adj-seed-3",
      requestNumber: "ADJ-sub-004-1",
      userId: null,
      submissionId: "sub-004",
      orderNumber: null,
      product: "flexible-partial",
      issues: ["tooth-shade", "bite"],
      answers: { newToothShade: "A2" },
      photos: { inMouth, onModels, biteStrip },
      description:
        "The teeth came out noticeably darker than my natural ones. I'd like them a " +
        "shade lighter, and the bite feels high on the right.",
      status: "changes_requested",
      reviewNotes:
        "Thanks for the photos. The in-mouth shot is a little dark to judge shade — " +
        "could you retake it in daylight with your lips held back? Then we'll get this moving.",
      reviewedBy: CARE_TEAM_NAME,
      reviewedAt: daysAgo(1),
      approvedAt: null,
      createdAt: daysAgo(3),
      submittedAt: daysAgo(3),
    },
  ];
}

export function buildSeed(): MockDb {
  const demo = submissionWithAddress({
    id: DEMO_SUBMISSION_ID,
    userId: DEMO_PATIENT.id,
    email: DEMO_PATIENT.email,
    name: DEMO_PATIENT.name,
    state: DEMO_PATIENT.state,
    orderNumber: DEMO_SHOPIFY_ORDER.orderNumber,
    products: DEMO_SHOPIFY_ORDER.products,
    whiteShade: "A2",
    gumShade: "G2",
    selectedTeeth: [12, 13, 14],
    teethNotSure: false,
    /* Angela's current order sits mid-review, so the two portals share one live
       conversation: it surfaces in the admin inbox, and her Messages view — which
       binds to her newest order (getMine) — converse on the same non-draft order.
       That makes the patient↔admin side-by-side demo work in both directions
       without anyone walking the intake flow first. The impression + teeth photos
       let the admin chat show the expandable photo strip on her order too. */
    status: "in_review",
    reviewedBy: "Admin User",
    reviewedAt: minutesAgo(35),
    closeBitePhotos: [DEMO_PHOTOS["close-bite-front"], DEMO_PHOTOS["close-bite-side"]],
    openBitePhotos: [DEMO_PHOTOS["open-bite-front"], DEMO_PHOTOS["open-bite-side"]],
    impressionPhotos: [DEMO_IMPRESSION_PHOTO, DEMO_IMPRESSION_PHOTO],
    createdAt: daysAgo(5),
  });

  /* A second, earlier order for the same patient, so My Orders has more than
     one to switch between. Kept older than `demo` so `getMine` (newest) — and
     therefore the dashboard — still resolves to the in-progress order. */
  const demoPast = submissionWithAddress({
    id: "demo-2",
    userId: DEMO_PATIENT.id,
    email: DEMO_PATIENT.email,
    name: DEMO_PATIENT.name,
    state: DEMO_PATIENT.state,
    orderNumber: "#0987",
    products: ["nightguard"],
    /* The four teeth photos the intake flow actually captures:
       [Front — teeth closed, Mouth open] then [Left side, Right side].
       Clean shots only — no captions or badges burned into the image. */
    closeBitePhotos: [
      "/assets/images/close-bite-front.png",
      "/assets/images/open-bite-front.png",
    ],
    openBitePhotos: [
      "/assets/images/open-bite-left.png",
      "/assets/images/close-bite-right.png",
    ],
    status: "completed",
    trackingNumber: "1Z999AA10555512345",
    shippedAt: daysAgo(96),
    completedAt: daysAgo(92),
    createdAt: daysAgo(120),
  });

  /* A third order sitting at "Review completed" — the care team has approved
     it, so the tracker rests on that stage and the "View order" CTA is active.
     Older than `demo`, so `getMine`/the dashboard are unaffected. */
  const demoReview = submissionWithAddress({
    id: "demo-3",
    userId: DEMO_PATIENT.id,
    email: DEMO_PATIENT.email,
    name: DEMO_PATIENT.name,
    state: DEMO_PATIENT.state,
    orderNumber: "#1099",
    products: ["acrylic-partial", "retainer"],
    whiteShade: "A2",
    gumShade: "G3",
    selectedTeeth: [12, 13, 14],
    /* A free-text note from the patient, and per-product intake answers: the
       acrylic partial carries its own tooth chart and shades (distinct from the
       top-level mirror), while the retainer needs neither and contributes no
       entry — the shape the multi-item intake wizard produces. */
    notes: "Please match the shade to my upper front teeth — the last set came out a touch too white for me.",
    itemDetails: {
      "acrylic-partial": {
        whiteShade: "A3",
        gumShade: "G2",
        selectedTeeth: [8, 9, 10, 11],
        teethNotSure: false,
        notes: "Only the four front teeth on this piece.",
      },
    },
    /* The four teeth photos the intake flow actually captures:
       [Front — teeth closed, Mouth open] then [Left side, Right side].
       Clean shots only — no captions or badges burned into the image. */
    closeBitePhotos: [
      "/assets/images/close-bite-front.png",
      "/assets/images/open-bite-front.png",
    ],
    openBitePhotos: [
      "/assets/images/open-bite-left.png",
      "/assets/images/close-bite-right.png",
    ],
    /* The real impression photo on file, minus the green success overlay. */
    impressionPhotos: [
      "/assets/images/impression-photo.svg",
      "/assets/images/impression-photo.svg",
      "/assets/images/impression-photo.svg",
      "/assets/images/impression-photo.svg",
    ],
    status: "approved",
    reviewedBy: CARE_TEAM_NAME,
    reviewedAt: daysAgo(2),
    createdAt: daysAgo(15),
  });

  return {
    version: SEED_VERSION,
    submissions: [demo, demoReview, demoPast, ...buildQueue()],
    subscriptions: buildSubscriptions(),
    plans: buildPlans(),
    paymentMethod: buildPaymentMethod(),
    billingAddress: buildBillingAddress(),
    invoices: buildInvoices(),
    insurances: buildInsurances(),
    adjustmentRequests: buildAdjustmentRequests(),
    messages: [...buildMessages(), ...buildInboxRequests()],
    notifications: buildNotifications(),
    promptConfigs: buildPromptConfigs(),
    /* The demo starts signed in as the patient, so opening any URL directly
       lands on a working screen. The login screens still work and still
       overwrite this; signing out clears it. */
    authUser: { ...DEMO_PATIENT },
    adminUser: null,
    recoverySession: false,
  };
}
