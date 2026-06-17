import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(process.env.ANTHROPIC_BASE_URL && { baseURL: process.env.ANTHROPIC_BASE_URL }),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ── Tool definitions for the advisor agent ── */

const tools: Anthropic.Tool[] = [
  {
    name: "get_active_prompt",
    description:
      "Retrieve the currently active prompt configuration for a specific photo type. " +
      "Returns the label, pose description, content checks, quality checks, and version info.",
    input_schema: {
      type: "object" as const,
      properties: {
        photo_type: {
          type: "string",
          description: "The photo type to get the prompt for, e.g. 'close-bite-front', 'close-bite-side', 'open-bite-front', 'open-bite-side'",
        },
      },
      required: ["photo_type"],
    },
  },
  {
    name: "get_prompt_history",
    description:
      "Get version history for a photo type's prompt. Shows all versions with their changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        photo_type: {
          type: "string",
          description: "The photo type to get history for",
        },
      },
      required: ["photo_type"],
    },
  },
  {
    name: "get_recent_analyses",
    description:
      "Get aggregated statistics from recent photo analyses. Shows pass/fail rates " +
      "and which checks fail most often for a given photo type. Useful for identifying patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        photo_type: {
          type: "string",
          description: "The photo type to analyze, e.g. 'close-bite-front'",
        },
        limit: {
          type: "number",
          description: "Number of recent submissions to analyze (default 20)",
        },
      },
      required: ["photo_type"],
    },
  },
  {
    name: "apply_prompt_change",
    description:
      "Save a new version of a prompt configuration and set it as active. " +
      "IMPORTANT: Only call this after the user has explicitly confirmed they want to apply the change. " +
      "Always show a preview of what will change first.",
    input_schema: {
      type: "object" as const,
      properties: {
        photo_type: {
          type: "string",
          description: "The photo type to update",
        },
        label: {
          type: "string",
          description: "Display label for this photo type",
        },
        pose_description: {
          type: "string",
          description: "Updated pose description",
        },
        content_checks: {
          type: "array",
          description: "Array of content check objects with id, label, and requirement",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              requirement: { type: "string" },
            },
            required: ["id", "label", "requirement"],
          },
        },
        change_notes: {
          type: "string",
          description: "Description of what changed and why",
        },
      },
      required: ["photo_type", "label", "pose_description", "content_checks", "change_notes"],
    },
  },
];

