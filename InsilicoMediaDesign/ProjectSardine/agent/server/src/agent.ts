import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "./system-prompt.ts";
import { buildScienceMcpServer, SCIENCE_TOOL_GLOB, type NotifyClient } from "./tools/index.ts";
import { state } from "./state.ts";

const MODEL = process.env.AGENT_MODEL ?? "claude-opus-4-7";

export type SsePush = (event: string, data: unknown) => void;

/**
 * Run one turn of the agent: take a user message, push events to the SSE
 * stream as the SDK emits them, append assistant text to history, and resolve
 * when the agent's turn ends.
 */
export async function runAgentTurn(userMessage: string, push: SsePush): Promise<void> {
  state.history.push({ role: "user", content: userMessage });

  const systemPrompt = await buildSystemPrompt();

  const notify: NotifyClient = (event, data) => push(event, data);
  const science = buildScienceMcpServer(notify);

  push("system", { kind: "turn_start", model: MODEL });

  let assistantText = "";

  try {
    const iter = query({
      prompt: userMessage,
      options: {
        model: MODEL,
        systemPrompt,
        mcpServers: { science },
        allowedTools: [SCIENCE_TOOL_GLOB],
        // permissionMode: "bypassPermissions" lets the tools we registered
        // run without an interactive approval prompt — appropriate for a
        // local single-user agent. If we ever multi-user, revisit.
        permissionMode: "bypassPermissions",
        maxTurns: 12,
      },
    });

    for await (const message of iter) {
      // Forward every SDK message verbatim to the client. The UI decides
      // what to render. We extract assistant text for history persistence.
      push("message", message);
      const text = extractAssistantText(message);
      if (text) assistantText += text;
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    push("error", { reason });
    return;
  }

  if (assistantText) {
    state.history.push({ role: "assistant", content: assistantText });
  }
  push("system", { kind: "turn_end" });
}

/**
 * Extract text content from an assistant SDK message.
 * The Agent SDK message shape is loosely typed across versions, so we walk
 * defensively rather than asserting.
 */
function extractAssistantText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  if (m.type !== "assistant") return null;
  const inner = (m.message as Record<string, unknown> | undefined) ?? m;
  const content = (inner.content as unknown[] | undefined) ?? [];
  let text = "";
  for (const block of content) {
    if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") text += b.text;
    }
  }
  return text || null;
}
