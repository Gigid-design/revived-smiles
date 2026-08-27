# Design To-Do — from Working Session Aug 18, 2026 (Meeting 9)

Audited against the current build (commit `9704909`) on 2026-08-18.
All six do-now items completed (`1086974`–`cbbce68`) and live on the demo (`?preview=approved` shows #3, `?preview=lab_retake` shows #4; #5/#6 are on the chat rail — open any conversation).
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
| #5 — shipping address on the Customer card · #6 — "Approved by / Sent back by" under the actions (approve one to see it) | https://revived-smiles-5ncq.vercel.app/admin/chat |

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

## Aug 21 client review — Tier 1 (copy & polish) ✅ all 10 shipped

Source: *Unosquare Internal Team Meeting Notes 8-21-26* · full triage in `Client Change Requests — Aug 21 Review.docx`. Commits `1259ddc`, `773bba2`; live.

| # | Request | Where to see it |
| --- | --- | --- |
| 1 | "Need different sized trays?" | /messages quick actions · admin chat |
| 2 | "Reject" / "Not approved" → **"Can't proceed with order"** (impression rejections only; adjustment declines untouched) | /dashboard?preview=rejected · admin chat + submissions |
| 3 | Tooth-shade disclaimer bold, on a highlighted strip, names the *physical* order form | /step4 |
| 4 | "UPPER/LOWER" tracking fixed (0.14em → 0.04em); completion cards no longer clip on short phones | /step5 · /complete · /intake-complete |
| 5 | Post-submission copy spells out the return-label step | /complete |
| 6 | "In production" gets a timestamp (new `fabricationStartedAt`) + "allow 5–7 business days" | /my-order?preview=in_production |
| 7 | Account support → chat, not email | /profile |
| 8 | Order number platform-wide (My Orders header, Progress card, /complete, admin lists) | /dashboard · /my-order · /admin/chat · /admin/submissions |
| 9 | Photo angles named with per-slot how-to; Good/Bad explained | /impression-photos |
| 10 | Scrolling: document is the scroller again (was an inner `main` scroller — wheel dead in desktop gutters, trapped feel on mobile) | any customer page |

**Still owed by the client for #9:** real lab example photographs for each angle — the strip is ready for them.
## Aug 21 client review — Tier 2 (contained logic) ✅ 10 of 13 shipped

Commits `96e6acc`…`f4a0175`; live. Full status + links in `Client Change Requests — Aug 21 Review.docx`.

| # | Request | Where to see it |
| --- | --- | --- |
| 1 | Tracker reorder — review before "Impressions received" | /my-order?preview=lab_retake |
| 3 | Adjustments on the tracker (Submitted → Received → Delivered) · "Unable to adjust" + reason, both portals | /my-order?preview=adjustment_received · ?preview=adjustment_rejected · /admin/adjustments |
| 4 | >6 teeth on flexible/acrylic → prompt, Continue disabled | /step5 |
| 5 | "Arrived damaged" requires a photo; admin card shows it | /my-order?preview=delivered → Report an issue |
| 6 | Any decline requires a written reason (becomes the reply) | /admin/chat → Dolores Hunt → Decline |
| 7 | "Can't proceed" available at every stage | /admin/chat → any post-review order |
| 8 | Documents per order | /my-documents |
| 9 | Lab retake uploads only the needed impression | /impression-photos?area=upper |
| 11 | Inbox priority by business-hours wait (12h), follow-ups don't reset it | /admin/chat |
| 13 | Return label re-issued after retake — already true | /dashboard?preview=approved |

## Aug 24 — built from Nathan's review answers ✅ 8 shipped

Commits `7f0e1ae`…`653e72e`; live.

| Item | Nathan's answer → what shipped | Where |
| --- | --- | --- |
| Pending vs In review | "Just drop Pending Review" → one In Review stage everywhere | /admin/submissions |
| Retake on AI fail | retake, then "Speak to support" after 2 retakes | /camera?ai=fail (fail twice) |
| Unilateral guard | his "neighbour teeth" approach — blocks other-arch/gap/4th-in-row with an explanation | /step5 on a unilateral order |
| Customers tab | his reframing of customer-360 | /admin/customers |
| Chat order mapping | order-context chips; several orders = one-tap picker | /messages |
| Reason tags | required on unable-to-adjust; feeds his analytics | /admin/adjustments → open one |
| CS edits intake | rail edit + auto-note to the patient | /admin/chat → Patient Intake → Edit |
| UPS QR label | "No printer? QR code" toggle; ShipStation wires the real code | /dashboard?preview=approved → Print return label |

**Still with Gitai:** refund-on-reject confirmation · upsell payment path · multi-order dashboard UX (Nathan defined the questions).
**Engineering integration (Nathan):** kit re-ship v1-as-task · Tasks view build · one-thread chat backend · Apple SSO/IAM · ShipStation QR · role provisioning.

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

- [x] **5. Shipping address in the admin chat rail (Customer card).** _(≈4:00–5:21)_
  **Why:** Gitai wants the customer's address visible in the portal and synced with Shopify — "all in one place and no confusion," a mismatched address "is going to cost something." Nathan confirmed it comes from the Shopify order sync; design the slot now with mock data.

- [x] **6. Reviewer attribution on approvals too.** _(≈26:40)_
  **Why:** Gitai: "mark who rejected and who approved specific impressions… so we can keep that traceability."
  **Current build:** rejection card already shows reviewer + date (`rejectReasonMeta`); extend the same treatment to approvals.

---

## Design later — waiting on input

- [x] **7. Analytics dashboard (Gorgias replacement).** _(≈23:30–27:12)_
  Metrics Gitai listed: messages received · first response time · messages-to-ticket-close · resolution time · totals over a time range · trend deltas ("resolution rate much higher than before").
  **Built** as `/admin/analytics` — Agents, Channels and Tags over one range picker, with CSV export.
  **Reviewed with Gitai on Aug 25**, who asked for a custom date range, a tag search and company-wide totals. All three shipped — see [`DESIGN_TODO_2026-08-25.md`](DESIGN_TODO_2026-08-25.md).
  **Still open there:** role-gating the view (Nathan's), and Gitai's list of what his CS team watches daily.

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
| Analytics | Sequence: check Gorgias data points first | Done — reviewed Aug 25; Gorgias exports CSV, so the download button is at parity |

## Not mine, but tracked (owner: Gitai / Nathan)

- Gitai → Nathan: Shopify access incl. API/webhooks add-on ("Suvi/CS-Cart Plus" pricing question); Gorgias API test access (promised right after the call).
- Gitai → marketing team: Klaviyo email templates (~1 month, no rush; Nathan uses dummy templates meanwhile).
- Nathan Thursday demo: AI photo grading, Shopify order sync → onboarding journey; teledentistry test cases (Dustin's env).
- Nathan: V1 deliverables doc with the ~11–12-item appendix/backlog. His read of Gitai's priorities: 1) adjustments, 2) protection plan, 3) subscription management; pre-order portal ≈ already handled in his implementation.

## Carry-over gap from Meeting 8 (still open)

- [ ] **Protection-plan demo data can't tell the "missed payments" story** — card renders but every seeded invoice reads *Paid*, so support can't point at a lapse. Two-line seed edit in `src/lib/api/mock/seed.ts:605`.
