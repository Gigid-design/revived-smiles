# Design — Working Session, Aug 25 2026

Session: *Revived Smiles + Unosquare*, 40m. Gigi (design), Nathan (dev), Gitai (client).
Design scope this session was **admin analytics** — Gigi walked the three tabs and Gitai
gave feedback on them live. Everything else on the call was Nathan's; logged at the
bottom so nothing falls off, not picked up here.

Legend: ✅ Built · 🕐 Waiting on someone · ➡️ Not design's

---

## ✅ Analytics — built from this session's feedback

All three land in `src/app/admin/analytics/` plus the contract they read through
(`src/lib/api/contract.ts`, `src/lib/api/types.ts`).

- [x] **Custom date range.** _(≈1:31)_ — `components/RangePicker.tsx`
  **Why:** Gitai, on the preset pills: *"Are we going to be able to choose a custom
  range as well?"* Nathan: *"Yeah, yeah."*
  **Built:** a fourth pill opens a start/end panel; once applied the pill reads the two
  dates and the presets deselect. The contract's `AnalyticsRangeKey` became
  `AnalyticsRange` — a preset, or `{ preset: "custom", start, end }` as plain calendar
  dates, so the caller never drags its own timezone into a boundary the backend owns.
  **Note for Nathan:** the picker enforces four rules (parseable dates, end on or after
  start, end not in the future, ≤ `MAX_CUSTOM_RANGE_DAYS` = 366) and the mock enforces
  them again. The backend must too — none of the browser half survives a crafted
  request. The mock also widens its bucket span for long windows (daily ≤ 45 days,
  weekly ≤ 280, four-weekly beyond) so a year doesn't arrive as 365 columns.

- [x] **Tag search.** _(≈2:45)_ — `page.tsx`, `TagSearch`
  **Why:** Gitai: *"Can we add a search function?"* Gigi: *"Search for a specific tag,
  yep."*
  **Built:** filters as you type in the *All used tags* header — no submit, because the
  whole vocabulary is already in the browser. The subtitle becomes a count
  ("3 of 12 tags match…"), the empty state names the query, and **Download data**
  exports what the search left on screen rather than the full list.
  **Note for Nathan:** deliberately client-side. If the tag vocabulary ever passes a few
  hundred, page `tags().all` and the search moves to you with it — that note is in the
  contract next to the method.

- [x] **Company-wide totals.** _(≈3:24)_ — `components/Primitives.tsx`, `CompanyBand`
  **Why:** Gitai: *"Total like first response time, like the averaging out over a certain
  amount of time, like, for example, for all our agents, so we can see that company-wide
  first response time or company-wide resolution time."* Nathan: *"it's just a
  measurement of all of those put together, so 100%."*
  **Built:** a six-tile band above *Top performers* — closed tickets, first response,
  resolution time, average CSAT, tickets replied, messages sent — each with the change
  against the window immediately before, coloured by whether the move is the good one
  for that metric. Caption reads "6 agents active · vs previous 30 days".
  **The distinction it has to hold:** these are the **team's** figures. The `Average` row
  pinned inside the table is the **per-agent mean** — a different question, and the
  screen must not let them be read as the same number.
  **Note for Nathan:** `previous` is null, never the current value, when there's no
  comparable history. A zero delta and an unknown delta are different claims, and the
  band renders "No comparison" for the second.

- [x] **Download data.** _(≈2:58)_ — already shipped; confirmed on the call.
  Nathan checked Gorgias mid-session — *"it's a CSV file that Gorgeous allows"* — so
  we're at parity. Two changes fell out of the above: the filename now carries the range
  (`agent-performance-2026-08-01_2026-08-27.csv`, so a custom export doesn't overwrite
  the last one), and the agent-performance CSV leads with a **Company-wide** row. The
  totals ask and the download ask are the same ask once the numbers are in a spreadsheet.

---

## 🕐 Analytics — still open

- 🕐 **Role-gating the Analytics view.** _(≈0:13, ≈23:35–26:24)_
  Gigi on the call: *"not everyone can access this view… Nathan will be helping us to
  build a role-based control for who can access this view."* Gitai wants it grouped by
  job role (manager / support / shipping / technician) rather than per-employee
  checkboxes — *"if we're able to create job roles, that would be cool."*
  **Owner: Nathan** — it's a portal-wide provisioning feature, not an analytics one.
  **Design's part when it lands:** the sidebar item hides for roles without access, and
  a direct hit on `/admin/analytics` needs a "not for your role" state rather than an
  empty screen. Nothing to build until the role model exists.

- 🕐 **What CS actually watches daily.** Carried from Aug 18 and still outstanding —
  Gitai owes the list. The six tiles above are our read of it; they're cheap to reorder
  once his team says which two they'd want largest.

---

## ➡️ Rest of the session — logged, not design's

Nathan's items, captured so the design side knows what's coming and what it will touch.

| Item | Where it landed | Touches design later? |
| --- | --- | --- |
| Tooth-selection validation + upsell _(≈5:12–9:36)_ | Gitai sending the quiz logic; disable non-applicable teeth, then upsell to the bigger product | Yes — the upsell moment and the "why can't I select this?" affordance |
| Shipment not received _(≈9:36–13:07)_ | 7-day no-status window (5 is max transit) pings CS **and** asks the patient "has this arrived?" | Yes — the patient-side prompt |
| Shipping-team task tab _(≈13:26–17:06)_ | Confirmed **not** the adjustments view — it's the shipping team's own queue, with label printing and tracking written back to Shopify | Yes — it's the third role's whole screen. Still blocked on Gitai's team |
| One chat per customer, order dropdown _(≈17:09–19:42)_ | Order selector at the top of the chat window; entering chat from an order pre-selects it; CS gets the same switcher on the right | Yes |
| Intake edits + audit log _(≈19:51–21:31)_ | Editing is fine; Gitai wants a small drop-down showing edit history | Yes — small |
| Apple SSO _(≈21:44–22:17)_ | **Dropped for now.** Nathan: *"there's a whole hoops to jump through with Apple."* Gitai fine with it | No |
| UPS/USPS QR return label _(≈22:24–23:35)_ | ShipStation returns it. **QR first, printable PDF as fallback** — Gitai: *"as long as it's clear that they have both options"* | Yes — the return step |
| Suggestion box _(≈26:27–27:34)_ | Staff-facing idea box, list view for management, likely on the dashboard | Yes — small |
| Impression resubmission _(≈31:11–33:49)_ | Per-photo pass/resubmit so patients retake only what failed — and the separate case of retaking a whole **impression** (upper only, lower kept) needs its own wording | Yes |
| AI retry cap _(≈34:06–37:06)_ | 3 attempts, then it pushes through flagged "AI uncertain — needs human review"; the AI picks the best of the three saved attempts | Yes — the third-failure screen |

**Owed after the call:** Gitai → tooth logic from the quiz, more impression + teeth test
images from his CS manager. Nathan → V1 feature summary doc, AI grading report (~90%
pass rate on the good set), ShipStation QR demo. Gigi → this list plus the review URLs
for sign-off, so Nathan's time stays on the build.
