import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { imageBase64 } = await req.json();

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
          },
          {
            type: "text",
            text: `You are a dental photo quality checker. A patient has taken a self-portrait photo of their teeth. Analyze it across exactly these 7 checks.

Return ONLY valid JSON, no other text:
{
  "checks": [
    { "id": "blur",       "label": "Blur & focus",       "pass": boolean, "detail": "one short sentence" },
    { "id": "lighting",   "label": "Lighting",            "pass": boolean, "detail": "one short sentence" },
    { "id": "visibility", "label": "Teeth visible",       "pass": boolean, "detail": "one short sentence" },
    { "id": "framing",    "label": "Framing & distance",  "pass": boolean, "detail": "one short sentence" },
    { "id": "angle",      "label": "Angle & orientation", "pass": boolean, "detail": "one short sentence" },
    { "id": "bite",       "label": "Bite position",       "pass": boolean, "detail": "one short sentence" },
    { "id": "glare",      "label": "Glare & reflections", "pass": boolean, "detail": "one short sentence" }
  ],
  "pass": boolean
}

Rules:
- "pass" at root is true only if ALL 7 checks pass
- "detail" is user-friendly, actionable — max 8 words
- If image is not a teeth photo at all, fail all checks`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const result = JSON.parse(text);
  return NextResponse.json(result);
}