/* ── Tool execution ── */

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_active_prompt": {
      const { data, error } = await supabase
        .from("prompt_configs")
        .select("*")
        .eq("photo_type", input.photo_type)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return JSON.stringify({ error: "No active prompt found for this photo type. The prompt_configs table may not be seeded yet." });
      }
      return JSON.stringify(data);
    }

    case "get_prompt_history": {
      const { data, error } = await supabase
        .from("prompt_configs")
        .select("version, label, change_notes, created_by, created_at, is_active")
        .eq("photo_type", input.photo_type)
        .order("version", { ascending: false })
        .limit(10);

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ versions: data ?? [] });
    }

    case "get_recent_analyses": {
      const limit = (input.limit as number) || 20;
      const photoType = input.photo_type as string;

      const { data, error } = await supabase
        .from("submissions")
        .select("photo_analyses")
        .not("photo_analyses", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return JSON.stringify({ error: error.message });

      // Aggregate stats for this photo type
      let total = 0;
      let passed = 0;
      const checkStats: Record<string, { pass: number; fail: number }> = {};

      for (const row of data ?? []) {
        const analyses = row.photo_analyses as Record<string, { checks: { id: string; pass: boolean }[]; pass: boolean }>;
        const entry = analyses?.[photoType];
        if (!entry) continue;

        total++;
        if (entry.pass) passed++;

        for (const check of entry.checks ?? []) {
          if (!checkStats[check.id]) checkStats[check.id] = { pass: 0, fail: 0 };
          if (check.pass) checkStats[check.id].pass++;
          else checkStats[check.id].fail++;
        }
      }

      return JSON.stringify({
        photo_type: photoType,
        total_analyzed: total,
        passed,
        failed: total - passed,
        pass_rate: total > 0 ? `${Math.round((passed / total) * 100)}%` : "N/A",
        check_breakdown: Object.entries(checkStats).map(([id, stats]) => ({
          check_id: id,
          pass: stats.pass,
          fail: stats.fail,
          fail_rate: total > 0 ? `${Math.round((stats.fail / total) * 100)}%` : "N/A",
        })),
      });
    }

    case "apply_prompt_change": {
      // Deactivate existing
      await supabase
        .from("prompt_configs")
        .update({ is_active: false })
        .eq("photo_type", input.photo_type);

      // Get next version number
      const { data: existing } = await supabase
        .from("prompt_configs")
        .select("version")
        .eq("photo_type", input.photo_type)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.version ?? 0) + 1;

      const { data: newConfig, error } = await supabase
        .from("prompt_configs")
        .insert({
          photo_type: input.photo_type,
          version: nextVersion,
          label: input.label,
          pose_description: input.pose_description,
          content_checks: input.content_checks,
          is_active: true,
          change_notes: input.change_notes,
          created_by: "AI Advisor",
        })
        .select("id, version, photo_type")
        .single();

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        success: true,
        message: `Prompt updated to version ${newConfig?.version}. The new version is now active.`,
        config: newConfig,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/* ── System prompt ── */

const SYSTEM_PROMPT = `You are the AI Prompt Advisor for Revived Smiles, a dental impression intake application. You help non-technical administrators optimize the AI prompts that analyze patient dental photos.

## Your Role
- Help admins understand why photos pass or fail AI analysis
- Suggest improvements to prompt requirements based on admin feedback
- Preview changes before applying them
- Apply prompt changes only when the admin explicitly confirms

## Context
The app uses AI (Claude) to analyze dental photos during patient intake. There are 4 photo types:
- **close-bite-front**: Front view with teeth showing (natural bite or smile)
- **close-bite-side**: Side view with teeth showing
- **open-bite-front**: Front view with mouth open
- **open-bite-side**: Side view with mouth open

Each photo type has:
1. **Content checks** — verify the photo shows the right thing (correct angle, teeth visible, etc.)
2. **Quality checks** — verify photo is usable (not blurry, good lighting, proper framing, no glare)

## Guidelines
- Always use plain, friendly language — the admin is not a developer
- When suggesting changes, show exactly what the requirement text would change from/to
- Use the get_active_prompt tool to see current prompt text before suggesting changes
- Use get_recent_analyses to understand failure patterns before making recommendations
- NEVER apply changes without showing a clear preview and getting explicit confirmation
- When applying changes, write clear change_notes explaining what changed and why
- If the admin describes a specific photo that was incorrectly analyzed, ask which photo type it was and what the issue was

## Response Style
- Be concise — 2-3 sentences for simple answers
- Use bullet points for lists
- Bold key terms

## IMPORTANT: Prompt Block Formatting
When quoting prompt text (current requirements or proposed changes), you MUST use fenced prompt blocks.
The chat UI renders these as highlighted cards. An "Apply This Change" button appears on proposed blocks.

For the **current** requirement being discussed:

:::current
The image must be in focus and not blurry. Motion blur or out-of-focus teeth should fail.
:::

For a **proposed** change:

:::proposed
Fail only if the blur is severe enough that tooth edges and surface details cannot be made out at all. Slight softness or minor focus issues are acceptable as long as the overall tooth structure is still visible.
:::

After a change has been **successfully applied**, confirm with a success block:

:::success
Blur & focus requirement updated to version 3.
Photos with slight softness will now pass — only severely blurry shots will be rejected.
[View in prompt editor](/admin/prompts/open-bite-front)
:::

If something **went wrong**, use a warning block:

:::warning
Couldn't apply the change — the prompt config for open-bite-front was not found.
:::

CRITICAL formatting rules:
- The ::: markers MUST be on their OWN LINE. Never glue them to other text. Always put a newline BEFORE and AFTER each ::: marker.
- WRONG: "Here is the result.:::success"
- CORRECT:
  Here is the result.

  :::success
  ...
  :::
- Always use :::current before showing existing prompt text, closed by :::
- Always use :::proposed before showing suggested new text, closed by :::
- Always use :::success after successfully applying a change, closed by ::: — include the version number, a plain-English summary, and a link: [View in prompt editor](/admin/prompts/{photo_type})
- Always use :::warning when something failed or needs attention, closed by :::
- Markdown links [text](url) work inside blocks — use them for prompt editor links. No other markdown (**, \`, >) inside blocks
- Show both current and proposed when suggesting a change so the admin can compare
- The proposed block has an "Apply This Change" button — the admin clicks it to confirm, so do NOT ask for text confirmation after showing a proposed block
- After applying, do NOT repeat the change text outside the success block — keep it concise`;

/* ── Main handler ── */

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build system prompt with optional context
    let systemPrompt = SYSTEM_PROMPT;
    if (context?.photoType) {
      systemPrompt += `\n\n## Current Context`;
      systemPrompt += `\nThe admin is reviewing a specific photo:`;
      systemPrompt += `\n- **Photo type**: \`${context.photoType}\``;
      if (context.photoLabel) {
        systemPrompt += `\n- **Label**: ${context.photoLabel}`;
      }
      if (context.analysisResult) {
        systemPrompt += `\n- **Analysis result**: ${JSON.stringify(context.analysisResult, null, 2)}`;
      }
      systemPrompt += `\n\nYou already know which photo this is — do NOT ask the admin to identify the photo type. Use the get_active_prompt tool with photo_type "${context.photoType}" when you need the current prompt.`;
    } else if (context?.submissionId) {
      systemPrompt += `\n\n## Current Context\nThe admin is viewing submission ID: ${context.submissionId}.`;
    }
    if (context?.photoAnalyses) {
      systemPrompt += `\n\nAnalysis results for this submission:\n${JSON.stringify(context.photoAnalyses, null, 2)}`;
    }

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // Agentic loop — handle tool calls
    let currentMessages = anthropicMessages;
    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      });

      // Extract text and tool use blocks
      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolBlocks = response.content.filter((b) => b.type === "tool_use");

      // Accumulate text
      for (const block of textBlocks) {
        if (block.type === "text") finalText += block.text;
      }

      // If no tool calls, we're done
      if (toolBlocks.length === 0 || response.stop_reason === "end_turn") {
        break;
      }

      // Execute tool calls and continue
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add assistant response + tool results to conversation
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ];
    }

    return new Response(JSON.stringify({ response: finalText }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Prompt advisor error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
