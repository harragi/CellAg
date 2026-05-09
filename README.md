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
│   ├── project-sardine/            top-level router
│   ├── sardine-start-with/         Media Zero (composition) driver
│   └── sardine-thrive/             Media Thrive (measurement) driver
└── InsilicoMediaDesign/
    └── ProjectSardine/             our first project
        ├── notes.md                canonical project state
        ├── notes-*.png             whiteboard captures
        ├── README.md               project overview
        └── agent/                  runnable agent app
            ├── server/             Bun + TypeScript + Claude Agent SDK
            │   └── src/tools/      7 custom tools (KEGG, Ensembl, EuropePMC, arXiv, caail, notes r/w)
            └── web/                React + Vite + react-markdown
                └── src/components/ chat, steps rail, color-coded tool cards, propose-edit UI
```

## What's Project Sardine

Project Sardine is the first concrete project under `InsilicoMediaDesign`. The whiteboard split it into two halves:

- **Media Zero (Start With)** — design a minimum-viable cell-culture media that enables cell *survival*. Composition / formulation work.
- **Media Thrive (Thrive)** — design the metric stack that grades whether cells in a candidate media are *thriving*, not just alive. Measurement / evaluation work.

Each half has its own [Claude Code skill](https://docs.claude.com/en/docs/claude-code/skills) under `.claude/skills/` and (currently for Start With only) its own runnable agent app under `agent/`.

The agent treats `notes.md` as canonical project state. It reads the file on every turn, queries scientific databases via custom tools, and proposes section edits inline. **Nothing reaches disk without a click.**

## How the agent works

```
Browser (React + Vite, port 5173)
   │   POST /api/chat   { message }
   │   ◄ SSE stream of SDK message events
   ▼
Bun + TypeScript server (port 3001)
   │   uses @anthropic-ai/claude-agent-sdk
   │   query() loop with 7 custom tools (in-process MCP server)
   ▼
Custom tools
   ├─ read_notes / propose_notes_edit  (filesystem: notes.md, propose-only)
   ├─ query_kegg                       (rest.kegg.jp)
   ├─ query_ensembl                    (rest.ensembl.org)
   ├─ search_europepmc                 (ebi.ac.uk/europepmc)
   ├─ arxiv_search                     (export.arxiv.org)
   └─ search_caail                     (local grep over cloned tucca-cellag/caail)
```

The system prompt loads the `sardine-start-with` skill verbatim and inlines the current `notes.md` so the agent always sees current state without an extra tool round-trip.

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
