# Photo analysis

Source of everything below: `src/app/api/analyze-photo/route.ts` (being
deleted). This is the single most valuable piece of product content in the old
backend — the wording of the checks was tuned against real patient photos to
stop the analyser rejecting usable ones. **Reproduce it exactly.**

Contract method:

```ts
analyze(image: string, photoType: PhotoType): Promise<PhotoAnalysis>
```

(`src/lib/api/contract.ts`, `PhotosApi`). `image` is a data URL from the camera
or file picker; a real implementation should upload or stream it rather than
inlining it in JSON, as the prototype did.

---

## 1. Model call — exact settings

Verbatim from `src/app/api/analyze-photo/route.ts` (lines 219–237):

```ts
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });
```

Facts that matter:

- **Model:** `claude-sonnet-4-6`.
- **max_tokens:** `1024`.
- **Image attachment:** a single user message whose content array is
  `[image, text]` — **the image block comes first, the prompt text second**.
  The image is a base64 block, not a URL.
- The client is the Anthropic SDK (`@anthropic-ai/sdk`), configured with
  `ANTHROPIC_API_KEY` and an optional `ANTHROPIC_BASE_URL` override.
- `export const maxDuration = 30` — the route was given a 30-second budget.

The request body the front end sent was `{ imageBase64, photoType }`, where
`imageBase64` is the data URL's payload with the `data:image/...;base64,`
prefix already stripped.

### Media-type detection

The route sniffed the media type from the leading base64 characters rather than
trusting a client-supplied value. Verbatim (lines 155–162):

```ts
/** Detect media type from base64 header bytes */
function detectMediaType(b64: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBOR")) return "image/png";
  if (b64.startsWith("R0lG")) return "image/gif";
  if (b64.startsWith("UklG")) return "image/webp";
  return "image/jpeg"; // default fallback
}
```

### Response post-processing

The model sometimes wrapped its JSON in a markdown fence, so the route stripped
it before parsing. Verbatim (lines 239–253):

```ts
  let text = response.content[0].type === "text" ? response.content[0].text : "{}";
  // Strip markdown code block wrapper if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const result = JSON.parse(text);
    if (configId) result.promptConfigId = configId;
    return NextResponse.json(result);
  } catch {
    console.error("Failed to parse AI response:", text.slice(0, 500));
    return NextResponse.json(
      { error: "Failed to parse analysis", checks: [], pass: false },
      { status: 502 }
    );
  }
```

Note the `promptConfigId` stamp: when the spec came from the database, the
config's id is attached to the result so an admin can later tell which prompt
version produced a given verdict. `PhotoAnalysis.promptConfigId` in
`src/lib/api/types.ts` preserves this. Keep it.

---

## 2. The prompt template — VERBATIM

This is the exact template literal from `src/app/api/analyze-photo/route.ts`
(lines 179–217), including the two interpolated variables. Nothing has been
reworded.

```ts
  const prompt = `You are a dental photo analyzer for a dental appliance company. A patient has taken a photo of their teeth that should be: **${spec.label}**.

**What this photo should show:**
${spec.pose_description}

Analyze the photo across two categories:

## A. CONTENT VALIDATION (Is this the right photo?)
${contentCriteria}

## B. PHOTO QUALITY (Is the photo usable?)
  1. **Blur & focus** — The image must be in focus and not blurry. Motion blur or out-of-focus teeth should fail.
  2. **Lighting** — The teeth area must be well-lit. Too dark or extreme shadows should fail.
  3. **Framing** — Teeth should fill a reasonable portion of the frame. Too far away or cropped badly should fail.
  4. **Glare** — No major glare or reflections on the teeth that obscure detail.

Return ONLY valid JSON, no other text:
{
  "checks": [
${contentChecksJson},
    { "id": "blur",     "label": "Blur & focus",       "pass": boolean, "detail": "short sentence", "observation": "what you actually see" },
    { "id": "lighting", "label": "Lighting",            "pass": boolean, "detail": "short sentence", "observation": "what you actually see" },
    { "id": "framing",  "label": "Framing & distance",  "pass": boolean, "detail": "short sentence", "observation": "what you actually see" },
    { "id": "glare",    "label": "Glare & reflections", "pass": boolean, "detail": "short sentence", "observation": "what you actually see" }
  ],
  "pass": boolean,
  "teethCenter": { "x": number, "y": number },
  "summary": "string"
}

