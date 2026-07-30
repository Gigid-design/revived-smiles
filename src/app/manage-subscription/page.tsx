"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";
import { api, ApiError } from "@/lib/api";
import type {
  BillingAddress,
  Invoice,
  PaymentMethod,
  Subscription,
  SubscriptionPlan,
} from "@/lib/api";

type Sheet = "card" | "history" | "address" | "plan" | "pause" | "cancel" | null;

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

/** "Aug 12" — the pace of a renewal line. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Aug 12, 2026" — for the billing-history rows. */
function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ManageSubscriptionPage() {
  const router = useRouter();

  const [sub, setSub] = useState<Subscription | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [address, setAddress] = useState<BillingAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subs, pm, addr] = await Promise.all([
          api.subscriptions.list(),
          api.subscriptions.getPaymentMethod(),
          api.subscriptions.getBillingAddress(),
        ]);
        if (cancelled) return;
        setSub(subs[0] ?? null);
        setPayment(pm);
        setAddress(addr);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const closeSheet = () => setSheet(null);

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* ── Header ── */}
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          aria-label="Back to my orders"
          onClick={() => router.push("/my-order")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>Manage subscription</h1>
      </header>

      <div className={styles.content} id="main-content">
        {loading && <div className={styles.loading}>Loading…</div>}

        {!loading && loadError && (
          <div className={styles.errorCard}>
            <p>{loadError}</p>
            <button className={styles.primaryBtn} onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        {!loading && !loadError && !sub && (
          <div className={styles.errorCard}>
            <p>You don’t have an active subscription.</p>
            <Link href="/my-order" className={styles.primaryBtn}>Back to my orders</Link>
          </div>
        )}

        {!loading && sub && (
          <>
            {/* ── Current plan ── product photo + gradient badge (Figma 476-65) ── */}
            <section className={styles.planCard} aria-label="Current plan">
              <div className={styles.planImage} role="img" aria-label={sub.productName} />
              <div className={styles.planBody}>
                <span className={styles.planBadge}>Current plan</span>
                <p className={styles.planName}>{sub.productName}</p>
                <p className={styles.planMeta}>
                  every {sub.intervalWeeks} weeks
                  {sub.status === "active" && <> · renews {shortDate(sub.nextDeliveryAt)}</>}
                  {sub.status === "paused" && <> · paused</>}
                  {sub.status === "canceled" && sub.canceledAt && <> · canceled {shortDate(sub.canceledAt)}</>}
                </p>
                <p className={styles.planPrice}>{money(sub.pricePerDelivery, sub.currency)}</p>
              </div>
            </section>

            {/* ── Billing ── */}
            <p className={styles.groupLabel}>Billing</p>
            <section className={styles.group}>
              <div className={styles.row}>
                <span className={styles.rowIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2.5" />
                    <path d="M2 10h20" />
                  </svg>
                </span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>Payment method</span>
                  <span className={styles.rowSub}>
                    {payment ? `${payment.brand} ending ${payment.last4}` : "No card on file"}
                  </span>
                </span>
                <button type="button" className={styles.rowLink} onClick={() => setSheet("card")}>
                  Change
                </button>
              </div>

              <button type="button" className={`${styles.row} ${styles.rowButton}`} onClick={() => setSheet("history")}>
                <span className={styles.rowIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" />
                  </svg>
                </span>
                <span className={styles.rowBody}><span className={styles.rowTitle}>Billing history</span></span>
                <ChevronIcon />
              </button>

              <button type="button" className={`${styles.row} ${styles.rowButton}`} onClick={() => setSheet("address")}>
                <span className={styles.rowIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span className={styles.rowBody}><span className={styles.rowTitle}>Billing address</span></span>
                <ChevronIcon />
              </button>
            </section>

            {/* ── Subscription ── */}
            <p className={styles.groupLabel}>Subscription</p>
            <section className={styles.group}>
              <button
                type="button"
                className={`${styles.row} ${styles.rowButton}`}
                onClick={() => setSheet("plan")}
                disabled={sub.status === "canceled"}
              >
                <span className={styles.rowIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4v13" /><path d="m4 7 3-3 3 3" /><path d="M17 20V7" /><path d="m20 17-3 3-3-3" />
                  </svg>
                </span>
                <span className={styles.rowBody}><span className={styles.rowTitle}>Change plan</span></span>
                <ChevronIcon />
              </button>

              {sub.status !== "canceled" && (
                <button type="button" className={`${styles.row} ${styles.rowButton}`} onClick={() => setSheet("pause")}>
                  <span className={styles.rowIcon} aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {sub.status === "paused"
                        ? <polygon points="6 4 20 12 6 20 6 4" />
                        : <><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></>}
                    </svg>
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{sub.status === "paused" ? "Resume subscription" : "Pause subscription"}</span>
                  </span>
                  <ChevronIcon />
                </button>
              )}

              {sub.status !== "canceled" && (
                <button type="button" className={`${styles.row} ${styles.rowButton} ${styles.rowDanger}`} onClick={() => setSheet("cancel")}>
                  <span className={`${styles.rowIcon} ${styles.rowIconDanger}`} aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                    </svg>
                  </span>
                  <span className={styles.rowBody}><span className={styles.rowTitle}>Cancel subscription</span></span>
                  <ChevronIcon danger />
                </button>
              )}
            </section>

            {/* ── Support ── */}
            <p className={styles.groupLabel}>Support</p>
            <section className={styles.group}>
              <Link href="/messages" className={styles.row}>
                <span className={styles.rowIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13v-1a7 7 0 0 1 14 0v1" /><rect x="3" y="13" width="4" height="6" rx="2" /><rect x="17" y="13" width="4" height="6" rx="2" /><path d="M19 19a3 3 0 0 1-3 3h-2" />
                  </svg>
                </span>
                <span className={styles.rowBody}><span className={styles.rowTitle}>Contact customer service</span></span>
                <ChevronIcon />
              </Link>
            </section>
          </>
        )}
      </div>

      {sub && sheet === "card" && (
        <CardSheet onClose={closeSheet} onSaved={(pm) => { setPayment(pm); closeSheet(); }} />
      )}
      {sheet === "history" && <HistorySheet onClose={closeSheet} />}
      {sheet === "address" && (
        <AddressSheet current={address} onClose={closeSheet} onSaved={(a) => { setAddress(a); closeSheet(); }} />
      )}
      {sub && sheet === "plan" && (
        <PlanSheet sub={sub} onClose={closeSheet} onChanged={(s) => { setSub(s); closeSheet(); }} />
      )}
      {sub && sheet === "pause" && (
        <PauseSheet sub={sub} onClose={closeSheet} onDone={(s) => { setSub(s); closeSheet(); }} />
      )}
      {sub && sheet === "cancel" && (
        <CancelSheet sub={sub} onClose={closeSheet} onDone={(s) => { setSub(s); closeSheet(); }} />
      )}
    </main>
  );
}

function ChevronIcon({ danger = false }: { danger?: boolean }) {
  return (
    <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={danger ? "#c4392f" : "#c0c4ce"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ══════════════════════════════════════ Bottom sheet shell ══ */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHead}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button type="button" className={styles.sheetClose} aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  );
}

/* ── Change payment method ── */
function CardSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (pm: PaymentMethod) => void }) {
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const [mm, yy] = exp.split("/").map((s) => s.trim());
    const expMonth = Number(mm);
    const expYear = yy ? 2000 + Number(yy) : NaN;
    if (!expMonth || !expYear) { setError("Enter the expiry as MM/YY."); return; }
    setBusy(true); setError(null);
    try {
      const pm = await api.subscriptions.updatePaymentMethod({ number, expMonth, expYear, cvc });
      onSaved(pm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Change card" onClose={onClose}>
      <label className={styles.fieldLabel} htmlFor="cc-number">Card number</label>
      <input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456"
        className={styles.input} value={number} onChange={(e) => setNumber(e.target.value)} />
      <div className={styles.fieldRow}>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="cc-exp">Expiry</label>
          <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY"
            className={styles.input} value={exp} onChange={(e) => setExp(e.target.value)} />
        </div>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="cc-cvc">CVC</label>
          <input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123"
            className={styles.input} value={cvc} onChange={(e) => setCvc(e.target.value)} />
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.primaryBtn} disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save card"}
      </button>
      <p className={styles.finePrint}>We never store your full card number.</p>
    </Sheet>
  );
}

/* ── Billing history ── */
function HistorySheet({ onClose }: { onClose: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  useEffect(() => { api.subscriptions.listInvoices().then(setInvoices).catch(() => setInvoices([])); }, []);
  return (
    <Sheet title="Billing history" onClose={onClose}>
      {!invoices && <p className={styles.muted}>Loading…</p>}
      {invoices && invoices.length === 0 && <p className={styles.muted}>No charges yet.</p>}
      {invoices && invoices.map((inv) => (
        <div key={inv.id} className={styles.invoiceRow}>
          <div>
            <p className={styles.invoiceDesc}>{inv.description}</p>
            <p className={styles.invoiceDate}>{fullDate(inv.date)}</p>
          </div>
          <div className={styles.invoiceRight}>
            <span className={styles.invoiceAmount}>{money(inv.amount, inv.currency)}</span>
            <span className={`${styles.invoiceStatus} ${inv.status === "paid" ? styles.invoicePaid : styles.invoiceOther}`}>
              {inv.status}
            </span>
          </div>
        </div>
      ))}
    </Sheet>
  );
}

/* ── Billing address ── */
function AddressSheet({ current, onClose, onSaved }: { current: BillingAddress | null; onClose: () => void; onSaved: (a: BillingAddress) => void }) {
  const [form, setForm] = useState<BillingAddress>(current ?? { line1: "", line2: "", city: "", state: "", postalCode: "", country: "United States" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof BillingAddress) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true); setError(null);
    try {
      onSaved(await api.subscriptions.updateBillingAddress(form));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Billing address" onClose={onClose}>
      <label className={styles.fieldLabel} htmlFor="addr-1">Street address</label>
      <input id="addr-1" className={styles.input} autoComplete="address-line1" value={form.line1} onChange={set("line1")} />
      <label className={styles.fieldLabel} htmlFor="addr-2">Apartment, suite (optional)</label>
      <input id="addr-2" className={styles.input} autoComplete="address-line2" value={form.line2} onChange={set("line2")} />
      <div className={styles.fieldRow}>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="addr-city">City</label>
          <input id="addr-city" className={styles.input} autoComplete="address-level2" value={form.city} onChange={set("city")} />
        </div>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="addr-state">State</label>
          <input id="addr-state" className={styles.input} autoComplete="address-level1" value={form.state} onChange={set("state")} />
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="addr-zip">Postal code</label>
          <input id="addr-zip" className={styles.input} autoComplete="postal-code" value={form.postalCode} onChange={set("postalCode")} />
        </div>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel} htmlFor="addr-country">Country</label>
          <input id="addr-country" className={styles.input} autoComplete="country-name" value={form.country} onChange={set("country")} />
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.primaryBtn} disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save address"}
      </button>
    </Sheet>
  );
}

/* ── Change plan ── */
function PlanSheet({ sub, onClose, onChanged }: { sub: Subscription; onClose: () => void; onChanged: (s: Subscription) => void }) {
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.subscriptions.listPlans().then(setPlans).catch(() => setPlans([])); }, []);
  const isCurrent = (p: SubscriptionPlan) => p.intervalWeeks === sub.intervalWeeks && p.pricePerDelivery === sub.pricePerDelivery;

  async function confirm() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      onChanged(await api.subscriptions.changePlan(sub.id, selected));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Change plan" onClose={onClose}>
      {!plans && <p className={styles.muted}>Loading…</p>}
      {plans && plans.map((p) => {
        const current = isCurrent(p);
        const active = selected ? selected === p.id : current;
        return (
          <button key={p.id} type="button" className={`${styles.planOption} ${active ? styles.planOptionActive : ""}`}
            onClick={() => setSelected(p.id)} aria-pressed={active}>
            <div className={styles.planOptionMain}>
              <span className={styles.planOptionName}>{p.name}{current && <span className={styles.currentTag}>Current</span>}</span>
              <span className={styles.planOptionDesc}>{p.description}</span>
            </div>
            <span className={styles.planOptionPrice}>{money(p.pricePerDelivery, p.currency)}</span>
          </button>
        );
      })}
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.primaryBtn} disabled={busy || !selected} onClick={confirm}>
        {busy ? "Saving…" : "Switch plan"}
      </button>
    </Sheet>
  );
}

