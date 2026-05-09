# CellAg

Open research workspace for **cellular agriculture × AI** — tools, notes, agents, and code that explore how AI/ML and modern foundation models can address the field's core bottlenecks: media cost, bioprocess scale, scaffold design, sensory prediction.

The flagship artifact in this repo is a **runnable interactive agent** built on the Claude Agent SDK, hooked up to KEGG, Ensembl, EuropePMC, arXiv, and a curated cell-ag-AI bibliography. It drives the design of minimum-viable cell-culture media for *Project Sardine*, our first concrete project.

## Quick start (run the agent locally)

You'll need [Bun](https://bun.sh) and an [Anthropic API key](https://console.anthropic.com).

```bash
git clone https://github.com/harragi/CellAg.git
cd CellAg/InsilicoMediaDesign/ProjectSardine/agent

# install
(cd server && bun install)
(cd web && bun install)

# configure
cp .env.example .env   # then fill in ANTHROPIC_API_KEY

# run (two terminals — or background the server)
(cd server && bun run dev) &     # → :3001
(cd web && bun run dev)          # → :5173

open http://localhost:5173
```

In the UI, click one of the suggested prompts (e.g. *"Build a Media Zero formulation for rainbow trout muscle cells"*). The agent will pull metabolic pathways from KEGG, check receptor expression in Ensembl, search EuropePMC and arXiv for evidence, grep the local caail bibliography, then propose a section edit to `notes.md` that you can review and apply with one click.

## Repo structure

```
CellAg/
├── CLAUDE.md                       project conventions for Claude Code
├── README.md                       this file
├── .claude/skills/                 Claude Code skills (project-scoped)
│   ├── project-sardine/            Sardine top-level router
│   ├── sardine-start-with/         Media Zero (composition) driver
│   ├── sardine-thrive/             Media Thrive (measurement) driver
│   ├── project-hamster/            Hamster top-level router
│   ├── hamster-validate/           CHO validation loop driver
│   └── hamster-metabolic-model/    iCHO genome-scale model drill-down
├── InsilicoMediaDesign/            category: media composition
│   └── ProjectSardine/
│       ├── notes.md                canonical project state
│       ├── notes-*.png             whiteboard captures
│       ├── README.md               project overview
│       └── agent/                  runnable multi-project agent app
│           ├── server/             Bun + TypeScript + Claude Agent SDK
│           │   └── src/tools/      10 custom tools
│           └── web/                React + Vite + react-markdown
│               └── src/components/ chat, steps rail, propose-edit UI
└── MediaValidation/                category: media validation
    └── ProjectHamster/             CHO validation effort
        ├── notes.md                canonical state
        └── README.md
```

## One agent, two halves of the loop

The agent is **unified** — it operates end-to-end across composition and validation, with no project switching. It loads both notes files and both driver skills as context every turn. When it proposes an edit, it picks which `notes.md` to target.

| | **Composition (Sardine framework)** | **Validation (Hamster framework)** |
|---|---|---|
| **Question** | What's *in* a media that keeps cells alive? | Is this media *valid* against what the cell can metabolically do? |
| **Cell-type focus** | Fish (rainbow trout target) — but framework is general | CHO (Chinese hamster ovary) — model-anchored |
| **Method** | Three-category design (basal + growth factors + often-ignored) + system-knowledge axis | iCHO genome-scale models + metabolic readouts (q_Glc, q_Lac, μ, Y_Lac/Glc) |
| **Output** | A formulation | A validation report with predicted vs. measured |
| **Skills** | `sardine-start-with`, `sardine-thrive` | `hamster-validate`, `hamster-metabolic-model` |
| **State** | `InsilicoMediaDesign/ProjectSardine/notes.md` | `MediaValidation/ProjectHamster/notes.md` |

For end-to-end queries (e.g., *"design a CHO media and validate it"*), the agent uses both halves in one conversation. The agent treats notes as the source of truth — reads on every turn, proposes section edits inline. **Nothing reaches disk without a click.**

## Architecture overview

A single-page HTML diagram lives at [`architecture.html`](./architecture.html) — system architecture, layered view, color-coded tool catalog (50 tools across 12 families), request lifecycle, propose-then-apply flow, skills layer, and external services. Open it locally with `open architecture.html` or view raw on GitHub.

## CHO media bench

[`cho-bench.html`](./cho-bench.html) is a self-contained interactive bench for varying CHO media components and watching how growth, byproducts, and inhibitor pressure respond live. Sliders for glucose / glutamine / asparagine / insulin / IGF-1 / selenium / NaCl / inoculum / time, four SVG charts (VCD over time, substrates, byproducts, ±20% sensitivity bars), live verdict panel that flags lactate / NH₃ / osmolarity bottlenecks. Includes the seven-major-CHO-inhibitor reference catalog with thresholds and citations.

The model is a Monod-style ODE with multiplicative inhibition (lactate, NH₃, osmolarity) — a fast triage tool, not a substitute for an iCHO FBA run. Its job is to find which knob to spin before a wet-lab cycle.

## Sensory bench

