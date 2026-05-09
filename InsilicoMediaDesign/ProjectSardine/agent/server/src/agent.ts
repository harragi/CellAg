import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildSystemPrompt } from "./system-prompt.ts";
import { buildScienceMcpServer, SCIENCE_TOOL_GLOB, type NotifyClient } from "./tools/index.ts";
import { appendTurn } from "./state.ts";
import { TU_ALLOWED_TOOLS } from "./tu-allowlist.ts";

const MODEL = process.env.AGENT_MODEL ?? "claude-opus-4-7";

// ToolUniverse MCP stdio entry point. Installed by `uv tool install
// tooluniverse`; binary lives in the user's PATH (typically ~/.local/bin).
const TU_BIN = process.env.TU_BIN ?? "tooluniverse-smcp-stdio";

export type SsePush = (event: string, data: unknown) => void;

/**
 * Run one turn of the unified agent. Pushes SDK message events to the SSE
 * stream as they arrive; appends assistant text to history.
 */
export async function runAgentTurn(userMessage: string, push: SsePush): Promise<void> {
  appendTurn({ role: "user", content: userMessage });

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
        mcpServers: {
          science,
          tooluniverse: {
            command: TU_BIN,
            args: [],
            env: { PYTHONIOENCODING: "utf-8" },
          },
        },
        allowedTools: [SCIENCE_TOOL_GLOB, ...TU_ALLOWED_TOOLS],
        permissionMode: "bypassPermissions",
        maxTurns: 24,
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
    appendTurn({ role: "assistant", content: assistantText });
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
