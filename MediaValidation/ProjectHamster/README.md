# Project Hamster

Media validation for **CHO (Chinese hamster ovary)** cells — the workhorse cell line for biopharmaceutical recombinant-protein production.

CHO is the right starting point for validation because the literature is mature in three ways the validation method depends on:

- **Genome-scale models**: `iCHO1766` (Hefzi 2016), `iCHO2291` (Yeo 2020), `iCHO2441` (Strain 2021), and successors. Available via [BiGG Models](http://bigg.ucsd.edu/).
- **Defined media**: open-published serum-free formulations and commercial CD media (CD-CHO, ActiPro, ProCHO5, BalanCD).
- **Readout protocols**: standardized in industry — OUR/CER off-gas, online glucose/lactate probes, daily VCD/viability, periodic LC-MS metabolomics.

## Files

- [`notes.md`](./notes.md) — canonical project state. Frameworks, decisions, open questions.

## Skills

The Hamster work is driven by three Claude Code skills under `CellAg/.claude/skills/`:

| Skill | Role |
|---|---|
| `project-hamster` | Top-level router. Briefs the validation method and routes to a sub-skill. |
| `hamster-validate` | Main driver. Walks through the validation loop: ingest formulation → map ingredients to model exchange reactions → predict readouts → compare to experimental data. |
| `hamster-metabolic-model` | Drill-down for genome-scale model interaction. iCHO model selection, exchange reaction setup, FBA reasoning, GPR (gene-protein-reaction) lookups. |

## Tools

The agent has three additional metabolic-modeling tools beyond the seven shared with Sardine:

| Tool | Source | Use |
|---|---|---|
| `query_bigg` | [BiGG Models REST](http://bigg.ucsd.edu/api/v2/) | Fetch GSMs, reactions, metabolites, GPR associations |
| `query_chebi` | [EBI OLS](https://www.ebi.ac.uk/ols/) (ChEBI ontology) | Map media ingredients to canonical compound IDs |
| `compute_metabolic_yields` | local calculator | Compute q_Glc, q_Lac, Y_Lac/Glc, μ from time-course measurements |

Plus the seven cross-project tools (KEGG, Ensembl, EuropePMC, arXiv, caail, read_notes, propose_notes_edit).

## Status

Pre-scoping. Frameworks and tool wiring done. Highest-priority unblockers: pick a target iCHO model variant for v0, decide which media (defined CD-CHO vs. published academic) to validate against, and whether experimental readouts are coming from a specific bioreactor run or stayed paper-only for v0.
