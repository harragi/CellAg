---
name: project-sardine
description: Top-level entry point for Project Sardine — a Media Zero / Media Thrive design effort under CellAg/InsilicoMediaDesign. Routes to the two specialized sub-skills (sardine-start-with for Media Zero composition, sardine-thrive for Media Thrive measurement). Use when the user mentions Project Sardine generally and you don't yet know which half they want to drive.
---

# Project Sardine — Router

You are the top-level entry point for Project Sardine. The project has been divided into two parallel workstreams; your job is to brief the user on both and route them to the right sub-skill.

## On invocation — do this

1. **Read `InsilicoMediaDesign/ProjectSardine/notes.md`** in full. It is the canonical state for the whole project.
2. **Summarize current state in 2–3 sentences.** What's decided, what's still open at the project level, when the most recent whiteboard was captured.
3. **Brief the user on the two halves** (one sentence each — see below).
4. **Ask which half they want to drive** via AskUserQuestion. Recommended options:
   - **Media Zero (Start With)** — composition / formulation work. Routes to `sardine-start-with`.
   - **Media Thrive (Thrive)** — measurement / evaluation work. Routes to `sardine-thrive`.
   - **Cross-cutting** — system knowledge, validation approach, scoping, or literature. Stay here for these.
5. **Hand off** by recommending the appropriate skill (`sardine-start-with` or `sardine-thrive`) — the user can invoke it next.

## The two halves in one sentence each

- **Media Zero (Start With):** what's the minimum media composition that keeps cells alive? (Output: a formulation — basal + growth factors + often-ignored factors.)
- **Media Thrive (Thrive):** how do we measure whether cells in a candidate media are *thriving*, not just alive? (Output: a metric stack — transcriptome + doubling time + imaging.)

## What this skill handles directly (vs. routes)

Stay in this skill for **cross-cutting** topics that span both halves:
- System knowledge (§7 of notes.md) — metabolism (KEGG) and signaling (EMBL/EMBO) databases that constrain both halves
- Validation approach (§8) — the paper / surrogate / wet-lab triad
- Open scoping questions (§10) — many block both halves
- Caail literature cross-walk (§11)
- Status updates that span both halves (§12)

Route to the sub-skills for **half-specific** work:
- Anything about ingredient selection, basal media, growth factors, often-ignored factors, fatty acids, FBS replacement → `sardine-start-with`
- Anything about transcriptome assays, RNA-Seq, doubling time, imaging-based health, tucca-rna-seq integration → `sardine-thrive`

## Update protocol

Same as the sub-skills — `notes.md` is canonical. Any decision the user makes must end up in notes.md before it's "captured." Date-stamp non-trivial changes.

## Things this skill does NOT do

- It does not run wet-lab experiments.
- It does not commit code or push to remotes.
- It does not modify the source whiteboard images (`notes-2026-05-09*.png`).
- It does not do the half-specific work itself when a sub-skill is more appropriate — route instead.
