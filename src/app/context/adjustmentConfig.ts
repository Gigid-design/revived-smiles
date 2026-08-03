/**
 * The Adjustment Request flow — configuration and copy.
 *
 * This is the backbone of the six-screen customer flow (see the spec,
 * "Adjustment Request Flow"). The portal collects a complete request; it does
 * not decide anything. The lab decides adjustment vs remake after the
 * appliance arrives. So everything here is about *which questions and steps a
 * product needs* and *what the customer is told* — never about a verdict.
 *
 * Every screen reads from this file:
 *   - Screen 2 (pick product): IN_FLOW_PRODUCTS + the customer-service escape.
 *   - Screen 4 (what's wrong):  ISSUES, ordered, filtered by product.
 *   - Screen 5 (required steps): the per-issue step metadata + copy below.
 *   - Last section (photos):     photoRequirements() + the daylight/damage rules.
 *
 * All grey-box strings from the spec are reproduced here verbatim as final
 * copy. If the copy needs to change, it changes here, in one place.
 */

/* Import the leaf `types` module, not the `@/lib/api` barrel: the mock backend
   imports this config, and routing the type through the barrel (which pulls in
   the mock) would form an import cycle. `types` depends on nothing. */
import type { AdjustmentIssueId } from "@/lib/api/types";

export type { AdjustmentIssueId };

/* ------------------------------------------------------------------ */
/* Products in the flow                                                */
/* ------------------------------------------------------------------ */

/**
 * The products this flow covers, in the spec's own order.
 *
 * `slug` is the flow's canonical id. Where an equivalent already exists in the
 * purchase catalogue (`productConfig.ts`) the slug matches it; four products
 * the spec needs are not yet in that catalogue and are marked `newToCatalogue`
 * so Phase 2 can add them without renaming any existing slug. The mapping is
 * intentionally explicit so a wrong guess is easy to spot and correct.
 *
 * Anything NOT in this list — Easy Denture, impression kits, cleaners,
 * whitening refills, accessories — is handled by customer service (Screen 2).
 */
export interface AdjustmentProduct {
  slug: string;
  label: string;
  /**
   * One of the "five partial dentures" the spec groups together again and
   * again (sore spots, loose, aesthetics, gum shade all key off this).
   */
  isPartialDenture: boolean;
  /**
   * Softens in near-boiling water, so it gets the hot-water activation step
   * (sore spots) and the hot-water reset (fit). True for the flexible and
   * unilateral families; the Acrylic Partial does NOT activate.
   */
  hotWaterActivated: boolean;
  /** Slug is not yet in productConfig.ts; Phase 2 adds it. */
  newToCatalogue?: boolean;
}

export const IN_FLOW_PRODUCTS: AdjustmentProduct[] = [
  { slug: "flexible-partial",          label: "Flexible Partial Denture",         isPartialDenture: true,  hotWaterActivated: true },
  { slug: "clear-flexible-partial",    label: "Clear Flexible Partial Denture",   isPartialDenture: true,  hotWaterActivated: true,  newToCatalogue: true },
  { slug: "unilateral-partial",        label: "Unilateral Partial Denture",       isPartialDenture: true,  hotWaterActivated: true },
  { slug: "clear-unilateral-partial",  label: "Clear Unilateral Partial Denture", isPartialDenture: true,  hotWaterActivated: true,  newToCatalogue: true },
  { slug: "acrylic-partial",           label: "Acrylic Partial Denture",          isPartialDenture: true,  hotWaterActivated: false },
  { slug: "essix-partial",             label: "Essix Partial Denture",            isPartialDenture: false, hotWaterActivated: false, newToCatalogue: true },
  { slug: "veneers",                   label: "Veneers",                          isPartialDenture: false, hotWaterActivated: false },
  { slug: "nightguard",                label: "Nightguard",                       isPartialDenture: false, hotWaterActivated: false },
  { slug: "retainer",                  label: "Retainer",                         isPartialDenture: false, hotWaterActivated: false },
  { slug: "whitening-tray",            label: "Whitening Tray",                   isPartialDenture: false, hotWaterActivated: false, newToCatalogue: true },
];

