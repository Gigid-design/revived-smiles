/**
 * Demo data for the mock adapter.
 *
 * Two audiences to satisfy: the patient demo needs one believable order to
 * walk through, and the admin demo needs a queue with enough variety that
 * every status badge, filter and empty state has something to render.
 */

import type {
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
import { REQUEST_LABELS, REQUEST_OUTCOMES } from "../types";
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
export const SEED_VERSION = 17;

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
    submission({
      id: `sub-${String(i + 2).padStart(3, "0")}`,
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

  const script: Array<{
    role: ChatMessage["senderRole"];
    body: string;
    mins: number;
    unread?: boolean;
    request?: ChatMessage["request"];
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
      role: "admin",
      body: "Wonderful. Send the photos over whenever you're ready and we'll take a look the same day.",
      mins: 45,
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

export function buildSeed(): MockDb {
  const demo = submission({
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
    status: "draft",
    createdAt: daysAgo(5),
  });

  /* A second, earlier order for the same patient, so My Orders has more than
     one to switch between. Kept older than `demo` so `getMine` (newest) — and
     therefore the dashboard — still resolves to the in-progress order. */
  const demoPast = submission({
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
  const demoReview = submission({
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
    /* No adjustment requests seeded — the flow creates the first one. */
    adjustmentRequests: [],
    messages: buildMessages(),
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
