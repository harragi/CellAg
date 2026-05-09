# MediaValidation

The validation counterpart to `InsilicoMediaDesign`.

Where `InsilicoMediaDesign` answers "what's *in* a cell-culture media?" (composition), this directory answers "is the media we have *valid* for our cells?" (validation against models and readouts).

## Method

Validation is grounded against three artifacts:

1. **Genome-scale metabolic models (GSMs).** Constraint-based reconstructions (e.g., `iCHO1766`, `iCHO2441` for CHO) that, given a media as exchange-flux constraints, predict feasible growth rates and byproduct fluxes via Flux Balance Analysis (FBA) and variants.
2. **Defined media formulations.** Published or commercial recipes (CD-CHO, ActiPro, ProCHO5, etc.) used as references and starting points.
3. **Metabolic readouts.** Experimental measurements — off-gas (OUR, CER), substrate consumption (q_Glc, q_Gln), byproducts (q_Lac, q_NH₃), specific productivity (q_P), viable cell density (VCD), doubling time. These are what you *measure* to check whether the model and the wet-lab agree.

A validation pass takes a candidate formulation, drives it through a GSM, predicts the readouts you'd expect, and flags discrepancies once experimental data is available.

## Projects

- **[ProjectHamster](./ProjectHamster/)** — CHO (Chinese hamster ovary) validation. The first concrete project here. CHO has the most mature GSM ecosystem and the most published media recipes, making it the right starting point for the validation workflow.

Future projects under `MediaValidation/` would target other cell types as their GSMs and readout protocols mature.
