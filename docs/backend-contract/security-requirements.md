# Security requirements

The prototype was a demo that reached production shape without a security pass.
This document lists the defects it shipped with. Each is stated as a
**requirement the new backend must meet**, with the evidence for what was wrong.

These are not hypotheticals. Every item below is quoted from code that ran.
Where a route has since been deleted or refactored, the git reference is given
so the claim stays checkable.

The application handles patient names, email addresses, US state of residence,
purchase details, and **photographs of patients' mouths**. Treat the last
category as the one that sets the bar.

---

## 1. Patient lookup was unauthenticated and enumerable

**Route:** `GET /api/lookup?email=...` — `src/app/api/lookup/route.ts`

**What was wrong.** The route took an email address from the query string, ran
no authentication and no authorisation, and returned the entire submission row:

```ts
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ found: false });

  let { data: row, error } = await supabase
    .from("submissions")
    .select("*")            // ← the whole record
    .eq("email", email)
    ...
  return NextResponse.json({ found: true, submission: row });
}
```

`select("*")` means the response contained the patient's name, email, state,
purchased products, shade selections, selected teeth, review notes, tracking
number, and the **public URLs of all their teeth and impression photographs**.

Anyone who knew or guessed an email address could retrieve all of it with a
single unauthenticated GET. There was no rate limit, so the endpoint was a
working enumeration oracle: `{"found": true}` versus `{"found": false}` confirms
whether a given person is a customer, before you even look at the payload.

**Requirement.** `SubmissionsApi.findByEmail` must require proof of ownership —
an existing session, or a magic link sent to the address — before returning any
submission data. It must **not** confirm whether an address is on file:
the response for "no such patient" and "patient exists but you have not proved
ownership" must be indistinguishable, and both must be rate-limited. This
mirrors `AuthApi.requestPasswordReset`, which the contract already requires to
resolve identically whether or not the address exists.

The contract states this requirement inline (`src/lib/api/contract.ts`,
`SubmissionsApi.findByEmail`).

---

## 2. Arbitrary column patch with no allowlist and no auth

**Route:** `PATCH /api/patch-submission` — `src/app/api/patch-submission/route.ts`

**What was wrong.** The route is 32 lines long. In its entirety, the write is:

```ts
const { submissionId, fields } = await req.json();

if (!submissionId || !fields || typeof fields !== "object") {
  return NextResponse.json({ error: "Missing submissionId or fields" }, { status: 400 });
}

const { error } = await supabase
  .from("submissions")
  .update(fields)              // ← caller-supplied object, written as-is
  .eq("id", submissionId);
```

`fields` is whatever JSON object the caller sent. There is no allowlist, no
field-level validation, no ownership check, and no authentication. Combined with
the service-role key (§3), any unauthenticated caller could set **any column on
any submission**, given only an id. Ids were also obtainable from §1.

Concretely, a single request could:

- flip `status` to `approved`, moving an order into fabrication without review;
- set `reviewed_by` to a real staff member's name and `reviewed_at` to now,
  fabricating an audit trail (see §9);
- overwrite `review_notes`, `tracking_number`, `photo_analyses`, or the photo
  URL arrays;
- rewrite another patient's `email`, redirecting their notifications.

**Requirement.** No general-purpose patch endpoint. The contract replaces it
with two narrow, typed operations:

- `SubmissionsApi.updateDraft(id, patch: Partial<SubmissionDraft>)` — writable
  keys are exactly `name`, `email`, `state`, `products`, `whiteShade`,
  `gumShade`, `selectedTeeth`, `teethNotSure`. The server must enforce that
  allowlist, must reject unknown keys rather than ignoring them, and must
  confirm the caller owns the draft.
- `SubmissionsApi.updateStatus(id, update: StatusUpdate)` — the only path to a
  status change, admin-only, with the transition rules in §7 below enforced
  server-side.

`SubmissionDraft` is derived from `Submission` in `src/lib/api/types.ts` with
`Pick<>`, so the allowlist cannot drift from the type.

---

## 3. Every API route used the service-role key with no auth check

**Routes:** all of `src/app/api/**` except `shipping-label`.

**What was wrong.** Seven of the eight routes open with the identical five
lines:

```ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

The service-role key bypasses Row Level Security entirely. Not one of those
routes then checked who was calling. There is no session read, no bearer-token
check, no cookie check — in `analyze-photo`, `lookup`, `patch-submission`,
`submit`, `messages`, `prompts` and `agent/prompt-advisor` alike.

The practical effect is that every RLS policy in the schema was decorative for
traffic arriving through the app's own API, and each route was an unauthenticated
proxy holding full read/write access to every table. `GET /api/messages?submissionId=`
returned any patient's chat to any caller. `POST /api/messages` let anyone post
a message as `senderRole: "admin"` into any submission's thread — the only
validation was `["admin","patient"].includes(senderRole)`.

**Requirement.**

1. Privileged credentials never sit behind an unauthenticated handler. Every
   endpoint authenticates the caller first and derives its data access from that
   identity.
2. Authorisation is per-resource, not per-route: a patient session may only read
   and write its own submission, messages and notifications.
3. If RLS (or an equivalent) is used, the request path must actually run under
   the caller's identity so those policies apply. If a service credential is
   genuinely needed for a specific operation, that operation is isolated and the
   ownership check is explicit and adjacent to it.
4. `MessagesApi.send` must derive `senderRole` and `senderName` from the
   authenticated session, never from the request body.

---

## 4. Admin access was gated entirely in the browser

**Files (pre-refactor, git `4867c26`):**
`src/app/admin/login/page.tsx`, `src/app/admin/components/AdminAuthGuard.tsx`

**What was wrong.** Four separate problems compounding.

*The allowlist was hardcoded in the client, and duplicated.* The same array
appears in both files:

```ts
/** Emails allowed to access the admin portal.
 *  Extend this list or replace with a DB lookup as the team grows. */
const ADMIN_EMAILS = [
  "admin@revivedsmiles.com",
  "ivan.lomelin@unosquare.com",
];
```

Two copies means they can diverge — revoking someone in one file leaves them
admin in the other. Both copies shipped to the browser in the JavaScript bundle,
so the list of staff email addresses was public.

*The check ran before authentication, in the browser.* The login page tested
`isAdminEmail(trimmedEmail)` on the typed input and returned early on failure —
a client-side branch an attacker simply does not execute.

*The role was invented client-side.* On success the page wrote:

```ts
const session = {
  name: displayName,
  email: trimmedEmail,
  role: "Admin",              // ← a string the browser made up
  loggedInAt: new Date().toISOString(),
};
sessionStorage.setItem("rs_admin_session", JSON.stringify(session));
```

Nothing in the system ever compared `role` against a database. It came from a
literal in client code and was stored in `sessionStorage`, where the user can
edit it.

*The guard trusted that marker.* `AdminAuthGuard` read the `sessionStorage`
blob, re-checked the email against its own copy of `ADMIN_EMAILS`, and on
success rendered the admin portal. But **the guard only controls rendering.**
The admin portal's data came from the API routes in §3, which had no auth at
all. Editing `sessionStorage` was never necessary — every admin capability was
reachable by calling the endpoints directly.

**Requirement.**

1. Staff membership is a fact in the database, resolved server-side. No email
   list in client code.
2. The role on `AdminUser` (`src/lib/api/types.ts`) is issued by the server
   from that record. A client-supplied role is ignored.
3. `AuthApi.signInAdmin` throws `not_authorized` for a non-staff account, and
   `AuthApi.getAdminUser` re-verifies on every guarded page load — both are
   already specified in `src/lib/api/contract.ts`.
4. **Every admin-only operation is enforced on the server**, independently of
   any client guard: `SubmissionsApi.list`, `stats`, `updateStatus`;
   `PromptsApi.create`, `activate`, `advise`; `ThreadsApi.setRequestStatus`.
   A client-side guard is a UX affordance, never a security boundary.

---

## 5. The prompt advisor could rewrite live config, unauthenticated

**Route:** `POST /api/agent/prompt-advisor` —
`src/app/api/agent/prompt-advisor/route.ts`

**What was wrong.** The route ran an agentic loop (up to five model turns) with
four tools, one of which — `apply_prompt_change` — writes to `prompt_configs`
and marks the new row active. That table decides how every subsequent patient
photo is graded.

The route had no authentication. The confirmation step existed only as
instructions in the system prompt ("NEVER apply changes without showing a clear
preview and getting explicit confirmation") and as a button in the admin UI that
sends the text `Yes, apply this change:` back into the conversation. An attacker
posting directly to the endpoint supplies the conversation array themselves, so
they supply the "confirmation" too. Model instructions are not an access control
mechanism.

The write also attributed itself to `created_by: "AI Advisor"`, so the audit
trail could not name a human.

**Requirement.** Stated in full in `prompt-advisor.md` §5. In short:
authenticate the caller; authorise them as staff against the database; require a
**server-issued** confirmation token that names the specific change being
applied, so that a transcript containing the words "yes, apply" is not
sufficient; record the approving admin's id; write atomically (§8); and
rate-limit, since each call can issue five model requests.

---

## 6. Raw user input interpolated into a PostgREST filter

**File (pre-refactor, git `4867c26`):** `src/app/admin/submissions/page.tsx:73`

**What was wrong.** The admin submissions search built its filter by string
concatenation:

```ts
query = query.or(`name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`);
```

`searchQuery` is whatever an admin types. PostgREST's `or=` parameter has its
own grammar — commas separate conditions, dots separate column/operator/value,
parentheses group. None of those characters were escaped. A search term
containing them changes the structure of the filter rather than being matched
literally.

The immediate consequences are a malformed-filter error or a silently wrong
result set. The more serious concern is that the caller controls the shape of a
server-side filter expression at all; combined with §3 and §4, the input was not
reliably coming from a trusted admin either. Note also that `%` and `_` are
`ILIKE` wildcards and were likewise unescaped, so a term containing them
searched differently than the admin intended.

**Requirement.** `SubmissionQuery.search` (`src/lib/api/types.ts`) is a plain
string that "matches name or email, case-insensitive". The backend must bind it
as a **parameter**, never interpolate it into a query or filter expression, and
must escape `ILIKE` metacharacters so the term is treated literally. The same
rule applies to `status` and to the paging parameters.

---

## 7. Photo write-back was a browser-side read-modify-write race

**Files (pre-refactor, git `4867c26`):** `src/app/camera/page.tsx`,
`camera-1/page.tsx`, `open-bite/page.tsx`, `open-bite-2/page.tsx` — the same
block, copied four times.

**What was wrong.** After uploading a photo, each capture screen read the
submission row into the browser, mutated an array element, and wrote the whole
array back:

```ts
const { data: row } = await supabase
  .from("submissions")
  .select("close_bite_photos,photo_analyses")
  .eq("id", id)
  .single();

