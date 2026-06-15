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
    label: "Close Bite — Front View",
    pose_description:
      "The patient should be BITING DOWN — upper teeth resting on lower teeth in a natural bite. " +
      "IMPORTANT: The lips must be PULLED BACK to expose the teeth and gums — this is NOT a closed-lip photo. " +
      "The photo is taken straight-on from the front. You should see both rows of teeth touching with no gap between them.",
    content_checks: [
      {
        id: "teeth_together",
        label: "Teeth together",
        requirement: "Upper and lower teeth must be biting together with no visible gap between them. The lips should be OPEN and pulled back — you need to SEE the teeth touching. If teeth are apart or mouth is wide open, fail. But do NOT fail just because lips are open — lips MUST be open to show the bite.",
      },
      {
        id: "front_view",
        label: "Front view",
        requirement: "The photo must show the teeth head-on from the front. You should see roughly equal amounts of the left and right sides of the mouth. If the photo is angled to show mostly one side, fail.",
      },
      {
        id: "teeth_exposed",
        label: "Teeth exposed",
        requirement: "The front teeth (incisors and canines) on both upper and lower jaw must be clearly visible. If lips are covering the teeth, fail.",
      },
    ],
  },
  "close-bite-side": {
    label: "Close Bite — Side View",
    pose_description:
      "The patient should be BITING DOWN — teeth together in a natural bite. " +
      "The photo is taken from the SIDE so you can see how the upper and lower back teeth (premolars and molars) meet. " +
      "Lips and cheek are pulled back to expose the side teeth. " +
      "IMPORTANT: Lips being open/pulled back is CORRECT — we need to see the teeth. " +
      "The key is that the back teeth are visible — it does not matter which side (left or right).",
    content_checks: [
      {
        id: "teeth_together",
        label: "Teeth together",
        requirement: "Upper and lower teeth must be biting together. The lips should be pulled back so the bite is visible. If teeth are apart or mouth is wide open, fail. Do NOT fail because lips are open — lips MUST be open to show the teeth.",
      },
      {
        id: "side_view",
        label: "Side view",
        requirement: "The photo must be taken from the side — NOT straight-on from the front. The back teeth (premolars/molars) should be more prominent than the front teeth. If the photo is a front view showing both sides equally, fail.",
      },
      {
        id: "back_teeth_visible",
        label: "Back teeth visible",
        requirement: "Premolars and/or molars must be clearly visible in the photo. The cheek or lips should be pulled back to expose them. If you can only see front teeth (incisors), fail.",
      },
    ],
  },
  "open-bite-front": {
    label: "Open Bite — Front View",
    pose_description:
      "The patient should have their mouth WIDE OPEN — jaw dropped, clear gap between upper and lower teeth. " +
      "The photo is taken straight-on from the front so you can see inside the mouth. " +
      "Both the upper arch (top row of teeth) and lower arch (bottom row) should be visible. " +
      "This lets the lab see the arch shape, tooth alignment, and any gaps or missing teeth.",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be clearly wide open with a visible gap between upper and lower teeth. If the teeth are together or nearly touching, fail.",
      },
      {
        id: "front_view",
        label: "Front view",
        requirement: "The photo must show the open mouth from the front (head-on). You should see roughly equal amounts of both sides. If the photo is angled to one side, fail.",
      },
      {
        id: "arches_visible",
        label: "Arches visible",
        requirement: "Both the upper row of teeth and lower row of teeth should be visible inside the open mouth. If you can only see one row or none, fail.",
      },
    ],
  },
  "open-bite-side": {
    label: "Open Bite — Side View",
    pose_description:
      "The patient should have their mouth WIDE OPEN. The photo is taken from the SIDE so you can see " +
      "the back teeth (premolars and molars) with the mouth open. The camera is angled roughly 45-90° from the front. " +
      "Lips and cheek are pulled back. It does not matter which side (left or right) — the key is that " +
      "back teeth are visible with the mouth open.",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be clearly open with a gap between upper and lower teeth. If the teeth are together, fail.",
      },
      {
        id: "side_view",
        label: "Side view",
        requirement: "The photo must be taken from the side, NOT straight-on. The back teeth should be more prominent than the front teeth. If it is a front view, fail.",
      },
      {
        id: "back_teeth_visible",
        label: "Back teeth visible",
        requirement: "Premolars and/or molars must be clearly visible with the mouth open. If you can only see front teeth, fail.",
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
    .map((c) => `    { "id": "${c.id}", "label": "${c.label}", "pass": boolean, "detail": "one short sentence" }`)
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
    { "id": "blur",     "label": "Blur & focus",       "pass": boolean, "detail": "one short sentence" },
    { "id": "lighting", "label": "Lighting",            "pass": boolean, "detail": "one short sentence" },
    { "id": "framing",  "label": "Framing & distance",  "pass": boolean, "detail": "one short sentence" },
    { "id": "glare",    "label": "Glare & reflections", "pass": boolean, "detail": "one short sentence" }
  ],
  "pass": boolean,
  "teethCenter": { "x": number, "y": number }
}

Rules:
- "pass" at root is true ONLY if ALL checks (content + quality) pass
- "detail" is user-friendly and actionable — max 10 words
- "teethCenter" is the approximate center of the teeth/mouth region as a percentage of image dimensions (0-100). x=50 means horizontally centered, y=30 means the teeth are in the upper third. If no teeth are visible, use { "x": 50, "y": 50 }
- Content checks are MORE IMPORTANT than quality checks — a well-lit photo of the wrong thing is still a fail
- Be practical, not clinical — you're helping a regular person take a usable photo, not diagnosing conditions
- If the image is clearly not a photo of teeth/mouth at all (e.g., a random object, a landscape), fail ALL checks`;

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
