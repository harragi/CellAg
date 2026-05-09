import { readFile } from "node:fs/promises";
import { PROJECTS, type ProjectKey } from "./projects.ts";
import { getHistory } from "./state.ts";

const TOOL_PREAMBLE = `
# Available tools

You can call these custom tools. They are exposed under the \`mcp__science__\` namespace:

**Cross-project (always available):**
- **read_notes** — Re-read the canonical notes.md if you suspect the inlined copy is stale.
- **propose_notes_edit** — Stage a section edit for user review. Diff appears inline; user clicks apply or reject. Wait for the next user message before assuming an edit was applied. Always include a clear \`rationale\`.
- **query_kegg** — KEGG REST API for metabolic pathways. CHO organism code: \`cge\`. Many fish species also covered.
- **query_ensembl** — Ensembl REST for genome / gene / receptor lookups. CHO species: \`cricetulus_griseus_chok1gshd\`.
- **search_europepmc** — Literature search across PubMed/PMC/preprints.
- **arxiv_search** — arXiv API for preprints.
- **search_caail** — Local grep over the caail bibliography. Strongest coverage of cell-ag-AI work; weak on CHO bioprocess.

**Metabolic-modeling (most useful for Hamster, but available everywhere):**
- **query_bigg** — BiGG Models REST API. Use for genome-scale models (iCHO family for CHO). Endpoints under \`https://bigg.ucsd.edu/api/v2\`.
- **query_chebi** — ChEBI compound lookup via EBI OLS. Use to map media ingredient names to canonical metabolite IDs.
- **compute_metabolic_yields** — Pure calculator. Given two time-course measurements (VCD, glucose, lactate, glutamine, ammonia, mAb), returns μ, doubling time, q_X for each measured species, and yield ratios (Y_Lac/Glc, Y_NH₃/Gln). Y_Lac/Glc is the headline diagnostic for CHO metabolic state.
`.trim();

/**
 * Build the system prompt for a query() call. Strategy: load SKILL.md and
 * notes.md verbatim each call so the agent always sees current state.
 */
export async function buildSystemPrompt(projectKey: ProjectKey): Promise<string> {
  const project = PROJECTS[projectKey];
  const [skill, notes] = await Promise.all([
    readFile(project.skillPath, "utf-8"),
    readFile(project.notesPath, "utf-8"),
  ]);

  const historyBlock = getHistory(projectKey)
    .map((turn) => `### ${turn.role === "user" ? "USER" : "ASSISTANT"}\n${turn.content}`)
    .join("\n\n");

  return [
    `# Project context`,
    `You are operating as the agent for **${project.displayName}**.`,
    project.description,
    "",
    "---",
    "",
    "# Skill (your operating manual)",
    skill,
    "",
    "---",
    "",
    `# Current notes.md (canonical project state for ${project.shortName})`,
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