Rules:
- "pass" at root is true ONLY if ALL checks (content + quality) pass
- "detail" is a short headline — max 8 words (shown collapsed)
- "observation" is a 1-2 sentence description of what you specifically see in the image for this check. Be concrete and descriptive — mention specific teeth, angles, lighting conditions, etc. This is shown when the user expands the check. Example: "I can see 4 upper incisors and 4 lower incisors clearly. The canines on both sides are also partially visible with the gums showing above."
- "summary" is a 2-3 sentence AI narrative about the overall photo. Describe what you see (teeth condition, positioning, any notable features) and whether the photo gives the lab what they need. Write in first person ("I can see..."). Be specific but friendly — not clinical. If the photo fails, explain what would make it better.
- "teethCenter" is the approximate center of the teeth/mouth region as a percentage of image dimensions (0-100). x=50 means horizontally centered, y=30 means the teeth are in the upper third. If no teeth are visible, use { "x": 50, "y": 50 }
- Content checks are MORE IMPORTANT than quality checks — a well-lit photo of the wrong thing is still a fail
- Be practical, not clinical — you're helping a regular person take a usable photo, not diagnosing conditions
- If the image is clearly not a photo of teeth/mouth at all, fail ALL checks`;
```

> **The `teethCenter` rule above says 0–100. That is the prototype's behaviour
> and it has changed. See §6 before you copy this line.**

### How the two interpolated variables were built

Verbatim (lines 170–177):

```ts
  // Build the content-specific checks portion of the prompt
  const contentChecksJson = spec.content_checks
    .map((c) => `    { "id": "${c.id}", "label": "${c.label}", "pass": boolean, "detail": "short sentence", "observation": "what you actually see" }`)
    .join(",\n");

  const contentCriteria = spec.content_checks
    .map((c, i) => `  ${i + 1}. **${c.label}** — ${c.requirement}`)
    .join("\n");
```

So `contentCriteria` renders a numbered list of `**label** — requirement`, and
`contentChecksJson` renders one JSON stub line per content check, which is then
concatenated ahead of the four fixed quality-check stubs.

---

## 3. The `PHOTO_TYPES` spec catalogue — VERBATIM

Verbatim from `src/app/api/analyze-photo/route.ts` (lines 52–139), including
the interface it satisfies. The four keys are the four values of the `PhotoType`
union in `src/lib/api/types.ts`.

```ts
interface PhotoTypeSpec {
  label: string;
  pose_description: string;
  content_checks: {
    id: string;
    label: string;
    requirement: string;
  }[];
}

const PHOTO_TYPES: Record<string, PhotoTypeSpec> = {
  "close-bite-front": {
    label: "Front View — Teeth Showing",
    pose_description:
      "The patient shows their front teeth from a straight-on angle. Lips are pulled back to expose the teeth. " +
      "A natural bite or a smile are both fine — what matters is that front teeth on both upper and lower jaw are visible. " +
      "This is NOT a closed-lip photo — the teeth must be showing.",
    content_checks: [
      {
        id: "teeth_visible",
        label: "Teeth showing",
        requirement: "Both upper and lower front teeth must be visible. A bite, a smile, or lips pulled back with a retractor are all acceptable. Fail ONLY if: lips are closed hiding teeth, only gums are showing, or teeth are too blurry to make out.",
      },
      {
        id: "front_view",
        label: "Front angle",
        requirement: "The photo should be roughly from the front — showing both sides of the mouth. A perfectly straight angle is not required; slightly off-center is fine. Fail only if the photo clearly shows just one side of the mouth.",
      },
    ],
  },
  "close-bite-side": {
    label: "Side View — Teeth Showing",
    pose_description:
      "The patient shows their teeth from the side. The camera is angled so you can see teeth beyond just the front incisors. " +
      "Lips or cheek are pulled back to expose the side teeth. A bite or slight gap are both fine. " +
      "It does not matter which side (left or right).",
    content_checks: [
      {
        id: "teeth_visible",
        label: "Teeth showing",
        requirement: "Teeth must be clearly visible with lips or cheek pulled back. A bite or slight gap are both fine. Fail only if teeth are hidden behind closed lips or the photo doesn't show teeth at all.",
      },
      {
        id: "side_angle",
        label: "Side angle",
        requirement: "The photo should be taken from an angle — not perfectly straight-on from the front. You should see some of the side teeth (premolars or canines beyond the front incisors). A 30-90° angle from the front is fine. Fail only if it's a straight front-on view showing both sides equally.",
      },
    ],
  },
  "open-bite-front": {
    label: "Front View — Mouth Open",
    pose_description:
      "The patient has their mouth open so you can see inside. The photo is from the front. " +
      "The mouth doesn't need to be extremely wide — just open enough to see the upper teeth and some of the lower teeth or gums. " +
      "This helps the lab see tooth alignment, spacing, and any missing teeth.",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be open with a visible gap between upper and lower teeth. It doesn't need to be extremely wide — a comfortable open is fine. Fail only if the teeth are together with no gap, or if the mouth is barely open and you can't see inside.",
      },
      {
        id: "front_view",
        label: "Front angle",
        requirement: "The photo should be roughly from the front. Slightly off-center is acceptable. Fail only if the photo is clearly from the side.",
      },
    ],
  },
  "open-bite-side": {
    label: "Side View — Mouth Open",
    pose_description:
      "The patient has their mouth open and the photo is taken from the side. " +
      "Lips or cheek are pulled back so side teeth are visible with the mouth open. " +
      "The mouth doesn't need to be extremely wide. It does not matter which side (left or right).",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be open with a visible gap. A comfortable open is fine — it doesn't need to be extremely wide. Fail only if teeth are together with no gap.",
      },
      {
        id: "side_angle",
        label: "Side angle",
        requirement: "The photo should be taken from an angle, not straight-on from the front. You should see some side teeth. A 30-90° angle is fine. Fail only if it's a straight front-on view.",
      },
    ],
  },
};
```

