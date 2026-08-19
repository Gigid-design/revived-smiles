# Design To-Do — from Working Session Aug 18, 2026 (Meeting 9)

Audited against the current build (commit `9704909`) on 2026-08-18.
Items 1–4 completed (`1086974`–`5d05124`) and live on the demo (`?preview=approved` shows #3, `?preview=lab_retake` shows #4).
Legend: ✅ Done · ⚠️ Partial · ❌ Not started · 🕐 Waiting on someone · ⚠️Nathan = developer flagged scope/complexity concern
Live demo: https://revived-smiles-5ncq.vercel.app

My explicit commitments on the call: the **retake-flow visual for Nathan** (#4) and the
**return-label flow on the dashboard** (#3). Both are wanted for Thursday's session.

---

## Demo links (base: https://revived-smiles-5ncq.vercel.app)

Admin sign-in: `/admin` → the login page prints its own demo credentials (`admin@revivedsmiles.com`, any password).
Data lives per browser tab (`sessionStorage`) — a messy demo resets with a fresh tab. `?preview=` params
show a state without an admin flipping the order.

**Checklist items 1–3 (done this session)**

| Show | URL |
| --- | --- |
| #1 — chat rail, no "Open full record" (open any conversation) | https://revived-smiles-5ncq.vercel.app/admin/chat |
| #2 — My Order, return/cancel gone | https://revived-smiles-5ncq.vercel.app/my-order |
| #3 — approved step + Print return label | https://revived-smiles-5ncq.vercel.app/dashboard?preview=approved |
| #4 — lab retake: customer dashboard (green run → amber stop, kit tracking) | https://revived-smiles-5ncq.vercel.app/dashboard?preview=lab_retake |
| #4 — lab retake: My Order tracker (stop past Review completed) | https://revived-smiles-5ncq.vercel.app/my-order?preview=lab_retake |
| #4 — lab retake: admin macros (open a conversation, type `Lab retake`) | https://revived-smiles-5ncq.vercel.app/admin/chat |

**Branch states (Meeting-8/9 work, for context)**

| Show | URL |
| --- | --- |
| Changes requested — merged orange panel, resubmit leads | https://revived-smiles-5ncq.vercel.app/dashboard?preview=changes_requested |
| Rejected — red panel, retake leads | https://revived-smiles-5ncq.vercel.app/dashboard?preview=rejected |
| Happy path — calm timeline | https://revived-smiles-5ncq.vercel.app/dashboard |
| Delivered — prescriptions + Care Guide buttons | https://revived-smiles-5ncq.vercel.app/my-order?preview=delivered |

**Admin portal walkthrough**

| Show | URL |
| --- | --- |
| Chat + right rail (Gerald = rejection reason; type `Resubmit` in macro bar for arch macros) | https://revived-smiles-5ncq.vercel.app/admin/chat |
| Adjustments — Approve delivers return label + packing slip in chat | https://revived-smiles-5ncq.vercel.app/admin/adjustments |
| AI prompts section | https://revived-smiles-5ncq.vercel.app/admin/prompts |
| Patient chat (customer side of the same thread) | https://revived-smiles-5ncq.vercel.app/messages |
| Documents / prescriptions | https://revived-smiles-5ncq.vercel.app/my-documents |

---

## Do now — nothing blocking these

- [x] **1. Remove "Open full record →" from the chat rail.** _(≈2:03–3:55)_ — `src/app/admin/chat/page.tsx:894`
  **Why:** Gitai: support won't use it — "there's more than enough information on the sidebar to approve or disapprove." Nathan's caveat: keeping it would mean revising the whole submissions detail view, so removal also kills that scope. I agreed on the call: "let's take that out."

- [x] **2. Remove "Return or cancel order" from My Order — entirely.** _(≈19:03–20:07)_ — `src/app/my-order/page.tsx:552`
  **Why:** Gitai: returns/cancels should go through customer service only — "make as much friction as possible in that flow… honestly remove that entirely." He worried people would self-return before impression approval.
  **Note:** this reverses his own Meeting-8 ask (self-serve return labels, commit `1973af3`). Aug 18 decision wins.

- [x] **3. "Impressions approved — print return label" on the customer progress list.** _(≈20:49–22:08)_ — dashboard, `src/app/dashboard/page.tsx`
  **Why:** If the customer ignores the approval email and comes straight to the portal, there is currently nowhere to get the return label. Gitai's wording: "intake complete, impression photos complete, and then right under it, impressions approved, print return label" + a brief pack-everything-back instruction.
  **I committed to this on the call:** "I will work that design into as another flow for Nathan."

- [x] **4. Post-lab retake flow — the visual Nathan asked me for.** _(≈6:03–12:57)_ — my #1 deliverable
  **Why:** Different scenario from the existing review-stage blocker. Here the impressions were already **approved and physically received in the lab**, then found bad. We send THEM a new kit (customer returns nothing first). Flow must show, **past the approval stage**:
  - a stop/blocker in the progress bar ("we're sending you another kit")
  - which arch we need retaken (upper / lower / bite)
  - tracking for the replacement kit
  - retake → resubmit photos → re-approval, without restarting the journey
  **Current build:** DONE (`5d05124`) — `lab_retake` status with structured arch + kit tracking; three admin macros; admin tracker holds at Approved; customer tracker stops past Review completed; no resend button, per Nathan's constraint.
  **⚠️Nathan:** the Shopify **write** (auto-sending the replacement kit from the portal) is added scope + testing risk — "I don't want the system to go nuts and send somebody 20 orders." Agreed short-term: kit dispatch stays **manual** in Shopify. So the design shows messaging + blocker only — **no "resend kit" button**.

- [ ] **5. Shipping address in the admin chat rail (Customer card).** _(≈4:00–5:21)_
  **Why:** Gitai wants the customer's address visible in the portal and synced with Shopify — "all in one place and no confusion," a mismatched address "is going to cost something." Nathan confirmed it comes from the Shopify order sync; design the slot now with mock data.

- [ ] **6. Reviewer attribution on approvals too.** _(≈26:40)_
  **Why:** Gitai: "mark who rejected and who approved specific impressions… so we can keep that traceability."
  **Current build:** rejection card already shows reviewer + date (`rejectReasonMeta`); extend the same treatment to approvals.

---

## Design later — waiting on input

- [ ] 🕐 **7. Analytics dashboard (Gorgias replacement).** _(≈23:30–27:12)_
  Metrics Gitai listed: messages received · first response time · messages-to-ticket-close · resolution time · totals over a time range · trend deltas ("resolution rate much higher than before").
  **Waiting on:** Nathan pulling the Gorgias data points from his test account, then he and I align on designs. Gitai also owes a list of what his CS team actually watches daily.
  **Head start possible:** a v1 draft from the metrics above is enough to design against.

- [ ] 🕐 **8. Shipping-team task list (third role).** _(≈13:01–17:58)_
  Replaces their Google Chat to-do list: order number + what to send (material / trays / kit), check-off, and **who completed it** for auditing. Nathan: build it on role-based access — shipping logs in, sees only their queue; can hook up email notifications.
  **Waiting on:** Gitai talking to his team about how they want it structured. **Do not design before that comes back.**
  **⚠️Nathan:** "it's added scope" — priority items ship first; manual Google-Chat process continues meanwhile.

- [ ] 🕐 **9. Integration health panel.** _(≈27:20)_
  Nathan's own item: a view showing connection status for ShipStation / Gorgias / Shopify ("this third-party system is down — that's a blocker"). He'll spec it; light design support when he does.

---

## ⚠️ Nathan's concerns — summary for the team discussion

| Topic | His concern | Agreed handling |
| --- | --- | --- |
| Shopify write / auto-resend kits | Added scope + testing; risk of runaway sends | Manual in Shopify short-term; portal shows messaging + blocker only |
| Shipping task list | Added scope; needs priority alignment | Backlog / appendix; after priority items |
| Open full record | Keeping it means revising submissions detail | Removed instead (#1) |
| Analytics | Sequence: check Gorgias data points first | He reviews, then we align on design |

## Not mine, but tracked (owner: Gitai / Nathan)

- Gitai → Nathan: Shopify access incl. API/webhooks add-on ("Suvi/CS-Cart Plus" pricing question); Gorgias API test access (promised right after the call).
- Gitai → marketing team: Klaviyo email templates (~1 month, no rush; Nathan uses dummy templates meanwhile).
- Nathan Thursday demo: AI photo grading, Shopify order sync → onboarding journey; teledentistry test cases (Dustin's env).
- Nathan: V1 deliverables doc with the ~11–12-item appendix/backlog. His read of Gitai's priorities: 1) adjustments, 2) protection plan, 3) subscription management; pre-order portal ≈ already handled in his implementation.

## Carry-over gap from Meeting 8 (still open)

- [ ] **Protection-plan demo data can't tell the "missed payments" story** — card renders but every seeded invoice reads *Paid*, so support can't point at a lapse. Two-line seed edit in `src/lib/api/mock/seed.ts:605`.
