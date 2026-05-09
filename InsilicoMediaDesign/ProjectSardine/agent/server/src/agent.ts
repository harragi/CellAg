import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "./system-prompt.ts";
import { buildScienceMcpServer, SCIENCE_TOOL_GLOB, type NotifyClient } from "./tools/index.ts";
import { appendTurn } from "./state.ts";
import type { ProjectKey } from "./projects.ts";

const MODEL = process.env.AGENT_MODEL ?? "claude-opus-4-7";

export type SsePush = (event: string, data: unknown) => void;

/**
 * Run one turn of the agent for a given project. Pushes SDK message events
 * to the SSE stream as they arrive; appends assistant text to per-project
 * history; resolves when the agent's turn ends.
 */
export async function runAgentTurn(
  projectKey: ProjectKey,
  userMessage: string,
  push: SsePush
): Promise<void> {
  appendTurn(projectKey, { role: "user", content: userMessage });

  const systemPrompt = await buildSystemPrompt(projectKey);

  const notify: NotifyClient = (event, data) => push(event, data);
  const science = buildScienceMcpServer(projectKey, notify);

  push("system", { kind: "turn_start", model: MODEL, project: projectKey });

  let assistantText = "";

  try {
    const iter = query({
      prompt: userMessage,
      options: {
        model: MODEL,
        systemPrompt,
        mcpServers: { science },
        allowedTools: [SCIENCE_TOOL_GLOB],
        permissionMode: "bypassPermissions",
        maxTurns: 16,
      },
    });

    for await (const message of iter) {
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
    appendTurn(projectKey, { role: "assistant", content: assistantText });
  }
  push("system", { kind: "turn_end" });
}

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