The same four specs are also present as seed rows in
`supabase-schema-prompt-configs.sql`, which is what made the hardcoded catalogue
a *fallback* rather than the source of truth — see §4.

### `GENERIC_SPEC` fallback — VERBATIM

Verbatim (lines 141–153):

```ts
/** Fallback for unknown photo types — generic dental photo checks */
const GENERIC_SPEC: PhotoTypeSpec = {
  label: "Dental Photo",
  pose_description:
    "This is a dental photo. It should clearly show teeth with good visibility.",
  content_checks: [
    {
      id: "is_dental",
      label: "Dental photo",
      requirement: "The image must be a photo of teeth/mouth. If it shows something else entirely, fail.",
    },
  ],
};
```

---

## 4. Spec resolution order

Verbatim (lines 17–45):

```ts
/** Load active prompt config from DB, falling back to hardcoded PHOTO_TYPES */
async function loadSpec(photoType: string): Promise<{ spec: PhotoTypeSpec; configId: string | null }> {
  try {
    const { data } = await supabase
      .from("prompt_configs")
      .select("*")
      .eq("photo_type", photoType)
      .eq("is_active", true)
      .single();

    if (data) {
      return {
        spec: {
          label: data.label,
          pose_description: data.pose_description,
          content_checks: data.content_checks as PhotoTypeSpec["content_checks"],
        },
        configId: data.id,
      };
    }
  } catch {
    // DB not available or table missing — fall through to hardcoded
  }

  return {
    spec: PHOTO_TYPES[photoType] ?? GENERIC_SPEC,
    configId: null,
  };
}
```

Required order for a real implementation:

1. The active `prompt_configs` row for that `photoType`.
2. Failing that, the hardcoded `PHOTO_TYPES` entry (§3).
3. Failing that, `GENERIC_SPEC` (§3).

A database outage must degrade to the hardcoded catalogue rather than failing
the request. Keep that property.

---

## 5. Required response shape

The model returns JSON; the route returned it to the client essentially
unchanged (plus `promptConfigId`). The front end's target shape is
`PhotoAnalysis` in `src/lib/api/types.ts`:

```ts
export interface AnalysisCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  observation?: string;
}

export interface PhotoAnalysis {
  checks: AnalysisCheck[];
  summary: string | null;
  teethCenter: { x: number; y: number } | null;
  pass: boolean;
  promptConfigId?: string;
}
```

Field by field:

| Field | Meaning | Notes |
| --- | --- | --- |
| `checks[].id` | Stable slug for the criterion. | **Load-bearing.** The capture screens key their remediation copy off these ids. Content-check ids come from the active spec (`teeth_visible`, `front_view`, `mouth_open`, `side_angle`, `is_dental`). Quality-check ids are the four fixed strings `blur`, `lighting`, `framing`, `glare`. Do not rename them. |
| `checks[].label` | Human-readable name shown next to the verdict. | Comes from the spec for content checks; fixed strings for quality checks (`Blur & focus`, `Lighting`, `Framing & distance`, `Glare & reflections`). |
| `checks[].pass` | Whether that single criterion passed. | Boolean. |
| `checks[].detail` | Short collapsed headline. | The prompt caps this at 8 words. The UI shows it in the collapsed state. |
| `checks[].observation` | 1–2 sentences of concrete description of what the model saw for that check. | Optional in the type. Shown when the user expands a check. |
| `summary` | 2–3 sentence first-person narrative about the whole photo. | Nullable. Shown to the patient and reused as context by the prompt advisor. |
| `teethCenter` | Approximate centre of the teeth/mouth region, used to re-centre the on-screen guide over the captured image. | Nullable. **Units changed — see §6.** |
| `pass` | Overall verdict. | True only if **every** check passed, content and quality. Content failures outrank quality failures per the prompt's rules. |
| `promptConfigId` | Which `prompt_configs` row produced this verdict. | Optional. Present only when the spec came from the database. Needed for admin traceability. |