[`sensory-bench.html`](./sensory-bench.html) is the sibling experiment for the sensory side: how cell composition, post-harvest aging, and cooking method drive perceivable taste. Eleven inputs (lipid class fractions, iron, glutamine, cell density, antioxidant capacity, aging time, storage, cooking method) feed three coupled chains — Maillard chemistry, lipid oxidation, and umami precursor pools (Yamaguchi 1972 synergy: u(MSG, IMP) ≈ MSG + 1218·MSG·IMP). Outputs: an 8-axis radar (umami, savory, fatty, beefy, fishy, green, metallic, oxidized), a live umami-vs-aging-time curve showing the IMP peak, a predicted-volatile-compound bar chart with eight key compounds (hexanal, nonanal, 2,4-decadienal, 1-octen-3-ol, 2-methylbutanal, furfural, 2,5-dimethylpyrazine, trans-2-nonenal), and a verdict panel that flags off-flavor risks. Five presets: Beef / Salmon / Chicken / Lean / Over-aged.

References: caail Sensory Prediction section (Lee 2023 POM, Du 2025, Sun 2023/2026, Shen 2024), Mottram 1998, Yamaguchi 1972, plus Fu 2026 on oleic-acid-driven adipogenesis (PubMed via ToolUniverse).

## How the agent works

```
Browser (React + Vite, port 5173)
   │   POST /api/chat   { message }
   │   ◄ SSE stream of SDK message events
   ▼
Bun + TypeScript server (port 3001)
   │   uses @anthropic-ai/claude-agent-sdk
   │   query() loop with 10 custom tools (in-process MCP server)
   │   system prompt = both SKILL.md files + both notes.md files (always)
   ▼
Custom tools
   ├─ read_notes / propose_notes_edit  (target_file: sardine | hamster)
   ├─ query_kegg                       (rest.kegg.jp)            metabolism
   ├─ query_ensembl                    (rest.ensembl.org)        signaling
   ├─ search_europepmc                 (ebi.ac.uk/europepmc)     literature
   ├─ arxiv_search                     (export.arxiv.org)        preprints
   ├─ search_caail                     (local clone)             cell-ag bibliography
   ├─ query_bigg                       (bigg.ucsd.edu/api/v2)    iCHO genome-scale models
   ├─ query_chebi                      (ebi.ac.uk/ols)           compound IDs
   └─ compute_metabolic_yields         (pure calculator)          q_X, Y_Lac/Glc, μ, t_d
```

The system prompt for each turn loads the active project's driver SKILL.md verbatim and inlines its current `notes.md`, so the agent always sees current state without an extra tool round-trip. Switching projects in the UI swaps skills, notes, and conversation history independently.

## References

The agent is grounded in the cell-ag-AI literature. The most directly relevant reviews:

- Todhunter et al. 2024, *AI and ML applications for cultured meat*. [arXiv:2407.09982](https://arxiv.org/abs/2407.09982)
- Datta et al. 2025, *Artificial Intelligence for Food Innovation*. [arXiv:2509.21556](https://arxiv.org/abs/2509.21556) — co-authored by David Kaplan (TUCCA) and Dan Jurafsky.
- TUCCA caail bibliography — [github.com/tucca-cellag/caail](https://github.com/tucca-cellag/caail) (37 papers, problem × technique matrix).
- TUCCA RNA-Seq pipeline — [github.com/tucca-cellag/tucca-rna-seq](https://github.com/tucca-cellag/tucca-rna-seq) (the production pipeline that backs the Thrive transcriptome axis).

The `search_caail` tool depends on a local clone of the caail bibliography for fast lookups. If the clone isn't present at `~/Code/tucca/caail`, the tool returns a polite "clone first" hint rather than failing.

## Optional: ToolUniverse for ad-hoc database access

[ToolUniverse](https://github.com/mims-harvard/ToolUniverse) (Harvard MIMS) wraps 2,000+ scientific databases (PubMed, UniProt, ChEMBL, FAERS, ClinicalTrials.gov, ENCODE, CELLxGENE, Reactome, OpenTargets, RCSB PDB, etc.) behind a unified CLI and MCP interface. This repo includes a project-scoped `.mcp.json` so Claude Code automatically picks ToolUniverse up when working in this workspace.

To install:

```bash
# uv must be installed (https://docs.astral.sh/uv/)
uv tool install tooluniverse
tu status   # should show ~2200+ tools loaded

# usage examples
tu find 'cell culture media'                                  # search
tu info PubMed_search_articles                                # tool details
tu run PubMed_search_articles '{"query": "iCHO model"}'       # run a tool
```

The `.mcp.json` exposes ToolUniverse to Claude Code as an MCP server — when you open a Claude Code session at this workspace, you'll see ToolUniverse's tools available directly. For Claude Desktop or Cursor, mirror the config to their respective config files (see `tu-skills/skills/setup-tooluniverse/SKILL.md`).

To unlock premium tools, set API keys in your shell:

```bash
export NCBI_API_KEY="…"     # https://account.ncbi.nlm.nih.gov/settings/
export FDA_API_KEY="…"      # https://open.fda.gov/apis/authentication/
```

This is **not required** for the core CellAg agent app under `agent/` — that uses its own custom tools (KEGG, Ensembl, BiGG, etc.). ToolUniverse is a separate, complementary capability for broader scientific lookups.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

Inspired by the work of the [Tufts University Center for Cellular Agriculture (TUCCA)](https://sites.tufts.edu/tucca/), David Kaplan's lab, and the broader cell-ag research community. Built with the [Claude Agent SDK](https://docs.claude.com/en/docs/agents-and-tools/agent-sdk).
