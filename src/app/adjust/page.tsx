"use client";

/* The adjustment request flow — a single route running the six screens as a
   state machine (see `state.ts`). Branches to customer service or a hot-water
   close-out are dead-ends the shell renders as message screens. */

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { IntakeHeader } from "../components/IntakeHeader";
import {
  CONFIRM_MODELS,
  OUT_OF_SCOPE_MESSAGE,
  getAdjustmentProduct,
} from "../context/adjustmentConfig";
import { ConfirmScreen } from "./screens/ConfirmScreen";
import { IssuesScreen } from "./screens/IssuesScreen";
import { MessageScreen } from "./screens/MessageScreen";
import { OrderScreen } from "./screens/OrderScreen";
import { ProductScreen } from "./screens/ProductScreen";
import { StepsScreen } from "./screens/StepsScreen";
import { SUBMITTED } from "../context/adjustmentConfig";
import { initialState, reducer, type WizardState } from "./state";
import styles from "./adjust.module.css";

/** The screens that count toward the progress bar, given whether Screen 1 shows. */
function flowScreens(singleOrder: boolean): string[] {
  return singleOrder
    ? ["product", "confirm", "issues", "steps"]
    : ["order", "product", "confirm", "issues", "steps"];
}

export default function AdjustFlow() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  /* True when the order was fixed on entry — a single order, or a deep link
     from My Order (`/adjust?order=<id>`) that pre-selects it. Back from the
     product screen then exits rather than showing a one-item order picker. */
  const orderLockedRef = useRef(false);

  /* Load the patient's orders once. A single order — or one named in the URL —
     skips Screen 1 entirely and starts on the product screen. */
  useEffect(() => {
    let alive = true;
    const wanted =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("order")
        : null;

    api.submissions
      .listMine()
      .then((orders) => {
        if (!alive) return;
        dispatch({ type: "orders-loaded", orders });

        const preselect = wanted ? orders.find((o) => o.id === wanted) : undefined;
        if (preselect) {
          orderLockedRef.current = true;
          dispatch({ type: "pick-order", submissionId: preselect.id });
        } else if (orders.length === 1) {
          orderLockedRef.current = true;
          dispatch({ type: "pick-order", submissionId: orders[0].id });
        }
      })
      .catch(() => {
        if (alive) dispatch({ type: "orders-loaded", orders: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  const singleOrder = state.orders?.length === 1;
  const order = state.orders?.find((o) => o.id === state.submissionId) ?? null;
  const product = state.product ? getAdjustmentProduct(state.product) : null;

  async function handleSubmit(payload: {
    product: string;
    issues: WizardState["issues"];
    answers: WizardState["answers"];
    photos: WizardState["photos"];
    description: string;
  }) {
    if (!state.submissionId) return;
    dispatch({ type: "submitting" });
    try {
      const req = await api.adjustments.create({ submissionId: state.submissionId, ...payload });
      dispatch({ type: "submitted", requestNumber: req.requestNumber });
    } catch (err) {
      dispatch({
        type: "error",
        error: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      });
    }
  }

  /* Back moves one screen up the flow, or exits to the dashboard from the top. */
  function goBack() {
    const { screen } = state;
    if (screen === "product") {
      if (singleOrder || orderLockedRef.current) return exit();
      return dispatch({ type: "back", screen: "order" });
    }
    if (screen === "confirm") return dispatch({ type: "back", screen: "product" });
    if (screen === "issues") return dispatch({ type: "back", screen: "confirm" });
    if (screen === "steps") return dispatch({ type: "back", screen: "issues" });
    exit();
  }

  function exit() {
    router.push("/dashboard");
  }

  function toChat() {
    router.push("/messages");
  }

  /* ── Terminal / message states ── */
  if (state.terminal === "service-product" || state.terminal === "service-confirm") {
    const body =
      state.terminal === "service-confirm" ? CONFIRM_MODELS.noMessage : OUT_OF_SCOPE_MESSAGE;
    return (
      <main className={styles.screen}>
        <MessageScreen
          variant="info"
          title="Let's get you to the right place"
          body={body}
          ctaLabel="Open chat"
          onCta={toChat}
          secondaryLabel="Back to dashboard"
          onSecondary={exit}
        />
      </main>
    );
  }

  if (state.terminal === "closed-out") {
    return (
      <main className={styles.screen}>
        <MessageScreen
          variant="success"
          title="Sorted"
          body="Glad the hot-water soak did it. If anything changes, you can come back here any time."
          ctaLabel="Back to dashboard"
          onCta={exit}
        />
      </main>
    );
  }

  if (state.screen === "submitted") {
    return (
      <main className={styles.screen}>
        <MessageScreen
          variant="success"
          title={SUBMITTED.heading}
          body={SUBMITTED.body}
          number={state.requestNumber ?? undefined}
          ctaLabel="Back to dashboard"
          onCta={exit}
          secondaryLabel="View my messages"
          onSecondary={toChat}
        />
      </main>
    );
  }

  /* ── Loading & empty ── */
  if (state.orders === null) {
    return (
      <main className={styles.screen}>
        <div className={styles.loading}>Loading your orders…</div>
      </main>
    );
  }

  if (state.orders.length === 0) {
    return (
      <main className={styles.screen}>
        <MessageScreen
          variant="info"
          title="No orders yet"
          body="We couldn't find an order to adjust. Once you've placed one, you can request an adjustment here."
          ctaLabel="Back to dashboard"
          onCta={exit}
        />
      </main>
    );
  }

  /* ── Progress chrome ── */
  const screens = flowScreens(singleOrder);
  const idx = screens.indexOf(state.screen);
  const total = screens.length;
  const current = idx + 1;
  const pct = Math.round((current / total) * 100);

  return (
    <main className={styles.screen}>
      <a href="#adjust-main" className="sr-only">
        Skip to main content
      </a>
      <IntakeHeader
        pct={pct}
        counter={`Step ${current} of ${total}`}
        onBack={goBack}
        onClose={exit}
      />

      <div id="adjust-main">
        {state.screen === "order" && (
          <OrderScreen
            orders={state.orders}
            initial={state.submissionId}
            onContinue={(submissionId) => dispatch({ type: "pick-order", submissionId })}
          />
        )}

        {state.screen === "product" && order && (
          <ProductScreen
            order={order}
            initial={state.product}
            onContinue={(p) => dispatch({ type: "pick-product", product: p })}
            onOutOfScope={() => dispatch({ type: "route-to-service", terminal: "service-product" })}
          />
        )}

        {state.screen === "confirm" && (
          <ConfirmScreen
            onYes={() => dispatch({ type: "confirm-has-models" })}
            onNo={() => dispatch({ type: "route-to-service", terminal: "service-confirm" })}
          />
        )}

        {state.screen === "issues" && product && (
          <IssuesScreen
            product={product}
            initial={state.issues}
            onContinue={(issues) => dispatch({ type: "set-issues", issues })}
          />
        )}

        {state.screen === "steps" && order && product && (
          <StepsScreen
            order={order}
            product={product}
            issues={state.issues}
            answers={state.answers}
            photos={state.photos}
            description={state.description}
            submitting={state.submitting}
            error={state.error}
            onSubmit={handleSubmit}
            onCloseOut={() => dispatch({ type: "close-out" })}
          />
        )}
      </div>
    </main>
  );
}
