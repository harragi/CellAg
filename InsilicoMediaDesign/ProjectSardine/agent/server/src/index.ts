import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { runAgentTurn } from "./agent.ts";
import { ALL_PROJECTS, DEFAULT_PROJECT, getProject, type ProjectKey } from "./projects.ts";
import { resetHistory, state, appendTurn } from "./state.ts";

const PORT = Number(process.env.PORT ?? 3001);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[fatal] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in, then restart."
  );
  process.exit(1);
}

for (const p of ALL_PROJECTS) {
  if (!existsSync(p.notesPath)) {
    console.error(`[fatal] notes.md not found for project '${p.key}' at ${p.notesPath}`);
    process.exit(1);
  }
  if (!existsSync(p.skillPath)) {
    console.error(`[fatal] SKILL.md not found for project '${p.key}' at ${p.skillPath}`);
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

function pickProject(input: string | null | undefined): ProjectKey {
  const p = input && getProject(input);
  return p ? p.key : DEFAULT_PROJECT;
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
        projects: ALL_PROJECTS.map((p) => p.key),
      });
    }

    if (url.pathname === "/api/projects") {
      // Public metadata for the UI — no internal paths.
      return json({
        projects: ALL_PROJECTS.map((p) => ({
          key: p.key,
          displayName: p.displayName,
          shortName: p.shortName,
          description: p.description,
          color: p.color,
          examplePrompts: p.examplePrompts,
        })),
        default: DEFAULT_PROJECT,
      });
    }

    if (url.pathname === "/api/notes" && req.method === "GET") {
      const project = pickProject(url.searchParams.get("project"));
      const p = getProject(project)!;
      const text = await readFile(p.notesPath, "utf-8");
      const proposed = [...state.proposedEdits.values()].filter((e) => e.project === project);
      return json({ project, notes: text, proposed });
    }

    if (url.pathname === "/api/reset" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { project?: string };
      const project = pickProject(body.project);
      resetHistory(project);
      // Drop any staged edits for this project.
      for (const [id, e] of state.proposedEdits) {
        if (e.project === project) state.proposedEdits.delete(id);
      }
      return json({ ok: true, project });
    }

    if (url.pathname === "/api/notes/apply" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      const edit = body.editId ? state.proposedEdits.get(body.editId) : undefined;
      if (!edit) return json({ ok: false, reason: "edit not found" }, { status: 404 });
      const project = getProject(edit.project)!;
      // MVP: append rather than section-replace. Captures the agent's intended
      // target and rationale alongside the new content for later manual merge.
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
      const current = await readFile(project.notesPath, "utf-8");
      await writeFile(project.notesPath, current.trimEnd() + "\n" + stampedBlock + "\n", "utf-8");
      state.proposedEdits.delete(edit.id);
      return json({ ok: true, project: edit.project });
    }

    if (url.pathname === "/api/notes/reject" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { editId?: string };
      const edit = body.editId ? state.proposedEdits.get(body.editId) : undefined;
      if (edit) {
        // Inject a system note into the right project's history so the agent
        // sees the rejection on its next turn.
        appendTurn(edit.project, {
          role: "user",
          content: `(System note: the user rejected proposed edit ${edit.id}. Do not retry the same change.)`,
        });
        state.proposedEdits.delete(edit.id);
      }
      return json({ ok: true });
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { message?: string; project?: string };
      const message = (body.message ?? "").trim();
      if (!message) return json({ ok: false, reason: "empty message" }, { status: 400 });
      const project = pickProject(body.project);
      return runChatSse(project, message);
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
    ALL_PROJECTS.map((p) => `  ${p.key.padEnd(8)} → ${p.notesPath}`).join("\n")
);

function runChatSse(project: ProjectKey, userMessage: string): Response {
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
        await runAgentTurn(project, userMessage, push);
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
