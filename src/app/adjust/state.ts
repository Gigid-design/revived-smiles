/**
 * State for the six-screen adjustment flow.
 *
 * The whole flow is one sitting with branches, so it lives in a single route
 * driven by this reducer rather than six cross-linked pages. `screen` is where
 * we are; `terminal` marks the two dead-ends the spec defines (routed to
 * customer service, or closed out because the hot-water reset fixed the fit).
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
  /** The chosen product slug. */
  product: string | null;

  /** Screen 4 selection, kept in the flow's display order. */
  issues: AdjustmentIssueId[];
  answers: AdjustmentAnswers;
  photos: AdjustmentPhotos;
  description: string;

  /** Set after a successful submit, for Screen 6. */
  requestNumber: string | null;
  submitting: boolean;
  error: string | null;
}

export const initialState: WizardState = {
  screen: "order",
  terminal: null,
  orders: null,
  submissionId: null,
  product: null,
  issues: [],
  answers: {},
  photos: {},
  description: "",
  requestNumber: null,
  submitting: false,
  error: null,
};

export type WizardAction =
  | { type: "orders-loaded"; orders: Submission[] }
  | { type: "pick-order"; submissionId: string }
  | { type: "pick-product"; product: string }
  | { type: "route-to-service"; terminal: Terminal }
  | { type: "confirm-has-models" }
  | { type: "set-issues"; issues: AdjustmentIssueId[] }
  | { type: "patch-answers"; answers: Partial<AdjustmentAnswers> }
  | { type: "patch-photos"; photos: Partial<AdjustmentPhotos> }
  | { type: "set-description"; description: string }
  | { type: "close-out" }
  | { type: "go"; screen: WizardScreen }
  | { type: "back"; screen: WizardScreen }
  | { type: "submitting" }
  | { type: "submitted"; requestNumber: string }
  | { type: "error"; error: string | null };

export function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "orders-loaded":
      return { ...state, orders: action.orders };

    case "pick-order":
      return { ...state, submissionId: action.submissionId, screen: "product" };

    case "pick-product":
      return { ...state, product: action.product, screen: "confirm" };

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

    case "go":
    case "back":
      return { ...state, screen: action.screen, terminal: null };

    case "submitting":
      return { ...state, submitting: true, error: null };

    case "submitted":
      return {
        ...state,
        submitting: false,
        requestNumber: action.requestNumber,
        screen: "submitted",
      };

    case "error":
      return { ...state, submitting: false, error: action.error };
  }
}
