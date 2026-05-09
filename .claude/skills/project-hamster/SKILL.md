---
name: project-hamster
description: Top-level entry point for Project Hamster — the CHO (Chinese hamster ovary) media validation effort under CellAg/MediaValidation. Routes to the two specialized sub-skills (hamster-validate for the validation loop, hamster-metabolic-model for genome-scale model interaction). Use when the user mentions Project Hamster, CHO, iCHO models, cell-culture media validation, or wants to make progress on the project.
---

# Project Hamster — Router

You are the top-level entry point for Project Hamster. The project is the validation counterpart to Project Sardine: where Sardine designs media (composition), Hamster checks media against CHO genome-scale metabolic models and metabolic readouts (validation).

## On invocation — do this

1. **Read `MediaValidation/ProjectHamster/notes.md`** in full. That file is the canonical state for this project.
2. **Summarize current state in 2–3 sentences.** What's decided, what's still open, what changed if observable.
3. **Brief the user on the two sub-areas** (one sentence each — see below).
4. **Ask which area they want to drive** via AskUserQuestion. Recommended options:
   - **Validation loop** — full validation workflow. Routes to `hamster-validate`.
   - **Metabolic model** — drill into iCHO model details. Routes to `hamster-metabolic-model`.
   - **Cross-cutting** — scoping, references, status. Stay here.
5. **Hand off** by recommending the appropriate sub-skill — the user can invoke it next.

## The sub-areas in one sentence each

- **`hamster-validate`** — the full validation loop: ingest formulation → map to model exchanges → predict readouts → compare to experiment.
- **`hamster-metabolic-model`** — drill-down for working with iCHO genome-scale models specifically: model selection, exchange reaction lookup, GPR associations, FBA reasoning.

## What this skill handles directly (vs. routes)

Stay in this skill for **cross-cutting** topics:
- Scoping questions in notes.md §8 that affect both sub-areas
- Reference / literature pointers (notes.md §10)
- Status updates that span both sub-areas
- Comparison with Project Sardine (different domain — composition vs. validation)

Route to the sub-skills for area-specific work:
- Anything about ingredient → metabolite mapping, q_X computation, predicted-vs-measured comparison → `hamster-validate`
- Anything about specific iCHO models, reaction lookups, exchange flux setup, GPR queries, FBA outcome reasoning → `hamster-metabolic-model`

## Update protocol

`notes.md` at `MediaValidation/ProjectHamster/notes.md` is canonical state. Same protocol as Sardine: any decision lands there before being captured. Date-stamp non-trivial changes.

## Things this skill does NOT do

- It does not run FBA. FBA execution requires COBRApy (Python) — out of scope for the in-agent MVP. The agent reasons *about* models via metadata; FBA hand-off is external.
- It does not run wet-lab experiments.
- It does not commit code or push to remotes.
- It does not do area-specific work itself when a sub-skill is more appropriate — route instead.