const photos = row?.close_bite_photos || [];
photos[0] = urlData.publicUrl;                    // mutate in the browser

const analyses = row?.photo_analyses || {};
analyses["close-bite-front"] = { checks, summary: aiSummary, teethCenter, pass: checks.every(c => c.pass) };

await supabase
  .from("submissions")
  .update({ close_bite_photos: photos, photo_analyses: analyses })
  .eq("id", id);
```

There is no optimistic-concurrency check — no version column, no `updated_at`
predicate, no conditional update. Two clients that read before either writes
will each write back an array reflecting only their own change, and the second
write wins. A patient who has the flow open in two tabs, or who resumes on
a phone while a laptop session is still open, can silently lose a photo they
were told was saved. The same applies to the `photo_analyses` map.

This is also a lost-update pattern on a column an admin later reviews, so the
failure mode is an order that looks complete but is missing an image.

**Requirement.** `PhotosApi.attachToSubmission(submissionId, photoType, url,
analysis)` must be **atomic on the server**. The client sends only the pose
slug, the URL and the verdict; the server resolves the slot (via
`PHOTO_TYPE_SLOTS` semantics — see `data-model.md` §1) and updates the single
element within one transaction, or with a conditional/compare-and-set update
that fails rather than clobbering. Do not read the row into any client and write
it back. The contract states this requirement inline.

---

## 8. Prompt version activation was two non-transactional writes

**Files:** `src/app/api/prompts/route.ts` (POST and PATCH), and
`apply_prompt_change` in `src/app/api/agent/prompt-advisor/route.ts`.

**What was wrong.** All three write paths perform a deactivate followed by a
separate activate, with no transaction:

```ts
// PATCH /api/prompts — activate a specific version
await supabase
  .from("prompt_configs")
  .update({ is_active: false })
  .eq("photo_type", photoType);        // ← write 1: nothing is active now

const { error } = await supabase
  .from("prompt_configs")
  .update({ is_active: true })
  .eq("id", id);                       // ← write 2: may fail
