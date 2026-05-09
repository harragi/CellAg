# CellAg — Project Guidance

This file provides project-specific guidance for Claude when working anywhere under `/Users/harrissyed/Code/CellAg/`.

## Independence statement

**CellAg is independent of Prepasaur.** Do not import or mirror Prepasaur conventions, code, env structure, database connections, route patterns, or stack choices. The parent `CLAUDE.md` files at `/Users/harrissyed/Code/CLAUDE.md` and `/Users/harrissyed/CLAUDE.md` describe other workspaces — when working on CellAg, treat their project-specific guidance as out of scope.

What still applies from parent files: general engineering principles, communication style, memory protocol, and tone. What does NOT apply: Prepasaur-specific paths, env vars, services, stack choices, ETL pipelines, taxonomy systems.

## What CellAg is

A research workspace for **cellular agriculture** — tools, notes, agents, and code that explore how AI/ML and modern foundation models can address the field's core bottlenecks (media cost, bioprocess scale, scaffold design, sensory prediction).

This is a research workspace, not a product codebase. The bias is toward fast iteration, readable artifacts, and skill-driven workflows over polished tooling.

## Project structure

```
CellAg/
├── CLAUDE.md                       ← this file
├── README.md                       ← workspace overview
├── .claude/skills/                 ← Claude Code skills (project-scoped)
│   ├── project-sardine/            ← Sardine top-level router
│   ├── sardine-start-with/         ← Media Zero (composition) driver
│   └── sardine-thrive/             ← Media Thrive (measurement) driver
└── InsilicoMediaDesign/            ← project: in-silico media design
    └── ProjectSardine/
        ├── notes.md                ← canonical project state
        ├── notes-*.png             ← whiteboard captures
        └── agent/                  ← runnable Claude Agent SDK app (Sardine Start-With)
            ├── server/             ← Bun + TypeScript
            └── web/                ← React + Vite
```

Future projects under CellAg should follow the same shape: a project directory under a parent category (e.g., `InsilicoMediaDesign/`), a canonical `notes.md`, and project-scoped skills under `.claude/skills/`.

## Conventions

### Source of truth: notes.md

For each project under CellAg, a single `notes.md` is canonical state. Skills, agents, and humans all read it on every interaction; decisions land back in it. Do not split state across multiple files unless a project's complexity genuinely requires it.

### Markdown-first

Working notes, project plans, transcribed whiteboards, and decision logs live as markdown alongside the code they describe. We use whiteboard photos as source artifacts and transcribe them rather than paraphrase.

### Skills drive workflows

Each project has one or more Claude Code skills under `.claude/skills/<skill-name>/SKILL.md`. Skills define the agent's interaction modes for that project. The skill is the brief; `notes.md` is the state.

### Stack defaults

When CellAg work needs code, default to:
- **TypeScript on Bun** for backend / agent / API work
- **React + Vite + TypeScript** for any UI
- **Node ecosystem only when Bun isn't viable**
- **No Hono, Clerk, Supabase, or Postgres** unless a specific project requires them — those are Prepasaur-shaped choices, not defaults here.

For Python work (rare here, but possible for bioinformatics), use a `.venv/` per project, not a global env.

### Environment variables

Each project owns its own `.env.example` and `.env`. Do not share env vars across projects. The most common one is `ANTHROPIC_API_KEY`.

### Tooling we lean on

- **Anthropic SDKs** — `@anthropic-ai/sdk` for raw API access; `@anthropic-ai/claude-agent-sdk` for agentic workflows
- **Scientific REST APIs** — KEGG (rest.kegg.jp), Ensembl (rest.ensembl.org), EuropePMC (ebi.ac.uk/europepmc), NCBI E-utilities, arXiv API. All are unauthenticated for the queries we run; be polite with rate limits.
- **caail bibliography** — `tucca-cellag/caail` is a curated AI-for-cell-ag paper list; we treat it as a reference dependency. A clone may live at `/Users/harrissyed/Code/tucca/caail/` for fast local lookups.

### Citation discipline

When agents or notes reference scientific work, cite by paper number from caail (`(caail #N)`) when applicable, by DOI / arXiv ID otherwise. Do not invent citations. Do not invent quantitative values (concentrations, viability percentages, costs) — when a number is unknown, say so.

## Active skills

Three Sardine skills currently live under `.claude/skills/`:

| Skill | Use when |
|---|---|
| `project-sardine` | The user mentions Project Sardine and you don't yet know which half. Routes to the sub-skills. |
| `sardine-start-with` | Media composition / formulation work — basal media, growth factors, often-ignored factors. |
| `sardine-thrive` | Measurement / evaluation work — RNA-Seq, doubling time, imaging-based health. |

When a user invokes one of these skills, follow it strictly — the skill is the operating manual for that workflow.

## Things this CLAUDE.md deliberately does NOT redefine

- System tone, sycophancy rules, communication anti-patterns
- Memory format and protocol
- Git commit / PR procedures
- General code review checklist

These are inherited from the user-level `CLAUDE.md` and remain in force.
