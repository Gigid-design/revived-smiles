/**
 * State for the adjustment flow.
 *
 * The whole flow is one sitting with branches, so it lives in a single route
 * driven by this reducer rather than cross-linked pages. `screen` is where we
 * are; `terminal` marks the dead-ends the spec defines (routed to customer
 * service, or closed out because the hot-water reset fixed the fit).
 *
 * Multiple products can be adjusted in one sitting (Gitai, Aug 4: "in case both
 * of them have an issue"). Each product keeps its own steps and photos, so they
 * are detailed one at a time — `products` is the selection, `productIndex` is
 * the one on screen — and each finished product is submitted as its own request
 * (the lab still needs to know which appliance has which problem).
 */

import type {
  AdjustmentAnswers,
  AdjustmentIssueId,
  AdjustmentPhotos,
  Submission,
} from "@/lib/api";
import type { WizardScreen } from "../context/adjustmentConfig";

/** The two ways the flow ends without a submission. */
export type Terminal =
  /** Screen 2: an out-of-scope item. */
  | "service-product"
  /** Screen 3: they don't have both appliance and models. */
  | "service-confirm"
  /** Screen 5 (fit): the hot-water reset fixed it — nothing ships. */
  | "closed-out";

export interface WizardState {
  screen: WizardScreen;
  /** Set when the flow reaches a dead-end; the shell renders a message screen. */
  terminal: Terminal | null;

  /** The patient's orders, loaded once for Screen 1. Null until loaded. */
  orders: Submission[] | null;
  /** The chosen order. */
  submissionId: string | null;

  /** The chosen product slugs, addressed one at a time (Screens 4–5). */
  products: string[];
  /** Which of `products` is currently being detailed. */
  productIndex: number;

  /** Working answers for the CURRENT product; reset between products. */
  issues: AdjustmentIssueId[];
  answers: AdjustmentAnswers;
  photos: AdjustmentPhotos;
  description: string;

  /** One request number per product submitted so far, for Screen 6. */
  requestNumbers: string[];
  submitting: boolean;
  error: string | null;
}

export const initialState: WizardState = {
  screen: "order",
  terminal: null,
  orders: null,
  submissionId: null,
  products: [],
  productIndex: 0,
  issues: [],
  answers: {},
  photos: {},
  description: "",
  requestNumbers: [],
  submitting: false,
  error: null,
};

/** Blank working state, applied when moving on to the next product. */
const CLEARED = {
  issues: [] as AdjustmentIssueId[],
  answers: {} as AdjustmentAnswers,
  photos: {} as AdjustmentPhotos,
  description: "",
};

export type WizardAction =
  | { type: "orders-loaded"; orders: Submission[] }
  | { type: "pick-order"; submissionId: string }
  | { type: "pick-products"; products: string[] }
  | { type: "route-to-service"; terminal: Terminal }
  | { type: "confirm-has-models" }
  | { type: "set-issues"; issues: AdjustmentIssueId[] }
  | { type: "patch-answers"; answers: Partial<AdjustmentAnswers> }
  | { type: "patch-photos"; photos: Partial<AdjustmentPhotos> }
  | { type: "set-description"; description: string }
  | { type: "close-out" }
  /** This product is done and submitted; move on to the next one's issues. */
  | { type: "advance-product"; requestNumber: string }
  /** This product needs no request (fit fixed); move on without submitting. */
  | { type: "skip-product" }
  | { type: "go"; screen: WizardScreen }
  | { type: "back"; screen: WizardScreen }
  | { type: "submitting" }
  /** Last product done — finish, recording its request number. */
  | { type: "submitted"; requestNumber: string }
  /** Last product needed no request — finish on what's already submitted. */
  | { type: "finish" }
  | { type: "error"; error: string | null };

export function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "orders-loaded":
      return { ...state, orders: action.orders };

    case "pick-order":
      return { ...state, submissionId: action.submissionId, screen: "product" };

    case "pick-products":
      return {
        ...state,
        products: action.products,
        productIndex: 0,
        ...CLEARED,
        screen: "confirm",
      };

    case "route-to-service":
      return { ...state, terminal: action.terminal };

    case "confirm-has-models":
      return { ...state, screen: "issues" };

    case "set-issues":
      return { ...state, issues: action.issues, screen: "steps" };

    case "patch-answers":
      return { ...state, answers: { ...state.answers, ...action.answers } };

    case "patch-photos":
      return { ...state, photos: { ...state.photos, ...action.photos } };

    case "set-description":
      return { ...state, description: action.description };

    case "close-out":
      return { ...state, terminal: "closed-out" };

    case "advance-product":
      return {
        ...state,
        requestNumbers: [...state.requestNumbers, action.requestNumber],
        productIndex: state.productIndex + 1,
        ...CLEARED,
        submitting: false,
        error: null,
        screen: "issues",
      };

    case "skip-product":
      return {
        ...state,
        productIndex: state.productIndex + 1,
        ...CLEARED,
        screen: "issues",
      };

    case "go":
    case "back":
      return { ...state, screen: action.screen, terminal: null };

    case "submitting":
      return { ...state, submitting: true, error: null };

    case "submitted":
      return {
        ...state,
        submitting: false,
        requestNumbers: [...state.requestNumbers, action.requestNumber],
        screen: "submitted",
      };

    case "finish":
      return { ...state, submitting: false, screen: "submitted" };

    case "error":
      return { ...state, submitting: false, error: action.error };
  }
}
