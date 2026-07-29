/**
 * Smoke test for the extended subscriptions API (manage-subscription page).
 * Runs headless against the mock adapter — no browser, no server.
 *   npx jiti scripts/smoke-subs.ts
 */
import { api } from "../src/lib/api";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const [sub] = await api.subscriptions.list();
  check("has a subscription", !!sub, sub?.productName);

  const pm = await api.subscriptions.getPaymentMethod();
  check("seeded card is Visa 4242", pm?.brand === "Visa" && pm?.last4 === "4242", `${pm?.brand} ${pm?.last4}`);

  const pm2 = await api.subscriptions.updatePaymentMethod({ number: "5555 5555 5555 4444", expMonth: 5, expYear: 2029, cvc: "123" });
  check("update card → Mastercard 4444", pm2.brand === "Mastercard" && pm2.last4 === "4444", `${pm2.brand} ${pm2.last4}`);

  let threw = false;
  try { await api.subscriptions.updatePaymentMethod({ number: "12", expMonth: 5, expYear: 2029, cvc: "1" }); }
  catch { threw = true; }
  check("rejects a bad card number", threw);

  const addr = await api.subscriptions.getBillingAddress();
  check("seeded billing address", addr?.city === "Austin", addr?.city);
  const addr2 = await api.subscriptions.updateBillingAddress({ ...addr!, city: "Dallas" });
  check("update address → Dallas", addr2.city === "Dallas");

  const invoices = await api.subscriptions.listInvoices();
  check("billing history present", invoices.length >= 3, `${invoices.length} invoices`);

  const plans = await api.subscriptions.listPlans();
  check("plans available", plans.length >= 2, `${plans.length} plans`);
  const monthly = plans.find((p) => p.intervalWeeks === 4)!;
  const changed = await api.subscriptions.changePlan(sub.id, monthly.id);
  check("change plan → 4-week interval", changed.intervalWeeks === 4 && changed.pricePerDelivery === monthly.pricePerDelivery);

  const paused = await api.subscriptions.setStatus(sub.id, "paused");
  check("pause → paused", paused.status === "paused");
  const resumed = await api.subscriptions.setStatus(sub.id, "active");
  check("resume → active", resumed.status === "active");

  const canceled = await api.subscriptions.cancel(sub.id);
  check("cancel → canceled + canceledAt", canceled.status === "canceled" && !!canceled.canceledAt);

  let blocked = false;
  try { await api.subscriptions.setStatus(sub.id, "active"); } catch { blocked = true; }
  check("cannot resume a canceled sub", blocked);

  console.log(failures ? `\n${failures} FAILED` : "\nAll subscription checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