/** Look up an in-flow product by slug, or null if it's customer-service only. */
export function getAdjustmentProduct(slug: string): AdjustmentProduct | null {
  return IN_FLOW_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/** Screen 2: an item not in the flow routes to customer service with this. */
export const OUT_OF_SCOPE_MESSAGE =
  "Adjustments for this item are handled by our customer service team. " +
  "Please contact them through the chat and they'll take care of you from here.";

/* ------------------------------------------------------------------ */
/* Screen 3 — confirm they have their appliance and models             */
/* ------------------------------------------------------------------ */

export const CONFIRM_MODELS = {
  intro:
    "To adjust your appliance, we need both your appliance and your dental " +
    "models returned to us.",
  question: "Do you have both?",
  yesLabel: "Yes, I have my appliance and both models",
  noLabel: "No, I'm missing one or both",
  /** "No" routes to customer service. The portal must NOT mention warranty. */
  noMessage:
    "No problem. Please contact customer service through the chat and our " +
    "team will help you from here.",
} as const;

/* ------------------------------------------------------------------ */
/* Screen 4 — the issues ("what's wrong")                              */
/* ------------------------------------------------------------------ */

/**
 * Which products an issue applies to. Derived from product flags plus the two
 * explicit extras the spec calls out, so the rule reads the way the spec
 * states it rather than as a hardcoded grid:
 *
 *   sore-spots  five partial dentures only
 *   bite        five partial dentures, Veneers, Nightguard
 *   loose       five partial dentures only
 *   fit         all products
 *   cracked     all products
 *   aesthetics  five partial dentures only
 *   tooth-shade five partial dentures, Veneers
 *   gum-shade   five partial dentures only
 */
export function issueAppliesToProduct(
  issue: AdjustmentIssueId,
  product: AdjustmentProduct
): boolean {
  const partial = product.isPartialDenture;
  switch (issue) {
    case "fit":
    case "cracked":
      return true;
    case "sore-spots":
    case "loose":
    case "aesthetics":
    case "gum-shade":
      return partial;
    case "bite":
      return partial || product.slug === "veneers" || product.slug === "nightguard";
    case "tooth-shade":
      return partial || product.slug === "veneers";
  }
}

/**
 * The issue buttons, in the order they must appear on Screen 4 and stack on
 * Screen 5. The fit label varies by product — see `fitButtonLabel()`.
 */
export const ISSUE_ORDER: AdjustmentIssueId[] = [
  "sore-spots",
  "bite",
  "loose",
  "fit",
  "cracked",
  "aesthetics",
  "tooth-shade",
  "gum-shade",
];

export const ISSUE_LABELS: Record<AdjustmentIssueId, string> = {
  "sore-spots": "Sore spots, discomfort & tightness",
  bite: "Bite",
  loose: "Loose",
  fit: "Does not fit at all", // overridden per-product by fitButtonLabel()
  cracked: "Cracked or broken",
  aesthetics: "Aesthetics",
  "tooth-shade": "Tooth shade",
  "gum-shade": "Gum shade",
};

/**
 * The fit button's label changes by product. The five partial dentures read
 * "Does not fit at all". The products without a sore-spots option — Essix,
 * Veneers, Nightguard, Retainer, Whitening Tray — read "Doesn't fit or too
 * tight", because their fit button has to absorb tightness complaints too.
 */
export function fitButtonLabel(product: AdjustmentProduct): string {
  return product.isPartialDenture ? "Does not fit at all" : "Doesn't fit or too tight";
}

/** The issues offered for a product, in display order. */
export function issuesForProduct(product: AdjustmentProduct): AdjustmentIssueId[] {
  return ISSUE_ORDER.filter((issue) => issueAppliesToProduct(issue, product));
}

/** The Screen 4 button label for an issue, applying the fit variant. */
export function issueButtonLabel(
  issue: AdjustmentIssueId,
  product: AdjustmentProduct
): string {
  return issue === "fit" ? fitButtonLabel(product) : ISSUE_LABELS[issue];
}

/* ------------------------------------------------------------------ */
/* Screen 5 — the required steps, per issue                            */
/* ------------------------------------------------------------------ */

/** Shared copy for the hot-water activation, reused by sore-spots and fit. */
export const HOT_WATER = {
  instructions:
    "Place your appliance in water that is close to boiling for 30 seconds. " +
    "Let it cool to a comfortable temperature before putting it in your mouth. " +
    "This softens the material so it can conform properly to your gums.",
  helpLink: "How do I do this?", // opens a pop-up with a GIF + written steps
} as const;

/** Sore spots — five partial dentures only. */
export const SORE_SPOTS = {
  /** Step 1, all five partials. */
  wearCheckbox: "I have worn my appliance for at least 5 days",
  /** Step 2, hot-water partials only (not Acrylic). Uses HOT_WATER copy. */
  hotWaterHeading: "Required step: activate your appliance",
  hotWaterIntro:
    "Before we can adjust your appliance, you need to complete the hot water " +
    "activation.",
  hotWaterCheckbox: "I have completed the hot water activation",
  /** Step 3, mark the models. The models-not-appliance emphasis is load-bearing. */
  markHeading: "Mark your models, not your appliance",
  markInstructions:
    "Using a marker or pen, mark the exact spot on your dental models where " +
    "you feel discomfort. Be as precise as you can, since the lab adjusts " +
    "based on where you mark.",
  markReminder:
    "Mark the models, not the appliance. And don't worry about ruining the " +
    "models. Marking them up is expected and won't cause any problems.",
  markUpload: "Photo of your marked models",
} as const;

/** Bite — five partials, Veneers, Nightguard. No upload here; photo comes last. */
export const BITE = {
  heading: "Use your bite strip",
  instructions:
    "Find the bite strip included in your appliance box. Place it on the side " +
    "where you're having trouble, then bite down and grind on it. The pigment " +
    "transfers to your appliance and shows us exactly where to adjust.",
  leaveMarks:
    "Leave the marks on your appliance. You'll upload a photo of them at the end.",
  /** The escape hatch has to be there, or people send unmarked appliances. */
  noStrip: "Don't have your bite strip? Contact customer service and we'll mail you one.",
} as const;

/** Loose — five partial dentures only. One question for the lab. */
export const LOOSE = {
  question: "Was your appliance ever snug?",
  options: [
    "It was snug at first and loosened over time",
    "It never felt snug, even when new",
  ],
} as const;

/**
 * Fit — all products, but the step content branches three ways:
 *  - Hot-water partials get a reset first, and can close out if it fixes it.
 *  - Acrylic Partial skips straight to the requirements (no hot-water step).
 *  - Non-partials get a "which best describes it?" question.
 */
export const FIT = {
  /** Hot-water partials: reset, then ask if it worked. Uses HOT_WATER.instructions (retry wording below). */
  resetInstructions:
    "Place your appliance in water that is close to boiling for 30 seconds. " +
    "Let it cool to a comfortable temperature, then try again. This resolves " +
    "most fit issues.",
  resetQuestion: "Did that fix it?",
  resetYes: "Yes, it fits now",
  resetNo: "No, it still doesn't fit",
  /** "Yes" closes it out: no ticket, nothing shipped. */
  resetResolved:
    "Great, glad that did it. If anything changes, you can come back here any time.",
  /** Non-partials (Essix, Veneers, Nightguard, Retainer, Whitening Tray). */
  describeQuestion: "Which best describes it?",
  describeOptions: [
    "It doesn't go in at all",
    "It goes in, but it's too tight",
  ],
} as const;

/** Does this product get the hot-water reset on the fit issue? */
export function fitHasHotWaterReset(product: AdjustmentProduct): boolean {
  return product.isPartialDenture && product.hotWaterActivated;
}

/** Does the fit issue show the "which best describes it?" question? */
export function fitHasDescribeQuestion(product: AdjustmentProduct): boolean {
  return !product.isPartialDenture;
}

/** Does the sore-spots issue include the hot-water activation step? */
export function soreSpotsHasHotWater(product: AdjustmentProduct): boolean {
  return product.hotWaterActivated;
}

/** Cracked or broken — all products. */
export const CRACKED = {
  upload: "Photo of the damage",
  question: "Do you still have all the pieces?",
  options: ["Yes", "No"],
} as const;

/**
 * Aesthetics — five partials only. No separate question; the final description
 * covers it. Selecting it tells the lab to look at appearance and adds the
 * daylight requirement to the photos (see photoNeedsDaylight()).
 */

/** Tooth shade — five partials, Veneers. Structured, not freeform, on purpose. */
export const TOOTH_SHADE = {
  currentLabel: "Your current shade:", // pulled from their order
  question: "Which shade would you like instead?",
  /** The 4 VITA A-range options, same visual treatment as the order form. */
  options: ["A1", "A2", "A3", "A4"],
} as const;

/** Gum shade — five partials only. Same as tooth shade, three options. */
export const GUM_SHADE = {
  currentLabel: "Your current shade:",
  question: "Which shade would you like instead?",
  /** G1 (dark) | G2 (pink) | G3 (clear) — not a light-to-dark scale. */
  options: ["G1", "G2", "G3"],
} as const;

/* ------------------------------------------------------------------ */
/* Last section — photos and description                               */
/* ------------------------------------------------------------------ */

export interface PhotoRequirement {
  id: "in-mouth" | "on-models" | "bite-strip";
  label: string;
  /** False only for the in-mouth photo when Cracked is selected. */
  required: boolean;
  /** Shown under the label when present. */
  note?: string;
}

export const LAST_SECTION = {
  heading: "Almost done. A few photos and one last question.",
  inMouth: "Your appliance in your mouth",
  onModels: "Your appliance on your models",
  biteStrip: "Your appliance with the bite strip marks",
  /** Appended to the photo instructions for aesthetics / tooth / gum shade. */
  daylightNote:
    "Please take these in natural daylight, with no filters, and with your " +
    "lips pulled back so we can see where the appliance meets your gums.",
  /** Replaces "required" for the in-mouth photo when Cracked is selected. */
  crackedInMouthNote: "If your appliance is too damaged to wear safely, skip this photo.",
  descriptionLabel: "Tell us what's wrong",
  descriptionHelp:
    "The more detail the better. Tell us what's bothering you, when you " +
    "notice it, and what you'd like us to change.",
} as const;

/** The daylight photo instruction applies when any of these are selected. */
export function photoNeedsDaylight(issues: AdjustmentIssueId[]): boolean {
  return issues.some((i) => i === "aesthetics" || i === "tooth-shade" || i === "gum-shade");
}

/**
 * The photos to collect in the last section, given the selected issues.
 * Always the in-mouth and on-models photos; the bite-strip photo only if Bite
 * was picked; the in-mouth photo becomes optional if Cracked was picked.
 */
export function photoRequirements(issues: AdjustmentIssueId[]): PhotoRequirement[] {
  const hasCracked = issues.includes("cracked");
  const reqs: PhotoRequirement[] = [
    {
      id: "in-mouth",
      label: LAST_SECTION.inMouth,
      required: !hasCracked,
      note: hasCracked ? LAST_SECTION.crackedInMouthNote : undefined,
    },
    { id: "on-models", label: LAST_SECTION.onModels, required: true },
  ];
  if (issues.includes("bite")) {
    reqs.push({ id: "bite-strip", label: LAST_SECTION.biteStrip, required: true });
  }
  return reqs;
}

/* ------------------------------------------------------------------ */
/* Screen 6 — submitted, and what happens on approval                  */
/* ------------------------------------------------------------------ */

export const SUBMITTED = {
  heading: "Thanks, we've got it.",
  body:
    "Our team will review your submission. Once it's approved you'll receive " +
    "a prepaid return label and packing instructions by email. You'll also " +
    "see the status here in your portal.",
} as const;

/** The one-page summary sheet the customer prints and puts in the box. */
export const SUMMARY_SHEET_FIELDS = [
  "Customer name",
  "Order number",
  "Adjustment request number",
  "Product",
  "What they reported",
  "Date approved",
] as const;

/** Must be unmissable in both the email and the portal. */
export const PRINT_INSTRUCTION =
  "Please print this sheet and put it in the box with your appliance and " +
  "models. Without it we may not be able to match your appliance to your " +
  "request, which will slow things down.";

/* ------------------------------------------------------------------ */
/* Wizard structure                                                    */
/* ------------------------------------------------------------------ */

/** The six screens, in order. Screen 1 is skipped when there's one order. */
export const WIZARD_SCREENS = [
  "order",     // 1 — pick the order
  "product",   // 2 — pick the product
  "confirm",   // 3 — confirm appliance + models
  "issues",    // 4 — what's wrong
  "steps",     // 5 — complete the required steps
  "submitted", // 6 — submitted
] as const;

export type WizardScreen = (typeof WIZARD_SCREENS)[number];
