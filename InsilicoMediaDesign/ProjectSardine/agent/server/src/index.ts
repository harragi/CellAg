import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { runAgentTurn } from "./agent.ts";
import { NOTES_PATH, PROJECT_DIR } from "./paths.ts";
import { state } from "./state.ts";

const PORT = Number(process.env.PORT ?? 3001);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

// Eager-fail if the API key is missing. Better than confusing 4xx later.
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[fatal] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in, then restart."
  );
  process.exit(1);
}

// Eager-fail if notes.md doesn't exist where we expect it.
if (!existsSync(NOTES_PATH)) {
  console.error(`[fatal] notes.md not found at ${NOTES_PATH}.`);
  process.exit(1);
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const server = Bun.serve({
  port: PORT,
  // Default is 10s — too short for agent turns. 255 is Bun's max; we also
  // send SSE keepalive comments below to keep the connection live.
  idleTimeout: 255,
  async fetch(req) {
    if (req.method === "OPTIONS") return preflight();
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return json({ ok: true, model: process.env.AGENT_MODEL ?? "claude-opus-4-7" });
    }

    if (url.pathname === "/api/notes" && req.method === "GET") {
      const text = await readFile(NOTES_PATH, "utf-8");
      const proposed = [...state.proposedEdits.values()];
      return json({ notes: text, proposed });
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      state.history = [];
      state.proposedEdits.clear();
      return json({ ok: true });
    }

    if (url.pathname === "/api/notes/apply" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      const edit = body.editId ? state.proposedEdits.get(body.editId) : undefined;
      if (!edit) return json({ ok: false, reason: "edit not found" }, { status: 404 });
      // For MVP: append the new content to notes.md as a date-stamped block, since
      // we don't yet have a robust section-replacement editor. The agent's
      // `section` field is included so the user can see the intended target.
      const timestamp = new Date().toISOString().slice(0, 10);
      const stampedBlock = [
        "",
        `<!-- agent-applied ${edit.id} ${timestamp} target=${JSON.stringify(edit.section)} -->`,
        `### [${timestamp}] Applied edit — ${edit.section}`,
        "",
        `_Rationale: ${edit.rationale}_`,
        "",
        edit.newContent,
        "",
      ].join("\n");
      const current = await readFile(NOTES_PATH, "utf-8");
      await writeFile(NOTES_PATH, current.trimEnd() + "\n" + stampedBlock + "\n", "utf-8");
      state.proposedEdits.delete(edit.id);
      return json({ ok: true });
    }

    if (url.pathname === "/api/notes/reject" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      if (body.editId) state.proposedEdits.delete(body.editId);
      // Inject a system note into history so the agent sees the rejection on the next turn.
      state.history.push({
        role: "user",
        content: `(System note: the user rejected proposed edit ${body.editId ?? "(unknown)"}. Do not retry the same change.)`,
      });
      return json({ ok: true });
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { message?: string };
      const message = (body.message ?? "").trim();
      if (!message) return json({ ok: false, reason: "empty message" }, { status: 400 });
      return runChatSse(message);
    }

    return json({ ok: false, reason: "not found", path: url.pathname }, { status: 404 });
  },
  error(err) {
    console.error("[server error]", err);
    return json({ ok: false, reason: err.message }, { status: 500 });
  },
});

console.log(
  `[sardine-start-with] listening on http://localhost:${server.port}\n` +
    `  notes.md → ${NOTES_PATH}\n` +
    `  project  → ${PROJECT_DIR}`
);

function runChatSse(userMessage: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // client disconnected
        }
      };
      // Keepalive comment every 15s. Prevents Bun.serve idleTimeout from
      // killing the connection during long tool calls or model latency.
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);
      try {
        await runAgentTurn(userMessage, push);
      } catch (err) {
        push("error", { reason: err instanceof Error ? err.message : String(err) });
      } finally {
        clearInterval(keepalive);
        push("done", {});
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  });
}

// Hint to suppress the unused-import lint on dirname/resolve until we use them.
void dirname;
void resolve;
