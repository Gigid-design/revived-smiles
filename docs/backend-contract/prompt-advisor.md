# Prompt advisor

Source of everything below: `src/app/api/agent/prompt-advisor/route.ts` (being
deleted).

The prompt advisor is a conversational agent inside the admin portal. A
non-technical administrator describes a photo the analyser got wrong, and the
advisor inspects the live prompt config, explains the failure, proposes new
requirement wording, and — on explicit confirmation — writes a new prompt
version.

Contract method:

```ts
advise(messages: AdvisorMessage[], context?: AdvisorContext): Promise<string>
```

(`src/lib/api/contract.ts`, `PromptsApi`). It returns a single assistant
markdown string. `AdvisorMessage` and `AdvisorContext` are declared in
`src/lib/api/types.ts`.

---

## 1. Model and loop settings

- **Model:** `claude-sonnet-4-6`
- **max_tokens:** `2048`
- **Agentic loop iteration cap:** `MAX_ITERATIONS = 5`
- **Route duration budget:** `export const maxDuration = 60`

The loop, verbatim (lines 362–412):

```ts
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
```

Two behaviours worth noting before you reimplement:

- Text from **every** iteration is concatenated into `finalText`, so any
  preamble the model emits alongside a tool call ends up in the returned string.
- The loop breaks on `stop_reason === "end_turn"` **or** on an iteration with no
  tool blocks. Hitting the cap silently returns whatever text accumulated.
- Every tool executor returns a JSON **string**; errors are returned as
  `{"error": "..."}` payloads inside a successful tool result rather than
  thrown, so the model can narrate the failure into a `:::warning` block.

---

## 2. System prompt — VERBATIM

Verbatim from `src/app/api/agent/prompt-advisor/route.ts` (lines 240–319). This
is a TypeScript template literal; the `\`` sequences are escaped backticks in
the source and reach the model as plain backticks.

```ts
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
```

### Context appended to the system prompt

The route appended a `## Current Context` section built from the request's
`context` object. Verbatim (lines 334–352):

```ts
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
```

Note a naming mismatch to resolve when reimplementing: this code reads
`context.analysisResult` and `context.photoAnalyses`, but `AdvisorContext` in
`src/lib/api/types.ts` declares `analysis`, `photoType`, `photoLabel`,
`photoUrl` and `submissionId`. Map `AdvisorContext.analysis` onto the
`**Analysis result**` line. `photoUrl` has no consumer in the old route; it is
available if a future implementation wants to send the image itself.

---

## 3. Tool definitions — VERBATIM

Verbatim from `src/app/api/agent/prompt-advisor/route.ts` (lines 19–113). Four
tools, exact names, descriptions and input schemas.

```ts
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
```

### What each tool did

| Tool | Behaviour in the prototype |
| --- | --- |
| `get_active_prompt` | `SELECT *` from `prompt_configs` where `photo_type` matches and `is_active` is true, single row. On miss, returns `{"error": "No active prompt found for this photo type. The prompt_configs table may not be seeded yet."}`. |
| `get_prompt_history` | Selects `version, label, change_notes, created_by, created_at, is_active` for that `photo_type`, ordered by `version` descending, **limit 10**. Returns `{"versions": [...]}`. |
| `get_recent_analyses` | Reads `photo_analyses` from the newest `limit` submissions (default 20) where `photo_analyses` is not null, then aggregates in application code: `total_analyzed`, `passed`, `failed`, `pass_rate` (rounded percent string), and a `check_breakdown` array of `{check_id, pass, fail, fail_rate}`. |
| `apply_prompt_change` | **Write path.** Sets `is_active = false` on every row for that `photo_type`, reads the max `version`, then inserts a new row with `version = max + 1`, `is_active = true`, and `created_by: "AI Advisor"`. Returns `{success, message, config}`. |

