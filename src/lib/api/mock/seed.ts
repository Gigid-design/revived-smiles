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
  ChatMessage,
  PhotoType,
  PromptConfig,
  Submission,
  SubmissionStatus,
  Thread,
} from "../types";
import type { MockDb } from "./store";

/* ------------------------------------------------------------------ */
/* Constants the rest of the demo refers to                            */
/* ------------------------------------------------------------------ */

export const DEMO_SUBMISSION_ID = "demo-1";
export const CARE_TEAM_NAME = "Revived Smiles Care";

export const DEMO_PATIENT: AuthUser = {
  id: "demo-user-1",
  email: "angela@example.com",
  name: "Angela Carter",
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
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

function buildThreads(): Thread[] {
  return [
    {
      id: "demo-thread-1",
      subject: "Different tray size",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
      unread: false,
      request: {
        kind: "trays",
        detail: "Trays too big",
        note: "The upper tray doesn't sit flush at the back — it lifts when I bite down.",
        status: "accepted",
        outcome: "New trays sent",
        trackingNumber: "1Z999AA10123456784",
      },
      messages: [
        { id: "demo-thread-1-m1", role: "patient", body: "The upper tray doesn't sit flush at the back — it lifts when I bite down.", createdAt: daysAgo(4) },
        { id: "demo-thread-1-m2", role: "care", body: "Thanks for flagging that, Angela. We've sent a smaller tray set out to you — tracking is 1Z999AA10123456784. Hold off on taking the impression until it arrives.", createdAt: daysAgo(3) },
      ],
    },
    {
      id: "demo-thread-2",
      subject: "Where is my order?",
      createdAt: daysAgo(1),
      updatedAt: minutesAgo(45),
      unread: true,
      messages: [
        { id: "demo-thread-2-m1", role: "patient", body: "Where is my order?", createdAt: daysAgo(1) },
        { id: "demo-thread-2-m2", role: "care", body: "You're in the review queue now — one of our technicians is checking your photos today. We'll message you the moment that's done.", createdAt: minutesAgo(45) },
      ],
    },
  ];
}

function buildMessages(): ChatMessage[] {
  const thread: Array<[ChatMessage["senderRole"], string, number]> = [
    ["admin", "Hi Angela — welcome to Revived Smiles. I'm here if anything in the photo steps is unclear.", 180],
    ["patient", "Thanks! Quick question — do I need to take the impression photos on the same day?", 174],
    ["admin", "No need. Take your time. The trays keep, and the photos only need to be from the same impression.", 170],
    ["patient", "That's helpful, thank you.", 166],
    ["admin", "Any time. I'll check back once your impressions are in.", 162],
  ];

  return thread.map(([senderRole, body, mins], i) => ({
    id: `demo-msg-${i + 1}`,
    submissionId: DEMO_SUBMISSION_ID,
    senderRole,
    senderName: senderRole === "admin" ? CARE_TEAM_NAME : (DEMO_PATIENT.name ?? "Angela Carter"),
    body,
    createdAt: minutesAgo(mins),
    readAt: minutesAgo(mins - 2),
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

export function buildSeed(): MockDb {
  const demo = submission({
    id: DEMO_SUBMISSION_ID,
    userId: DEMO_PATIENT.id,
    email: DEMO_PATIENT.email,
    name: DEMO_PATIENT.name,
    state: "California",
    products: ["flexible-partial"],
    whiteShade: "A2",
    gumShade: "G2",
    selectedTeeth: [12, 13, 14],
    teethNotSure: false,
    status: "draft",
    createdAt: daysAgo(5),
  });

  return {
    submissions: [demo, ...buildQueue()],
    messages: buildMessages(),
    threads: buildThreads(),
    notifications: buildNotifications(),
    promptConfigs: buildPromptConfigs(),
    authUser: null,
    adminUser: null,
    recoverySession: false,
  };
}
