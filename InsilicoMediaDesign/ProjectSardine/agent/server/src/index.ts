import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { runAgentTurn } from "./agent.ts";
import { CONFIG, type NotesTarget } from "./projects.ts";
import { resetHistory, state, appendTurn } from "./state.ts";

const PORT = Number(process.env.PORT ?? 3001);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[fatal] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in, then restart."
  );
  process.exit(1);
}

for (const [target, path] of Object.entries(CONFIG.notesPaths)) {
  if (!existsSync(path)) {
    console.error(`[fatal] notes.md not found for target '${target}' at ${path}`);
    process.exit(1);
  }
}
for (const [target, path] of Object.entries(CONFIG.skillPaths)) {
  if (!existsSync(path)) {
    console.error(`[fatal] SKILL.md not found for ${target} at ${path}`);
    process.exit(1);
  }
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

function pickTarget(input: string | null | undefined): NotesTarget {
  return input === "hamster" ? "hamster" : "sardine";
}

const server = Bun.serve({
  port: PORT,
  // Default 10s is too short for agent turns. 255 is Bun's max; SSE keepalive
  // pings below also keep the connection alive during long tool calls.
  idleTimeout: 255,
  async fetch(req) {
    if (req.method === "OPTIONS") return preflight();
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        model: process.env.AGENT_MODEL ?? "claude-opus-4-7",
      });
    }

    if (url.pathname === "/api/config") {
      return json({
        displayName: CONFIG.displayName,
        shortName: CONFIG.shortName,
        description: CONFIG.description,
        examplePrompts: CONFIG.examplePrompts,
      });
    }

    if (url.pathname === "/api/notes" && req.method === "GET") {
      // Optional ?target=sardine|hamster — default returns both.
      const target = url.searchParams.get("target");
      if (target) {
        const t = pickTarget(target);
        const text = await readFile(CONFIG.notesPaths[t], "utf-8");
        const proposed = [...state.proposedEdits.values()].filter((e) => e.target === t);
        return json({ target: t, notes: text, proposed });
      }
      const sardineText = await readFile(CONFIG.notesPaths.sardine, "utf-8");
      const hamsterText = await readFile(CONFIG.notesPaths.hamster, "utf-8");
      return json({
        notes: { sardine: sardineText, hamster: hamsterText },
        proposed: [...state.proposedEdits.values()],
      });
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      resetHistory();
      state.proposedEdits.clear();
      return json({ ok: true });
    }

    if (url.pathname === "/api/notes/apply" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      const edit = body.editId ? state.proposedEdits.get(body.editId) : undefined;
      if (!edit) return json({ ok: false, reason: "edit not found" }, { status: 404 });
      const path = CONFIG.notesPaths[edit.target];
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
      const current = await readFile(path, "utf-8");
      await writeFile(path, current.trimEnd() + "\n" + stampedBlock + "\n", "utf-8");
      state.proposedEdits.delete(edit.id);
      return json({ ok: true, target: edit.target });
    }

    if (url.pathname === "/api/notes/reject" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      const edit = body.editId ? state.proposedEdits.get(body.editId) : undefined;
      if (edit) {
        appendTurn({
          role: "user",
          content: `(System note: the user rejected proposed edit ${edit.id} on target_file '${edit.target}'. Do not retry the same change.)`,
        });
        state.proposedEdits.delete(edit.id);
      }
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
  `[cellag-agent] listening on http://localhost:${server.port}\n` +
    Object.entries(CONFIG.notesPaths)
      .map(([k, p]) => `  notes.${k.padEnd(7)} → ${p}`)
      .join("\n")
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