Note that `apply_prompt_change` has **no `quality_checks` parameter** — the
advisor could only ever change content checks, labels and pose descriptions.
Given the fix required in `photo-analysis.md` §7 (quality checks must actually
be used), consider adding an optional `quality_checks` parameter with the same
item schema as `content_checks`. That is a deliberate extension, not something
the prototype did.

---

## 4. The `:::` block protocol is a hard contract with the admin UI

The advisor's output is not free-form markdown. The admin drawer parses these
fenced blocks and renders them as cards:

**File:** `src/app/admin/components/ReviewCriteriaDrawer.tsx`

The parser (around lines 106–160) matches an opening marker with:

```ts
const blockMatch = line.match(/^(.*?):::(current|proposed|success|warning)\s*$/);
```

and consumes lines until:

```ts
/^\s*:::(?:current|proposed|success|warning)?\s*$/
```

Each variant maps to a card:

| Marker | Card heading | Style class |
| --- | --- | --- |
| `:::current` | `📋 Current Requirement` | `promptBlockCurrent` |
| `:::proposed` | `✨ Proposed Change` | `promptBlockProposed` |
| `:::success` | `✅ Change Applied` | `promptBlockSuccess` |
| `:::warning` | `⚠️ Warning` | `promptBlockWarning` |

**Changing these four names, or the `:::` delimiter, breaks that renderer.**
The content between markers is not treated as general markdown — only
`[text](url)` links are rendered inside a block. Bold, inline code and
blockquotes are not, which is why the system prompt forbids them there.

The `:::proposed` card is the confirmation UI. It carries an "Apply This Change"
button; clicking it sends a new user turn back into the advisor:

```tsx
sendMessage(`Yes, apply this change:\n\n${proposedText}`)
```

That is the entire confirmation mechanism. There is no separate confirm
endpoint. See §5 for why that is not sufficient on its own.

The parser was deliberately made tolerant of a marker glued to preceding text on
the same line (`Here is the result.:::success`) — the leading capture group in
the regex renders that text and still opens the block. That tolerance exists
because the model occasionally violated the rule; the system prompt's
"CRITICAL formatting rules" section is the primary defence and must be kept.

---

## 5. REQUIRED: authorise and confirm the write path server-side

`apply_prompt_change` mutates live production configuration: it changes which
prompt every subsequent patient photo is graded against.

In the prototype it was reachable by an **unauthenticated** `POST` to
`/api/agent/prompt-advisor`. The route had no auth check of any kind, and the
Supabase client it used was constructed with `SUPABASE_SERVICE_ROLE_KEY`. Anyone
who could reach the URL could send a crafted conversation and get the model to
call the tool. The only "confirmation" was a button in a browser the attacker
did not need to use.

Requirements for the real backend:

1. **Authenticate.** `PromptsApi.advise` must reject any caller without a valid
   session. Match `AuthApi.signInAdmin` / `getAdminUser` in
   `src/lib/api/contract.ts`, which specify that staff status is decided
   server-side.
2. **Authorise.** The session must belong to a staff account verified against
   the database — not against a client-supplied role string, and not against a
   hardcoded email list. See `security-requirements.md` §4.
3. **Confirm server-side.** The model deciding it has seen a confirmation is not
   a confirmation. `apply_prompt_change` must require a server-issued token or
   equivalent that is only minted when the admin performs the confirming action,
   and that names the exact change being applied. A conversation transcript that
   merely *contains* the words "yes, apply this change" must not be sufficient.
4. **Attribute correctly.** The prototype wrote `created_by: "AI Advisor"`,
   losing which human approved the change. Record the authenticated admin's id
   alongside the fact that the advisor drafted it.
5. **Write atomically.** The deactivate-then-insert pair was two separate
   non-transactional statements. See `security-requirements.md` §8.
6. **Rate-limit.** Each `advise` call can issue up to five model requests plus
   database reads. Unauthenticated access made this a cost amplifier as well as
   a correctness problem.
