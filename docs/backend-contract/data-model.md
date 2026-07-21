# Data model

**This is what the prototype's schema was — a starting point, not a mandate.**

The prototype ran on Supabase (PostgreSQL). Nothing in the contract requires
PostgreSQL, Supabase, or these table names. The value of this document is that
it records what data actually existed, how it was shaped, and — in the final
section — how each column maps onto the camelCase field names the front end now
speaks.

The schema was applied as eight incremental migration files at the repository
root, run in this order:

| File | Adds |
| --- | --- |
| `supabase-schema.sql` | `submissions` base table, storage bucket note |
| `supabase-schema-draft.sql` | `submissions.user_id`, draft status |
| `supabase-schema-admin.sql` | review columns, teeth-photo arrays |
| `supabase-schema-photo-analysis.sql` | `submissions.photo_analyses` |
| `supabase-schema-workflow.sql` | tracking/shipping/completion columns |
| `supabase-schema-messages.sql` | `messages` table |
| `supabase-schema-notifications.sql` | `notifications` table + status trigger |
| `supabase-schema-prompt-configs.sql` | `prompt_configs` table + seed rows |

The tables below are the consolidated result.

---

## 1. `submissions`

One row per patient order, from first draft through delivery.

| Column | SQL type | Null | Default | Added by |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | base |
| `email` | `text` | **no** | — | base |
| `name` | `text` | yes | — | base |
| `state` | `text` | yes | — | base |
| `products` | `text[]` | yes | — | base |
| `white_shade` | `text` | yes | — | base |
| `gum_shade` | `text` | yes | — | base |
| `selected_teeth` | `integer[]` | yes | — | base |
| `teeth_not_sure` | `boolean` | yes | `false` | base |
| `impression_photos` | `text[]` | yes | — | base |
| `status` | `text` | yes | `'pending'` | base |
| `created_at` | `timestamp with time zone` | yes | `now()` | base |
| `user_id` | `uuid` | yes | — | draft |
| `reviewed_by` | `text` | yes | — | admin |
| `reviewed_at` | `timestamp with time zone` | yes | — | admin |
| `review_notes` | `text` | yes | — | admin |
| `close_bite_photos` | `text[]` | yes | — | admin / photo-analysis |
| `open_bite_photos` | `text[]` | yes | — | admin / photo-analysis |
| `photo_analyses` | `jsonb` | yes | `'{}'` | photo-analysis |
| `tracking_number` | `text` | yes | — | workflow |
| `shipped_at` | `timestamptz` | yes | — | workflow |
| `completed_at` | `timestamptz` | yes | — | workflow |

**Constraints:** primary key on `id`. **That is all.** In particular:

- `status` has **no CHECK constraint and no enum type.** The valid values were
  recorded only in a `COMMENT ON COLUMN`, rewritten by three separate
  migrations. The final comment (`supabase-schema-workflow.sql`) reads:
  `draft | pending | in_review | approved | changes_requested | rejected | in_fabrication | shipped | completed`.
  These nine values are the `SubmissionStatus` union in `src/lib/api/types.ts`.
  A real backend should constrain this properly — the prototype could store any
  string.
- `user_id` is a bare `uuid` with **no foreign key** to `auth.users`.
- There are **no indexes** on `submissions` other than the primary key — no
  index on `email`, `status`, `user_id`, or `created_at`, all of which were
  queried and sorted on.

**Array-slot conventions** (these are semantic, not enforced):

- `close_bite_photos[0]` = front, `[1]` = side.
- `open_bite_photos[0]` = front, `[1]` = side.
- `impression_photos` holds up to four tray photos.

`src/lib/api/types.ts` encodes the first two as `PHOTO_TYPE_SLOTS`:

```ts
export const PHOTO_TYPE_SLOTS: Record<PhotoType, { field: "closeBitePhotos" | "openBitePhotos"; index: 0 | 1 }> = {
  "close-bite-front": { field: "closeBitePhotos", index: 0 },
  "close-bite-side":  { field: "closeBitePhotos", index: 1 },
  "open-bite-front":  { field: "openBitePhotos",  index: 0 },
  "open-bite-side":   { field: "openBitePhotos",  index: 1 },
};
```

**`photo_analyses` shape.** A JSONB object keyed by photo type, documented in
`supabase-schema-photo-analysis.sql` as:

```
{ "close-bite-front": { checks, summary, teethCenter, pass }, ... }
```