/* ── Pause / resume ── */
function PauseSheet({ sub, onClose, onDone }: { sub: Subscription; onClose: () => void; onDone: (s: Subscription) => void }) {
  const pausing = sub.status !== "paused";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true); setError(null);
    try {
      onDone(await api.subscriptions.setStatus(sub.id, pausing ? "paused" : "active"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Sheet title={pausing ? "Pause subscription" : "Resume subscription"} onClose={onClose}>
      <p className={styles.sheetLede}>
        {pausing
          ? "We’ll stop billing and deliveries until you resume. You can pick it back up any time."
          : "Deliveries and billing will start again from the next cycle."}
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.primaryBtn} disabled={busy} onClick={go}>
        {busy ? "Working…" : pausing ? "Pause subscription" : "Resume subscription"}
      </button>
      <button type="button" className={styles.ghostBtn} onClick={onClose}>Keep as is</button>
    </Sheet>
  );
}

/* ── Cancel ── */
function CancelSheet({ sub, onClose, onDone }: { sub: Subscription; onClose: () => void; onDone: (s: Subscription) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true); setError(null);
    try {
      onDone(await api.subscriptions.cancel(sub.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Cancel subscription" onClose={onClose}>
      <p className={styles.sheetLede}>
        This ends your {sub.productName} subscription for good — no more deliveries or charges.
        If you only need a break, pausing keeps your place.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.dangerBtn} disabled={busy} onClick={go}>
        {busy ? "Canceling…" : "Cancel subscription"}
      </button>
      <button type="button" className={styles.ghostBtn} onClick={onClose}>Keep my subscription</button>
    </Sheet>
  );
}
