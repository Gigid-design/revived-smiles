# Design Updates Checklist — from Working Sessions (Jul 16 & Jul 21, 2026)

Audited against the current build (commit `d2751de`) on 2026-07-23.
Legend: ✅ Done · ⚠️ Partial / needs polish · ❌ Missing
Source: **M1** = July 16 session, **M2** = July 21 session. Each item has a **Why** = the reason it came up in the meeting.

---

## ✅ Already done (verify these still look right)

- [x] **Product pre-filled & read-only** on intake step 1. _(M1/M2)_ — `src/app/intake/page.tsx`
  **Why:** The product comes from the Shopify order, so there's no reason to let them pick or change it — "it should be from the Shopify order… there shouldn't be any option to switch that here." A wrong pick would mean fabricating something nobody paid for.

- [x] **"Wrong order?" button → contact support** on the product step. _(M2)_ — `src/app/intake/page.tsx:149`
  **Why:** Gitai wanted a safety valve in case Shopify pulled the wrong item — "is this the wrong order button… you can contact support immediately from here if you made a mistake that you didn't realize."

- [x] **Name & State removed from the form.** _(M2)_
  **Why:** Both are already tied to the account, so re-asking is redundant — "we don't need the name or the state… it's still linked to their account, so they should have their name and state already there."

- [x] **Shade options**: tooth A1–A4 + gum Dark / Pink / Clear. _(M2)_ — `src/app/step4/page.tsx`
  **Why:** These are the exact SKUs the lab actually offers — "A1 through A4, and then we have only one dark, one pink, and then one clear gum shade." Showing more would let patients pick something that can't be made.

- [x] **Teeth chart drawn as arches** + **"I'm not sure"** option. _(M2)_ — `src/app/step5/page.tsx`
  **Why (arches):** Gitai explicitly asked "can we have it as arches instead of it looking like this?" — a horseshoe reads more like a real mouth for a non-technical, older audience. **Why ("not sure"):** "Some people aren't sure what teeth they're missing… with a bunch of shifting" — and the technicians can see it from the impression anyway, so the patient shouldn't be blocked.

- [x] **Bite registration = acknowledgment checkbox** (purple putty), not a photo. _(M1)_ — `src/app/impression-photos/page.tsx:301`
  **Why:** They ship purple putty so the patient bites down naturally; the lab needs to know it was done, but a bite photo can't really be graded — "it's hard to actually approve something like that. We just want to acknowledge that they did it."

- [x] **Impression photos: 4 shots (Upper/Lower arch) + shutter/upload.** _(M1/M2)_
  **Why:** These verify the molds are usable before anything is fabricated — the whole review step depends on them.

- [x] **Subscription refill card** ("upcoming refill / manage"). _(M2)_ — `SubscriptionCard.tsx`
  **Why:** Refills are automated, so the card is a heads-up plus a place to manage it — "here's a subscription that's up for refill… it's an automated refill… and then they could manage it."

- [x] **Completed tasks collapse into green "Completed" steps.** _(M2)_ — `src/app/dashboard/page.tsx`
  **Why:** Once a step is done the how-to shouldn't keep reappearing — "make it like a drop down once it's complete so they don't have to see it every time." Green makes it "more exciting" and confirms progress for an audience that needs reassurance.

- [x] **Digital/virtual guide** — "Read steps" modal alongside the video. _(M1)_ — `ImpressionStepsModal.tsx`
  **Why:** Not everyone keeps the printed guide handy — "maybe we have it so they have an option to read it virtually as well… a link under the read the guide."

- [x] **Messages = single consolidated thread.** _(M2)_ — `src/app/messages/page.tsx`
  **Why:** Gitai pushed hard for one thread over separate ones because his demographic gets lost — "they typically talk about one topic at a time… having different message threads is just going to be confusing for our demographic."

- [x] **Quick prompts** — "Where is my order?", "How do I take my impressions?", "What's the latest?". _(M1/M2)_
  **Why:** Pre-filled prompts steer non-technical users instead of facing a blank box — Nathan: "pre-filled action items to say what's the latest, or where's my order."

- [x] **Request supplies** (materials / trays "too big/small" + note) → status card + tracking #. _(M1)_
  **Why:** Running out of putty or getting the wrong tray size is a common, repeat request — "they can go to messages and quickly tell you request trays… a little form… are they too big or too small," and it should then be trackable in orders.

- [x] **My Orders tab** + fulfilment tracker; **bottom nav** = Home / My Orders / Messages. _(M2)_
  **Why:** One place to see where every order/subscription sits — "any orders or subscriptions would live on this orders tab."

- [x] **SSO buttons** — Microsoft, Shopify, Google (Shopify stubbed). _(M2)_
  **Why:** Customers already have these logins (Shopify from the purchase itself), so it removes signup friction — "keep to those three as options for now."