The keys inside are already camelCase, because the browser wrote this object
directly. A fifth key, `promptConfigId`, is added by the analysis route when the
spec came from the database. Any pose may be absent — hence
`PhotoAnalyses = Partial<Record<PhotoType, PhotoAnalysis>>`. **Note the units
change on `teethCenter` documented in `photo-analysis.md` §6: values stored by
the prototype are 0–100, the contract now expects 0–1.**

**RLS policies** (six, across three migration files):

```sql
CREATE POLICY "Allow public inserts"        ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated reads"   ON submissions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated updates" ON submissions FOR UPDATE USING (true);
CREATE POLICY "Allow public photo updates"  ON submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can update own drafts" ON submissions FOR UPDATE
  USING (user_id = auth.uid() AND status = 'draft');
CREATE POLICY "Users can read own submissions" ON submissions FOR SELECT
  USING (user_id = auth.uid());
```

The two scoped policies at the bottom are **dead**. PostgreSQL combines
permissive policies with OR, so `USING (true)` on the same command makes the
ownership check irrelevant. The `supabase-schema-admin.sql` migration is honest
about it: `-- TODO: Replace USING (true) with real auth checks once Supabase
Auth is wired up`. Separately, every API route bypassed RLS entirely by using
the service-role key — see `security-requirements.md` §3.

---

## 2. `messages`

Per-submission chat between the patient and an admin. Full DDL, verbatim from
`supabase-schema-messages.sql`:

```sql
CREATE TABLE messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'patient')),
  sender_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_messages_submission ON messages(submission_id, created_at);
```

| Column | SQL type | Null | Default | Constraint |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `submission_id` | `uuid` | **no** | — | FK → `submissions(id)` ON DELETE CASCADE |
| `sender_role` | `text` | **no** | — | `CHECK (sender_role IN ('admin','patient'))` |
| `sender_name` | `text` | **no** | — | — |
| `body` | `text` | **no** | — | — |
| `created_at` | `timestamptz` | yes | `now()` | — |
| `read_at` | `timestamptz` | yes | — | null = unread |

This is the best-specified table in the schema: a real foreign key, a real CHECK
constraint, and a composite index matching the actual query
(`WHERE submission_id = ? ORDER BY created_at`).

**Realtime:** `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` — the
live-chat feature depended on the change feed. `MessagesApi.subscribe` in the
contract replaces this; any transport is acceptable.

**RLS:** three patient-scoped policies (`Patients can read own messages`,
`Patients can send messages`, `Patients can mark messages read`), all keyed on
`submission_id IN (SELECT id FROM submissions WHERE user_id = auth.uid())`.
The insert policy additionally requires `sender_role = 'patient'`. There is **no
admin policy** — admin access came from the service-role key. Note the update
policy has no `WITH CHECK`, so a patient with direct database access could
rewrite any column of a message on their own submission, not just `read_at`.

**Unread counting.** The old `GET /api/messages?unreadCounts=id1,id2,...`
fetched every matching row and counted them in JavaScript. The contract requires
this to be a single aggregate query (`MessagesApi.unreadCounts`).

---

## 3. `notifications`

Patient-facing notifications, written by a database trigger.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'status_update',
  -- types: 'status_update', 'action_required', 'info'
  read boolean DEFAULT false,
  submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_email_read
  ON notifications (email, read);