```

Between those statements the photo type has **no active prompt**. If write 2
fails — network error, process restart, function timeout — it stays that way,
and the error path returns HTTP 500 without attempting to restore the previous
version. The schema does not enforce the invariant either: there is no partial
unique index on `(photo_type) WHERE is_active`, so the "exactly one active
version" rule existed only as a convention in application code
(`data-model.md` §4).

The consequence is not just an inconsistent row. `loadSpec` in the analysis
route falls back to the hardcoded `PHOTO_TYPES` catalogue when no active row is
found, so a half-completed activation silently reverts every subsequent photo
analysis to the original built-in prompt — discarding all admin tuning, with no
error surfaced to anyone.

The POST path has a further ordering bug: it reads the max version, then
deactivates, then inserts. Two concurrent creates can read the same max and
attempt the same `version`, which the `UNIQUE(photo_type, version)` constraint
will reject — after the deactivate has already run, again leaving nothing
active.

**Requirement.** `PromptsApi.create` and `PromptsApi.activate` must each be a
single transaction: deactivate the current version, activate/insert the new one,
commit or roll back together. Version-number allocation must be safe under
concurrency (allocate inside the transaction, or use a sequence, and retry on
conflict). Add the partial unique index so the database enforces "at most one
active version per photo type" rather than trusting the caller. The contract
states the atomicity requirement inline for both methods.

---

## 9. `reviewed_by` stored a display name, not a user id

**Column:** `submissions.reviewed_by text` (`supabase-schema-admin.sql`)

**What was wrong.** The review audit trail recorded a free-text display name.
That name came from `AdminUser.name`, which the login page derived in the
browser from Supabase user metadata, falling back to the local part of the email
address:

```ts
const displayName = user?.user_metadata?.full_name
  || user?.user_metadata?.name
  || trimmedEmail.split("@")[0];
```

Three consequences:

- **Not resolvable.** A stored string like `"admin"` or `"Ivan"` does not
  identify an account. If two staff share a first name, or someone changes their
  display name, the historical record becomes ambiguous or wrong.
- **Not stable.** `user_metadata` is user-editable in Supabase. A staff member
  could change what future review records say about them.
- **Not trustworthy.** Because it travelled in the request body to an
  unauthenticated endpoint (§2, §3), any caller could write any name into it —
  including a real colleague's — and stamp `reviewed_at`. The audit trail could
  be forged by someone who was never authenticated at all.

The prototype's `StatusUpdate` shape carries this forward: `reviewedBy: string`
in `src/lib/api/types.ts` is still the reviewer's name, because that is what the
admin UI displays.

**Requirement.**

1. Store a **stable user id** with a foreign key to the staff user record. The
   display name is resolved by join at read time, never stored as the identity.
2. The server takes the reviewer's identity from the **authenticated session**
   and ignores any `reviewedBy` in the request body. `StatusUpdate.reviewedBy`
   should be treated as advisory display data at most; the contract's
   `updateStatus` says it "records an admin decision, stamping reviewer and
   timestamps" — the stamping is the server's job.
3. Review records should be append-only or otherwise tamper-evident. A status
   history table, rather than three mutable columns on `submissions`, would also
   fix the fact that the current design keeps only the most recent decision.

---

## Cross-cutting items

These did not fit a single route but must not be lost.

**Status-transition rules were enforced only in the browser.** The contract
(`SubmissionsApi.updateStatus`) requires the server to enforce: `rejected` and
`changes_requested` require non-empty notes; `shipped` sets `shippedAt`;
`completed` sets `completedAt`. `requiresReviewNotes()` in
`src/lib/api/types.ts` expresses the first rule; the server must apply it
independently. There is also no CHECK constraint on `submissions.status`
(`data-model.md` §1), so the column accepted any string.

**Patient photographs sat in a public storage bucket.** The
`impression-photos` bucket was created with `Public: true`, and object keys were
`close-bite/{millisecond timestamp}-front.jpg` — guessable, low-entropy, and
requiring no credential to fetch. The photo URLs were also returned in bulk by
the unauthenticated lookup in §1. See `data-model.md` §5 for the requirement.

**Notification access was keyed on email with `USING (true)` policies.** All
three RLS policies on `notifications` were unconditional, and the client
addressed rows by `.eq("email", ...)`. Anyone with the anon key could read or
mark-read any patient's notifications. `NotificationsApi` in the contract
exposes no email or user-id parameter precisely so that ownership becomes a
server-side concern.

**Threads and their request decisions were browser-simulated.** The supplies
request feature had no backend at all (`data-model.md` §6), and the patient's
own client decided whether a request was accepted — inventing the tracking
number locally. `ThreadsApi.setRequestStatus` must reject a patient session.

**Shipping labels carried a fabricated tracking reference.** The label PDF drew
a decorative barcode from a fixed array of bar widths and printed
`RS-{first 8 chars of the submission id}` under the heading "TRACKING
REFERENCE" (`src/app/api/shipping-label/route.ts`). Nothing was registered with
a carrier. This is a correctness and arguably a consumer-protection problem, not
only a security one: the patient was handed a label implying trackable carrier
pickup. `ShippingApi.label` must obtain a genuine tracking number from a carrier
and write it back to `submission.trackingNumber`. Note also that the route did
not verify the caller owned the submission, and it accepted `patientName` from
the request body, printing it onto the PDF unvalidated.
