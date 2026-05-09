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
│               └── src/components/ chat, steps rail, project switcher, propose-edit UI
└── MediaValidation/                category: media validation (NEW)
    └── ProjectHamster/             CHO validation effort
        ├── notes.md                canonical state
        └── README.md
```

## Two projects in flight

| | **Project Sardine** | **Project Hamster** |
|---|---|---|
| **Cell type** | Fish (rainbow trout target) | CHO (Chinese hamster ovary) |
| **Question** | What's *in* a media that keeps cells alive? | Is this media *valid* against what the cell can metabolically do? |
| **Method** | Composition design + system-knowledge-driven ingredient choice | GSM (iCHO family) + metabolic readouts (q_Glc, q_Lac, μ, Y_Lac/Glc) |
| **Output** | A formulation | A validation report (predicted vs. measured, discrepancy modes) |
| **Skills** | `project-sardine`, `sardine-start-with`, `sardine-thrive` | `project-hamster`, `hamster-validate`, `hamster-metabolic-model` |
| **State** | `InsilicoMediaDesign/ProjectSardine/notes.md` | `MediaValidation/ProjectHamster/notes.md` |

Each project has its own canonical `notes.md` and its own driver skill. The agent treats notes as the source of truth — reads on every turn, proposes section edits inline. **Nothing reaches disk without a click.**

## How the agent works

```
Browser (React + Vite, port 5173)
   │   POST /api/chat   { message, project: "sardine" | "hamster" }
   │   ◄ SSE stream of SDK message events
   ▼
Bun + TypeScript server (port 3001)
   │   uses @anthropic-ai/claude-agent-sdk
   │   query() loop with 10 custom tools (in-process MCP server)
   │   project registry → per-project SKILL.md + notes.md
   ▼
Custom tools
   ├─ read_notes / propose_notes_edit  (per-project notes.md, propose-only)
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

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

Inspired by the work of the [Tufts University Center for Cellular Agriculture (TUCCA)](https://sites.tufts.edu/tucca/), David Kaplan's lab, and the broader cell-ag research community. Built with the [Claude Agent SDK](https://docs.claude.com/en/docs/agents-and-tools/agent-sdk).