On unparseable model output, the prototype returned HTTP 502 with
`{ error, checks: [], pass: false }`. A real implementation should surface this
as an `ApiError` — `network` or `unknown` per `ApiErrorCode` in
`src/lib/api/types.ts` — rather than a body the UI has to sniff.

---

## 6. MIGRATION NOTE — `teethCenter` units changed from 0–100 to 0–1

**This is a breaking change between the old route and the new contract. Read it
before copying the prompt.**

The old prompt instructed the model to return `teethCenter` as *a percentage of
image dimensions (0-100)*, and the old capture screens consumed it that way —
straight into a CSS `object-position` with a literal `%` suffix:

```tsx
// src/app/camera/page.tsx, before the refactor
style={teethCenter ? { objectPosition: `${teethCenter.x}% ${teethCenter.y}%` } : undefined}
```

The new contract normalises the value. `src/lib/api/types.ts` declares:

```ts
  /** Normalised 0–1 coordinates used to centre the on-screen guide. */
  teethCenter: { x: number; y: number } | null;
```

and all four capture screens now multiply by 100 themselves:

```tsx
// src/app/camera/page.tsx:236 (also camera-1:236, open-bite:225, open-bite-2:226)
style={teethCenter ? { objectPosition: `${teethCenter.x * 100}% ${teethCenter.y * 100}%` } : undefined}
```

**Requirement:** `PhotosApi.analyze` must return `teethCenter` in the range
0–1. A centred mouth is `{ x: 0.5, y: 0.5 }`.

You have two options, and you must pick one deliberately:

- Change the prompt's `teethCenter` rule to ask for 0–1 directly (and update the
  worked example — "y=30 means the teeth are in the upper third" becomes
  y = 0.3). This is the cleaner option but it re-tunes a line of a tuned prompt.
- Keep the prompt verbatim at 0–100 and divide by 100 in the adapter before
  returning. This preserves the tuned wording exactly and is the safer option.

Either way, **if a 0–100 value reaches the UI unconverted the guide overlay will
be pinned to the bottom-right corner of the image for every photo** (any value
above 100% clamps there), because the screens will multiply it by 100 again.

Historic `photo_analyses` rows written by the prototype hold 0–100 values. If
that data is migrated, it must be rescaled.

---

## 7. KNOWN GAP — `quality_checks` was stored but never used

**This is a defect to fix, not a behaviour to reproduce.**

What was true in the prototype:

- `prompt_configs` has a `quality_checks jsonb NOT NULL` column with a default
  containing the four quality criteria (`supabase-schema-prompt-configs.sql`,
  lines 14–19).
- The admin prompt editor renders and edits quality checks and sends them on
  save — `src/app/admin/prompts/[photoType]/page.tsx` (lines 34, 69, 139, 282).
- `POST /api/prompts` persists them into `quality_checks`
  (`src/app/api/prompts/route.ts`, lines 121–123).
- `loadSpec` in `analyze-photo/route.ts` reads **only** `label`,
  `pose_description` and `content_checks` from the row. It never reads
  `quality_checks`.
- Section B of the prompt hardcodes all four quality criteria as literal text.

**Consequence:** an admin could open the prompt editor, carefully rewrite the
blur or lighting requirement, save it, see it persisted and versioned — and the
analyser's behaviour would not change at all. The edit was written to a column
nobody read. Every photo was still graded against the hardcoded text.

**Requirement for the new backend:** section B of the prompt must be rendered
from the active config's `quality_checks`, exactly as section A is rendered from
`content_checks`, so that an admin edit takes effect. The natural implementation
mirrors the existing `contentCriteria` builder:

```ts
const qualityCriteria = spec.quality_checks
  .map((c, i) => `  ${i + 1}. **${c.label}** — ${c.requirement}`)
  .join("\n");
```

with the matching JSON stubs generated the same way instead of being hardcoded,
so that a quality check's `id` and `label` also flow from config into the
response. The four default quality checks in the schema are byte-identical to
the four hardcoded lines in the prompt, so rendering from config with the seeded
defaults produces the current prompt exactly — the change is behaviour-preserving
until someone edits a quality check, which is the point.

`PromptConfig.qualityChecks` is already a required field on the contract type
(`src/lib/api/types.ts`), and `NewPromptConfig.qualityChecks` is optional on
create. The front end is ready for this; only the analysis path is missing.
