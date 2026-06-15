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
      "The patient should have their teeth together in a natural bite (upper teeth resting on lower teeth). " +
      "The photo should be taken straight-on from the front so both upper and lower teeth are visible. " +
      "Lips should be pulled back or retracted to expose the teeth and gums.",
    content_checks: [
      {
        id: "teeth_closed",
        label: "Teeth together",
        requirement: "Upper and lower teeth must be touching/closed in a natural bite. If the mouth is open, fail.",
      },
      {
        id: "front_angle",
        label: "Front angle",
        requirement: "Photo must show teeth from the front (straight-on). Side angles or top-down views should fail.",
      },
      {
        id: "teeth_exposed",
        label: "Teeth exposed",
        requirement: "Both upper and lower front teeth must be visible. Lips should be retracted. If lips cover the teeth, fail.",
      },
    ],
  },
  "close-bite-left": {
    label: "Close Bite — Left Side",
    pose_description:
      "The patient should have their teeth together in a natural bite. The photo should be taken from the LEFT side " +
      "of the patient's face (photographer's right), showing how the upper and lower teeth meet on that side. " +
      "Lips should be pulled back to expose the side teeth and gums.",
    content_checks: [
      {
        id: "teeth_closed",
        label: "Teeth together",
        requirement: "Upper and lower teeth must be touching/closed. If the mouth is open, fail.",
      },
      {
        id: "side_angle",
        label: "Left side angle",
        requirement: "Photo must show the LEFT side of the teeth (the patient's left). A front view or right side view should fail.",
      },
      {
        id: "side_teeth_visible",
        label: "Side teeth visible",
        requirement: "Premolars and molars on the left side must be visible. If only front teeth are showing, fail.",
      },
    ],
  },
  "close-bite-right": {
    label: "Close Bite — Right Side",
    pose_description:
      "The patient should have their teeth together in a natural bite. The photo should be taken from the RIGHT side " +
      "of the patient's face (photographer's left), showing how the upper and lower teeth meet on that side. " +
      "Lips should be pulled back to expose the side teeth and gums.",
    content_checks: [
      {
        id: "teeth_closed",
        label: "Teeth together",
        requirement: "Upper and lower teeth must be touching/closed. If the mouth is open, fail.",
      },
      {
        id: "side_angle",
        label: "Right side angle",
        requirement: "Photo must show the RIGHT side of the teeth (the patient's right). A front view or left side view should fail.",
      },
      {
        id: "side_teeth_visible",
        label: "Side teeth visible",
        requirement: "Premolars and molars on the right side must be visible. If only front teeth are showing, fail.",
      },
    ],
  },
  "open-bite-front": {
    label: "Open Bite — Front View",
    pose_description:
      "The patient should have their mouth WIDE OPEN. The photo should be taken straight-on from the front " +
      "so that the upper arch, lower arch, and the inside of the mouth are visible. " +
      "This lets the lab see the arch shape, tooth alignment, and any gaps or missing teeth.",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be clearly wide open, showing space between upper and lower teeth. A closed bite should fail.",
      },
      {
        id: "front_angle",
        label: "Front angle",
        requirement: "Photo must show the open mouth from the front (straight-on). Side views should fail.",
      },
      {
        id: "arches_visible",
        label: "Arches visible",
        requirement: "Both the upper and lower dental arches (rows of teeth) should be visible inside the open mouth.",
      },
    ],
  },
  "open-bite-left": {
    label: "Open Bite — Left Side",
    pose_description:
      "The patient should have their mouth WIDE OPEN. The photo should be taken from the LEFT side " +
      "of the patient's face, showing the left-side teeth, arch shape, and bite relationship with the mouth open.",
    content_checks: [
      {
        id: "mouth_open",
        label: "Mouth open",
        requirement: "The mouth must be clearly open. A closed bite should fail.",
      },
      {
        id: "side_angle",
        label: "Left side angle",
        requirement: "Photo must show the left side of the open mouth. A front view should fail.",
      },
      {
        id: "side_teeth_visible",
        label: "Side teeth visible",
        requirement: "Left-side premolars and molars must be visible with the mouth open.",
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
    model: "claude-sonnet-4-20250514",
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