---

## ⚠️ Partial — started but needs work

- [ ] **Contact support on EVERY screen** _(M1)_ — `src/app/components/FloatingChat.tsx` (built, not imported anywhere)
  **Why:** This was one of Gitai's most-repeated asks. The older demographic gets stuck and abandons — "every slide really, we want to give them an option to contact support at the bottom so they're not confused… it assures them that support is always there." A per-screen support button is the anti-abandonment safety net.

- [ ] **Completion screen: confetti + concrete next steps** _(M1)_ — `src/app/complete/page.tsx`
  **Why:** Two purposes. Emotional payoff — "confetti and whatever… make them feel good about finishing it" — and expectation-setting so they're not left wondering: "here are the next steps. Our customer service team is currently reviewing your photos and will let you know whether you're approved… a notification in your email and/or this portal."

- [ ] **Shipping label on the order (ShipStation)** _(M2)_ — `src/app/components/ShippingLabelModal.tsx` (built, not used)
  **Why:** After approval the patient has to mail their impressions back, so the return label must be right there — "when they click accept… automated emails telling them their impressions are approved and providing them with the shipping label from ShipStation within their order."

- [ ] **Chat entry visibility** _(M2)_
  **Why:** Gitai literally couldn't find the chat entry — "is it that three dots? I didn't even see that it was a text." If the account owner missed it, older patients will too. Jade agreed to "beef up the visuals so it looks more like a chat."

- [ ] **Order ETA / "arrive by"** _(M2)_ — `src/app/my-order/page.tsx`
  **Why:** Answers "where's my order" before they even ask — "arrive by, expected to arrive by information… so they can just quickly at a glance see that stuff."

---

## ❌ Missing — focus here next

- [ ] **QR-code deep-link flow** _(M1/M2 — the core entry path)_ — `src/app/page.tsx:96`
  **Why:** The QR code is printed on the physical impression kit. Scanning it means the patient is holding the kit and ready to do impressions *right now*, so they should land straight on the process — not the homepage. "When they scan the QR code on the impression kit, it takes them to the login… then it opens straight to the process page, not the homepage." A normal website login still goes to the homepage — "it depends on how they're getting to our portal." (Nathan confirmed M2 the QR is one general code, not unique per order.)

- [ ] **Welcoming landing page after QR login** _(M1)_
  **Why:** A warm first screen so the process doesn't feel cold or intimidating — "a welcoming landing page saying thank you for ordering, begin your impression process now… make a nice landing page for them to feel involved."

- [ ] **Denial / resubmit states on the dashboard** _(M1)_ — `src/app/dashboard/page.tsx`
  **Why:** If impressions are rejected, the patient must clearly see that *only the photos* need redoing — not their whole intake. "Their impressions will turn red and say resubmit… but the intake form stays green because we don't need that information again — that's a one-time thing." Prevents them from redoing completed work and getting frustrated. Reason lives in Messages.

- [ ] **Auto-push submission summary into Messages** _(M1 — the "hims & hers" pattern)_
  **Why:** Transparency and a single reference point. Gitai modeled it on hims/hers — "once you complete the form it sends it pre-filled to your provider in the messages box… I liked how it showed everything." So the patient sees exactly what they submitted and CS can reply against it, instead of it only living internally.

- [ ] **Passwordless authentication (magic link + OTP)** _(M2)_ — `src/app/page.tsx`
  **Why:** Password management is a headache for an older audience and a support burden — "they enter their email, receive a one-time passcode or magic link, so there's no password management." Fewer "forgot password" tickets. Gitai: "Magic link would probably be easier."

- [ ] **Optional free-text notes field in intake** _(M1)_
  **Why:** Patients routinely scribble clarifications on paper order forms today — Gitai gave real examples: "they're missing 6 teeth but only want to replace 2… people get confused with the numbering," and "please change my address." An optional, character-limited box captures those instead of losing them ("keep it to a comfortable character limit so you don't receive stories").

---

## Notes / open decisions (not build tasks yet)

- **Gorgias vs. portal for CS** _(M1/M2)_ — Keep Gorgias for V1 (macros, Shopify order view, Meta/email integrations are too valuable to drop). The portal owns approve/deny and keeps Gorgias updated. Backend integration, not UI.
  **Why noted:** Gitai prefers the portal long-term but Gorgias does too much to retire quickly — "there was just too much there that can't be brought over quickly or cheaply within scope."

- **Teledental integration** _(M2)_ — "Put a pin in" Healthy; a different teledental partner with a full API is likely by month-end — revisit mapping later.

- **Chat on the homepage too** _(M2 — undecided)_ — Gitai wants to check with his team whether to surface chat directly on the dashboard as well as per-screen. Waiting on his call.