```

| Column | SQL type | Null | Default | Constraint |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | yes | — | no FK |
| `email` | `text` | **no** | — | — |
| `title` | `text` | **no** | — | — |
| `body` | `text` | **no** | — | — |
| `type` | `text` | **no** | `'status_update'` | valid values in a comment only |
| `read` | `boolean` | yes | `false` | — |
| `submission_id` | `uuid` | yes | — | FK → `submissions(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` | yes | `now()` | — |

`type` values are `status_update`, `action_required`, `info` — the
`NotificationType` union in `src/lib/api/types.ts`. Enforced nowhere.

**Rows were addressed by email, not by user id.** The notifications screen
queried `.eq("email", user.email)`, and "mark all read" did
`.update({read:true}).eq("email", userEmail).eq("read", false)`. `user_id` was
populated by the trigger but never used for lookup, which is why the index is on
`(email, read)`. The comment in the migration explains the reasoning:
`-- RLS: users can read their own notifications (by email, since no auth.uid() in anon context)`.

**RLS:** all three policies are `USING (true)` / `WITH CHECK (true)`. Any caller
with the anon key could read, mark-read, and insert **any** notification. A real
backend must scope these to the authenticated user.

### The status-change trigger

Verbatim from `supabase-schema-notifications.sql`:

```sql
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'draft' THEN
    INSERT INTO notifications (user_id, email, title, body, type, submission_id)
    VALUES (
      NEW.user_id,
      NEW.email,
      CASE NEW.status
        WHEN 'in_review' THEN 'Submission under review'
        WHEN 'approved' THEN 'Great news! Submission approved'
        WHEN 'changes_requested' THEN 'Action required: Updates needed'
        WHEN 'rejected' THEN 'Submission update'
        ELSE 'Status update'
      END,
      CASE NEW.status
        WHEN 'in_review' THEN 'Our team is reviewing your submission. We''ll be in touch soon.'
        WHEN 'approved' THEN 'Your submission has been approved! We''re preparing your order.'
        WHEN 'changes_requested' THEN 'Our team needs some updates to your submission. Please review.'
        WHEN 'rejected' THEN 'Unfortunately we can''t process this submission. Please see details.'
        ELSE 'Your submission status has been updated.'
      END,
      CASE WHEN NEW.status = 'changes_requested' THEN 'action_required' ELSE 'status_update' END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_status_change ON submissions;

CREATE TRIGGER on_status_change
  AFTER UPDATE OF status ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_status_change();
```

Behaviour, precisely:

- Fires **`AFTER UPDATE OF status` only** — not on INSERT. A submission created
  directly at `pending` (which is what `POST /api/submit` did) produced no
  notification.
- Guards on `OLD.status IS DISTINCT FROM NEW.status`, so an update that rewrites
  the same status is a no-op. `IS DISTINCT FROM` also handles nulls correctly.
- Suppresses notifications for transitions **to** `draft`. Transitions *from*
  `draft` (e.g. `draft → pending`) do notify.
- Copies `user_id`, `email` and `id` off the submission row.
- Four statuses get bespoke copy. `pending`, `in_fabrication`, `shipped` and
  `completed` all fall through to the generic
  `'Status update'` / `'Your submission status has been updated.'` — so the
  three statuses the workflow migration added never got their own copy. This is
  a content gap worth closing in the real backend, not a bug to reproduce.
- `type` is `action_required` only for `changes_requested`; everything else is
  `status_update`. Nothing ever wrote `info`.

Whether the real backend keeps this as a database trigger or moves it into the
service layer is an implementation choice. The observable behaviour — a status
change produces exactly one patient-visible notification, with copy that varies
by status — is what the UI depends on.

---

## 4. `prompt_configs`

Versioned AI prompt configuration for photo analysis. Full DDL, verbatim from
`supabase-schema-prompt-configs.sql`:

```sql
CREATE TABLE IF NOT EXISTS prompt_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  label text NOT NULL,
  pose_description text NOT NULL,
  content_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_checks jsonb NOT NULL DEFAULT '[
    {"id":"blur","label":"Blur & focus","requirement":"The image must be in focus and not blurry. Motion blur or out-of-focus teeth should fail."},
    {"id":"lighting","label":"Lighting","requirement":"The teeth area must be well-lit. Too dark or extreme shadows should fail."},
    {"id":"framing","label":"Framing & distance","requirement":"Teeth should fill a reasonable portion of the frame. Too far away or cropped badly should fail."},
    {"id":"glare","label":"Glare & reflections","requirement":"No major glare or reflections on the teeth that obscure detail."}
  ]'::jsonb,
  is_active boolean DEFAULT false,
  created_by text,
  change_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(photo_type, version)
);
```

| Column | SQL type | Null | Default | Constraint |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | PK |
| `photo_type` | `text` | **no** | — | part of `UNIQUE(photo_type, version)`; not constrained to the four valid slugs |
| `version` | `integer` | **no** | `1` | part of `UNIQUE(photo_type, version)` |
| `label` | `text` | **no** | — | — |
| `pose_description` | `text` | **no** | — | — |
| `content_checks` | `jsonb` | **no** | `'[]'::jsonb` | array of `{id, label, requirement}` |
| `quality_checks` | `jsonb` | **no** | four seeded checks (above) | array of `{id, label, requirement}` |
| `is_active` | `boolean` | yes | `false` | — |
| `created_by` | `text` | yes | — | free text, e.g. `"AI Advisor"` |
| `change_notes` | `text` | yes | — | — |
| `created_at` | `timestamptz` | yes | `now()` | — |

**The `quality_checks` default is the important artefact here.** Its four
entries are byte-identical to the four quality criteria hardcoded in the
analysis prompt — which is exactly why nobody noticed the column was never read.
See `photo-analysis.md` §7.

**Missing constraint:** nothing enforces *at most one active version per
`photo_type`*. The prototype maintained that invariant with two sequential
writes in application code. A real backend should express it in the schema —
a partial unique index such as
`CREATE UNIQUE INDEX ON prompt_configs (photo_type) WHERE is_active;` — and
perform the swap in a transaction. See `security-requirements.md` §8.

**Seed data:** the migration inserts version 1 for all four photo types, with
`is_active = true`, mirroring the hardcoded `PHOTO_TYPES` catalogue in the
analysis route (reproduced in full in `photo-analysis.md` §3). Note that the
seed rows supply `content_checks` only, taking the schema default for
`quality_checks`. `ON CONFLICT (photo_type, version) DO NOTHING` makes the
migration re-runnable.

**RLS:** `Allow prompt reads` / `Allow prompt inserts` / `Allow prompt updates`,
all unconditional (`USING (true)` / `WITH CHECK (true)`). Anyone with the anon
key could rewrite the prompts that grade every patient photo.

---

## 5. Storage bucket

Declared as a manual step at the bottom of `supabase-schema.sql`:

```sql
-- Storage bucket for impression photos
-- Run in Supabase Dashboard → Storage → New bucket:
--   Name: impression-photos
--   Public: true
```

One **public** bucket named `impression-photos` held every patient image —
teeth photos and impression-tray photos alike, despite the name.

Object key conventions, from the pre-refactor capture screens:

| Kind | Key pattern | Source screen |
| --- | --- | --- |
| Close bite, front | `close-bite/{Date.now()}-front.jpg` | `src/app/camera/page.tsx` |
| Close bite, side | `close-bite/{Date.now()}-side.jpg` | `src/app/camera-1/page.tsx` |
| Open bite, front | `open-bite/{Date.now()}-front.jpg` | `src/app/open-bite/page.tsx` |
| Open bite, side | `open-bite/{Date.now()}-side.jpg` | `src/app/open-bite-2/page.tsx` |
| Impression tray | `impressions/{Date.now()}-slot{1..4}.{ext}` | `src/app/impression-photos/page.tsx` |

Uploads used `{ contentType: "image/jpeg", upsert: true }`, and the public URL
returned by `getPublicUrl` was stored in the submission's array column.

The contract's `PhotosApi.upload(file, kind)` takes
`kind: "close-bite" | "open-bite" | "impression"` — the three path prefixes
above — and returns `StoredPhoto { url, path }`. The `path` field exists so the
backend's own key can round-trip without the UI needing to understand it.

**Requirements for the real implementation.** These are patient dental
photographs. A public bucket with timestamp-derived keys means anyone can
enumerate and download them; the keys carry no entropy beyond a millisecond
timestamp. The bucket must be private, with access mediated by short-lived
signed URLs issued only to the owning patient or an authenticated staff member.
Consider whether this data is PHI in your jurisdiction and what that implies for
retention, encryption at rest, and audit logging.

---

## 6. What has no table

**Threads** — the patient supplies-request feature on `/my-order` — had **no
backend at all.** It lived entirely in `localStorage` under the key
`rs_message_threads`, and its own source said so:

```
NOTE: this is UI state only. Persisting threads to the backend — and whether
an accepted request writes through to Shopify — is a separate scope.
```
(`src/app/context/MessagesContext.tsx`, pre-refactor)

`ThreadsApi` in `src/lib/api/contract.ts` is therefore a **greenfield
specification**, not a description of something that existed. Two consequences:

- There is no schema to migrate from. Design `Thread`, `ThreadMessage` and
  `ThreadRequest` storage from `src/lib/api/types.ts`.
- `ThreadsApi.setRequestStatus` is on the patient client only because the
  prototype simulated support's decision in the browser — including inventing
  the tracking number. The contract states it must be admin-only and must reject
  a patient session.

---

## 7. Column mapping: old snake_case → new camelCase

**The front end no longer speaks snake_case.** `src/lib/api/types.ts` is the
authority, and its header is explicit: *"the front end speaks camelCase
everywhere. Any snake_case is a detail of a particular backend and belongs
inside that backend's adapter, never in a screen."*

If your backend keeps these column names, the adapter must translate in both
directions.

### `submissions` → `Submission`

| Old column | New field | Type in `types.ts` | Notes |
| --- | --- | --- | --- |
| `id` | `id` | `string` | |
| `user_id` | `userId` | `string \| null` | |
| `email` | `email` | `string` | non-null |
| `name` | `name` | `string \| null` | |
| `state` | `state` | `string \| null` | full US state name, not the abbreviation |
| `products` | `products` | `string[]` | `ProductConfig["id"]` slugs; render via `productLabel()`, never raw |
| `white_shade` | `whiteShade` | `string \| null` | `"A1" \| "A2" \| "A3"` |
| `gum_shade` | `gumShade` | `string \| null` | `"G1" \| "G2" \| "G3" \| "G4"` |
| `selected_teeth` | `selectedTeeth` | `number[]` | universal tooth numbering 1–32 |
| `teeth_not_sure` | `teethNotSure` | `boolean` | |
| `close_bite_photos` | `closeBitePhotos` | `string[]` | `[front, side]` |
| `open_bite_photos` | `openBitePhotos` | `string[]` | `[front, side]` |
| `impression_photos` | `impressionPhotos` | `string[]` | up to four |
| `photo_analyses` | `photoAnalyses` | `PhotoAnalyses` | keys are `PhotoType` slugs; inner fields already camelCase |
| `status` | `status` | `SubmissionStatus` | nine-value union |
| `review_notes` | `reviewNotes` | `string \| null` | |
| `reviewed_by` | `reviewedBy` | `string \| null` | **stored a display name; must become a user id — see `security-requirements.md` §9** |
| `reviewed_at` | `reviewedAt` | `Timestamp \| null` | ISO-8601 string |
| `tracking_number` | `trackingNumber` | `string \| null` | |
| `shipped_at` | `shippedAt` | `Timestamp \| null` | |
| `completed_at` | `completedAt` | `Timestamp \| null` | |
| `created_at` | `createdAt` | `Timestamp` | non-null in the contract |

Note that the contract's array columns are non-nullable (`string[]`, `number[]`)
while the SQL columns are nullable. The adapter must coalesce null to `[]`, and
null `photo_analyses` to `{}`.

`ImpressionPhoto` (`{ url, path, slot: 1|2|3|4 }`) is the **input** shape for
`SubmissionsApi.finalize`. `Submission.impressionPhotos` is a plain `string[]`
of URLs, indexed by slot − 1.

### `messages` → `ChatMessage`

| Old column | New field | Type |
| --- | --- | --- |
| `id` | `id` | `string` |
| `submission_id` | `submissionId` | `string` |
| `sender_role` | `senderRole` | `MessageRole` = `"admin" \| "patient"` |
| `sender_name` | `senderName` | `string` |
| `body` | `body` | `string` |
| `created_at` | `createdAt` | `Timestamp` |
| `read_at` | `readAt` | `Timestamp \| null` |

### `notifications` → `AppNotification`

| Old column | New field | Type | Notes |
| --- | --- | --- | --- |
| `id` | `id` | `string` | |
| `title` | `title` | `string` | |
| `body` | `body` | `string` | |
| `type` | `type` | `NotificationType` | `"status_update" \| "action_required" \| "info"` |
| `read` | `read` | `boolean` | |
| `submission_id` | `submissionId` | `string \| null` | |
| `created_at` | `createdAt` | `Timestamp` | |
| `user_id` | *(none)* | — | **not exposed.** `NotificationsApi.list()` returns the signed-in patient's notifications; ownership is a server concern. |
| `email` | *(none)* | — | **not exposed.** The prototype's email-keyed lookup must not survive into the contract; scope by session instead. |

### `prompt_configs` → `PromptConfig`

| Old column | New field | Type | Notes |
| --- | --- | --- | --- |
| `id` | `id` | `string` | |
| `photo_type` | `photoType` | `PhotoType` | narrowed from `text` to the four-value union |
| `version` | `version` | `number` | |
| `label` | `label` | `string` | |
| `pose_description` | `poseDescription` | `string` | |
| `content_checks` | `contentChecks` | `PromptCheck[]` | `{ id, label, requirement }` — inner keys unchanged |
| `quality_checks` | `qualityChecks` | `PromptCheck[]` | required on `PromptConfig`, optional on `NewPromptConfig` |
| `is_active` | `isActive` | `boolean` | |
| `created_by` | `createdBy` | `string \| null` | |
| `change_notes` | `changeNotes` | `string \| null` | |
| `created_at` | `createdAt` | `Timestamp` | |

The advisor tool schemas in `prompt-advisor.md` §3 use snake_case
(`photo_type`, `pose_description`, `content_checks`, `change_notes`) because
they are model-facing, not UI-facing. Those names are part of a tuned prompt
surface — keep them as they are and translate at the adapter boundary.
