import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(process.env.ANTHROPIC_BASE_URL && { baseURL: process.env.ANTHROPIC_BASE_URL }),
});

/**
 * Photo type definitions — each type specifies what content the AI should
 * validate beyond generic photo quality. The `content_criteria` tells Claude
 * exactly what must be present in the image for it to be useful to the lab.
 */
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

/** Detect media type from base64 header bytes */
function detectMediaType(b64: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBOR")) return "image/png";
  if (b64.startsWith("R0lG")) return "image/gif";
  if (b64.startsWith("UklG")) return "image/webp";
  return "image/jpeg"; // default fallback
}

export async function POST(req: NextRequest) {
  const { imageBase64, photoType } = await req.json();

  const mediaType = detectMediaType(imageBase64 as string);
  const spec = PHOTO_TYPES[photoType as string] ?? GENERIC_SPEC;

  // Build the content-specific checks portion of the prompt
  const contentChecksJson = spec.content_checks
    .map((c) => `    { "id": "${c.id}", "label": "${c.label}", "pass": boolean, "detail": "short sentence", "observation": "what you actually see" }`)
    .join(",\n");

  const contentCriteria = spec.content_checks
    .map((c, i) => `  ${i + 1}. **${c.label}** — ${c.requirement}`)
    .join("\n");

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

  let text = response.content[0].type === "text" ? response.content[0].text : "{}";
  // Strip markdown code block wrapper if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    console.error("Failed to parse AI response:", text.slice(0, 500));
    return NextResponse.json(
      { error: "Failed to parse analysis", checks: [], pass: false },
      { status: 502 }
    );
  }
}
