# Project Sardine

Two-part project under `InsilicoMediaDesign`:

1. **Media Zero (Start With)** — design a minimum cell-culture media that enables cell *survival*. Composition / formulation work.
2. **Media Thrive (Thrive)** — design the metric stack that grades whether cells in a candidate media are *thriving*, not just alive. Measurement / evaluation work.

Each half has its own agentic Claude skill. A top-level router skill orchestrates both.

## Files

- [`notes.md`](./notes.md) — canonical project state. All decisions land here.
- [`notes-2026-05-09.png`](./notes-2026-05-09.png) — initial whiteboard (09:48)
- [`notes-2026-05-09b.png`](./notes-2026-05-09b.png) — system-knowledge axis added (10:05)
- [`notes-2026-05-09c.png`](./notes-2026-05-09c.png) — Media Thrive added, sources annotated, databases named (10:17, latest)

## Skills

| Skill | Purpose |
|---|---|
| `project-sardine` | Top-level router. Briefs both halves, routes to the appropriate sub-skill, handles cross-cutting topics (system knowledge, validation, scoping, literature). |
| `sardine-start-with` | Drives Media Zero composition work — basal media, growth factors, often-ignored factors. |
| `sardine-thrive` | Drives Media Thrive measurement work — transcriptome (RNA-Seq), doubling time, imaging-based health. |

All three live at `CellAg/.claude/skills/<name>/SKILL.md`.

## Runnable agent

A standalone web-based agent for the **Start With** half lives at [`agent/`](./agent). It uses the Claude Agent SDK (Bun + TypeScript backend) and a React + Vite frontend, hooked up to KEGG, Ensembl, EuropePMC, arXiv, and the local caail bibliography. See [`agent/README.md`](./agent/README.md) for run instructions.

```bash
cd agent
(cd server && bun install)
(cd web && bun install)
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
(cd server && bun run dev) &     # → :3001
(cd web && bun run dev)          # → :5173
```

Notes propose-then-apply: the agent never writes to `notes.md` directly. It calls `propose_notes_edit`, which surfaces a diff in the right-hand panel. The user clicks Apply or Reject.

## Status

Pre-scoping. Highest-priority unblocker: confirm the target cell line / species ("fish X" on the whiteboard).
