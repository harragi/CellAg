import { readFile } from "node:fs/promises";
import { NOTES_PATH, SKILL_PATH } from "./paths.ts";
import { state } from "./state.ts";

const TOOL_PREAMBLE = `
# Available tools

You can call these custom tools. They are exposed under the \`mcp__science__\` namespace:

- **read_notes** — Re-read the canonical notes.md if you suspect the inlined copy is stale (e.g., after a propose_notes_edit was applied).
- **propose_notes_edit** — Stage a section edit for user review. The user sees a diff in the UI and clicks Apply or Reject. Never assume an edit was applied — wait for the next user message to confirm. Always include a clear \`rationale\`.
- **query_kegg** — KEGG REST API for metabolic pathways. Use for the metabolism axis of system knowledge.
- **query_ensembl** — Ensembl REST for genome / gene / transcript lookups. Use for the signaling axis of system knowledge (which receptors does the target species express?).
- **search_europepmc** — Literature search across PubMed/PMC/preprints. Use for evidence beyond what the agent already cites.
- **arxiv_search** — arXiv API. Use for recent / preprint work.
- **search_caail** — Local grep over the caail bibliography. Use first when looking for canonical references in the cell-ag-AI literature.

# Conversation history

The user's previous messages (and your responses) for this session are appended below the current notes.md.
`.trim();

/**
 * Build the system prompt for a fresh query() call.
 *
 * Strategy: load SKILL.md + current notes.md verbatim each call so the agent
 * always sees current state without needing a tool round-trip.
 */
export async function buildSystemPrompt(): Promise<string> {
  const [skill, notes] = await Promise.all([
    readFile(SKILL_PATH, "utf-8"),
    readFile(NOTES_PATH, "utf-8"),
  ]);

  const historyBlock = state.history
    .map(
      (turn) =>
        `### ${turn.role === "user" ? "USER" : "ASSISTANT"}\n${turn.content}`
    )
    .join("\n\n");

  return [
    "# Skill (your operating manual)",
    skill,
    "",
    "---",
    "",
    "# Current notes.md (canonical project state)",
    notes,
    "",
    "---",
    "",
    TOOL_PREAMBLE,
    "",
    "---",
    "",
    "# Session history",
    historyBlock || "_(no prior turns this session)_",
  ].join("\n");
}
